/**
 * Shared Hooks
 * Merged from: useCameraController, useDebounce, useKeyboardShortcuts, useMediaQuery, useMotionEngine, useSceneConfig
 */

import { useThree, useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PerspectiveCamera, Vector3, MathUtils } from 'three';

import { getEventBus } from '@/core/EventBus';
import {
  getCameraService,
  getInputService,
  getMotionService,
  calculatePresetPose,
  calculateDistance,
  type CameraPresetType
} from '@/services/camera';
import { clientPointToElementPoint, getClientPointFromPointerEvent } from '@/shared/coordinates';
import { useSceneStore } from '@/shared/store';
import { CameraMotionType } from '@/shared/types';
import { easeOutCubic } from '@/shared/utils';

import type {
  Vec3,
  CameraPose,
  MotionType,
  BlendMode,
  MotionResult as CoreMotionResult,
  SceneConfig
} from '@/shared/types';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

// ============================================================================
// useCameraController
// ============================================================================

export interface CameraControllerOptions {
  controlsRef: React.MutableRefObject<OrbitControlsType | null>;
  enableSync?: boolean;
  syncInterval?: number;
}

export interface CameraControllerReturn {
  moveTo: (position: Vec3, duration?: number) => void;
  lookAt: (target: Vec3, duration?: number) => void;
  setFov: (fov: number, duration?: number) => void;
  reset: () => void;
  applyPreset: (preset: 'FRONT' | 'TOP' | 'SIDE' | 'ISO' | 'FOCUS') => void;
  getCurrentPose: () => CameraPose;
  startInteraction: (type: 'rotate' | 'pan' | 'zoom' | 'touch') => void;
  endInteraction: () => void;
  invalidate: () => void;
}

interface AnimationState {
  isAnimating: boolean;
  startTime: number;
  duration: number;
  startFov: number;
  endFov: number;
}

const fromVector3 = (v: Vector3): Vec3 => ({ x: v.x, y: v.y, z: v.z });

