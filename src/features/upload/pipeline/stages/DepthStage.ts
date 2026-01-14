import { createLogger } from '@/core/Logger';
import { getAIService } from '@/services/ai';

import type { PipelineStage, StageInput, StageOutput } from '../types';

const logger = createLogger({ module: 'DepthStage' });
export class DepthStage implements PipelineStage {
  readonly name = 'depth';
  readonly order = 2;
  async execute(input: StageInput): Promise<StageOutput> {
    try {
      if (!input.imageUrl) {
        throw new Error('No image URL available for depth estimation');
      }
      const aiService = getAIService();
      if (!aiService.isAvailable()) {
        await aiService.initialize();
      }
      const depthResult = await aiService.estimateDepth(input.imageUrl);
      return {
        ...input,
        depthUrl: depthResult.depthUrl,
        metadata: { ...input.metadata, depthMethod: depthResult.method },
        success: true
      };
    } catch (error) {
      logger.error('Depth estimation failed', { error });
      return {
        ...input,
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  canSkip(input: StageInput): boolean {
    return input.depthUrl !== undefined;
  }
}
