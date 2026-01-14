import { getEventBus } from '@/core/EventBus';
import { ConfigEvents } from '@/core/EventTypes';
import { createLogger } from '@/core/Logger';
import { RenderStyle, ColorGradePreset, CameraMotionType, ProjectionMode } from '@/shared/types';

import type { ILifecycleAware } from '@/core/LifecycleManager';
import type { SceneConfig } from '@/shared/types';

const logger = createLogger({ module: 'ConfigService' });

export interface ConfigPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<SceneConfig>;
}

export interface IConfigService {
  getConfig(): SceneConfig;
  setConfig(config: Partial<SceneConfig>): void;
  resetConfig(): void;
  applyPreset(presetId: string): void;
  getPresets(): ConfigPreset[];
  validateConfig(config: Partial<SceneConfig>): string[];
}

const CONFIG_PRESETS: ConfigPreset[] = [
  {
    id: 'cinematic',
    name: '电影级',
    description: '电影级画面效果，适合展示',
    config: {
      renderStyle: RenderStyle.REALISTIC,
      colorGrade: ColorGradePreset.CINEMATIC,
      exposure: 1.2,
      contrast: 1.1,
      saturation: 1.05,
      enableVignette: true,
      vignetteStrength: 0.4,
    },
  },
  {
    id: 'vibrant',
    name: '鲜艳',
    description: '高饱和度鲜艳色彩',
    config: {
      renderStyle: RenderStyle.REALISTIC,
      colorGrade: ColorGradePreset.NONE,
      exposure: 1.1,
      contrast: 1.15,
      saturation: 1.3,
      enableVignette: false,
    },
  },
  {
    id: 'noir',
    name: '黑白',
    description: '经典黑白电影风格',
    config: {
      renderStyle: RenderStyle.REALISTIC,
      colorGrade: ColorGradePreset.NOIR,
      exposure: 1.0,
      contrast: 1.2,
      saturation: 0,
      enableVignette: true,
      vignetteStrength: 0.5,
    },
  },
  {
    id: 'holographic',
    name: '全息',
    description: '科幻全息投影效果',
    config: {
      renderStyle: RenderStyle.HOLOGRAPHIC,
      colorGrade: ColorGradePreset.NONE,
      enableVignette: false,
    },
  },
];

const DEFAULT_CONFIG: SceneConfig = {
  displacementScale: 1.2,
  wireframe: false,
  meshDensity: 192,
  mirrorMode: 'NONE' as never,
  autoRotate: false,
  cameraMotionType: CameraMotionType.STATIC,
  cameraMotionSpeed: 0.6,
  cameraMotionBlend: 'additive',
  motionResumeDelayMs: 800,
  motionResumeTransitionMs: 300,
  orbitRadius: 12,
  orbitTilt: 15,
  flyByHeight: 3,
  flyBySwing: 12,
  spiralLoops: 2,
  spiralHeight: 8,
  arcAngle: 90,
  arcRhythm: 1,
  trackingDistance: 12,
  trackingOffset: 0,
  dollyRange: 20,
  dollyIntensity: 1,
  fov: 55,
  orthoZoom: 20,
  cameraMode: 'PERSPECTIVE' as never,
  minDistance: 1.5,
  maxDistance: 40,
  dampingFactor: 0.1,
  rotateSpeed: 0.8,
  zoomSpeed: 1.2,
  verticalShift: 0,
  enablePan: true,
  panSpeed: 0.8,
  minPolarAngle: 0,
  maxPolarAngle: Math.PI,
  isImmersive: false,
  showGrid: false,
  showAxes: false,
  renderStyle: RenderStyle.REALISTIC,
  roughness: 0.6,
  metalness: 0.2,
  lightIntensity: 1.2,
  exposure: 1.1,
  projectionMode: ProjectionMode.PLANE,
  projectionAngle: 180,
  depthInvert: false,
  backgroundIntensity: 0.8,
  enableNakedEye3D: false,
  enableParticles: false,
  edgeFade: 0.8,
  parallaxScale: 0.3,
  depthFog: 0.2,
  lightAngleX: 45,
  lightAngleY: 30,
  vignetteStrength: 0.3,
  particleType: 'dust',
  videoMuted: true,
  enableFrameInterpolation: true,
  hologramType: 'CLASSIC' as never,
  hologramColor: '#00ffff',
  hologramSpeed: 1.0,
  hologramOpacity: 0.8,
  hologramScanlines: 5.0,
  hologramGlitch: 0.15,
  hologramTint: 0.2,
  hologramUseOriginalColor: false,
  enableVignette: true,
  colorGrade: ColorGradePreset.CINEMATIC,
  saturation: 1.08,
  contrast: 1.05,
  brightness: 1.0,
};

