import { HologramType } from '@/shared/types';

// ============================================================================
// Cyberpunk Presets
// ============================================================================

export interface CyberpunkPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  neonIntensity: number;
  chromaticAberration: number;
  noiseIntensity: number;
  scanlines: number;
  glitch: number;
}

export const CYBERPUNK_PRESETS: CyberpunkPreset[] = [
  {
    id: 'neon-city',
    label: '霓虹都市',
    description: '明亮霓虹与色彩分离',
    icon: '🌆',
    neonIntensity: 1.5,
    chromaticAberration: 0.8,
    noiseIntensity: 0.1,
    scanlines: 0.3,
    glitch: 0.1,
  },
  {
    id: 'matrix',
    label: '矩阵',
    description: '绿色数字雨效果',
    icon: '🟢',
    neonIntensity: 1.2,
    chromaticAberration: 0.3,
    noiseIntensity: 0.15,
    scanlines: 0.5,
    glitch: 0.2,
  },
  {
    id: 'blade-runner',
    label: '银翼杀手',
    description: '暗色调霓虹雨夜',
    icon: '🌧️',
    neonIntensity: 0.8,
    chromaticAberration: 1.0,
    noiseIntensity: 0.2,
    scanlines: 0.2,
    glitch: 0.05,
  },
];

export const getDefaultCyberpunkPreset = (): CyberpunkPreset => CYBERPUNK_PRESETS[0]!;

// ============================================================================
// Hologram Presets
// ============================================================================

export interface HologramPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  type: HologramType;
  color: string;
  opacity: number;
  scanlines: number;
  glitch: number;
  flicker: number;
}

export const HOLOGRAM_PRESETS: HologramPreset[] = [
  {
    id: 'classic-blue',
    label: '经典蓝',
    description: '青蓝色科幻全息投影',
    icon: '💠',
    type: HologramType.CLASSIC,
    color: '#00ffff',
    opacity: 0.8,
    scanlines: 5.0,
    glitch: 0.15,
    flicker: 0.1,
  },
  {
    id: 'cyber-green',
    label: '赛博绿',
    description: '绿色科技感全息',
    icon: '🌿',
    type: HologramType.CYBER,
    color: '#00ff88',
    opacity: 0.75,
    scanlines: 8.0,
    glitch: 0.25,
    flicker: 0.15,
  },
  {
    id: 'tactical',
    label: '战术橙',
    description: '军事风格战术显示',
    icon: '🔶',
    type: HologramType.TACTICAL,
    color: '#ff8800',
    opacity: 0.85,
    scanlines: 3.0,
    glitch: 0.05,
    flicker: 0.05,
  },
  {
    id: 'ghost',
    label: '幽灵白',
    description: '半透明幽灵效果',
    icon: '👻',
    type: HologramType.GHOST,
    color: '#ffffff',
    opacity: 0.5,
    scanlines: 2.0,
    glitch: 0.3,
    flicker: 0.2,
  },
];

export const getDefaultHologramPreset = (): HologramPreset => HOLOGRAM_PRESETS[0]!;

// ============================================================================
// Painting Presets
// ============================================================================

export interface PaintingPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  brushSize: number;
  posterize: number;
  saturation: number;
  contrast: number;
}

export const PAINTING_PRESETS: PaintingPreset[] = [
  {
    id: 'impressionist',
    label: '印象派',
    description: '柔和光影，色彩斑斓',
    icon: '🌸',
    brushSize: 3,
    posterize: 8,
    saturation: 1.2,
    contrast: 1.1,
  },
  {
    id: 'van-gogh',
    label: '梵高',
    description: '旋转笔触，浓烈色彩',
    icon: '🌻',
    brushSize: 5,
    posterize: 6,
    saturation: 1.4,
    contrast: 1.2,
  },
  {
    id: 'watercolor',
    label: '水彩',
    description: '轻盈透明，自然晕染',
    icon: '💧',
    brushSize: 4,
    posterize: 10,
    saturation: 0.9,
    contrast: 0.95,
  },
];

export const getDefaultPaintingPreset = (): PaintingPreset => PAINTING_PRESETS[0]!;

// ============================================================================
// Pixel Presets
// ============================================================================

export interface PixelPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  pixelSize: number;
  paletteSize: number;
  dithering: boolean;
}

export const PIXEL_PRESETS: PixelPreset[] = [
  {
    id: 'nes',
    label: 'NES',
    description: '经典红白机像素风格',
    icon: '🎮',
    pixelSize: 4,
    paletteSize: 16,
    dithering: false,
  },
  {
    id: 'arcade',
    label: '街机',
    description: '复古街机游戏风格',
    icon: '🕹️',
    pixelSize: 3,
    paletteSize: 32,
    dithering: true,
  },
  {
    id: 'gameboy',
    label: 'GameBoy',
    description: '经典绿色4色液晶风格',
    icon: '💚',
    pixelSize: 4,
    paletteSize: 4,
    dithering: true,
  },
];

export const getDefaultPixelPreset = (): PixelPreset => PIXEL_PRESETS[0]!;

// ============================================================================
// Sketch Presets
// ============================================================================

export interface SketchPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  strokeWidth: number;
  edgeThreshold: number;
  contrast: number;
}

export const SKETCH_PRESETS: SketchPreset[] = [
  {
    id: 'pencil',
    label: '铅笔',
    description: '自然柔和的铅笔素描',
    icon: '✏️',
    strokeWidth: 1,
    edgeThreshold: 0.3,
    contrast: 1.0,
  },
  {
    id: 'charcoal',
    label: '炭笔',
    description: '粗犷有力的炭笔素描',
    icon: '🖤',
    strokeWidth: 2,
    edgeThreshold: 0.2,
    contrast: 1.3,
  },
  {
    id: 'ink',
    label: '钢笔',
    description: '精细锐利的钢笔线条',
    icon: '🖊️',
    strokeWidth: 1,
    edgeThreshold: 0.4,
    contrast: 1.5,
  },
];

export const getDefaultSketchPreset = (): SketchPreset => SKETCH_PRESETS[0]!;
