/**
 * Shared Types
 *
 * This file re-exports domain types for backward compatibility
 * and contains Three.js specific types that depend on external libraries.
 */

import type { MirrorMode, CameraMotionType, CameraMode, RenderStyle, ProjectionMode, HologramType, ColorGradePreset } from '@/core/domain/types';
import type { Camera } from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

// ============================================================================
// Re-export Domain Types (for backward compatibility)
// ============================================================================

export {
  // Enums
  SceneType,
  TechPipeline,
  ColorGradePreset,
  CameraMode,
  ProjectionMode,
  RenderStyle,
  HologramType,
  MirrorMode,
  CameraMotionType,
  // Asset types
  type AssetType,
  type BaseAsset,
  type ImageAsset,
  type VideoAsset,
  type Asset,
  // Analysis types
  type AnalysisResult,
  type ProcessedAsset,
  type ProcessingState,
  // Config types
  type RecommendedConfig,
  // Session types
  type SessionStatus,
  SESSION_STATUS_TRANSITIONS,
  // Type guards
  isImageAsset,
  isVideoAsset,
  isValidAsset,
  isValidAnalysisResult,
  isValidProcessedAsset,
  isValidStatusTransition
} from '@/core/domain/types';



// ============================================================================
// Camera View Presets
// ============================================================================

export type CameraViewPreset = 'FRONT' | 'TOP' | 'SIDE' | 'ISO' | 'FOCUS';
export type CameraPreset = CameraViewPreset;
export type ProjectionType = 'perspective' | 'orthographic';

// ============================================================================
// Geometry Types
// ============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export type TrackedPointSource = 'user' | 'tracker';

export interface TrackedPoint2D {
  pixel: { x: number; y: number };
  mediaWidth: number;
  mediaHeight: number;
  flipX?: boolean;
  flipY?: boolean;
  timestamp?: number;
  source?: TrackedPointSource;
}

export interface TrackedPoint3D {
  uv: { u: number; v: number };
  depth01: number;
  world: Vec3;
  timestamp?: number;
  source?: TrackedPointSource;
}

// ============================================================================
// Camera Types
// ============================================================================

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  up: Vec3;
  fov: number;
  near?: number;
  far?: number;
}

export interface CameraBookmark {
  id: string;
  name: string;
  pose: CameraPose;
  createdAt: number;
  thumbnail?: string;
}

// ============================================================================
// Motion Types
// ============================================================================

export type MotionType = 'STATIC' | 'ORBIT' | 'FLY_BY' | 'SPIRAL' | 'ARC' | 'TRACKING' | 'DOLLY_ZOOM';
export type BlendMode = 'override' | 'additive' | 'manual-priority';

export interface MotionParams {
  speed: number;
  scale: number;
  orbitRadius: number;
  orbitTilt: number;
  flyByHeight: number;
  flyBySwing: number;
  spiralLoops: number;
  spiralHeight: number;
  arcAngle: number;
  arcRhythm: number;
  trackingDistance: number;
  trackingOffset: number;
  dollyRange: number;
  dollyIntensity: number;
}

export interface MotionConfig {
  type: MotionType;
  blendMode: BlendMode;
  params: Partial<MotionParams>;
}

export interface MotionResult {
  position: Vec3;
  target: Vec3;
  fov: number;
}

export interface MotionPoint {
  position: Vec3;
  target: Vec3;
  fov: number;
  time: number;
}

export interface MotionState {
  isActive: boolean;
  isPaused: boolean;
  type: MotionType;
  progress: number;
  startTime: number;
}

// ============================================================================
// Animation Types
// ============================================================================

export type EasingType =
  | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  | 'ease-in-cubic' | 'ease-out-cubic' | 'ease-in-out-cubic'
  | 'ease-in-elastic' | 'ease-out-elastic' | 'ease-in-out-elastic'
  | 'ease-in-bounce' | 'ease-out-bounce';

export type EasingFunction = (t: number) => number;

export interface TransitionOptions {
  duration?: number;
  easing?: EasingType;
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
}

