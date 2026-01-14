import { useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { PerspectiveCamera, Vector3, MathUtils } from 'three';

import { InputEvents } from '@/core/EventTypes';
import { 
  getMotionService, 
  getEventBus, 
  getInputService 
} from '@/services/camera';
import { 
  CameraMotionType, 
  ProjectionMode
} from '@/shared/types';

import type { InputIntentChangedPayload, InputInertiaUpdatePayload } from '@/core/EventTypes';
import type { 
  SceneConfig, 
  MotionType,
  BlendMode,
  CameraPose,
  Vec3,
  Point2D
} from '@/shared/types';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

type InteractionIntent = 'viewing' | 'adjusting' | 'exploring';

const fromVector3 = (v: Vector3): Vec3 => ({ x: v.x, y: v.y, z: v.z });

const toMotionType = (type: CameraMotionType): MotionType => {
  const mapping: Record<CameraMotionType, MotionType> = {
    [CameraMotionType.STATIC]: 'STATIC',
    [CameraMotionType.ORBIT]: 'ORBIT',
    [CameraMotionType.FLY_BY]: 'FLY_BY',
    [CameraMotionType.SPIRAL]: 'SPIRAL',
    [CameraMotionType.ARC]: 'ARC',
    [CameraMotionType.TRACKING]: 'TRACKING',
    [CameraMotionType.DOLLY_ZOOM]: 'DOLLY_ZOOM'
  };
  return mapping[type] || 'STATIC';
};

// Bezier easing for smooth transitions
const easeInOutQuart = (t: number): number => 
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

export const useUserInteraction = () => {
  const [isInteracting, setIsInteracting] = useState(false);
  const [intent, setIntent] = useState<InteractionIntent>('viewing');
  const [isInertiaActive, setIsInertiaActive] = useState(false);
  const { gl } = useThree();
  const inputService = getInputService();
  const eventBus = getEventBus();

  useEffect(() => {
    const canvas = gl.domElement;
    inputService.bindToElement(canvas);
    return () => {
      inputService.unbind();
    };
  }, [gl, inputService]);

  useEffect(() => {
    const offStart = eventBus.on(InputEvents.INTERACTION_START, () => {
      setIsInteracting(true);
      setIsInertiaActive(false);
    });
    const offEnd = eventBus.on(InputEvents.INTERACTION_END, () => {
      setIsInteracting(false);
    });
    const offIntent = eventBus.on(InputEvents.INTENT_CHANGED, (data: InputIntentChangedPayload) => {
      setIntent(data.intent);
    });
    const offInertiaStart = eventBus.on(InputEvents.INERTIA_START, () => {
      setIsInertiaActive(true);
    });
    const offInertiaEnd = eventBus.on(InputEvents.INERTIA_END, () => {
      setIsInertiaActive(false);
    });
    return () => {
      offStart();
      offEnd();
      offIntent();
      offInertiaStart();
      offInertiaEnd();
    };
  }, [eventBus]);
  
  return { isInteracting, intent, isInertiaActive };
};

interface CameraMotionLogicProps {
  config: SceneConfig;
  controlsRef: React.MutableRefObject<OrbitControlsType | null>;
}

export const CameraMotionLogic = memo(({ 
  config, 
  controlsRef 
}: CameraMotionLogicProps) => {
  const { camera } = useThree();
  const { isInteracting, intent, isInertiaActive } = useUserInteraction();
  const motionService = getMotionService();
  
  const userBasePosition = useRef(new Vector3(0, 0, 9));
  const userBaseTarget = useRef(new Vector3(0, 0, 0));
  const lastMotionType = useRef<CameraMotionType>(CameraMotionType.STATIC);
  const lastProjectionMode = useRef<ProjectionMode>(config.projectionMode);
  const lastIsImmersive = useRef<boolean>(config.isImmersive);
  
  // Inertia-driven camera movement
  const inertiaVelocity = useRef<Point2D>({ x: 0, y: 0 });

  // Handle inertia updates for smooth camera deceleration
  useEffect(() => {
    const bus = getEventBus();
    const offInertiaUpdate = bus.on(InputEvents.INERTIA_UPDATE, (data: InputInertiaUpdatePayload) => {
      inertiaVelocity.current = data.velocity;
    });
    const offInertiaEnd = bus.on(InputEvents.INERTIA_END, () => {
      inertiaVelocity.current = { x: 0, y: 0 };
    });
    return () => {
      offInertiaUpdate();
      offInertiaEnd();
    };
  }, []);
  
  useEffect(() => {
    motionService.setParameter('speed', config.cameraMotionSpeed);
    motionService.setParameter('orbitRadius', config.orbitRadius);
    motionService.setParameter('orbitTilt', config.orbitTilt);
    motionService.setParameter('flyByHeight', config.flyByHeight);
    motionService.setParameter('flyBySwing', config.flyBySwing);
    motionService.setParameter('spiralLoops', config.spiralLoops);
    motionService.setParameter('spiralHeight', config.spiralHeight);
    motionService.setParameter('arcAngle', config.arcAngle);
    motionService.setParameter('arcRhythm', config.arcRhythm);
    motionService.setParameter('trackingDistance', config.trackingDistance);
    motionService.setParameter('trackingOffset', config.trackingOffset);
    motionService.setParameter('dollyRange', config.dollyRange);
    motionService.setParameter('dollyIntensity', config.dollyIntensity);
  }, [
    config.cameraMotionSpeed, config.orbitRadius, config.orbitTilt,
    config.flyByHeight, config.flyBySwing, config.spiralLoops, config.spiralHeight,
    config.arcAngle, config.arcRhythm, config.trackingDistance, config.trackingOffset,
    config.dollyRange, config.dollyIntensity, motionService
  ]);
  
  useEffect(() => {
    const motionType = toMotionType(config.cameraMotionType);
    const blendMode = config.cameraMotionBlend as BlendMode;
    
    if (config.cameraMotionType !== lastMotionType.current) {
      lastMotionType.current = config.cameraMotionType;
      if (motionType === 'STATIC') {
        motionService.stop();
      } else {
        motionService.start(motionType, { blendMode });
      }
    }
    motionService.setBlendMode(blendMode);
  }, [config.cameraMotionType, config.cameraMotionBlend, motionService]);
  
  useEffect(() => {
    if (config.cameraMotionBlend === 'additive' && controlsRef.current) {
      userBasePosition.current.copy(camera.position);
      userBaseTarget.current.copy(controlsRef.current.target);
    }
  }, [config.cameraMotionBlend, camera, controlsRef]);
  
  useEffect(() => {
    if (!isInteracting && config.cameraMotionBlend === 'additive' && controlsRef.current) {
      const timer = setTimeout(() => {
        userBasePosition.current.copy(camera.position);
        userBaseTarget.current.copy(controlsRef.current!.target);
      }, 50);
      return () => { clearTimeout(timer); };
    }
    return undefined;
  }, [isInteracting, config.cameraMotionBlend, camera, controlsRef]);

  useEffect(() => {
    const bus = getEventBus();
    const offEnd = bus.on('input:interaction-end', () => {
      const controls = controlsRef.current;
      if (!controls) return;
      userBasePosition.current.copy(camera.position);
      userBaseTarget.current.copy(controls.target);
    });
    return () => { offEnd(); };
  }, [camera, controlsRef]);
  
  const motionScale = useMemo(() => {
    switch (config.projectionMode) {
      case ProjectionMode.CUBE: return 0.2;
      case ProjectionMode.INFINITE_BOX: return 0.15;
      case ProjectionMode.CORNER: return 0.3;
      case ProjectionMode.CYLINDER: return 0.5;
      case ProjectionMode.DOME: return 0.6;
      case ProjectionMode.SPHERE: return 0.6;
      case ProjectionMode.PANORAMA: return 0.1;
      default: return 1.0;
    }
  }, [config.projectionMode]);

  useEffect(() => {
    motionService.setParameter('scale', motionScale);
  }, [motionScale, motionService]);

  useEffect(() => {
    if (isInteracting) return undefined;
    if (config.cameraMotionType !== CameraMotionType.STATIC) return undefined;

    const controls = controlsRef.current;
    if (!controls) return undefined;

    const projectionChanged = lastProjectionMode.current !== config.projectionMode;
    const immersiveChanged = lastIsImmersive.current !== config.isImmersive;
    if (!projectionChanged && !immersiveChanged) return undefined;
    lastProjectionMode.current = config.projectionMode;
    lastIsImmersive.current = config.isImmersive;

    const immersiveModes = [ProjectionMode.INFINITE_BOX, ProjectionMode.CORNER, ProjectionMode.CUBE, ProjectionMode.PANORAMA, ProjectionMode.SPHERE, ProjectionMode.DOME, ProjectionMode.CYLINDER];
    const isImmersiveMode = immersiveModes.includes(config.projectionMode);

    const resetTo = (position: Vector3, target: Vector3) => {
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
    };

    const currentDistance = Math.max(0.01, camera.position.distanceTo(controls.target));
    const clampedDistance = Math.max(config.minDistance, Math.min(config.maxDistance, currentDistance));

    if (config.isImmersive && isImmersiveMode) {
      resetTo(new Vector3(0, 0, 0.02), new Vector3(0, 0, 0));
      return undefined;
    }

    resetTo(new Vector3(0, 0, clampedDistance > 0 ? clampedDistance : 9), new Vector3(0, 0, 0));
    return undefined;
  }, [camera, config.cameraMotionType, config.isImmersive, config.maxDistance, config.minDistance, config.projectionMode, controlsRef, isInteracting]);

  const resumeTransitionRef = useRef({
    isTransitioning: false,
    startTime: 0,
    duration: config.motionResumeTransitionMs,
    startPosition: new Vector3(),
    startTarget: new Vector3()
  });

  useEffect(() => {
    resumeTransitionRef.current.duration = config.motionResumeTransitionMs;
  }, [config.motionResumeTransitionMs]);

  useEffect(() => {
    const bus = getEventBus();
    const offResumed = bus.on('motion:resumed', () => {
      const t = resumeTransitionRef.current;
      t.isTransitioning = true;
      t.startTime = performance.now();
      t.startPosition.copy(camera.position);
      const controls = controlsRef.current;
      if (controls) {
        t.startTarget.copy(controls.target);
      }
    });
    return () => { offResumed(); };
  }, [camera, controlsRef]);

  // Calculate adaptive lerp factor based on intent and inertia
  const getAdaptiveLerpFactor = useCallback((baseLerp: number, delta: number): number => {
    let factor = baseLerp;
    
    // Reduce motion influence during user interaction
    if (isInteracting) {
      factor *= 0.1; // Minimal motion during active interaction
    } else if (isInertiaActive) {
      // Gradually increase motion influence as inertia decays
      const inertiaSpeed = Math.hypot(inertiaVelocity.current.x, inertiaVelocity.current.y);
      const inertiaFactor = Math.max(0.2, 1 - inertiaSpeed / 500);
      factor *= inertiaFactor;
    }
    
    // Adjust based on intent
    switch (intent) {
      case 'exploring':
        factor *= 0.15; // User is actively exploring, minimize motion
        break;
      case 'adjusting':
        factor *= 0.4; // User is fine-tuning, reduce motion
        break;
      case 'viewing':
      default:
        // Normal motion influence
        break;
    }
    
    return Math.min(factor, delta * 5); // Cap to prevent jumps
  }, [isInteracting, isInertiaActive, intent]);

  useFrame((_, delta) => {
    const time = performance.now();
    const blendMode = config.cameraMotionBlend || 'additive';
    const baseLerp = 0.12;
    const cinematicLerp = getAdaptiveLerpFactor(baseLerp, delta);
    const resumeTransition = resumeTransitionRef.current;
    
    // During active interaction with manual-priority mode, pause motion completely
    if (blendMode === 'manual-priority' && isInteracting) {
      if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - config.fov) > 0.5) {
        camera.fov = MathUtils.lerp(camera.fov, config.fov, 0.08);
        camera.updateProjectionMatrix();
      }
      return;
    }

    if (blendMode === 'manual-priority' && motionService.isPaused()) {
      if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - config.fov) > 0.5) {
        camera.fov = MathUtils.lerp(camera.fov, config.fov, 0.08);
        camera.updateProjectionMatrix();
      }
      return;
    }
    
    const basePose: CameraPose = {
      position: fromVector3(userBasePosition.current),
      target: fromVector3(userBaseTarget.current),
      up: { x: 0, y: 1, z: 0 },
      fov: config.fov
    };
    
    const motionResult = motionService.calculate(time, basePose);
    
    if (motionResult && config.cameraMotionType !== CameraMotionType.STATIC) {
      let targetPos = new Vector3(motionResult.position.x, motionResult.position.y, motionResult.position.z);
      let targetLook = new Vector3(motionResult.target.x, motionResult.target.y, motionResult.target.z);

      if (blendMode === 'manual-priority') {
        const defaultPos = new Vector3(0, 0, 9);
        // Use dynamic blend factor from motion service
        const dynamicBlend = (motionService as unknown as { getDynamicBlendFactor?: () => number }).getDynamicBlendFactor?.() ?? 0.35;
        const offset = targetPos.sub(defaultPos).multiplyScalar(dynamicBlend);
        targetPos = new Vector3().copy(userBasePosition.current).add(offset);
        targetLook = new Vector3().copy(userBaseTarget.current).add(targetLook.multiplyScalar(dynamicBlend));
      }
      
      if (resumeTransition.isTransitioning) {
        const elapsed = time - resumeTransition.startTime;
        const duration = Math.max(0, resumeTransition.duration);
        const progress = duration === 0 ? 1 : Math.min(elapsed / duration, 1);

        if (progress < 1) {
          // Use Bezier easing for smoother transition
          const eased = easeInOutQuart(progress);
          camera.position.lerpVectors(resumeTransition.startPosition, targetPos, eased);
          if (controlsRef.current) {
            controlsRef.current.target.lerpVectors(resumeTransition.startTarget, targetLook, eased);
            controlsRef.current.update();
          }
        } else {
          resumeTransition.isTransitioning = false;
          camera.position.copy(targetPos);
          if (controlsRef.current) {
            controlsRef.current.target.copy(targetLook);
            controlsRef.current.update();
          }
        }
      } else {
        // Use adaptive lerp factor for smooth blending
        camera.position.lerp(targetPos, cinematicLerp);

        if (controlsRef.current) {
          controlsRef.current.target.lerp(targetLook, cinematicLerp);
          controlsRef.current.update();
        }
      }
      
      if (camera instanceof PerspectiveCamera) {
        const targetFov = motionResult.fov || config.fov;
        if (Math.abs(camera.fov - targetFov) > 0.5) {
          camera.fov = MathUtils.lerp(camera.fov, targetFov, 0.08);
          camera.updateProjectionMatrix();
        }
      }
    } else {
      if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - config.fov) > 0.5) {
        camera.fov = MathUtils.lerp(camera.fov, config.fov, 0.08);
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
});

CameraMotionLogic.displayName = 'CameraMotionLogic';

export default CameraMotionLogic;