export function useCameraController(options: CameraControllerOptions): CameraControllerReturn {
  const { controlsRef, enableSync = true, syncInterval = 10 } = options;
  const { camera, gl, invalidate } = useThree();

  const cameraService = getCameraService();
  const inputService = getInputService();
  const eventBus = getEventBus();

  const reusableVectors = useMemo(() => ({
    startPosition: new Vector3(),
    endPosition: new Vector3(),
    startTarget: new Vector3(),
    endTarget: new Vector3(),
    tempVec: new Vector3()
  }), []);

  const animationRef = useRef<AnimationState>({
    isAnimating: false,
    startTime: 0,
    duration: 0,
    startFov: 55,
    endFov: 55
  });

  const frameCountRef = useRef(0);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);

  const syncToService = useCallback(() => {
    if (!controlsRef.current) return;
    const fov = camera instanceof PerspectiveCamera ? camera.fov : 55;
    cameraService.setPose({
      position: fromVector3(camera.position),
      target: fromVector3(controlsRef.current.target),
      up: { x: 0, y: 1, z: 0 },
      fov
    });
  }, [camera, controlsRef, cameraService]);

  useFrame(() => {
    const anim = animationRef.current;
    const vecs = reusableVectors;

    if (anim.isAnimating) {
      const elapsed = Date.now() - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      const eased = easeOutCubic(progress);

      camera.position.lerpVectors(vecs.startPosition, vecs.endPosition, eased);

      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(vecs.startTarget, vecs.endTarget, eased);
        controlsRef.current.update();
      }

      if (camera instanceof PerspectiveCamera) {
        camera.fov = MathUtils.lerp(anim.startFov, anim.endFov, eased);
        camera.updateProjectionMatrix();
      }

      if (progress >= 1) {
        anim.isAnimating = false;
        syncToService();
      }
    }

    if (enableSync && !anim.isAnimating) {
      frameCountRef.current++;
      if (frameCountRef.current >= syncInterval) {
        frameCountRef.current = 0;
        syncToService();
      }
    }
  });

  const moveTo = useCallback((position: Vec3, duration = 500) => {
    const anim = animationRef.current;
    const vecs = reusableVectors;

    if (duration <= 0) {
      camera.position.set(position.x, position.y, position.z);
      syncToService();
      invalidate();
      return;
    }

    vecs.startPosition.copy(camera.position);
    vecs.endPosition.set(position.x, position.y, position.z);
    vecs.startTarget.copy(controlsRef.current?.target ?? vecs.tempVec.set(0, 0, 0));
    vecs.endTarget.copy(vecs.startTarget);

    anim.isAnimating = true;
    anim.startFov = camera instanceof PerspectiveCamera ? camera.fov : 55;
    anim.endFov = anim.startFov;
    anim.startTime = Date.now();
    anim.duration = duration;

    invalidate();
  }, [camera, controlsRef, syncToService, invalidate, reusableVectors]);

  const lookAt = useCallback((target: Vec3, duration = 500) => {
    const anim = animationRef.current;
    const vecs = reusableVectors;

    if (duration <= 0) {
      if (controlsRef.current) {
        controlsRef.current.target.set(target.x, target.y, target.z);
        controlsRef.current.update();
      }
      syncToService();
      invalidate();
      return;
    }

    vecs.startPosition.copy(camera.position);
    vecs.endPosition.copy(camera.position);
    vecs.startTarget.copy(controlsRef.current?.target ?? vecs.tempVec.set(0, 0, 0));
    vecs.endTarget.set(target.x, target.y, target.z);

    anim.isAnimating = true;
    anim.startFov = camera instanceof PerspectiveCamera ? camera.fov : 55;
    anim.endFov = anim.startFov;
    anim.startTime = Date.now();
    anim.duration = duration;

    invalidate();
  }, [camera, controlsRef, syncToService, invalidate, reusableVectors]);

  const setFov = useCallback((fov: number, duration = 300) => {
    if (!(camera instanceof PerspectiveCamera)) return;

    const anim = animationRef.current;
    const vecs = reusableVectors;

    if (duration <= 0) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
      void cameraService.setFov(fov);
      invalidate();
      return;
    }

    vecs.startPosition.copy(camera.position);
    vecs.endPosition.copy(camera.position);
    vecs.startTarget.copy(controlsRef.current?.target ?? vecs.tempVec.set(0, 0, 0));
    vecs.endTarget.copy(vecs.startTarget);

    anim.isAnimating = true;
    anim.startFov = camera.fov;
    anim.endFov = fov;
    anim.startTime = Date.now();
    anim.duration = duration;

    invalidate();
  }, [camera, controlsRef, cameraService, invalidate, reusableVectors]);

  const reset = useCallback(() => {
    void moveTo({ x: 0, y: 0, z: 9 }, 500);
    void lookAt({ x: 0, y: 0, z: 0 }, 500);
    void setFov(55, 300);
    void cameraService.applyPreset('FRONT');
  }, [moveTo, lookAt, setFov, cameraService]);

  const applyPreset = useCallback((preset: 'FRONT' | 'TOP' | 'SIDE' | 'ISO' | 'FOCUS') => {
    const currentPose: CameraPose = {
      position: fromVector3(camera.position),
      target: fromVector3(controlsRef.current?.target ?? reusableVectors.tempVec.set(0, 0, 0)),
      up: { x: 0, y: 1, z: 0 },
      fov: camera instanceof PerspectiveCamera ? camera.fov : 55
    };

    const currentDist = calculateDistance(currentPose.position, currentPose.target);
    const presetPose = calculatePresetPose(preset as CameraPresetType, currentDist);

    void moveTo(presetPose.position, 600);
    void lookAt(presetPose.target, 600);
    void cameraService.applyPreset(preset);
  }, [camera, controlsRef, moveTo, lookAt, cameraService, reusableVectors]);

  const getCurrentPose = useCallback((): CameraPose => ({
    position: fromVector3(camera.position),
    target: fromVector3(controlsRef.current?.target ?? reusableVectors.tempVec.set(0, 0, 0)),
    up: { x: 0, y: 1, z: 0 },
    fov: camera instanceof PerspectiveCamera ? camera.fov : 55
  }), [camera, controlsRef, reusableVectors]);

  const startInteraction = useCallback((type: 'rotate' | 'pan' | 'zoom' | 'touch') => {
    inputService.setEnabled(true);
    eventBus.emit('input:interaction-start', {
      type,
      position: lastPointerPosRef.current ?? { x: 0, y: 0 },
      timestamp: Date.now()
    });
  }, [inputService, eventBus]);

  const endInteraction = useCallback(() => {
    eventBus.emit('input:interaction-end', { type: 'rotate', duration: 0 });
    syncToService();
  }, [eventBus, syncToService]);

  const interactionHandlersRef = useRef({ startInteraction, endInteraction });
  interactionHandlersRef.current = { startInteraction, endInteraction };

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleChange = () => { invalidate(); };
    controls.addEventListener('change', handleChange);

    return () => { controls.removeEventListener('change', handleChange); };
  }, [controlsRef, invalidate]);

  useEffect(() => {
    const canvas = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      const client = { x: e.clientX, y: e.clientY };
      lastPointerPosRef.current = clientPointToElementPoint(client, canvas);
      interactionHandlersRef.current.startInteraction('rotate');
    };
    const handleMouseUp = () => { interactionHandlersRef.current.endInteraction(); };
    const handleWheel = (e: WheelEvent) => {
      const client = { x: e.clientX, y: e.clientY };
      lastPointerPosRef.current = clientPointToElementPoint(client, canvas);
      interactionHandlersRef.current.startInteraction('zoom');
      setTimeout(() => { interactionHandlersRef.current.endInteraction(); }, 100);
    };
    const handleTouchStart = (e: TouchEvent) => {
      const client = getClientPointFromPointerEvent(e);
      if (client) {
        lastPointerPosRef.current = clientPointToElementPoint(client, canvas);
      }
      interactionHandlersRef.current.startInteraction('touch');
    };
    const handleTouchEnd = () => { interactionHandlersRef.current.endInteraction(); };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gl]);

  useEffect(() => {
    const unsubscribe = eventBus.on('camera:pose-changed', (payload) => {
      if (payload.source !== 'user' && payload.source !== 'sync') {
        const pose = payload.pose;
        camera.position.set(pose.position.x, pose.position.y, pose.position.z);

        if (controlsRef.current) {
          controlsRef.current.target.set(pose.target.x, pose.target.y, pose.target.z);
          controlsRef.current.update();
        }

        if (camera instanceof PerspectiveCamera && pose.fov) {
          camera.fov = pose.fov;
          camera.updateProjectionMatrix();
        }

        invalidate();
      }
    });

    return unsubscribe;
  }, [camera, controlsRef, eventBus, invalidate]);

  return { moveTo, lookAt, setFov, reset, applyPreset, getCurrentPose, startInteraction, endInteraction, invalidate };
}

