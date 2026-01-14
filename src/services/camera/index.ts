export { getCoreController, CoreController } from './CoreController';
export { 
  CoreControllerProvider,
  CoreControllerContext,
  useCoreController,
  useCameraService,
  useMotionService,
  useInputService,
  useAnimationService
} from './CoreControllerProvider';
export { getCameraService, CameraService } from './CameraService';
export { getMotionService, MotionService } from './MotionService';
export { getInputService, InputService } from './InputService';
export { getAnimationScheduler, AnimationScheduler, getEasingFunction } from './AnimationScheduler';
export { getCameraStateAccessor, resetCameraStateAccessor } from './CameraStateBridge';
export type { CameraStateAccessor } from './CameraStateBridge';
export {
  getConfigService,
  ConfigService
} from './ConfigService';
export type { ConfigPreset, IConfigService } from './ConfigService';
export { getEventBus, EventBus, emitEvent, onEvent, resetEventBus } from '@/core/EventBus';
export {
  CAMERA_PRESETS,
  calculatePresetPose,
  calculateDistance,
  scaleVec3,
  getDistanceFromPose
} from './CameraPresets';
export type { CameraPresetType, PresetConfig } from './CameraPresets';