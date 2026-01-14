import { useMemo, useEffect } from 'react';
import { 
  type Texture, MeshStandardMaterial, DoubleSide, Color, type ShaderMaterial, 
  AdditiveBlending, NormalBlending, type WebGLProgramParametersWithUniforms, type Material 
} from 'three';

import { ProjectionMode, RenderStyle } from '@/shared/types';

import {
  HolographicMaterialClass,
  PaintingMaterialClass,
  SplatMaterialClass,
  SketchMaterialClass,
  PixelMaterialClass,
  CyberpunkMaterialClass
} from '../materials';

import type { SceneConfig } from '@/shared/types';


const injectEdgeFade = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uSeamCorrection = { value: 0.0 };
    shader.uniforms.uEdgeFade = { value: 0.8 };
    shader.vertexShader = `uniform float uSeamCorrection;\nuniform float uEdgeFade;\n${shader.vertexShader}`;
    const edgeFadeFunc = `
      float calculateEdgeFade(vec2 uv) {
          float fadeX = smoothstep(0.0, 0.08, uv.x) * smoothstep(0.0, 0.08, 1.0 - uv.x);
          float fadeY = smoothstep(0.0, 0.08, uv.y) * smoothstep(0.0, 0.08, 1.0 - uv.y);
          return mix(1.0, fadeX * fadeY, uEdgeFade);
      }
    `;
    shader.vertexShader = shader.vertexShader.replace('void main() {', `${edgeFadeFunc  }\nvoid main() {`);
    const seamLogic = `
      float disp = texture2D( displacementMap, vUv ).x;
      if (uSeamCorrection > 0.5) {
         float dist = min(vUv.x, 1.0 - vUv.x);
         float blendWidth = 0.1;
         if (dist < blendWidth) {
            float dLeft = texture2D(displacementMap, vec2(0.01, vUv.y)).x;
            float dRight = texture2D(displacementMap, vec2(0.99, vUv.y)).x;
            float dAvg = (dLeft + dRight) * 0.5;
            float t = smoothstep(0.0, blendWidth, dist);
            disp = mix(dAvg, disp, t);
         }
      }
      disp *= calculateEdgeFade(vUv);
      transformed += normalize( objectNormal ) * ( disp * displacementScale + displacementBias );
    `;
    shader.vertexShader = shader.vertexShader.replace('#include <displacementmap_vertex>', seamLogic);
    if (!shader.vertexShader.includes('varying vec2 vUv;')) {
      shader.vertexShader = `varying vec2 vUv;\n${shader.vertexShader}`;
    }
};

interface ShaderUniformProps {
  transparent?: boolean;
  depthWrite?: boolean;
  side?: typeof DoubleSide;
  blending?: typeof AdditiveBlending | typeof NormalBlending;
}
function createShaderMaterial<T extends ShaderMaterial>(
  MaterialClass: new () => T,
  props: ShaderUniformProps
): T {
  const mat = new MaterialClass();
  Object.assign(mat, props);
  return mat;
}

function setUniform(mat: ShaderMaterial, name: string, value: unknown): void {
  if (mat.uniforms?.[name]) {
    mat.uniforms[name].value = value;
  }
}

function getTexelSize(texture: Texture | null): [number, number] {
  if (!texture?.image) {return [1 / 512, 1 / 512];}
  const img = texture.image as { width?: number; height?: number };
  const w = img.width ?? 512;
  const h = img.height ?? 512;
  return [1 / w, 1 / h];
}

