import type { AnalysisResult } from '@/core/domain/types';

// Re-export as ImageAnalysis for backward compatibility
export type ImageAnalysis = AnalysisResult;

export interface DepthResult {
  depthUrl: string;
  method: 'ai' | 'canvas';
  confidence?: number;
}

export type AIProgressCallback = (progress: number, stage: string) => void;

export interface IAIProvider {
  readonly providerId: string;
  readonly isAvailable: boolean;
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  analyzeScene?(base64Image: string): Promise<ImageAnalysis>;
  estimateDepth?(imageUrl: string): Promise<DepthResult>;
  editImage?(base64Image: string, prompt: string): Promise<string>;
}

export interface IAIService {
  analyzeScene(base64Image: string): Promise<ImageAnalysis>;
  estimateDepth(imageUrl: string): Promise<DepthResult>;
  editImage(base64Image: string, prompt: string): Promise<string>;
  isAvailable(): boolean;
  getActiveProvider(): string;
  onProgress(callback: AIProgressCallback): () => void;
}

export interface AICacheConfig {
  enabled: boolean;
  maxSize: number;
  ttlMs: number;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hash: string;
}
