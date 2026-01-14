export const DEFAULT_FOV = 55;
export const MAX_CAMERA_HISTORY = 50;
export const DEFAULT_ANIMATION_DURATION = 500;
export const LONG_PRESS_THRESHOLD = 500;
export const DOUBLE_TAP_THRESHOLD = 300;
export const SWIPE_VELOCITY_THRESHOLD = 0.5;
export const MAX_LOG_HISTORY = 500;

const readEnvNumber = (key: string, fallback: number): number => {
  const raw = (import.meta.env as Record<string, string | undefined>)[key];
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const MAX_IMAGE_FILE_SIZE_MB = readEnvNumber('VITE_MAX_IMAGE_FILE_SIZE_MB', 500);
export const MAX_VIDEO_FILE_SIZE_MB = readEnvNumber('VITE_MAX_VIDEO_FILE_SIZE_MB', 3072);

export const MAX_IMAGE_FILE_SIZE = Math.floor(MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024);
export const MAX_VIDEO_FILE_SIZE = Math.floor(MAX_VIDEO_FILE_SIZE_MB * 1024 * 1024);

export const MAX_FILE_SIZE = MAX_IMAGE_FILE_SIZE;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'] as const;
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'] as const;
export const MAX_MESH_DENSITY = 384;
export const DEFAULT_POINT_SIZE = 4.0;
export const AI_CACHE_TTL = 5000;
