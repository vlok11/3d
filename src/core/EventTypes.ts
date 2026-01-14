import type {
  CameraPose,
  CameraPreset,
  CameraBookmark,
  MotionType,
  BlendMode,
  MotionState,
  InteractionType,
  GestureEvent,
  TrackedPoint2D,
  TrackedPoint3D
} from '@/shared/types';

export const CameraEvents = {
  POSITION_CHANGED: 'camera:position:changed',
  POSE_CHANGED: 'camera:pose-changed',
  POSE_ANIMATING: 'camera:pose-animating',
  PRESET_APPLIED: 'camera:preset-applied',
  PROJECTION_CHANGED: 'camera:projection-changed',
  BOOKMARK_SAVED: 'camera:bookmark-saved',
  BOOKMARK_LOADED: 'camera:bookmark-loaded',
  BOOKMARK_DELETED: 'camera:bookmark-deleted',
  HISTORY_CHANGED: 'camera:history-changed',
  VIEW_RESET: 'camera:view:reset',
  MOTION_STARTED: 'camera:motion:started',
  MOTION_STOPPED: 'camera:motion:stopped',
  MOTION_COMPLETED: 'camera:motion:completed',
} as const;

export const ConfigEvents = {
  CHANGED: 'config:changed',
  PRESET_APPLIED: 'config:preset-applied',
  RESET: 'config:reset',
  VALIDATED: 'config:validated',
  VALIDATION_FAILED: 'config:validation:failed',
} as const;

export const MotionEvents = {
  STARTED: 'motion:started',
  STOPPED: 'motion:stopped',
  PAUSED: 'motion:paused',
  RESUMED: 'motion:resumed',
  PROGRESS: 'motion:progress',
  TYPE_CHANGED: 'motion:type-changed',
  BLEND_MODE_CHANGED: 'motion:blend-mode-changed',
  PARAMS_CHANGED: 'motion:params-changed',
} as const;

export const InputEvents = {
  INTERACTION_START: 'input:interaction-start',
  INTERACTION_END: 'input:interaction-end',
  INTERACTION_UPDATE: 'input:interaction-update',
  GESTURE: 'input:gesture',
  ENABLED_CHANGED: 'input:enabled-changed',
  INTENT_CHANGED: 'input:intent-changed',
  INERTIA_START: 'input:inertia-start',
  INERTIA_UPDATE: 'input:inertia-update',
  INERTIA_END: 'input:inertia-end',
} as const;

export const TrackingEvents = {
  POINT_2D: 'tracking:point2d',
  POINT_3D: 'tracking:point3d',
} as const;

export const AnimationEvents = {
  STARTED: 'animation:started',
  PROGRESS: 'animation:progress',
  COMPLETED: 'animation:completed',
  CANCELLED: 'animation:cancelled',
  PAUSED: 'animation:paused',
  RESUMED: 'animation:resumed',
} as const;

export const SystemEvents = {
  INITIALIZED: 'system:initialized',
  DISPOSED: 'system:disposed',
  ERROR: 'system:error',
  WARNING: 'system:warning',
  PAUSED: 'system:paused',
  RESUMED: 'system:resumed',
} as const;

export const RenderEvents = {
  STYLE_CHANGED: 'render:style:changed',
  MATERIAL_UPDATED: 'render:material:updated',
  SHADER_COMPILED: 'render:shader:compiled',
  SHADER_ERROR: 'render:shader:error',
  FRAME_RENDERED: 'render:frame:rendered',
} as const;

export const UploadEvents = {
  STARTED: 'upload:started',
  PROGRESS: 'upload:progress',
  STAGE_CHANGED: 'upload:stage:changed',
  COMPLETED: 'upload:completed',
  ERROR: 'upload:error',
  CANCELLED: 'upload:cancelled',
} as const;

export const MediaEvents = {
  LOADED: 'media:loaded',
  UNLOADED: 'media:unloaded',
  DEPTH_GENERATED: 'media:depth:generated',
  VIDEO_PLAY: 'media:video:play',
  VIDEO_PAUSE: 'media:video:pause',
  VIDEO_SEEK: 'media:video:seek',
  VIDEO_ENDED: 'media:video:ended',
} as const;

