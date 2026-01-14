import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import { Color } from 'three';

import {
  holographicVertexShader,
  holographicFragmentShader,
  paintingVertexShader,
  paintingFragmentShader,
  splatVertexShader,
  splatFragmentShader,
  sketchVertexShader,
  sketchFragmentShader,
  pixelVertexShader,
  pixelFragmentShader,
  cyberpunkVertexShader,
  cyberpunkFragmentShader
} from '@/shared/shaders';

export const HolographicMaterialClass = shaderMaterial(
  {
    time: 0,
    color: new Color('#00ffff'),
    map: null,
    displacementMap: null,
    displacementScale: 0.0,
    displacementBias: 0.0,
    opacity: 1.0,
    scanlineDensity: 5.0,
    glitchIntensity: 0.0,
    tintIntensity: 0.8,
    uSeamCorrection: 0.0,
    uEdgeFade: 0.8,
    uParallaxScale: 0.3
  },
  holographicVertexShader,
  holographicFragmentShader
);

export const PaintingMaterialClass = shaderMaterial(
  {
    uTime: 0,
    uMap: null,
    uTexelSize: [1 / 512, 1 / 512],
    uDisplacementMap: null,
    uDisplacementScale: 0.0,
    uDisplacementBias: 0.0,
    uSeamCorrection: 0.0,
    uEdgeFade: 0.8,
    uBrushSize: 0.008,
    uPosterize: 10.0
  },
  paintingVertexShader,
  paintingFragmentShader
);

export const SplatMaterialClass = shaderMaterial(
  {
    uMap: null,
    uDisplacementMap: null,
    uDisplacementScale: 0.0,
    uDisplacementBias: 0.0,
    uPointSize: 4.0,
    uTime: 0
  },
  splatVertexShader,
  splatFragmentShader
);

export const SketchMaterialClass = shaderMaterial(
  {
    uTime: 0,
    uMap: null,
    uTexelSize: [1 / 512, 1 / 512],
    uDisplacementMap: null,
    uDisplacementScale: 0.0,
    uDisplacementBias: 0.0,
    uStrokeWidth: 1.0,
    uEdgeThreshold: 0.3
  },
  sketchVertexShader,
  sketchFragmentShader
);

export const PixelMaterialClass = shaderMaterial(
  {
    uMap: null,
    uDisplacementMap: null,
    uDisplacementScale: 0.0,
    uDisplacementBias: 0.0,
    uPixelSize: 64.0,
    uPaletteSize: 8.0
  },
  pixelVertexShader,
  pixelFragmentShader
);

export const CyberpunkMaterialClass = shaderMaterial(
  {
    uTime: 0,
    uMap: null,
    uTexelSize: [1 / 512, 1 / 512],
    uDisplacementMap: null,
    uDisplacementScale: 0.0,
    uDisplacementBias: 0.0,
    uNeonIntensity: 1.0,
    uChromaticAberration: 0.5,
    uNoiseIntensity: 0.2
  },
  cyberpunkVertexShader,
  cyberpunkFragmentShader
);

extend({
  HolographicMaterial: HolographicMaterialClass,
  PaintingMaterial: PaintingMaterialClass,
  SplatMaterial: SplatMaterialClass,
  SketchMaterial: SketchMaterialClass,
  PixelMaterial: PixelMaterialClass,
  CyberpunkMaterial: CyberpunkMaterialClass
});