// ============================================================================
// useDebounce
// ============================================================================

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(timer); };
  }, [value, delay]);

  return debouncedValue;
};

export const useDebouncedCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => { callbackRef.current = callback; }, [callback]);
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => { callbackRef.current(...args); }, delay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delay, ...deps]
  );
};

export const useThrottledCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  const lastRan = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => { callbackRef.current = callback; }, [callback]);
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRan.current >= limit) {
        callbackRef.current(...args);
        lastRan.current = now;
      } else {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          callbackRef.current(...args);
          lastRan.current = Date.now();
        }, limit - (now - lastRan.current));
      }
    },
    [limit]
  );
};

// ============================================================================
// useKeyboardShortcuts
// ============================================================================

export interface KeyboardShortcutConfig {
  enabled?: boolean;
  onTogglePlay?: () => void;
  onResetView?: () => void;
  onToggleWireframe?: () => void;
  onToggleFullscreen?: () => void;
  onExport?: () => void;
  onSnapshot?: () => void;
}

export function useKeyboardShortcuts(config: KeyboardShortcutConfig = {}) {
  const {
    enabled = true,
    onTogglePlay,
    onResetView,
    onToggleWireframe,
    onToggleFullscreen,
    onExport,
    onSnapshot
  } = config;

  const setConfig = useSceneStore((s) => s.setConfig);
  const sceneConfig = useSceneStore((s) => s.config);

  const sceneConfigRef = useRef(sceneConfig);
  sceneConfigRef.current = sceneConfig;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    const currentConfig = sceneConfigRef.current;

    switch (key) {
      case ' ':
        e.preventDefault();
        onTogglePlay?.();
        break;
      case 'r':
        if (!ctrl) {
          e.preventDefault();
          onResetView?.();
          setConfig({ cameraMotionType: CameraMotionType.STATIC });
          getEventBus().emit('keyboard:reset-view', {});
        }
        break;
      case 'w':
        if (!ctrl) {
          e.preventDefault();
          onToggleWireframe?.();
          setConfig({ wireframe: !currentConfig.wireframe });
        }
        break;
      case 'f':
        if (!ctrl) {
          e.preventDefault();
          onToggleFullscreen?.();
        }
        break;
      case 's':
        if (ctrl) {
          e.preventDefault();
          onSnapshot?.();
        }
        break;
      case 'e':
        if (ctrl) {
          e.preventDefault();
          onExport?.();
        }
        break;
      case 'g':
        if (!ctrl) {
          e.preventDefault();
          setConfig({ showGrid: !currentConfig.showGrid });
        }
        break;
      case 'escape':
        setConfig({ cameraMotionType: CameraMotionType.STATIC });
        getEventBus().emit('keyboard:escape', {});
        break;
      case '1': case '2': case '3': case '4': case '5': case '6':
        if (!ctrl) {
          const motionTypes: CameraMotionType[] = [
            CameraMotionType.STATIC, CameraMotionType.ORBIT, CameraMotionType.FLY_BY,
            CameraMotionType.SPIRAL, CameraMotionType.ARC, CameraMotionType.DOLLY_ZOOM
          ];
          const index = parseInt(key) - 1;
          if (index >= 0 && index < motionTypes.length) {
            setConfig({ cameraMotionType: motionTypes[index] });
          }
        }
        break;
    }
  }, [onTogglePlay, onResetView, onToggleWireframe, onToggleFullscreen, onExport, onSnapshot, setConfig]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); };
  }, [enabled, handleKeyDown]);
}

