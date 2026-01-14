import { getEventBus } from '@/core/EventBus';
import { createLogger } from '@/core/Logger';

import { FallbackProvider } from './providers/FallbackProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { TensorFlowProvider } from './providers/TensorFlowProvider';

import type { IAIProvider, IAIService, DepthResult, AIProgressCallback, AICacheConfig, CacheEntry, ImageAnalysis } from './types';
import type { ILifecycleAware } from '@/core/LifecycleManager';

const logger = createLogger({ module: 'AIService' });

const AIEvents = {
  ANALYSIS_STARTED: 'ai:analysis-started',
  ANALYSIS_COMPLETED: 'ai:analysis-completed',
  DEPTH_STARTED: 'ai:depth-started',
  DEPTH_COMPLETED: 'ai:depth-completed',
  PROVIDER_CHANGED: 'ai:provider-changed',
  CACHE_HIT: 'ai:cache-hit',
} as const;

function hashString(str: string): string {
  let hash1 = 0;
  let hash2 = 0;
  const len = str.length;

  for (let i = 0; i < len; i++) {
    const char = str.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1 + char) | 0;
    hash2 = ((hash2 << 7) ^ char) | 0;
  }

  return `${(hash1 >>> 0).toString(16)}_${(hash2 >>> 0).toString(16)}_${len}`;
}

class AIServiceImpl implements IAIService, ILifecycleAware {
  readonly serviceId = 'ai-service';
  readonly dependencies = [];

  private geminiProvider: GeminiProvider;
  private tensorflowProvider: TensorFlowProvider;
  private fallbackProvider: FallbackProvider;
  private activeSceneProvider: IAIProvider | null = null;
  private activeDepthProvider: IAIProvider | null = null;
  private progressCallbacks = new Set<AIProgressCallback>();
  private cacheConfig: AICacheConfig = { enabled: true, maxSize: 50, ttlMs: 5 * 60 * 1000 };
  private analysisCache = new Map<string, CacheEntry<ImageAnalysis>>();
  private depthCache = new Map<string, CacheEntry<DepthResult>>();
  // 防止重复请求�?pending map
  private pendingAnalysis = new Map<string, Promise<ImageAnalysis>>();
  private pendingDepth = new Map<string, Promise<DepthResult>>();

