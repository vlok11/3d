import { useLoader } from '@react-three/fiber';
import { memo, useRef, useEffect, useState, useMemo } from 'react';
import { type Group, type VideoTexture, TextureLoader, BackSide } from 'three';

import { useSceneStore } from '@/shared/store';
import { ProjectionMode, RenderStyle, MirrorMode } from '@/shared/types';

import { useMaterialUpdater } from '../hooks/useMaterialUpdater';
import { useSceneMaterials } from '../hooks/useSceneMaterials';

import { SceneGeometry, AtmosphereParticles, ParallaxRig, VideoManager } from './index';

import type { ParticleType } from './effects';

interface SceneContentProps {
  imageUrl: string;
  depthUrl: string;
  backgroundUrl: string | null;
  videoUrl: string | null;
  aspectRatio: number;
  videoTextureRef: React.MutableRefObject<VideoTexture | null>;
  sceneGroupRef: React.MutableRefObject<Group | null>;
}

export const SceneContent = memo(({
  imageUrl,
  depthUrl,
  backgroundUrl,
  videoUrl,
  aspectRatio,
  videoTextureRef,
  sceneGroupRef
}: SceneContentProps) => {
  const config = useSceneStore((state) => state.config);
  const groupRef = useRef<Group>(null);

  const particleType = useMemo<ParticleType | undefined>(() => {
    const t = config.particleType;
    if (t === 'dust' || t === 'snow' || t === 'stars' || t === 'firefly') return t;
    return undefined;
  }, [config.particleType]);
  
  useEffect(() => {
    if (sceneGroupRef) {sceneGroupRef.current = groupRef.current;}
  }, [sceneGroupRef]);

  const [colorMap, displacementMap, backgroundTexture] = useLoader(TextureLoader, [
    imageUrl,
    depthUrl,
    backgroundUrl ?? 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  ]);
  
  const [videoTexture, setVideoTexture] = useState<VideoTexture | null>(null);
  
  useEffect(() => {
    if (videoTextureRef) {videoTextureRef.current = videoTexture;}
  }, [videoTexture, videoTextureRef]);

  const activeMap = videoTexture ?? colorMap ?? null;
  
  const isWrapped = useMemo(() => [ProjectionMode.PANORAMA, ProjectionMode.DOME].includes(config.projectionMode) ||
      ((config.projectionMode === ProjectionMode.SPHERE || config.projectionMode === ProjectionMode.CYLINDER) &&
        config.projectionAngle >= 355), [config.projectionMode, config.projectionAngle]);
  
  const seamCorrectionValue = isWrapped ? 1.0 : 0.0;
  
  if (!displacementMap) {return null;}
  
  // eslint-disable-next-line react-hooks/rules-of-hooks -- Conditional return above is for loading state only
  const materials = useSceneMaterials(
    activeMap,
    displacementMap,
    config,
    seamCorrectionValue
  );
  const { activeMaterial, holographicMaterial, paintingMaterial, splatMaterial, sketchMaterial, cyberpunkMaterial } = materials;

  // eslint-disable-next-line react-hooks/rules-of-hooks -- Conditional return above is for loading state only
  useMaterialUpdater({
    activeMaterial,
    holographicMaterial,
    paintingMaterial,
    splatMaterial,
    sketchMaterial,
    cyberpunkMaterial,
    hologramSpeed: config.hologramSpeed
  });

  const width = 10;
  const height = width / aspectRatio;

  if (!activeMaterial) {return null;}

  const renderGeometryGroup = () => {
    const baseProps = {
      width,
      height,
      density: config.meshDensity,
      displacementScale: config.displacementScale,
      material: activeMaterial,
      projectionMode: config.projectionMode,
      projectionAngle: config.projectionAngle
    };
    
    let scaleX = 1, scaleY = 1;
    if (config.mirrorMode === MirrorMode.HORIZONTAL || config.mirrorMode === MirrorMode.QUAD) {scaleX = -1;}
    if (config.mirrorMode === MirrorMode.VERTICAL || config.mirrorMode === MirrorMode.QUAD) {scaleY = -1;}
    
    return (
      <group scale={[scaleX, scaleY, 1]}>
        <SceneGeometry {...baseProps} />
      </group>
    );
  };

  return (
    <>
      <VideoManager videoUrl={videoUrl} onTextureReady={setVideoTexture} />
      
      <ambientLight intensity={config.lightIntensity} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={config.lightIntensity * 0.5}
      />
      
      <AtmosphereParticles
        enabled={config.enableParticles}
        particleType={particleType}
      />
      
      {config.showGrid && <gridHelper args={[20, 20, 0x444444, 0x222222]} />}
      {config.showAxes && <axesHelper args={[5]} />}
      
      {backgroundUrl && config.renderStyle === RenderStyle.REALISTIC && 
       config.projectionMode !== ProjectionMode.GAUSSIAN_SPLAT && (
        <mesh scale={[100, 100, 100]} rotation={[0, Math.PI, 0]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            map={backgroundTexture}
            side={BackSide}
            transparent
            opacity={config.backgroundIntensity}
            depthWrite={false}
            toneMapped
          />
        </mesh>
      )}
      
      <ParallaxRig enabled={config.enableNakedEye3D}>
        <group ref={groupRef}>
          {renderGeometryGroup()}
        </group>
      </ParallaxRig>
    </>
  );
});

SceneContent.displayName = 'SceneContent';

export default SceneContent;