// ============================================================================
// useMediaQuery
// ============================================================================

export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  dark: '(prefers-color-scheme: dark)',
  light: '(prefers-color-scheme: light)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  highContrast: '(prefers-contrast: high)',
} as const;

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return window.matchMedia(query).matches;
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => { setMatches(event.matches); };
    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => { mediaQuery.removeEventListener('change', handleChange); };
  }, [query]);

  return matches;
};

export const useResponsive = () => {
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);
  const isDesktop = useMediaQuery(breakpoints.desktop);
  const isPortrait = useMediaQuery(breakpoints.portrait);
  const prefersReducedMotion = useMediaQuery(breakpoints.reducedMotion);
  const prefersDark = useMediaQuery(breakpoints.dark);

  return {
    isMobile, isTablet, isDesktop, isPortrait,
    isLandscape: !isPortrait, prefersReducedMotion, prefersDark,
    isTouchDevice: isMobile || isTablet
  };
};

export const useWindowSize = () => {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const handleResize = useCallback(() => {
    setSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); };
  }, [handleResize]);

  return size;
};

// ============================================================================
// useMotionEngine
// ============================================================================

export interface MotionPoint {
  position: Vec3;
  target: Vec3;
  fov: number;
  time: number;
}

export type MotionResult = CoreMotionResult;

export interface MotionEngineState {
  isActive: boolean;
  isPaused: boolean;
  motionType: MotionType;
  progress: number;
  blendMode: BlendMode;
}