export const ExportEvents = {
  SNAPSHOT_STARTED: 'export:snapshot:started',
  SNAPSHOT_COMPLETED: 'export:snapshot:completed',
  MODEL_EXPORT_STARTED: 'export:model:started',
  MODEL_EXPORT_COMPLETED: 'export:model:completed',
  RECORDING_STARTED: 'export:recording:started',
  RECORDING_STOPPED: 'export:recording:stopped',
} as const;

export const PipelineEvents = {
  STARTED: 'pipeline:started',
  STAGE_STARTED: 'pipeline:stage-started',
  STAGE_COMPLETED: 'pipeline:stage-completed',
  COMPLETED: 'pipeline:completed',
  ERROR: 'pipeline:error',
  CANCELLED: 'pipeline:cancelled',
} as const;

export const AIEvents = {
  REQUEST_STARTED: 'ai:request:started',
  REQUEST_COMPLETED: 'ai:request:completed',
  REQUEST_ERROR: 'ai:request:error',
  PROVIDER_CHANGED: 'ai:provider:changed',
  FALLBACK_ACTIVATED: 'ai:fallback:activated',
} as const;

export const PerformanceEvents = {
  FPS_UPDATE: 'performance:fps:update',
  MEMORY_WARNING: 'performance:memory:warning',
  THRESHOLD_EXCEEDED: 'performance:threshold:exceeded',
} as const;

export const LifecycleEvents = {
  SERVICE_INITIALIZED: 'lifecycle:service:initialized',
  SERVICE_DESTROYED: 'lifecycle:service:destroyed',
  APP_READY: 'lifecycle:app:ready',
  APP_PAUSED: 'lifecycle:app:paused',
  APP_RESUMED: 'lifecycle:app:resumed',
} as const;

export const SessionEvents = {
  CONFIG_RECOMMENDED: 'session:config-recommended',
  RESET_REQUESTED: 'session:reset-requested',
} as const;

export const ErrorEvents = {
  ERROR_OCCURRED: 'error:occurred',
  ERROR_RECOVERED: 'error:recovered',
  FATAL_ERROR: 'error:fatal',
} as const;

export type CameraEventType = typeof CameraEvents[keyof typeof CameraEvents];
export type ConfigEventType = typeof ConfigEvents[keyof typeof ConfigEvents];
export type MotionEventType = typeof MotionEvents[keyof typeof MotionEvents];
export type InputEventType = typeof InputEvents[keyof typeof InputEvents];
export type AnimationEventType = typeof AnimationEvents[keyof typeof AnimationEvents];
export type SystemEventType = typeof SystemEvents[keyof typeof SystemEvents];
export type RenderEventType = typeof RenderEvents[keyof typeof RenderEvents];
export type UploadEventType = typeof UploadEvents[keyof typeof UploadEvents];
export type MediaEventType = typeof MediaEvents[keyof typeof MediaEvents];
export type ExportEventType = typeof ExportEvents[keyof typeof ExportEvents];
export type PipelineEventType = typeof PipelineEvents[keyof typeof PipelineEvents];
export type AIEventType = typeof AIEvents[keyof typeof AIEvents];
export type PerformanceEventType = typeof PerformanceEvents[keyof typeof PerformanceEvents];
export type LifecycleEventType = typeof LifecycleEvents[keyof typeof LifecycleEvents];
export type ErrorEventType = typeof ErrorEvents[keyof typeof ErrorEvents];
export type SessionEventType = typeof SessionEvents[keyof typeof SessionEvents];
export type TrackingEventType = typeof TrackingEvents[keyof typeof TrackingEvents];

export type CoreEventType =
  | CameraEventType
  | ConfigEventType
  | MotionEventType
  | InputEventType
  | TrackingEventType
  | AnimationEventType
  | SystemEventType
  | RenderEventType
  | UploadEventType
  | MediaEventType
  | ExportEventType
  | PipelineEventType
  | AIEventType
  | PerformanceEventType
  | LifecycleEventType
  | ErrorEventType
  | SessionEventType;

export interface CameraPoseChangedPayload {
  pose: CameraPose;
  previousPose: CameraPose;
  source: 'user' | 'motion' | 'preset' | 'animation' | 'sync';
}

export interface CameraPoseAnimatingPayload {
  currentPose: CameraPose;
  targetPose: CameraPose;
  progress: number;
}

