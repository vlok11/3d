/**
 * Shared Store
 * Merged from: useCameraStore, useSceneStore, slices/*
 */

import { Vector3 } from 'three';
import { create } from 'zustand';
import { subscribeWithSelector, devtools } from 'zustand/middleware';

import { getEventBus } from '@/core/EventBus';
import { CameraEvents, ConfigEvents } from '@/core/EventTypes';
import { calculatePresetPose, calculateDistance, type CameraPresetType } from '@/services/camera/CameraPresets';
import {
  CameraMode,
  ProjectionMode,
  ColorGradePreset,
  HologramType,
  MirrorMode,
  CameraMotionType,
  RenderStyle
} from '@/shared/types';

import type { Vec3, SceneConfig, CameraPreset } from '@/shared/types';
import type { StateCreator } from 'zustand';

// ============================================================================
// Camera Slice
// ============================================================================

const MAX_HISTORY = 50;
const generateId = (): string => `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

const isVec3Equal = (a: Vec3, b: Vec3): boolean => a.x === b.x && a.y === b.y && a.z === b.z;
const isCameraPoseEqual = (a: CameraPose, b: CameraPose): boolean => (
  isVec3Equal(a.position, b.position) &&
  isVec3Equal(a.target, b.target) &&
  isVec3Equal(a.up, b.up) &&
  a.fov === b.fov
);

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  up: Vec3;
  fov: number;
}

const DEFAULT_POSE: CameraPose = {
  position: { x: 0, y: 0, z: 9 },
  target: { x: 0, y: 0, z: 0 },
  up: { x: 0, y: 1, z: 0 },
  fov: 55
};

export interface CameraHistoryEntry {
  pose: CameraPose;
  timestamp: number;
  source: 'user' | 'motion' | 'preset' | 'reset';
}

export interface CameraBookmark {
  id: string;
  name: string;
  pose: CameraPose;
  createdAt: number;
}

export interface CameraSlice {
  pose: CameraPose;
  bookmarks: CameraBookmark[];
  history: CameraHistoryEntry[];
  setPose: (pose: Partial<CameraPose>, source?: CameraHistoryEntry['source']) => void;
  setPosition: (position: Vec3) => void;
  setTarget: (target: Vec3) => void;
  setFov: (fov: number) => void;
  addBookmark: (name: string) => void;
  removeBookmark: (id: string) => void;
  applyBookmark: (id: string) => void;
  applyPreset: (preset: CameraPresetType) => void;
  undo: () => void;
  resetCamera: () => void;
}

export const createCameraSlice: StateCreator<CameraSlice, [], [], CameraSlice> = (set, get) => ({
  pose: { ...DEFAULT_POSE },
  bookmarks: [],
  history: [],
  setPose: (newPose, source = 'user') => {
    const currentPose = get().pose;
    const updatedPose = { ...currentPose, ...newPose };

    if (isCameraPoseEqual(currentPose, updatedPose)) return;

    set((state) => ({
      pose: updatedPose,
      history: [{ pose: updatedPose, timestamp: Date.now(), source }, ...state.history.slice(0, MAX_HISTORY - 1)]
    }));
    
    // Emit pose changed event
    getEventBus().emit(CameraEvents.POSE_CHANGED, {
      pose: updatedPose,
      previousPose: currentPose,
      source
    });
  },
  setPosition: (position) => { get().setPose({ position }, 'user'); },
  setTarget: (target) => { get().setPose({ target }, 'user'); },
  setFov: (fov) => { get().setPose({ fov: Math.max(10, Math.min(120, fov)) }, 'user'); },
  addBookmark: (name) => {
    const { pose, bookmarks } = get();
    const newBookmark: CameraBookmark = { id: generateId(), name, pose: { ...pose }, createdAt: Date.now() };
    set({ bookmarks: [...bookmarks, newBookmark] });
    getEventBus().emit(CameraEvents.BOOKMARK_SAVED, { bookmark: newBookmark });
  },
  removeBookmark: (id) => { 
    set((state) => ({ bookmarks: state.bookmarks.filter((b) => b.id !== id) }));
    getEventBus().emit(CameraEvents.BOOKMARK_DELETED, { bookmarkId: id });
  },
  applyBookmark: (id) => {
    const bookmark = get().bookmarks.find((b) => b.id === id);
    if (bookmark) {
      get().setPose(bookmark.pose, 'preset');
      getEventBus().emit(CameraEvents.BOOKMARK_LOADED, { bookmark });
    }
  },
  applyPreset: (preset) => {
    const currentPose = get().pose;
    const currentDist = calculateDistance(currentPose.position, currentPose.target);
    const presetPose = calculatePresetPose(preset, currentDist);
    get().setPose({ position: presetPose.position, target: presetPose.target }, 'preset');
    getEventBus().emit(CameraEvents.PRESET_APPLIED, { 
      preset: preset as unknown as CameraPreset, 
      pose: get().pose 
    });
  },
  undo: () => {
    const { history } = get();
    if (history.length < 2) return;
    const [, previous, ...rest] = history;
    if (previous) {
      set({ pose: previous.pose, history: [previous, ...rest] });
      getEventBus().emit(CameraEvents.HISTORY_CHANGED, {
        canUndo: rest.length > 0,
        canRedo: false,
        historyLength: rest.length + 1
      });
    }
  },
  resetCamera: () => { 
    set({ pose: { ...DEFAULT_POSE }, history: [] });
    getEventBus().emit(CameraEvents.VIEW_RESET, undefined as unknown as void);
  }
});

// ============================================================================
// Interaction Slice
// ============================================================================

export type InteractionType = 'none' | 'rotate' | 'pan' | 'zoom' | 'touch';

export interface InteractionState {
  isInteracting: boolean;
  interactionType: InteractionType;
  startPosition: Vec3 | null;
  startTarget: Vec3 | null;
  lastInteractionTime: number;
}

const DEFAULT_INTERACTION: InteractionState = {
  isInteracting: false,
  interactionType: 'none',
  startPosition: null,
  startTarget: null,
  lastInteractionTime: 0
};

export interface InteractionSlice {
  interaction: InteractionState;
  basePose: CameraPose | null;
  startInteraction: (type: InteractionType) => void;
  endInteraction: () => void;
  captureBasePose: () => void;
  clearBasePose: () => void;
}

export const createInteractionSlice: StateCreator<InteractionSlice & CameraSlice, [], [], InteractionSlice> = (set, get) => ({
  interaction: { ...DEFAULT_INTERACTION },
  basePose: null,
  startInteraction: (type) => {
    const { pose } = get();
    set({
      interaction: {
        isInteracting: true,
        interactionType: type,
        startPosition: { ...pose.position },
        startTarget: { ...pose.target },
        lastInteractionTime: Date.now()
      }
    });
  },
  endInteraction: () => { set({ interaction: { ...DEFAULT_INTERACTION, lastInteractionTime: Date.now() } }); },
  captureBasePose: () => { const { pose } = get(); set({ basePose: { ...pose } }); },
  clearBasePose: () => { set({ basePose: null }); }
});

// ============================================================================
// Motion Slice
// ============================================================================

export interface MotionState {
  isActive: boolean;
  type: string;
  progress: number;
  startTime: number;
  duration: number;
  isPaused: boolean;
  pausedAt: number;
}

const DEFAULT_MOTION: MotionState = {
  isActive: false,
  type: 'STATIC',
  progress: 0,
  startTime: 0,
  duration: 0,
  isPaused: false,
  pausedAt: 0
};

export interface MotionSlice {
  motion: MotionState;
  startMotion: (type: string, duration?: number) => void;
  stopMotion: () => void;
  pauseMotion: () => void;
  resumeMotion: () => void;
  updateMotionProgress: (progress: number) => void;
}

export const createMotionSlice: StateCreator<MotionSlice, [], [], MotionSlice> = (set, get) => ({
  motion: { ...DEFAULT_MOTION },
  startMotion: (type, duration = 0) => {
    set({ motion: { isActive: true, type, progress: 0, startTime: Date.now(), duration, isPaused: false, pausedAt: 0 } });
  },
  stopMotion: () => { set({ motion: { ...DEFAULT_MOTION } }); },
  pauseMotion: () => {
    const { motion } = get();
    if (!motion.isActive) return;
    set({ motion: { ...motion, isPaused: true, pausedAt: motion.progress } });
  },
  resumeMotion: () => {
    const { motion } = get();
    if (!motion.isPaused) return;
    set({ motion: { ...motion, isPaused: false, startTime: Date.now() - (motion.pausedAt * motion.duration) } });
  },
  updateMotionProgress: (progress) => {
    set((state) => ({ motion: { ...state.motion, progress: Math.max(0, Math.min(1, progress)) } }));
  }
});

// ============================================================================
// Camera Store
// ============================================================================

type CameraStore = CameraSlice & InteractionSlice & MotionSlice & { reset: () => void };

export const toVector3 = (v: Vec3): Vector3 => new Vector3(v.x, v.y, v.z);
export const fromVector3 = (v: Vector3): Vec3 => ({ x: v.x, y: v.y, z: v.z });
export const distance = (a: Vec3, b: Vec3): number => {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const useCameraStore = create<CameraStore>()(
  devtools(
    subscribeWithSelector((...a) => ({
      ...createCameraSlice(...a),
      ...createInteractionSlice(...a),
      ...createMotionSlice(...a),
      reset: () => {
        const [set] = a;
        set({
          pose: { ...DEFAULT_POSE },
          motion: { ...DEFAULT_MOTION },
          interaction: { ...DEFAULT_INTERACTION },
          basePose: null,
          history: []
        });
      }
    })),
    { name: 'CameraStore', enabled: import.meta.env.DEV }
  )
);

export const useCameraPosition = () => useCameraStore((s) => s.pose.position);
export const useCameraTarget = () => useCameraStore((s) => s.pose.target);
export const useCameraFov = () => useCameraStore((s) => s.pose.fov);
export const useMotionState = () => useCameraStore((s) => s.motion);
export const useInteractionState = () => useCameraStore((s) => s.interaction);
export const useIsMotionActive = () => useCameraStore((s) => s.motion.isActive && !s.motion.isPaused);
export const useIsInteracting = () => useCameraStore((s) => s.interaction.isInteracting);
export const useCameraBookmarks = () => useCameraStore((s) => s.bookmarks);

// ============================================================================
// Scene Store
// ============================================================================

interface SceneStore {
  config: SceneConfig;
  setConfig: (updater: Partial<SceneConfig> | ((prev: SceneConfig) => Partial<SceneConfig>)) => void;
  resetConfig: () => void;
  resetViewConfig: () => void;
}

const hasSceneConfigChanges = (oldConfig: SceneConfig, changes: Partial<SceneConfig>): boolean => {
  for (const key of Object.keys(changes) as (keyof SceneConfig)[]) {
    if (!Object.is(oldConfig[key], changes[key])) return true;
  }
  return false;
};

const DEFAULT_CONFIG: SceneConfig = {
  displacementScale: 1.2,
  wireframe: false,
  meshDensity: 192,
  mirrorMode: MirrorMode.NONE,
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
  cameraMode: CameraMode.PERSPECTIVE,
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
  hologramType: HologramType.CLASSIC,
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
  brightness: 1.0
};

export const useSceneStore = create<SceneStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      config: DEFAULT_CONFIG,
      setConfig: (updater) => {
        const oldConfig = get().config;
        const changes = typeof updater === 'function' ? updater(oldConfig) : updater;
        if (!hasSceneConfigChanges(oldConfig, changes)) return;

        const nextChanges: Partial<SceneConfig> = { ...changes };
        if (nextChanges.projectionMode !== undefined) {
          const immersiveModes = [
            ProjectionMode.INFINITE_BOX,
            ProjectionMode.CORNER,
            ProjectionMode.CUBE,
            ProjectionMode.PANORAMA,
            ProjectionMode.SPHERE,
            ProjectionMode.DOME,
            ProjectionMode.CYLINDER
          ];
          const shouldImmersive = immersiveModes.includes(nextChanges.projectionMode);
          nextChanges.isImmersive = shouldImmersive;
          if (shouldImmersive) {
            nextChanges.cameraMode = CameraMode.PERSPECTIVE;
          }
        }

        const newConfig = { ...oldConfig, ...nextChanges };
        set({ config: newConfig });
        
        // Emit config changed event
        getEventBus().emit(ConfigEvents.CHANGED, {
          changes: nextChanges as Partial<Record<string, unknown>>,
          oldConfig: oldConfig as unknown as Partial<Record<string, unknown>>,
          newConfig: newConfig as unknown as Partial<Record<string, unknown>>
        });
      },
      resetConfig: () => { 
        const oldConfig = get().config;
        set({ config: DEFAULT_CONFIG });
        getEventBus().emit(ConfigEvents.RESET, {
          oldConfig: oldConfig as unknown as Partial<Record<string, unknown>>,
          newConfig: DEFAULT_CONFIG as unknown as Partial<Record<string, unknown>>
        });
      },
      resetViewConfig: () => {
        const oldConfig = get().config;
        const viewChanges = { cameraMotionType: CameraMotionType.STATIC, isImmersive: false, fov: 55 };
        if (!hasSceneConfigChanges(oldConfig, viewChanges)) return;
        set((state) => ({
          config: { ...state.config, ...viewChanges }
        }));
        getEventBus().emit(ConfigEvents.CHANGED, {
          changes: viewChanges as Partial<Record<string, unknown>>,
          oldConfig: oldConfig as unknown as Partial<Record<string, unknown>>,
          newConfig: { ...oldConfig, ...viewChanges } as unknown as Partial<Record<string, unknown>>
        });
      }
    })),
    { name: 'SceneStore', enabled: import.meta.env.DEV }
  )
);

export const useDisplacementScale = () => useSceneStore((s) => s.config.displacementScale);
export const useCameraMotionType = () => useSceneStore((s) => s.config.cameraMotionType);
export const useRenderStyle = () => useSceneStore((s) => s.config.renderStyle);
export const useProjectionMode = () => useSceneStore((s) => s.config.projectionMode);
export const useIsImmersive = () => useSceneStore((s) => s.config.isImmersive);
