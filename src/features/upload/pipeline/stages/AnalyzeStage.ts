import { createLogger } from '@/core/Logger';
import { getAIService } from '@/services/ai';
import { SceneType, TechPipeline } from '@/shared/types';

import type { PipelineStage, StageInput, StageOutput } from '../types';

const logger = createLogger({ module: 'AnalyzeStage' });

export class AnalyzeStage implements PipelineStage {
  readonly name = 'analyze';
  readonly order = 1;

  async execute(input: StageInput): Promise<StageOutput> {
    logger.info('Starting analysis stage');

    try {
      const { imageBase64 } = input;

      if (!imageBase64) {
        logger.warn('Image data not available, using defaults');
        return {
          ...input,
          success: true,
          analysis: {
            sceneType: SceneType.UNKNOWN,
            description: '分析服务暂时不可用',
            reasoning: '分析服务暂时不可用',
            estimatedDepthScale: 1.5,
            recommendedFov: 55,
            recommendedPipeline: TechPipeline.DEPTH_MESH,
            suggestedModel: 'default',
          },
        };
      }

      const aiService = getAIService();
      const analysis = await aiService.analyzeScene(imageBase64);
      
      logger.info('Analysis completed', { sceneType: analysis.sceneType });

      return {
        ...input,
        success: true,
        analysis,
      };
    } catch (error) {
      logger.warn('Analysis failed, using fallback values', { error: String(error) });
      
      // Return success with fallback values to continue pipeline
      // Analysis is non-critical; depth estimation and rendering can proceed
      return {
        ...input,
        success: true,
        analysis: {
          sceneType: SceneType.UNKNOWN,
          description: '分析服务暂时不可用，使用默认配置',
          reasoning: String(error),
          estimatedDepthScale: 1.5,
          recommendedFov: 55,
          recommendedPipeline: TechPipeline.DEPTH_MESH,
          suggestedModel: 'default',
        },
      };
    }
  }
}

export const createAnalyzeStage = (): PipelineStage => new AnalyzeStage();