class ConfigServiceImpl implements IConfigService, ILifecycleAware {
  private static instance: ConfigServiceImpl | null = null;
  readonly serviceId = 'config-service';
  readonly dependencies: string[] = [];

  private config: SceneConfig = { ...DEFAULT_CONFIG };

  private constructor() {}

  static getInstance(): ConfigServiceImpl {
    ConfigServiceImpl.instance ??= new ConfigServiceImpl();
    return ConfigServiceImpl.instance;
  }

  static resetInstance(): void {
    ConfigServiceImpl.instance = null;
  }

  async initialize(): Promise<void> {
    logger.info('ConfigService initialized');
  }

  async destroy(): Promise<void> {
    logger.info('ConfigService destroyed');
  }

  getConfig(): SceneConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<SceneConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    getEventBus().emit(ConfigEvents.CHANGED, {
      changes: config,
      oldConfig,
      newConfig: this.config,
    });
  }

  resetConfig(): void {
    const oldConfig = { ...this.config };
    this.config = { ...DEFAULT_CONFIG };

    getEventBus().emit(ConfigEvents.RESET, {
      oldConfig,
      newConfig: this.config,
    });
  }

  applyPreset(presetId: string): void {
    const preset = CONFIG_PRESETS.find((p) => p.id === presetId);
    if (!preset) {
      logger.warn(`Preset not found: ${presetId}`);
      return;
    }

    this.setConfig(preset.config);

    getEventBus().emit(ConfigEvents.PRESET_APPLIED, {
      presetId: preset.id,
      presetName: preset.name,
    });
  }

  getPresets(): ConfigPreset[] {
    return [...CONFIG_PRESETS];
  }

  validateConfig(config: Partial<SceneConfig>): string[] {
    const errors: string[] = [];

    if (config.displacementScale !== undefined) {
      if (config.displacementScale < 0 || config.displacementScale > 10) {
        errors.push('displacementScale must be between 0 and 10');
      }
    }

    if (config.fov !== undefined) {
      if (config.fov < 10 || config.fov > 150) {
        errors.push('fov must be between 10 and 150');
      }
    }

    if (config.exposure !== undefined) {
      if (config.exposure < 0 || config.exposure > 5) {
        errors.push('exposure must be between 0 and 5');
      }
    }

    if (errors.length > 0) {
      getEventBus().emit(ConfigEvents.VALIDATION_FAILED, { errors });
    }

    return errors;
  }

  importConfig(jsonString: string): void {
    try {
      const imported = JSON.parse(jsonString) as Partial<SceneConfig>;
      const errors = this.validateConfig(imported);
      if (errors.length > 0) {
        throw new Error('无效的配置格式');
      }
      this.setConfig(imported);
    } catch (e) {
      logger.error('Failed to import config', { error: String(e) });
      throw e;
    }
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }
}

export const getConfigService = (): IConfigService => ConfigServiceImpl.getInstance();
export const resetConfigService = (): void => { ConfigServiceImpl.resetInstance(); };
export { ConfigServiceImpl as ConfigService };