  constructor() {
    this.geminiProvider = new GeminiProvider();
    this.tensorflowProvider = new TensorFlowProvider();
    this.fallbackProvider = new FallbackProvider();
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.geminiProvider.initialize(),
      this.tensorflowProvider.initialize(),
      this.fallbackProvider.initialize()
    ]);

    this.activeSceneProvider = this.geminiProvider.isAvailable 
      ? this.geminiProvider 
      : this.fallbackProvider;

    this.activeDepthProvider = this.tensorflowProvider.isAvailable 
      ? this.tensorflowProvider 
      : this.fallbackProvider;

    logger.info(`Initialized: scene=${this.activeSceneProvider.providerId}, depth=${this.activeDepthProvider.providerId}`);
  }

  async destroy(): Promise<void> {
    await Promise.all([
      this.geminiProvider.dispose(),
      this.tensorflowProvider.dispose(),
      this.fallbackProvider.dispose()
    ]);

    this.analysisCache.clear();
    this.depthCache.clear();
    this.progressCallbacks.clear();
  }

  pause(): void {}

  resume(): void {}

  isAvailable(): boolean {
    return this.activeSceneProvider !== null || this.activeDepthProvider !== null;
  }

  getActiveProvider(): string {
    return `scene=${this.activeSceneProvider?.providerId}, depth=${this.activeDepthProvider?.providerId}`;
  }

  onProgress(callback: AIProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  async analyzeScene(base64Image: string): Promise<ImageAnalysis> {
    const cacheKey = hashString(base64Image);
    const cached = this.getCached(this.analysisCache, cacheKey, 'analysis');
    if (cached) {return cached;}

    // 检查是否有正在进行的相同请�?
    const pending = this.pendingAnalysis.get(cacheKey);
    if (pending) {return pending;}

    const promise = this.doAnalyzeScene(base64Image, cacheKey);
    this.pendingAnalysis.set(cacheKey, promise);
    
    try {
      return await promise;
    } finally {
      this.pendingAnalysis.delete(cacheKey);
    }
  }

  private async doAnalyzeScene(base64Image: string, cacheKey: string): Promise<ImageAnalysis> {
    this.emitProgress(0, 'analyzing');
    getEventBus().emit(AIEvents.ANALYSIS_STARTED, { provider: this.activeSceneProvider?.providerId });

    try {
      if (this.activeSceneProvider?.analyzeScene) {
        this.emitProgress(50, 'analyzing');
        const result = await this.activeSceneProvider.analyzeScene(base64Image);
        this.setCache(this.analysisCache, cacheKey, result);
        this.emitProgress(100, 'analyzing');
        getEventBus().emit(AIEvents.ANALYSIS_COMPLETED, { provider: this.activeSceneProvider.providerId, success: true });
        return result;
      }
    } catch (error) {
      logger.warn('Primary provider failed', { error });
      if (this.activeSceneProvider !== this.fallbackProvider) {
        getEventBus().emit(AIEvents.PROVIDER_CHANGED, { from: this.activeSceneProvider?.providerId, to: 'fallback' });
        this.activeSceneProvider = this.fallbackProvider;
      }
    }

    const result = await this.fallbackProvider.analyzeScene(base64Image);
    this.setCache(this.analysisCache, cacheKey, result);
    this.emitProgress(100, 'analyzing');
    getEventBus().emit(AIEvents.ANALYSIS_COMPLETED, { provider: 'fallback', success: true });
    return result;
  }

  async estimateDepth(imageUrl: string): Promise<DepthResult> {
    const cacheKey = hashString(imageUrl);
    const cached = this.getCached(this.depthCache, cacheKey, 'depth');
    if (cached) {return cached;}

    // 检查是否有正在进行的相同请�?
    const pending = this.pendingDepth.get(cacheKey);
    if (pending) {return pending;}

    const promise = this.doEstimateDepth(imageUrl, cacheKey);
    this.pendingDepth.set(cacheKey, promise);
    
    try {
      return await promise;
    } finally {
      this.pendingDepth.delete(cacheKey);
    }
  }

  private async doEstimateDepth(imageUrl: string, cacheKey: string): Promise<DepthResult> {
    this.emitProgress(0, 'depth_estimation');
    getEventBus().emit(AIEvents.DEPTH_STARTED, { provider: this.activeDepthProvider?.providerId });

    try {
      if (this.activeDepthProvider?.estimateDepth) {
        this.emitProgress(50, 'depth_estimation');
        const result = await this.activeDepthProvider.estimateDepth(imageUrl);
        this.setCache(this.depthCache, cacheKey, result);
        this.emitProgress(100, 'depth_estimation');
        getEventBus().emit(AIEvents.DEPTH_COMPLETED, { provider: this.activeDepthProvider.providerId, success: true });
        return result;
      }
    } catch (error) {
      logger.warn('Primary depth provider failed', { error });
      if (this.activeDepthProvider !== this.fallbackProvider) {
        getEventBus().emit(AIEvents.PROVIDER_CHANGED, { from: this.activeDepthProvider?.providerId, to: 'fallback' });
        this.activeDepthProvider = this.fallbackProvider;
      }
    }

    const result = await this.fallbackProvider.estimateDepth(imageUrl);
    this.setCache(this.depthCache, cacheKey, result);
    this.emitProgress(100, 'depth_estimation');
    getEventBus().emit(AIEvents.DEPTH_COMPLETED, { provider: 'fallback', success: true });
    return result;
  }

  async editImage(base64Image: string, _prompt: string): Promise<string> {
    // Image editing not supported yet - return original image
    logger.warn('Image editing not implemented');
    return base64Image;
  }

  clearCache(): void {
    this.analysisCache.clear();
    this.depthCache.clear();
  }

  configureCaching(config: Partial<AICacheConfig>): void {
    this.cacheConfig = { ...this.cacheConfig, ...config };
  }

  private emitProgress(progress: number, stage: string): void {
    for (const callback of this.progressCallbacks) {
      callback(progress, stage);
    }
  }

  private getCached<T>(cache: Map<string, CacheEntry<T>>, key: string, cacheType: 'analysis' | 'depth'): T | null {
    if (!this.cacheConfig.enabled) {return null;}

    const entry = cache.get(key);
    if (!entry) {return null;}

    if (Date.now() - entry.timestamp > this.cacheConfig.ttlMs) {
      cache.delete(key);
      return null;
    }

    getEventBus().emit(AIEvents.CACHE_HIT, { key, type: cacheType });
    return entry.value;
  }

  private setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void {
    if (!this.cacheConfig.enabled) {return;}

    if (cache.size >= this.cacheConfig.maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) {cache.delete(oldestKey);}
    }

    cache.set(key, { value, timestamp: Date.now(), hash: key });
  }
}

let instance: AIServiceImpl | null = null;

export const getAIService = (): AIServiceImpl => {
  instance ??= new AIServiceImpl();
  return instance;
};

export const resetAIService = (): void => {
  instance = null;
};

export { AIServiceImpl as AIService };