export interface CameraPresetAppliedPayload {
  preset: CameraPreset;
  pose: CameraPose;
}

export interface CameraProjectionChangedPayload {
  mode: 'perspective' | 'orthographic';
  previousMode: 'perspective' | 'orthographic';
}

export interface CameraBookmarkSavedPayload {
  bookmark: CameraBookmark;
}

export interface CameraBookmarkLoadedPayload {
  bookmark: CameraBookmark;
}

export interface CameraBookmarkDeletedPayload {
  bookmarkId: string;
}

export interface CameraHistoryChangedPayload {
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
}

export interface MotionStartedPayload {
  type: MotionType;
  blendMode: BlendMode;
}

export interface MotionStoppedPayload {
  type: MotionType;
  reason: 'user' | 'completed' | 'error';
}

export interface MotionPausedPayload {
  type: MotionType;
  progress: number;
}

export interface MotionResumedPayload {
  type: MotionType;
  progress: number;
}

export interface MotionProgressPayload {
  type: MotionType;
  progress: number;
  state: MotionState;
}

export interface MotionTypeChangedPayload {
  type: MotionType;
  previousType: MotionType;
}

export interface MotionBlendModeChangedPayload {
  mode: BlendMode;
  previousMode: BlendMode;
}

export interface MotionParamsChangedPayload {
  key: string;
  value: number;
  previousValue: number;
}

export interface InputInteractionStartPayload {
  type: InteractionType;
  position: { x: number; y: number };
  timestamp: number;
}

export interface InputInteractionEndPayload {
  type: InteractionType;
  duration: number;
  intent?: 'viewing' | 'adjusting' | 'exploring';
  velocity?: { x: number; y: number };
}

export interface InputIntentChangedPayload {
  intent: 'viewing' | 'adjusting' | 'exploring';
  confidence: number;
}

export interface InputInertiaStartPayload {
  velocity: { x: number; y: number };
}

export interface InputInertiaUpdatePayload {
  velocity: { x: number; y: number };
}

export interface InputInertiaEndPayload {
  /** Marker field for non-empty interface */
  _?: never;
}

export interface InputInteractionUpdatePayload {
  type: InteractionType;
  position: { x: number; y: number };
  delta: { x: number; y: number };
}

export interface InputGesturePayload {
  gesture: GestureEvent;
}

export interface InputEnabledChangedPayload {
  enabled: boolean;
}

export interface AnimationStartedPayload {
  id: string;
  duration: number;
}

export interface AnimationProgressPayload {
  id: string;
  progress: number;
}

export interface AnimationCompletedPayload {
  id: string;
  duration: number;
}

export interface AnimationCancelledPayload {
  id: string;
  progress: number;
  snappedToEnd: boolean;
}

export interface AnimationPausedPayload {
  id: string;
  progress: number;
}

export interface AnimationResumedPayload {
  id: string;
  progress: number;
}

export interface ConfigChangedPayload {
  changes: Partial<Record<string, unknown>>;
  oldConfig: Partial<Record<string, unknown>>;
  newConfig: Partial<Record<string, unknown>>;
}

export interface ConfigPresetAppliedPayload {
  presetId: string;
  presetName: string;
}

export interface ConfigResetPayload {
  oldConfig: Partial<Record<string, unknown>>;
  newConfig: Partial<Record<string, unknown>>;
}

export interface SystemInitializedPayload {
  timestamp: number;
  version: string;
}

export interface SystemDisposedPayload {
  timestamp: number;
}

export interface SystemErrorPayload {
  error: Error;
  context: string;
  recoverable: boolean;
}

export interface SystemWarningPayload {
  message: string;
  context: string;
}

export interface SystemPausedPayload {
  timestamp: number;
}

export interface SystemResumedPayload {
  timestamp: number;
  pauseDuration: number;
}

