import type { PipelineStage, StageInput, StageOutput } from '../types';

export class PrepareStage implements PipelineStage {
  readonly name = 'prepare';
  readonly order = 3;
  async execute(input: StageInput): Promise<StageOutput> {
    try {
      if (!input.imageUrl) {throw new Error('Missing image URL');}
      if (!input.depthUrl) {throw new Error('Missing depth URL');}
      if (!input.analysis) {throw new Error('Missing analysis data');}
      const recommendedConfig = {
        displacementScale: input.analysis.estimatedDepthScale,
        fov: input.analysis.recommendedFov,
      };
      return {
        ...input,
        metadata: { ...input.metadata, recommendedConfig, ready: true },
        success: true
      };
    } catch (error) {
      return {
        ...input,
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}
