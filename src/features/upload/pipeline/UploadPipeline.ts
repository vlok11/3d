/**
 * UploadPipeline - 上传处理管道
 * 
 * 职责：协调各个处理阶段，提供进度回调和错误恢复
 * - 支持可选的事件发射器注入（解耦 EventBus）
 * - 提供 onProgress, onError, onComplete 回调
 */

import { PipelineEvents } from '@/core/EventTypes';
import { createLogger } from '@/core/Logger';

import { ReadStage, AnalyzeStage, DepthStage, PrepareStage } from './stages';

import type { 
  IUploadPipeline, 
  PipelineStage, 
  PipelineProgress, 
  ProcessedResult,
  ProgressCallback,
  ErrorCallback,
  CompleteCallback,
  StageInput,
  RecoveryOption
} from './types';

const logger = createLogger({ module: 'UploadPipeline' });

// ============================================================================
// Pipeline Event Emitter Interface
// ============================================================================

export interface PipelineEventEmitter {
  emit(event: string, payload: Record<string, unknown>): void;
}

export interface PipelineOptions {
  eventEmitter?: PipelineEventEmitter;
}

// ============================================================================
// Default Event Emitter (lazy load EventBus)
// ============================================================================

const createDefaultEmitter = (): PipelineEventEmitter => ({
  emit: (event, payload) => {
    // Lazy import to avoid circular dependency
    import('@/core/EventBus').then(({ getEventBus }) => {
      getEventBus().emit(event, payload);
    }).catch(() => {
      // Silently ignore if EventBus is not available
    });
  }
});

// ============================================================================
// Pipeline Implementation
// ============================================================================

class UploadPipelineImpl implements IUploadPipeline {
  private stages: PipelineStage[] = [];
  private progressCallbacks = new Set<ProgressCallback>();
  private errorCallbacks = new Set<ErrorCallback>();
  private completeCallbacks = new Set<CompleteCallback>();
  private eventEmitter: PipelineEventEmitter;
  
  private currentProgress: PipelineProgress = {
    stage: '',
    stageIndex: 0,
    totalStages: 0,
    progress: 0,
    message: ''
  };
  
  private isCancelled = false;
  private startTime = 0;
  private abortController: AbortController | null = null;
  private currentRunId: string | null = null;

  constructor(options?: PipelineOptions) {
    this.eventEmitter = options?.eventEmitter ?? createDefaultEmitter();
    
    this.stages = [
      new ReadStage(),
      new AnalyzeStage(),
      new DepthStage(),
      new PrepareStage()
    ].sort((a, b) => a.order - b.order);
  }

  async process(input: File | string): Promise<ProcessedResult> {
    this.isCancelled = false;
    this.startTime = Date.now();
    this.abortController = new AbortController();
    this.currentRunId = crypto.randomUUID();
    
    const inputType = input instanceof File ? 'file' : 'url';
    this.eventEmitter.emit(PipelineEvents.STARTED, { inputType });
    
    const runId = this.currentRunId;
    let stageInput: StageInput = input instanceof File 
      ? { file: input, signal: this.abortController.signal, runId } 
      : { url: input, signal: this.abortController.signal, runId };

    const totalStages = this.stages.length;

    for (let i = 0; i < this.stages.length; i++) {
      if (this.isCancelled) {
        this.eventEmitter.emit(PipelineEvents.CANCELLED, {});
        throw new Error('Pipeline cancelled');
      }

      const stage = this.stages[i]!;
      
      if (stage.canSkip?.(stageInput)) continue;

      this.updateProgress({
        stage: stage.name,
        stageIndex: i,
        totalStages,
        progress: Math.round((i / totalStages) * 100),
        message: `Processing ${stage.name}...`
      });

      this.eventEmitter.emit(PipelineEvents.STAGE_STARTED, { 
        stage: stage.name, 
        progress: this.currentProgress.progress 
      });

      const output = await stage.execute(stageInput);

      // Check cancellation after stage execution to prevent callback pollution
      if (this.isCancelled) {
        this.eventEmitter.emit(PipelineEvents.CANCELLED, {});
        throw new Error('Pipeline cancelled');
      }

      if (!output.success) {
        const error = output.error ?? new Error(`Stage ${stage.name} failed`);
        const recoveryOptions = this.getRecoveryOptions(stage.name, stageInput);
        
        for (const callback of this.errorCallbacks) {
          callback(error, stage.name, recoveryOptions);
        }
        
        this.eventEmitter.emit(PipelineEvents.ERROR, { 
          stage: stage.name, 
          error: error.message 
        });
        throw error;
      }

      stageInput = output;
      this.eventEmitter.emit(PipelineEvents.STAGE_COMPLETED, { 
        stage: stage.name, 
        progress: Math.round(((i + 1) / totalStages) * 100) 
      });
    }

    const processingTime = Date.now() - this.startTime;

    // Convert keys to match domain definitions
    const isVideo = !!stageInput.videoUrl;
    const baseAsset = {
      id: crypto.randomUUID(),
      sourceUrl: stageInput.imageUrl!,
      width: (stageInput.metadata?.width as number) ?? 1024,
      height: (stageInput.metadata?.height as number) ?? 1024,
      aspectRatio: (stageInput.metadata?.aspectRatio as number) ?? 1,
      createdAt: Date.now()
    };

    const asset = isVideo ? {
      ...baseAsset,
      type: 'video' as const,
      duration: (stageInput.metadata?.duration as number) ?? 0,
      thumbnailUrl: stageInput.imageUrl!,
      sourceUrl: stageInput.videoUrl! // For video type, source is the video
    } : {
      ...baseAsset,
      type: 'image' as const
    };

    const analysisResult = {
      ...stageInput.analysis!,
      depthScaleEstimate: stageInput.analysis?.estimatedDepthScale ?? 1.0,
      depthVariance: 0.5, // Default/Placeholder as current analysis doesn't provide this
      keywords: [] 
    };

    const result: ProcessedResult = {
      asset,
      analysis: analysisResult,
      depthMapUrl: stageInput.depthUrl!,
      imageUrl: stageInput.imageUrl!,
      backgroundUrl: stageInput.backgroundUrl,
      processingTime
    };

    this.updateProgress({
      stage: 'complete',
      stageIndex: totalStages,
      totalStages,
      progress: 100,
      message: 'Processing complete'
    });

    for (const callback of this.completeCallbacks) {
      callback(result);
    }

    this.eventEmitter.emit(PipelineEvents.COMPLETED, { result });
    return result;
  }

  cancel(): void {
    this.isCancelled = true;
    this.abortController?.abort();
  }

  getProgress(): PipelineProgress {
    return { ...this.currentProgress };
  }

  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  onComplete(callback: CompleteCallback): () => void {
    this.completeCallbacks.add(callback);
    return () => this.completeCallbacks.delete(callback);
  }

  private updateProgress(progress: PipelineProgress): void {
    this.currentProgress = progress;
    for (const callback of this.progressCallbacks) {
      callback(progress);
    }
  }


  private getRecoveryOptions(stageName: string, _stageInput?: StageInput): RecoveryOption[] {
    // Recovery not yet implemented - return empty array to avoid misleading UI
    // TODO: Implement pipeline resume/retry mechanism in a future iteration
    logger.debug('Recovery requested but not implemented', { stageName });
    return [];
  }
}

// ============================================================================
// Factory
// ============================================================================

export const createUploadPipeline = (options?: PipelineOptions): UploadPipelineImpl => 
  new UploadPipelineImpl(options);

export { UploadPipelineImpl as UploadPipeline };