export interface MotionEngineReturn extends MotionEngineState {
  start: (type: MotionType) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setBlendMode: (mode: BlendMode) => void;
  calculate: (time: number, basePose: CameraPose) => MotionResult | null;
  generatePreview: (duration?: number, samples?: number) => MotionPoint[];
}

export function useMotionEngine(): MotionEngineReturn {
  const motionService = getMotionService();
  const eventBus = getEventBus();

  const [state, setState] = useState<MotionEngineState>({
    isActive: motionService.isActive(),
    isPaused: motionService.isPaused(),
    motionType: motionService.getType(),
    progress: motionService.getProgress(),
    blendMode: motionService.getBlendMode()
  });

  const lastResultRef = useRef<MotionResult | null>(null);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(
      eventBus.on('motion:started', (payload) => {
        setState(prev => ({ ...prev, isActive: true, isPaused: false, motionType: payload.type, blendMode: payload.blendMode }));
      })
    );
    unsubscribers.push(
      eventBus.on('motion:stopped', () => {
        setState(prev => ({ ...prev, isActive: false, isPaused: false, progress: 0 }));
        lastResultRef.current = null;
      })
    );
    unsubscribers.push(
      eventBus.on('motion:paused', (payload) => {
        setState(prev => ({ ...prev, isPaused: true, progress: payload.progress }));
      })
    );
    unsubscribers.push(
      eventBus.on('motion:resumed', () => {
        setState(prev => ({ ...prev, isPaused: false }));
      })
    );
    unsubscribers.push(
      eventBus.on('motion:progress', (payload) => {
        setState(prev => ({ ...prev, progress: payload.progress }));
      })
    );
    unsubscribers.push(
      eventBus.on('motion:blend-mode-changed', (payload) => {
        setState(prev => ({ ...prev, blendMode: payload.mode }));
      })
    );

    return () => { unsubscribers.forEach(unsub => { unsub(); }); };
  }, [eventBus]);

  const start = useCallback((type: MotionType) => { motionService.start(type); }, [motionService]);
  const stop = useCallback(() => { motionService.stop(); lastResultRef.current = null; }, [motionService]);
  const pause = useCallback(() => { motionService.pause(); }, [motionService]);
  const resume = useCallback(() => { motionService.resume(); }, [motionService]);
  const setBlendMode = useCallback((mode: BlendMode) => { motionService.setBlendMode(mode); }, [motionService]);

  const calculate = useCallback((time: number, basePose: CameraPose): MotionResult | null => {
    if (!state.isActive || state.isPaused) return lastResultRef.current;
    const result = motionService.calculate(time, basePose);
    if (result) lastResultRef.current = result;
    return result;
  }, [state.isActive, state.isPaused, motionService]);

  const generatePreview = useCallback((duration = 10, samples = 100): MotionPoint[] => {
    const points: MotionPoint[] = [];
    const basePose: CameraPose = {
      position: { x: 0, y: 0, z: 9 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 1, z: 0 },
      fov: 55
    };

    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * duration;
      const result = motionService.calculate(t, basePose);
      if (result) {
        points.push({ position: result.position, target: result.target, fov: result.fov, time: t });
      }
    }

    return points;
  }, [motionService]);

  return { ...state, start, stop, pause, resume, setBlendMode, calculate, generatePreview };
}

// ============================================================================
// useSceneConfig
// ============================================================================

export function useSceneConfig() {
  const config = useSceneStore((state) => state.config);
  const setConfig = useSceneStore((state) => state.setConfig);
  const resetConfig = useSceneStore((state) => state.resetConfig);
  const resetViewConfig = useSceneStore((state) => state.resetViewConfig);

  const updateConfig = useCallback(<K extends keyof SceneConfig>(key: K, value: SceneConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, [setConfig]);

  return { config, setConfig, updateConfig, resetConfig, resetViewConfig };
}

// ============================================================================
// Re-exports from core
// ============================================================================

export {
  useCoreController,
  useCameraService,
  useMotionService,
  useInputService,
  useAnimationService
} from '@/services/camera';
