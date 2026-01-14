/**
 * useColorGrade - 色彩分级 Hook
 * 
 * 职责：根据 colorGrade 配置计算 CSS filter 样式
 */

import { useMemo } from 'react';

import { useSceneStore } from '@/shared/store';

export interface ColorGradeStyle {
  filter: string;
  transition: string;
}

export function useColorGrade(): ColorGradeStyle {
  const saturation = useSceneStore((state) => state.config.saturation);
  const contrast = useSceneStore((state) => state.config.contrast);
  const brightness = useSceneStore((state) => state.config.brightness);
  const colorGrade = useSceneStore((state) => state.config.colorGrade);

  return useMemo(() => {
    let hueRotate = '0deg';
    let saturateVal = saturation;
    let contrastVal = contrast;
    let sepia = '0%';
    let grayscale = '0%';
    let brightnessVal = brightness;

    switch (colorGrade) {
      case 'CYBERPUNK':
        saturateVal *= 1.5;
        contrastVal *= 1.2;
        hueRotate = '-20deg';
        break;
      case 'VINTAGE':
        sepia = '40%';
        contrastVal *= 0.9;
        saturateVal *= 0.8;
        break;
      case 'NOIR':
        grayscale = '100%';
        contrastVal *= 1.5;
        break;
      case 'CINEMATIC':
        contrastVal *= 1.2;
        saturateVal *= 1.1;
        sepia = '10%';
        hueRotate = '-5deg';
        break;
      case 'DREAMY':
        contrastVal *= 0.85;
        saturateVal *= 1.3;
        brightnessVal *= 1.15;
        sepia = '10%';
        break;
      case 'VHS':
        contrastVal *= 1.3;
        saturateVal *= 0.8;
        sepia = '20%';
        break;
      case 'WARM':
        sepia = '30%';
        contrastVal *= 1.05;
        saturateVal *= 1.2;
        break;
    }

    return {
      filter: `saturate(${saturateVal}) contrast(${contrastVal}) brightness(${brightnessVal}) hue-rotate(${hueRotate}) sepia(${sepia}) grayscale(${grayscale})`,
      transition: 'filter 0.3s ease-out'
    };
  }, [saturation, contrast, brightness, colorGrade]);
}
