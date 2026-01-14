/**
 * useMaterialUpdater - 材质 uniforms 更新 Hook
 * 
 * 职责：在 useFrame 中统一更新所有材质的时间相关 uniforms
 * - 避免在组件中分散处理各种材质的更新逻辑
 * - 支持暂停/恢复动画
 */

import { useFrame } from '@react-three/fiber';
import { useRef, useCallback } from 'react';

import type { ShaderMaterial, Material } from 'three';

export interface MaterialUpdaterOptions {
  activeMaterial: Material | undefined;
  holographicMaterial: ShaderMaterial;
  paintingMaterial: ShaderMaterial;
  splatMaterial: ShaderMaterial;
  sketchMaterial: ShaderMaterial;
  cyberpunkMaterial: ShaderMaterial;
  hologramSpeed: number;
  paused?: boolean;
}

/**
 * 统一更新材质的时间相关 uniforms
 */
export function useMaterialUpdater({
  activeMaterial,
  holographicMaterial,
  paintingMaterial,
  splatMaterial,
  sketchMaterial,
  cyberpunkMaterial,
  hologramSpeed,
  paused = false
}: MaterialUpdaterOptions): void {
  
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (paused) return;
    
    timeRef.current += delta;

    // Holographic material
    if (activeMaterial === holographicMaterial && holographicMaterial.uniforms?.time) {
      holographicMaterial.uniforms.time.value += delta * hologramSpeed;
    }

    // Painting material
    if (activeMaterial === paintingMaterial && paintingMaterial.uniforms?.uTime) {
      paintingMaterial.uniforms.uTime.value += delta;
    }

    // Splat material
    if (activeMaterial === splatMaterial && splatMaterial.uniforms?.uTime) {
      splatMaterial.uniforms.uTime.value += delta;
    }

    // Sketch material
    if (activeMaterial === sketchMaterial && sketchMaterial.uniforms?.uTime) {
      sketchMaterial.uniforms.uTime.value += delta;
    }

    // Cyberpunk material
    if (activeMaterial === cyberpunkMaterial && cyberpunkMaterial.uniforms?.uTime) {
      cyberpunkMaterial.uniforms.uTime.value += delta;
    }
  });
}

/**
 * 重置材质时间
 */
export function useResetMaterialTime(materials: {
  holographicMaterial: ShaderMaterial;
  paintingMaterial: ShaderMaterial;
  splatMaterial: ShaderMaterial;
  sketchMaterial: ShaderMaterial;
  cyberpunkMaterial: ShaderMaterial;
}): () => void {
  return useCallback(() => {
    const { holographicMaterial, paintingMaterial, splatMaterial, sketchMaterial, cyberpunkMaterial } = materials;
    
    if (holographicMaterial.uniforms?.time) {
      holographicMaterial.uniforms.time.value = 0;
    }
    if (paintingMaterial.uniforms?.uTime) {
      paintingMaterial.uniforms.uTime.value = 0;
    }
    if (splatMaterial.uniforms?.uTime) {
      splatMaterial.uniforms.uTime.value = 0;
    }
    if (sketchMaterial.uniforms?.uTime) {
      sketchMaterial.uniforms.uTime.value = 0;
    }
    if (cyberpunkMaterial.uniforms?.uTime) {
      cyberpunkMaterial.uniforms.uTime.value = 0;
    }
  }, [materials]);
}