export interface CoreEventPayloadMap {
  [CameraEvents.POSITION_CHANGED]: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } };
  [CameraEvents.POSE_CHANGED]: CameraPoseChangedPayload;
  [CameraEvents.POSE_ANIMATING]: CameraPoseAnimatingPayload;
  [CameraEvents.PRESET_APPLIED]: CameraPresetAppliedPayload;
  [CameraEvents.PROJECTION_CHANGED]: CameraProjectionChangedPayload;
  [CameraEvents.BOOKMARK_SAVED]: CameraBookmarkSavedPayload;
  [CameraEvents.BOOKMARK_LOADED]: CameraBookmarkLoadedPayload;
  [CameraEvents.BOOKMARK_DELETED]: CameraBookmarkDeletedPayload;
  [CameraEvents.HISTORY_CHANGED]: CameraHistoryChangedPayload;
  [CameraEvents.VIEW_RESET]: void;
  [CameraEvents.MOTION_STARTED]: { type: string; duration: number };
  [CameraEvents.MOTION_STOPPED]: void;
  [CameraEvents.MOTION_COMPLETED]: { type: string };

  [ConfigEvents.CHANGED]: ConfigChangedPayload;
  [ConfigEvents.PRESET_APPLIED]: ConfigPresetAppliedPayload;
  [ConfigEvents.RESET]: ConfigResetPayload;
  [ConfigEvents.VALIDATED]: { config: Record<string, unknown> };
  [ConfigEvents.VALIDATION_FAILED]: { errors: string[] };

  [MotionEvents.STARTED]: MotionStartedPayload;
  [MotionEvents.STOPPED]: MotionStoppedPayload;
  [MotionEvents.PAUSED]: MotionPausedPayload;
  [MotionEvents.RESUMED]: MotionResumedPayload;
  [MotionEvents.PROGRESS]: MotionProgressPayload;
  [MotionEvents.TYPE_CHANGED]: MotionTypeChangedPayload;
  [MotionEvents.BLEND_MODE_CHANGED]: MotionBlendModeChangedPayload;
  [MotionEvents.PARAMS_CHANGED]: MotionParamsChangedPayload;

  [InputEvents.INTERACTION_START]: InputInteractionStartPayload;
  [InputEvents.INTERACTION_END]: InputInteractionEndPayload;
  [InputEvents.INTERACTION_UPDATE]: InputInteractionUpdatePayload;
  [InputEvents.GESTURE]: InputGesturePayload;
  [InputEvents.ENABLED_CHANGED]: InputEnabledChangedPayload;
  [InputEvents.INTENT_CHANGED]: InputIntentChangedPayload;
  [InputEvents.INERTIA_START]: InputInertiaStartPayload;
  [InputEvents.INERTIA_UPDATE]: InputInertiaUpdatePayload;
  [InputEvents.INERTIA_END]: InputInertiaEndPayload;

  [TrackingEvents.POINT_2D]: TrackedPoint2D;
  [TrackingEvents.POINT_3D]: TrackedPoint3D;

  [AnimationEvents.STARTED]: AnimationStartedPayload;
  [AnimationEvents.PROGRESS]: AnimationProgressPayload;
  [AnimationEvents.COMPLETED]: AnimationCompletedPayload;
  [AnimationEvents.CANCELLED]: AnimationCancelledPayload;
  [AnimationEvents.PAUSED]: AnimationPausedPayload;
  [AnimationEvents.RESUMED]: AnimationResumedPayload;

  [SystemEvents.INITIALIZED]: SystemInitializedPayload;
  [SystemEvents.DISPOSED]: SystemDisposedPayload;
  [SystemEvents.ERROR]: SystemErrorPayload;
  [SystemEvents.WARNING]: SystemWarningPayload;
  [SystemEvents.PAUSED]: SystemPausedPayload;
  [SystemEvents.RESUMED]: SystemResumedPayload;

  [RenderEvents.STYLE_CHANGED]: { style: string };
  [RenderEvents.MATERIAL_UPDATED]: { materialType: string };
  [RenderEvents.SHADER_COMPILED]: { shaderId: string };
  [RenderEvents.SHADER_ERROR]: { shaderId: string; error: string };
  [RenderEvents.FRAME_RENDERED]: { frameTime: number };

  [UploadEvents.STARTED]: { fileName: string; fileType: string; fileSize: number };
  [UploadEvents.PROGRESS]: { progress: number; stage: string };
  [UploadEvents.STAGE_CHANGED]: { stage: string; previousStage?: string };
  [UploadEvents.COMPLETED]: { result: Record<string, unknown> };
  [UploadEvents.ERROR]: { error: string; stage?: string };
  [UploadEvents.CANCELLED]: void;

  [MediaEvents.LOADED]: { type: 'image' | 'video'; url: string };
  [MediaEvents.UNLOADED]: void;
  [MediaEvents.DEPTH_GENERATED]: { method: string };
  [MediaEvents.VIDEO_PLAY]: void;
  [MediaEvents.VIDEO_PAUSE]: void;
  [MediaEvents.VIDEO_SEEK]: { time: number };
  [MediaEvents.VIDEO_ENDED]: void;

  [ExportEvents.SNAPSHOT_STARTED]: void;
  [ExportEvents.SNAPSHOT_COMPLETED]: { fileName: string };
  [ExportEvents.MODEL_EXPORT_STARTED]: void;
  [ExportEvents.MODEL_EXPORT_COMPLETED]: { fileName: string };
  [ExportEvents.RECORDING_STARTED]: { withAudio: boolean };
  [ExportEvents.RECORDING_STOPPED]: { duration: number };

  [PipelineEvents.STARTED]: { inputType: 'file' | 'url' };
  [PipelineEvents.STAGE_STARTED]: { stage: string; progress: number };
  [PipelineEvents.STAGE_COMPLETED]: { stage: string; progress: number };
  [PipelineEvents.COMPLETED]: { result: Record<string, unknown> };
  [PipelineEvents.ERROR]: { stage: string; error: string };
  [PipelineEvents.CANCELLED]: Record<string, never>;

  [AIEvents.REQUEST_STARTED]: { provider: string; operation: string };
  [AIEvents.REQUEST_COMPLETED]: { provider: string; operation: string; duration: number };
  [AIEvents.REQUEST_ERROR]: { provider: string; operation: string; error: string };
  [AIEvents.PROVIDER_CHANGED]: { from: string; to: string };
  [AIEvents.FALLBACK_ACTIVATED]: { reason: string };

  [PerformanceEvents.FPS_UPDATE]: { fps: number; frameTime: number };
  [PerformanceEvents.MEMORY_WARNING]: { used: number; total: number; percentage: number };
  [PerformanceEvents.THRESHOLD_EXCEEDED]: { metric: string; value: number; threshold: number };

  [LifecycleEvents.SERVICE_INITIALIZED]: { serviceId: string };
  [LifecycleEvents.SERVICE_DESTROYED]: { serviceId: string };
  [LifecycleEvents.APP_READY]: { initTime: number };
  [LifecycleEvents.APP_PAUSED]: void;
  [LifecycleEvents.APP_RESUMED]: void;

  [ErrorEvents.ERROR_OCCURRED]: { type: string; message: string; context?: Record<string, unknown> };
  [ErrorEvents.ERROR_RECOVERED]: { type: string };
  [ErrorEvents.FATAL_ERROR]: { type: string; message: string };

  [SessionEvents.CONFIG_RECOMMENDED]: { config: Record<string, unknown> };
  [SessionEvents.RESET_REQUESTED]: void;
}

