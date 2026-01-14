import { 
  OrbitControls, 
  PerspectiveCamera as DreiPerspectiveCamera, 
  OrthographicCamera as DreiOrthographicCamera 
} from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { memo, useCallback } from 'react';


import { CameraMode, CameraMotionType, ProjectionMode } from '@/shared/types';

import { CameraMotionLogic } from './CameraMotionLogic';

import type { SceneConfig } from '@/shared/types';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';


interface CameraSetupProps {
  config: SceneConfig;
}

interface CameraRigProps {
  config: SceneConfig;
  controlsRef: React.MutableRefObject<OrbitControlsType | null>;
  children?: React.ReactNode;
}

const getImmersiveDistanceLimits = (projectionMode: ProjectionMode, configuredMaxDistance: number) => {
  switch (projectionMode) {
    case ProjectionMode.CYLINDER:
      return { min: 0.01, max: Math.max(6, configuredMaxDistance) };
    case ProjectionMode.PANORAMA:
      return { min: 0.01, max: Math.max(8, configuredMaxDistance) };
    case ProjectionMode.SPHERE:
      return { min: 0.01, max: Math.max(10, configuredMaxDistance) };
    case ProjectionMode.DOME:
      return { min: 0.01, max: Math.max(10, configuredMaxDistance) };
    case ProjectionMode.INFINITE_BOX:
      return { min: 0.01, max: Math.max(14, configuredMaxDistance) };
    case ProjectionMode.CORNER:
      return { min: 0.01, max: Math.max(12, configuredMaxDistance) };
    case ProjectionMode.CUBE:
      return { min: 0.01, max: Math.max(12, configuredMaxDistance) };
    default:
      return { min: 0.01, max: Math.max(12, configuredMaxDistance) };
  }
};

const CameraSetup = memo(({ config }: CameraSetupProps) => config.cameraMode === CameraMode.PERSPECTIVE ? (
    <DreiPerspectiveCamera makeDefault position={[0, 0, 9]} fov={config.fov} />
  ) : (
    <DreiOrthographicCamera makeDefault position={[0, 0, 8]} zoom={config.orthoZoom} />
  ));

const CameraRig = memo(({ 
  config, 
  controlsRef, 
  children 
}: CameraRigProps) => {
  const { invalidate } = useThree();

  const immersiveLimits = getImmersiveDistanceLimits(config.projectionMode, config.maxDistance);
  const activeMinDist = config.isImmersive ? immersiveLimits.min : config.minDistance;
  const activeMaxDist = config.isImmersive ? immersiveLimits.max : config.maxDistance;

  const isAutoMotion = [
    CameraMotionType.ORBIT,
    CameraMotionType.FLY_BY, 
    CameraMotionType.SPIRAL, 
    CameraMotionType.DOLLY_ZOOM, 
    CameraMotionType.ARC, 
    CameraMotionType.TRACKING
  ].includes(config.cameraMotionType);

  const dampingFactor = config.enableFrameInterpolation 
    ? Math.max(0.01, config.dampingFactor * 0.5) 
    : config.dampingFactor;

  const allowZoom = config.cameraMotionBlend === 'manual-priority'
    ? true
    : config.cameraMotionType !== CameraMotionType.DOLLY_ZOOM;

  const handleChange = useCallback(() => {
    invalidate();
  }, [invalidate]);

  return (
    <>
      <CameraSetup config={config} />
      <CameraMotionLogic config={config} controlsRef={controlsRef} />
      <OrbitControls 
        ref={controlsRef}
        makeDefault
        enableRotate
        enableZoom={allowZoom}
        enablePan={config.enablePan}
        enableDamping 
        dampingFactor={isAutoMotion ? dampingFactor * 1.5 : dampingFactor}
        rotateSpeed={config.rotateSpeed} 
        zoomSpeed={config.zoomSpeed} 
        minDistance={activeMinDist} 
        maxDistance={activeMaxDist} 
        maxPolarAngle={config.maxPolarAngle} 
        minPolarAngle={config.minPolarAngle} 
        panSpeed={config.panSpeed} 
        autoRotate={false}
        autoRotateSpeed={0}
        onChange={handleChange}
      />
      {children}
    </>
  );
});

CameraSetup.displayName = 'CameraSetup';
CameraRig.displayName = 'CameraRig';

export default CameraRig;
export type { CameraRigProps };
