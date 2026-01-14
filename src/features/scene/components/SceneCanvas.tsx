import { Canvas, useThree } from '@react-three/fiber';
import { memo, type ReactNode, useEffect } from 'react';
import { ACESFilmicToneMapping } from 'three';

import { useSceneStore } from '@/shared/store';

interface ToneMappingEffectProps {
  exposure: number;
}

const ToneMappingEffect = memo(({ exposure }: ToneMappingEffectProps) => {
  const { gl } = useThree();
  
  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  
  return null;
});

interface SceneCanvasProps {
  children: ReactNode;
  className?: string;
}

export const SceneCanvas = memo(({ children, className }: SceneCanvasProps) => {
  const config = useSceneStore((state) => state.config);
  
  const filterStyle = useFilterStyle(config);
  
  return (
    <div 
      className={`w-full h-full bg-black relative rounded-lg overflow-hidden shadow-2xl border border-zinc-800 transition-all duration-200 ${className ?? ''}`}
      style={filterStyle}
    >
      {config.enableVignette && (
        <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.8)_100%)] mix-blend-multiply" />
      )}
      
      <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
        <ToneMappingEffect exposure={config.exposure} />
        {children}
      </Canvas>
    </div>
  );
});

function useFilterStyle(config: ReturnType<typeof useSceneStore.getState>['config']) {
  let hueRotate = '0deg';
  let saturate = config.saturation;
  let contrast = config.contrast;
  let sepia = '0%';
  let grayscale = '0%';
  let brightness = config.brightness;
  
  switch (config.colorGrade) {
    case 'CYBERPUNK':
      saturate *= 1.5;
      contrast *= 1.2;
      hueRotate = '-20deg';
      break;
    case 'VINTAGE':
      sepia = '40%';
      contrast *= 0.9;
      saturate *= 0.8;
      break;
    case 'NOIR':
      grayscale = '100%';
      contrast *= 1.5;
      break;
    case 'CINEMATIC':
      contrast *= 1.2;
      saturate *= 1.1;
      sepia = '10%';
      hueRotate = '-5deg';
      break;
    case 'DREAMY':
      contrast *= 0.85;
      saturate *= 1.3;
      brightness *= 1.15;
      sepia = '10%';
      break;
    case 'VHS':
      contrast *= 1.3;
      saturate *= 0.8;
      sepia = '20%';
      break;
    case 'WARM':
      sepia = '30%';
      contrast *= 1.05;
      saturate *= 1.2;
      break;
  }
  
  return {
    filter: `saturate(${saturate}) contrast(${contrast}) brightness(${brightness}) hue-rotate(${hueRotate}) sepia(${sepia}) grayscale(${grayscale})`,
    transition: 'filter 0.3s ease-out'
  };
}

ToneMappingEffect.displayName = 'ToneMappingEffect';
SceneCanvas.displayName = 'SceneCanvas';

export default SceneCanvas;
