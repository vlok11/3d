import type { ProcessedAsset, AnalysisResult } from '@/core/domain/types';

export interface StageInput {
  file?: File;
  url?: string;
  imageBase64?: string;
  imageUrl?: string;
  depthUrl?: string;
  backgroundUrl?: string;
  videoUrl?: string;
  analysis?: AnalysisResult;
  metadata?: Record<string, unknown>;
  onProgress?: (stage: string, progress: number, message: string) => void;
  signal?: AbortSignal;
  runId?: string;
}

/**
 * RunContext provides a unified protocol for cancellation and lifecycle management.
 * Each process() call generates a new runId; callbacks validate runId before executing.
 */
export interface RunContext {
  signal: AbortSignal;
  runId: string;
}

export interface StageOutput extends StageInput {
  success: boolean;
  error?: Error;
}

export interface PipelineStage {
  readonly name: string;
  readonly order: number;
  execute(input: StageInput): Promise<StageOutput>;
  canSkip?(input: StageInput): boolean;
}

export interface PipelineProgress {
  stage: string;
  stageIndex: number;
  totalStages: number;
  progress: number;
  message: string;
}

// Retain compatibility alias or replace usages. 
// For now, we make ProcessedResult compatible with ProcessedAsset or just alias it.
// But ProcessedAsset is structurally different (nested Asset).
// Let's modify ProcessedResult to be a "Legacy View" or update consumers.
// Ideally, we move everyone to ProcessedAsset. 

export type ProcessedResult = ProcessedAsset;

export type ProgressCallback = (progress: PipelineProgress) => void;
export type ErrorCallback = (error: Error, stage: string, recoveryOptions: RecoveryOption[]) => void;
export type CompleteCallback = (result: ProcessedResult) => void;

export interface RecoveryOption {
  label: string;
  action: () => Promise<void>;
}

export interface IUploadPipeline {
  process(input: File | string): Promise<ProcessedResult>;
  cancel(): void;
  getProgress(): PipelineProgress;
  onProgress(callback: ProgressCallback): () => void;
  onError(callback: ErrorCallback): () => void;
  onComplete(callback: CompleteCallback): () => void;
}