export function useSceneMaterials(
  activeMap: Texture | null, 
  displacementMap: Texture, 
  config: SceneConfig,
  seamCorrectionValue: number
) {
  const standardMaterial = useMemo(() => {
    if (!activeMap || !displacementMap) {return undefined;}
    const mat = new MeshStandardMaterial({
      map: activeMap,
      displacementMap,
      side: DoubleSide,
      envMapIntensity: 0.8, 
      toneMapped: true,
      emissive: new Color('#000000'),
      emissiveIntensity: 0
    });
    mat.onBeforeCompile = (shader) => {
        injectEdgeFade(shader);
        mat.userData.shader = shader; 
    };
    return mat;
  }, [activeMap, displacementMap]);

  const holographicMaterial = useMemo(() => createShaderMaterial(HolographicMaterialClass, {
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending
    }), []);

  const paintingMaterial = useMemo(() => createShaderMaterial(PaintingMaterialClass, { side: DoubleSide }), []);

  const splatMaterial = useMemo(() => createShaderMaterial(SplatMaterialClass, {
      transparent: true,
      depthWrite: false,
      blending: NormalBlending
    }), []);

  const sketchMaterial = useMemo(() => createShaderMaterial(SketchMaterialClass, { side: DoubleSide }), []);

  const pixelMaterial = useMemo(() => createShaderMaterial(PixelMaterialClass, { side: DoubleSide }), []);

  const cyberpunkMaterial = useMemo(() => createShaderMaterial(CyberpunkMaterialClass, { side: DoubleSide }), []);

  useEffect(() => () => {
      standardMaterial?.dispose();
      holographicMaterial.dispose();
      paintingMaterial.dispose();
      splatMaterial.dispose();
      sketchMaterial.dispose();
      pixelMaterial.dispose();
      cyberpunkMaterial.dispose();
    }, [standardMaterial, holographicMaterial, paintingMaterial, splatMaterial, sketchMaterial, pixelMaterial, cyberpunkMaterial]);

  let activeMaterial: Material | undefined = standardMaterial;
  if (config.projectionMode === ProjectionMode.GAUSSIAN_SPLAT) {activeMaterial = splatMaterial;}
  else if (config.renderStyle === RenderStyle.HOLOGRAPHIC) {activeMaterial = holographicMaterial;}
  else if (config.renderStyle === RenderStyle.PAINTING) {activeMaterial = paintingMaterial;}
  else if (config.renderStyle === RenderStyle.SKETCH) {activeMaterial = sketchMaterial;}
  else if (config.renderStyle === RenderStyle.PIXEL) {activeMaterial = pixelMaterial;}
  else if (config.renderStyle === RenderStyle.CYBERPUNK) {activeMaterial = cyberpunkMaterial;}

  useEffect(() => {
    if (!activeMaterial) {return;}
    const scale = config.depthInvert ? -config.displacementScale : config.displacementScale;
    const bias = -scale / 2;
    const texelSize = getTexelSize(activeMap);
    if (activeMaterial === standardMaterial && standardMaterial) {
      standardMaterial.displacementScale = scale;
      standardMaterial.displacementBias = bias;
      standardMaterial.wireframe = config.wireframe;
      standardMaterial.roughness = config.roughness;
      standardMaterial.metalness = config.metalness;
      standardMaterial.envMapIntensity = config.lightIntensity * 0.8;
      if (standardMaterial.userData.shader) {
        standardMaterial.userData.shader.uniforms.uSeamCorrection.value = seamCorrectionValue;
        standardMaterial.userData.shader.uniforms.uEdgeFade.value = config.edgeFade;
      }
      if (standardMaterial.map !== activeMap || standardMaterial.displacementMap !== displacementMap) {
        standardMaterial.map = activeMap;
        standardMaterial.displacementMap = displacementMap;
        standardMaterial.needsUpdate = true;
      }
    }
    if (activeMaterial === holographicMaterial) {
      const mat = holographicMaterial;
      setUniform(mat, 'map', activeMap);
      setUniform(mat, 'displacementMap', displacementMap);
      setUniform(mat, 'displacementScale', scale);
      setUniform(mat, 'displacementBias', bias);
      setUniform(mat, 'color', new Color(config.hologramColor));
      setUniform(mat, 'opacity', config.hologramOpacity);
      setUniform(mat, 'scanlineDensity', config.hologramScanlines);
      setUniform(mat, 'glitchIntensity', config.hologramGlitch);
      setUniform(mat, 'uSeamCorrection', seamCorrectionValue);
      setUniform(mat, 'tintIntensity', config.hologramUseOriginalColor ? 0.0 : config.hologramTint);
      setUniform(mat, 'uEdgeFade', config.edgeFade);
      setUniform(mat, 'uParallaxScale', config.parallaxScale);
      mat.wireframe = config.wireframe;
    }
    if (activeMaterial === paintingMaterial) {
      const mat = paintingMaterial;
      setUniform(mat, 'uMap', activeMap);
      setUniform(mat, 'uDisplacementMap', displacementMap);
      setUniform(mat, 'uDisplacementScale', scale);
      setUniform(mat, 'uDisplacementBias', bias);
      setUniform(mat, 'uTexelSize', texelSize);
      setUniform(mat, 'uSeamCorrection', seamCorrectionValue);
      setUniform(mat, 'uEdgeFade', config.edgeFade);
      setUniform(mat, 'uBrushSize', (config.paintingBrushSize ?? 5) * 0.002);
      setUniform(mat, 'uPosterize', config.paintingPosterize ?? 10);
      mat.wireframe = config.wireframe;
    }
    if (activeMaterial === sketchMaterial) {
      const mat = sketchMaterial;
      setUniform(mat, 'uMap', activeMap);
      setUniform(mat, 'uDisplacementMap', displacementMap);
      setUniform(mat, 'uDisplacementScale', scale);
      setUniform(mat, 'uDisplacementBias', bias);
      setUniform(mat, 'uTexelSize', texelSize);
      setUniform(mat, 'uStrokeWidth', config.sketchStrokeWidth ?? 1.0);
      setUniform(mat, 'uEdgeThreshold', config.sketchEdgeThreshold ?? 0.3);
      mat.wireframe = config.wireframe;
    }
    if (activeMaterial === pixelMaterial) {
      const mat = pixelMaterial;
      setUniform(mat, 'uMap', activeMap);
      setUniform(mat, 'uDisplacementMap', displacementMap);
      setUniform(mat, 'uDisplacementScale', scale);
      setUniform(mat, 'uDisplacementBias', bias);
      setUniform(mat, 'uPixelSize', config.pixelSize ?? 64);
      setUniform(mat, 'uPaletteSize', config.pixelPaletteSize ?? 8);
      mat.wireframe = config.wireframe;
    }
    if (activeMaterial === cyberpunkMaterial) {
      const mat = cyberpunkMaterial;
      setUniform(mat, 'uMap', activeMap);
      setUniform(mat, 'uDisplacementMap', displacementMap);
      setUniform(mat, 'uDisplacementScale', scale);
      setUniform(mat, 'uDisplacementBias', bias);
      setUniform(mat, 'uTexelSize', texelSize);
      setUniform(mat, 'uNeonIntensity', config.cyberpunkNeonIntensity ?? 1.0);
      setUniform(mat, 'uChromaticAberration', config.cyberpunkChromaticAberration ?? 0.5);
      setUniform(mat, 'uNoiseIntensity', config.cyberpunkNoiseIntensity ?? 0.2);
      mat.wireframe = config.wireframe;
    }
    if (activeMaterial === splatMaterial) {
      const mat = splatMaterial;
      setUniform(mat, 'uMap', activeMap);
      setUniform(mat, 'uDisplacementMap', displacementMap);
      setUniform(mat, 'uDisplacementScale', scale * 1.5);
      setUniform(mat, 'uDisplacementBias', bias * 1.5);
      const clampedDensity = Math.min(config.meshDensity, 384);
      const dynamicSize = Math.max(3.0, 800.0 / clampedDensity);
      setUniform(mat, 'uPointSize', dynamicSize);
    }
  }, [activeMaterial, standardMaterial, holographicMaterial, paintingMaterial, 
      sketchMaterial, pixelMaterial, cyberpunkMaterial, splatMaterial,
      config, activeMap, displacementMap, seamCorrectionValue]);
  return { 
    activeMaterial, 
    standardMaterial,
    holographicMaterial, 
    paintingMaterial, 
    splatMaterial,
    sketchMaterial,
    pixelMaterial,
    cyberpunkMaterial
  };
}
