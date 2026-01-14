import { createLogger } from '@/core/Logger';
import { SceneType, TechPipeline } from '@/shared/types';
import { generatePseudoDepthMap } from '@/shared/utils';

import type { IAIProvider, DepthResult, ImageAnalysis } from '../types';

const logger = createLogger({ module: 'FallbackProvider' });

export class FallbackProvider implements IAIProvider {
  readonly providerId = 'fallback';
  private _isAvailable = true;

  get isAvailable(): boolean {
    return this._isAvailable;
  }

  async initialize(): Promise<void> {
    logger.info('FallbackProvider initialized');
  }

  async dispose(): Promise<void> {
    logger.info('FallbackProvider destroyed');
  }

  async analyzeScene(_base64Image: string): Promise<ImageAnalysis> {
    logger.info('Using fallback analysis');
    
    return {
      sceneType: SceneType.UNKNOWN,
      estimatedDepthScale: 1.5,
      description: '无法连接AI服务，使用默认设置',
      recommendedFov: 55,
      recommendedPipeline: TechPipeline.DEPTH_MESH,
      reasoning: '离线模式',
      suggestedModel: 'default',
    };
  }

  async estimateDepth(imageUrl: string): Promise<DepthResult> {
    logger.info('Using fallback depth estimation');
    
    const depthUrl = await generatePseudoDepthMap(imageUrl);
    
    return {
      depthUrl,
      method: 'canvas',
      confidence: 0.5,
    };
  }
}

export const createFallbackProvider = (): IAIProvider => new FallbackProvider();
