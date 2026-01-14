/**
 * Scene Configurator
 * 
 * "The Brain" of the transition logic.
 * Pure function: (AnalysisResult + AssetType) -> SceneConfig
 */

import { SceneType, ColorGradePreset, CameraMotionType } from '@/shared/types';

import type { AnalysisResult, AssetType, RecommendedConfig } from '@/core/domain/types';

interface ConfigContext {
  analysis: AnalysisResult;
  assetType: AssetType;
}

export class SceneConfigurator {
  static deriveConfig(context: ConfigContext): RecommendedConfig {
    const { analysis, assetType } = context;

    // 1. Base default
    const config: RecommendedConfig = {
      displacementScale: analysis.estimatedDepthScale || 1.2,
      fov: analysis.recommendedFov || 55,
      colorGrade: ColorGradePreset.NONE,
      enableFog: false,
      enableVignette: true,
      cameraMotion: CameraMotionType.STATIC,
      videoLoop: true
    };

    // 2. Adjust for Scene Type
    switch (analysis.sceneType) {
      case SceneType.OUTDOOR:
        config.enableFog = true;
        config.displacementScale *= 1.2; // Outdoors usually need more depth exaggeration
        config.cameraMotion = CameraMotionType.ORBIT; // Generic orbit is good for landscapes
        break;
      
      case SceneType.INDOOR:
        config.fov = 65; // Slightly wider for indoors
        config.cameraMotion = CameraMotionType.DOLLY_ZOOM; // Subtle dolly
        break;

      case SceneType.OBJECT:
        config.displacementScale *= 0.8; // Reduce noise for objects
        config.cameraMotion = CameraMotionType.ARC;
        config.enableVignette = true; // Focus on object
        break;
    }

    // 3. Adjust for Video
    if (assetType === 'video') {
      config.cameraMotion = CameraMotionType.STATIC; // Video usually has its own motion
      config.videoLoop = true;
    }

    // 4. Color Grading Strategy
    config.colorGrade = this.recommendColorGrade(analysis.keywords ?? []);

    return config;
  }

  private static recommendColorGrade(keywords: string[]): ColorGradePreset {
    const k = keywords.map(s => s.toLowerCase());

    if (k.some(w => ['neon', 'cyber', 'night', 'city', 'future'].includes(w))) {
      return ColorGradePreset.CYBERPUNK;
    }
    if (k.some(w => ['sunset', 'warm', 'desert', 'fire'].includes(w))) {
      return ColorGradePreset.WARM;
    }
    if (k.some(w => ['winter', 'snow', 'cold', 'ice', 'blue'].includes(w))) {
      return ColorGradePreset.COLD;
    }
    if (k.some(w => ['forest', 'nature', 'mountain'].includes(w))) {
      return ColorGradePreset.CINEMATIC;
    }
    if (k.some(w => ['old', 'retro', 'vintage', '1980', '1990'].includes(w))) {
      return ColorGradePreset.VINTAGE;
    }

    return ColorGradePreset.NONE;
  }
}