export type CoreEventHandler<T extends CoreEventType> = (
  payload: CoreEventPayloadMap[T]
) => void;

export interface EventSubscriptionOptions {
  once?: boolean;
  priority?: number;
}

export interface EventRecord {
  type: CoreEventType | string;
  payload: unknown;
  timestamp: number;
  subscriberCount: number;
}

export interface IEventBus {
  emit<T extends CoreEventType>(type: T, payload: CoreEventPayloadMap[T]): void;
  emit(type: string, payload: unknown): void;
  on<T extends CoreEventType>(type: T, handler: CoreEventHandler<T>, options?: EventSubscriptionOptions): () => void;
  on(type: string, handler: (payload: unknown) => void, options?: EventSubscriptionOptions): () => void;
  once<T extends CoreEventType>(type: T, handler: CoreEventHandler<T>): () => void;
  once(type: string, handler: (payload: unknown) => void): () => void;
  off<T extends CoreEventType>(type: T, handler: CoreEventHandler<T>): void;
  off(type: string, handler: (payload: unknown) => void): void;
  offAll(type?: CoreEventType | string): void;
  enableLogging(enabled: boolean): void;
  getEventHistory(limit?: number): EventRecord[];
  clearEventHistory(): void;
  getSubscriberCount(type: CoreEventType | string): number;
}