export interface AnimationOptions<T = unknown> {
  duration: number;
  easing?: EasingType;
  onUpdate?: (value: T, progress: number) => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

export interface AnimationHandle {
  id: string;
  cancel: (snapToEnd?: boolean) => void;
  pause: () => void;
  resume: () => void;
  isActive: () => boolean;
  getProgress: () => number;
}

export interface AnimationInfo {
  id: string;
  startTime: number;
  duration: number;
  progress: number;
  isPaused: boolean;
}

export interface QueuedAnimation {
  id: string;
  execute: () => AnimationHandle;
  priority?: number;
}

// ============================================================================
// Input/Interaction Types
// ============================================================================

export type InteractionType = 'none' | 'rotate' | 'pan' | 'zoom' | 'touch' | 'pinch';
export type GestureType = 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'pinch' | 'rotate';

export interface GestureEvent {
  type: GestureType;
  position: Point2D;
  delta?: Point2D;
  scale?: number;
  rotation?: number;
  velocity?: Point2D;
  timestamp: number;
}

export interface InteractionState {
  isInteracting: boolean;
  type: InteractionType;
  startPosition: Point2D | null;
  currentPosition: Point2D | null;
  startTime: number;
  lastUpdateTime: number;
}

export interface InputSensitivity {
  rotate: number;
  pan: number;
  zoom: number;
  pinch: number;
}

// ============================================================================
// Scene Config (Full config with all rendering options)
// ============================================================================

export interface SceneConfig {
  displacementScale: number;
  wireframe: boolean;
  meshDensity: number;
  mirrorMode: MirrorMode;
  autoRotate: boolean;
  cameraMotionType: CameraMotionType;
  cameraMotionSpeed: number;
  fov: number;
  orthoZoom: number;
  cameraMode: CameraMode;
  minDistance: number;
  maxDistance: number;
  dampingFactor: number;
  rotateSpeed: number;
  zoomSpeed: number;
  verticalShift: number;
  enablePan: boolean;
  panSpeed: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  isImmersive: boolean;
  cameraMotionBlend: BlendMode;
  motionResumeDelayMs: number;
  motionResumeTransitionMs: number;
  orbitRadius: number;
  orbitTilt: number;
  flyByHeight: number;
  flyBySwing: number;
  spiralLoops: number;
  spiralHeight: number;
  arcAngle: number;
  arcRhythm: number;
  trackingDistance: number;
  trackingOffset: number;
  dollyRange: number;
  dollyIntensity: number;
  showGrid: boolean;
  showAxes: boolean;
  renderStyle: RenderStyle;
  roughness: number;
  metalness: number;
  lightIntensity: number;
  exposure: number;
  projectionMode: ProjectionMode;
  projectionAngle: number;
  depthInvert: boolean;
  backgroundIntensity: number;
  enableNakedEye3D: boolean;
  enableParticles: boolean;
  edgeFade: number;
  parallaxScale: number;
  depthFog: number;
  lightAngleX: number;
  lightAngleY: number;
  vignetteStrength: number;
  particleType: string;
  videoMuted: boolean;
  enableFrameInterpolation: boolean;
  hologramType: HologramType;
  hologramColor: string;
  hologramSpeed: number;
  hologramOpacity: number;
  hologramScanlines: number;
  hologramGlitch: number;
  hologramTint: number;
  hologramUseOriginalColor: boolean;
  enableVignette: boolean;
  colorGrade: ColorGradePreset;
  saturation: number;
  contrast: number;
  brightness: number;
  enableStyleTransition?: boolean;
  styleTransitionDuration?: number;
  paintingBrushSize?: number;
  paintingPosterize?: number;
  sketchStrokeWidth?: number;
  sketchEdgeThreshold?: number;
  pixelSize?: number;
  pixelPaletteSize?: number;
  cyberpunkNeonIntensity?: number;
  cyberpunkChromaticAberration?: number;
  cyberpunkNoiseIntensity?: number;
}

// ============================================================================
// Service Interfaces (Infrastructure Layer contracts)
// ============================================================================

export interface IMotionService {
  start(type: MotionType, config?: Partial<MotionConfig>): void;
  stop(): void;
  pause(): void;
  resume(): void;
  isActive(): boolean;
  isPaused(): boolean;
  getType(): MotionType;
  getProgress(): number;
  getState(): MotionState;
  setBlendMode(mode: BlendMode): void;
  getBlendMode(): BlendMode;
  calculate(time: number, basePose?: CameraPose): MotionResult | null;
  generatePreview(duration: number, samples: number): MotionPoint[];
  setParameter<K extends keyof MotionParams>(key: K, value: MotionParams[K]): void;
  getParameters(): MotionParams;
}

export interface IAnimationService {
  animate<T>(from: T, to: T, options: AnimationOptions<T>): AnimationHandle;
  animateNumber(from: number, to: number, options: AnimationOptions<number>): AnimationHandle;
  animateVec3(from: Vec3, to: Vec3, options: AnimationOptions<Vec3>): AnimationHandle;
  enqueue(animation: QueuedAnimation): void;
  clearQueue(): void;
  isAnimating(): boolean;
  getActiveAnimations(): AnimationInfo[];
  cancel(handle: AnimationHandle, snapToEnd?: boolean): void;
  cancelAll(snapToEnd?: boolean): void;
}

export interface IInputService {
  isInteracting(): boolean;
  getInteractionType(): InteractionType;
  getState(): InteractionState;
  onInteractionStart(callback: (type: InteractionType) => void): () => void;
  onInteractionEnd(callback: () => void): () => void;
  onGesture(callback: (gesture: GestureEvent) => void): () => void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  setSensitivity(sensitivity: Partial<InputSensitivity>): void;
  getSensitivity(): InputSensitivity;
  bindToElement(element: HTMLElement): void;
  unbind(): void;
}

export interface ICameraService {
  getPose(): CameraPose;
  setPose(pose: Partial<CameraPose>, options?: TransitionOptions): void;
  moveTo(position: Vec3, duration?: number): Promise<void>;
  lookAt(target: Vec3, duration?: number): Promise<void>;
  setFov(fov: number, duration?: number): Promise<void>;
  setProjection(mode: ProjectionType): void;
  applyPreset(preset: CameraPreset): Promise<void>;
  saveBookmark(name: string): string;
  loadBookmark(id: string): Promise<void>;
  deleteBookmark(id: string): void;
  getBookmarks(): CameraBookmark[];
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  syncFromThree(camera: Camera, controls: OrbitControlsType): void;
  syncToThree(camera: Camera, controls: OrbitControlsType): void;
}

export interface ICoreController {
  initialize(): Promise<void>;
  dispose(): void;
  camera: ICameraService;
  motion: IMotionService;
  input: IInputService;
  animation: IAnimationService;
  isInitialized: boolean;
  reset(): void;
  pause(): void;
  resume(): void;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Import MirrorMode and CameraMotionType for SceneConfig (already re-exported above)

