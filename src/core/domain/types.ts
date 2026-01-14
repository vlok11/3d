/**
 * Domain Layer - Core Type Definitions
 *
 * Pure data structures for the "Upload -> Analyze -> Render" flow.
 * NO external dependencies (except TypeScript built-ins).
 * NO imports from Infrastructure or Presentation layers.
 */

// ============================================================================
// 1. Enums - Business Domain Constants
// ============================================================================

export enum SceneType {
  INDOOR = 'INDOOR',
  OUTDOOR = 'OUTDOOR',
  OBJECT = 'OBJECT',
  UNKNOWN = 'UNKNOWN'
}

export enum TechPipeline {
  DEPTH_MESH = 'DEPTH_MESH',
  GAUSSIAN_SPLAT = 'GAUSSIAN_SPLAT',
  GENERATIVE_MESH = 'GENERATIVE_MESH'
}

export enum ColorGradePreset {
  NONE = 'NONE',
  CYBERPUNK = 'CYBERPUNK',
  VINTAGE = 'VINTAGE',
  NOIR = 'NOIR',
  CINEMATIC = 'CINEMATIC',
  DREAMY = 'DREAMY',
  VHS = 'VHS',
  WARM = 'WARM',
  FILM = 'FILM',
  JAPANESE = 'JAPANESE',
  COLD = 'COLD',
  SEPIA = 'SEPIA'
}

export enum CameraMode {
  PERSPECTIVE = 'PERSPECTIVE',
  ORTHOGRAPHIC = 'ORTHOGRAPHIC'
}

export enum ProjectionMode {
  PLANE = 'PLANE',
  CORNER = 'CORNER',
  SPHERE = 'SPHERE',
  CYLINDER = 'CYLINDER',
  CUBE = 'CUBE',
  DOME = 'DOME',
  PANORAMA = 'PANORAMA',
  GAUSSIAN_SPLAT = 'GAUSSIAN_SPLAT',
  INFINITE_BOX = 'INFINITE_BOX'
}

export enum RenderStyle {
  REALISTIC = 'REALISTIC',
  HOLOGRAPHIC = 'HOLOGRAPHIC',
  PAINTING = 'PAINTING',
  SKETCH = 'SKETCH',
  PIXEL = 'PIXEL',
  CYBERPUNK = 'CYBERPUNK'
}

export enum HologramType {
  CLASSIC = 'CLASSIC',
  CYBER = 'CYBER',
  TACTICAL = 'TACTICAL',
  GHOST = 'GHOST'
}

export enum MirrorMode {
  NONE = 'NONE',
  HORIZONTAL = 'HORIZONTAL',
  VERTICAL = 'VERTICAL',
  QUAD = 'QUAD'
}

export enum CameraMotionType {
  STATIC = 'STATIC',
  ORBIT = 'ORBIT',
  FLY_BY = 'FLY_BY',
  SPIRAL = 'SPIRAL',
  DOLLY_ZOOM = 'DOLLY_ZOOM',
  ARC = 'ARC',
  TRACKING = 'TRACKING'
}

// ============================================================================
// 2. Asset Definitions
// ============================================================================

export type AssetType = 'image' | 'video';

export interface BaseAsset {
  id: string;
  sourceUrl: string; // The original URL (User uploaded)
  type: AssetType;
  width: number;
  height: number;
  aspectRatio: number;
  createdAt: number;
}

export interface ImageAsset extends BaseAsset {
  type: 'image';
}

export interface VideoAsset extends BaseAsset {
  type: 'video';
  duration: number;
  thumbnailUrl?: string; // Proxy image for analysis
}

export type Asset = ImageAsset | VideoAsset;

// ============================================================================
// 3. Processing & Analysis
// ============================================================================

export interface AnalysisResult {
  sceneType: SceneType;
  description: string;
  /** Estimated depth scale (0.5 - 5.0), affects displacement intensity */
  estimatedDepthScale: number;
  /** Depth variance (0.0 - 1.0), how "deep" is the scene - optional for backward compat */
  depthVariance?: number;
  mainSubject?: string;
  /** Scene keywords, e.g. ["sunset", "cyberpunk", "city"] */
  keywords?: string[];
  recommendedFov: number;
  recommendedPipeline: TechPipeline;
  reasoning: string;
  /** Suggested AI model for processing - legacy field */
  suggestedModel?: string;
}

export interface ProcessedAsset {
  asset: Asset;
  /** The generated depth map URL */
  depthMapUrl: string;
  /** The processed image URL (may differ from asset.sourceUrl after preprocessing) */
  imageUrl: string;
  /** Optional background URL for compositing */
  backgroundUrl?: string;
  analysis: AnalysisResult;
  processingTime: number;
}

/** Processing state for UI feedback */
export interface ProcessingState {
  status: 'idle' | 'analyzing' | 'generating_depth' | 'ready' | 'error';
  message: string;
  progress: number; // 0-100
}

// ============================================================================
// 4. Configuration Types
// ============================================================================

/** Recommended config derived from AI analysis */
export interface RecommendedConfig {
  displacementScale: number;
  fov: number;
  colorGrade: ColorGradePreset;
  enableFog: boolean;
  enableVignette: boolean;
  cameraMotion: CameraMotionType;
  videoLoop?: boolean;
}

// ============================================================================
// 5. Type Guards
// ============================================================================

/** Check if asset is an ImageAsset */
export function isImageAsset(asset: Asset): asset is ImageAsset {
  return asset.type === 'image';
}

/** Check if asset is a VideoAsset */
export function isVideoAsset(asset: Asset): asset is VideoAsset {
  return asset.type === 'video';
}

/** Validate Asset has required fields */
export function isValidAsset(obj: unknown): obj is Asset {
  if (!obj || typeof obj !== 'object') return false;
  const a = obj as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.sourceUrl === 'string' &&
    (a.type === 'image' || a.type === 'video') &&
    typeof a.width === 'number' &&
    typeof a.height === 'number' &&
    typeof a.aspectRatio === 'number' &&
    typeof a.createdAt === 'number'
  );
}

/** Validate AnalysisResult has required fields */
export function isValidAnalysisResult(obj: unknown): obj is AnalysisResult {
  if (!obj || typeof obj !== 'object') return false;
  const a = obj as Record<string, unknown>;
  return (
    typeof a.sceneType === 'string' &&
    Object.values(SceneType).includes(a.sceneType as SceneType) &&
    typeof a.description === 'string' &&
    typeof a.estimatedDepthScale === 'number' &&
    typeof a.recommendedFov === 'number' &&
    typeof a.recommendedPipeline === 'string' &&
    typeof a.reasoning === 'string'
  );
}

/** Validate ProcessedAsset has required fields */
export function isValidProcessedAsset(obj: unknown): obj is ProcessedAsset {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    isValidAsset(p.asset) &&
    typeof p.depthMapUrl === 'string' &&
    typeof p.imageUrl === 'string' &&
    isValidAnalysisResult(p.analysis) &&
    typeof p.processingTime === 'number'
  );
}

// ============================================================================
// 6. Session Status (Application Layer concept, but pure type)
// ============================================================================

export type SessionStatus =
  | 'idle'
  | 'uploading'
  | 'analyzing'
  | 'processing_depth'
  | 'ready'
  | 'error';

/** Valid state transitions for SessionStatus */
export const SESSION_STATUS_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  idle: ['uploading'],
  uploading: ['analyzing', 'error'],
  analyzing: ['processing_depth', 'error'],
  processing_depth: ['ready', 'error'],
  ready: ['idle'],
  error: ['idle']
};

/** Check if a status transition is valid */
export function isValidStatusTransition(from: SessionStatus, to: SessionStatus): boolean {
  return SESSION_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
