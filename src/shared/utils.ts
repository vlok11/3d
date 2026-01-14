/**
 * Shared Utilities
 * Merged from: errorHandler.ts, imageProcessing.ts, math.ts, performance.ts
 */

import Hls from 'hls.js';

import { createLogger } from '@/core/Logger';

import type { Vec3 } from '@/shared/types';

const logger = createLogger({ module: 'Utils' });

// ============================================================================
// Error Handler
// ============================================================================

export enum ErrorType {
  NETWORK = 'NETWORK',
  FILE_TYPE = 'FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  PROCESSING = 'PROCESSING',
  AI_SERVICE = 'AI_SERVICE',
  WEBGL = 'WEBGL',
  UNKNOWN = 'UNKNOWN',
}

export interface AppErrorInfo {
  type: ErrorType;
  message: string;
  details?: string;
  recoverable: boolean;
}

const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.NETWORK]: '网络连接失败，请检查网络后重试',
  [ErrorType.FILE_TYPE]: '不支持的文件类型，请上传图片或视频文件',
  [ErrorType.FILE_TOO_LARGE]: '文件过大，请上传更小的文件',
  [ErrorType.PROCESSING]: '处理过程中出现错误，请重试',
  [ErrorType.AI_SERVICE]: 'AI 服务暂时不可用，已切换到离线模式',
  [ErrorType.WEBGL]: '您的浏览器不支持 WebGL，请使用现代浏览器',
  [ErrorType.UNKNOWN]: '发生未知错误，请刷新页面重试',
};

export function categorizeError(error: Error): AppErrorInfo {
  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch') || message.includes('cors')) {
    return { type: ErrorType.NETWORK, message: ERROR_MESSAGES[ErrorType.NETWORK], details: error.message, recoverable: true };
  }
  if (message.includes('file type') || message.includes('unsupported')) {
    return { type: ErrorType.FILE_TYPE, message: ERROR_MESSAGES[ErrorType.FILE_TYPE], details: error.message, recoverable: true };
  }
  if (message.includes('too large') || message.includes('size')) {
    return { type: ErrorType.FILE_TOO_LARGE, message: ERROR_MESSAGES[ErrorType.FILE_TOO_LARGE], details: error.message, recoverable: true };
  }
  if (message.includes('webgl') || message.includes('context')) {
    return { type: ErrorType.WEBGL, message: ERROR_MESSAGES[ErrorType.WEBGL], details: error.message, recoverable: false };
  }

  logger.error('Uncategorized error', { message: error.message });
  return { type: ErrorType.UNKNOWN, message: ERROR_MESSAGES[ErrorType.UNKNOWN], details: error.message, recoverable: true };
}

export function handleError(error: Error, context?: string): AppErrorInfo {
  const errorInfo = categorizeError(error);
  logger.error(`Error in ${context ?? 'unknown'}`, { type: errorInfo.type, message: error.message });
  return errorInfo;
}

// ============================================================================
// Math Utilities
// ============================================================================

export const easeLinear = (t: number): number => t;
export const easeInQuad = (t: number): number => t * t;
export const easeOutQuad = (t: number): number => t * (2 - t);
export const easeInOutQuad = (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
export const easeInCubic = (t: number): number => t * t * t;
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number): number => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

export const easeInElastic = (t: number): number => {
  if (t === 0 || t === 1) return t;
  return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
};

export const easeOutElastic = (t: number): number => {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};

export const easeInOutElastic = (t: number): number => {
  if (t === 0 || t === 1) return t;
  if (t < 0.5) return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2;
  return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2 + 1;
};

export const easeOutBounce = (t: number): number => {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

export const easeInBounce = (t: number): number => 1 - easeOutBounce(1 - t);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpVec3 = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const calculateDistance = (a: Vec3, b: Vec3): number => {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const normalizeVec3 = (v: Vec3): Vec3 => {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
};

export const scaleVec3 = (v: Vec3, scale: number): Vec3 => ({ x: v.x * scale, y: v.y * scale, z: v.z * scale });
export const addVec3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const subtractVec3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const degToRad = (deg: number): number => deg * (Math.PI / 180);
export const radToDeg = (rad: number): number => rad * (180 / Math.PI);


// ============================================================================
// Performance Utilities
// ============================================================================

export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => { fn(...args); timeoutId = null; }, delay);
  };
  debouncedFn.cancel = () => { if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; } };
  return debouncedFn;
};

export const throttle = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; if (lastArgs) { fn(...lastArgs); lastArgs = null; } }, limit);
    } else {
      lastArgs = args;
    }
  };
};

export const getMemoryUsage = (): { used: number; total: number; percentage: number } | null => {
  if ('memory' in performance) {
    const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100),
    };
  }
  return null;
};

export class ObjectURLManager {
  private urls = new Set<string>();
  private static instance: ObjectURLManager | null = null;

  static getInstance(): ObjectURLManager {
    ObjectURLManager.instance ??= new ObjectURLManager();
    return ObjectURLManager.instance;
  }

  create(blob: Blob | File): string {
    const url = URL.createObjectURL(blob);
    this.urls.add(url);
    return url;
  }

  revoke(url: string): void {
    if (this.urls.has(url)) { URL.revokeObjectURL(url); this.urls.delete(url); }
  }

  revokeAll(): void {
    this.urls.forEach(url => URL.revokeObjectURL(url));
    this.urls.clear();
  }

  getCount(): number { return this.urls.size; }
}

export const getObjectURLManager = (): ObjectURLManager => ObjectURLManager.getInstance();

export const requestIdleCallback = (callback: () => void, options?: { timeout?: number }): number => {
  if ('requestIdleCallback' in window) {
    return (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout?: number }) => number }).requestIdleCallback(callback, options);
  }
  return setTimeout(callback, options?.timeout ?? 1) as unknown as number;
};

export const cancelIdleCallback = (id: number): void => {
  if ('cancelIdleCallback' in window) {
    (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
};

export const batchProcess = async <T, R>(
  items: T[],
  processor: (item: T) => R | Promise<R>,
  batchSize = 10,
  delayBetweenBatches = 0
): Promise<R[]> => {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    if (delayBetweenBatches > 0 && i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  return results;
};

const isDevEnv = import.meta.env?.DEV ?? true;

export const perfMark = {
  start: (name: string) => { if (isDevEnv) performance.mark(`${name}-start`); },
  end: (name: string) => {
    if (isDevEnv) {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
        const measure = performance.getEntriesByName(name, 'measure')[0];
        if (measure) logger.debug(`${name}: ${measure.duration.toFixed(2)}ms`);
      } catch { /* Ignore */ }
    }
  },
  clear: () => { if (isDevEnv) { performance.clearMarks(); performance.clearMeasures(); } }
};


// ============================================================================
// Image Processing
// ============================================================================

const BLOCKED_HOSTS = [
  'localhost', '127.0.0.1', '0.0.0.0', '::1',
  '169.254.', '10.', '172.16.', '172.17.', '172.18.', '172.19.',
  '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.',
  '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.',
  '192.168.', 'metadata.google', 'metadata.aws', '169.254.169.254'
];

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'data:', 'blob:'];

export const validateUrl = (url: string): { valid: boolean; error?: string } => {
  try {
    if (url.startsWith('data:') || url.startsWith('blob:')) return { valid: true };
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return { valid: false, error: `Unsupported protocol: ${parsed.protocol}` };
    }
    const hostname = parsed.hostname.toLowerCase();
    for (const blocked of BLOCKED_HOSTS) {
      if (hostname === blocked || hostname.startsWith(blocked)) {
        return { valid: false, error: 'Internal network addresses not allowed' };
      }
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
};

const safeLoadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const validation = validateUrl(url);
  if (!validation.valid) { reject(new Error(validation.error)); return; }
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Image load failed'));
  img.src = url;
});

export const generatePseudoDepthMap = (imageUrl: string, blurAmount = 4): Promise<string> => new Promise((resolve, reject) => {
  safeLoadImage(imageUrl).then(img => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('Could not get canvas context')); return; }
    const MAX_SIZE = 2048;
    let width = img.width, height = img.height;
    if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
    else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const depthBuffer = new Float32Array(width * height);
    const edgeBuffer = new Float32Array(width * height);
    const getLum = (idx: number) => {
      if (idx < 0 || idx >= data.length) return 0;
      return 0.299 * (data[idx] ?? 0) + 0.587 * (data[idx + 1] ?? 0) + 0.114 * (data[idx + 2] ?? 0);
    };
    let minLum = 255, maxLum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const lum = getLum(i);
      minLum = Math.min(minLum, lum);
      maxLum = Math.max(maxLum, lum);
    }
    const lumRange = Math.max(1, maxLum - minLum);
    const contrastFactor = Math.min(2.0, 255 / lumRange);
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const pixelIdx = idx * 4;
        const rawLum = getLum(pixelIdx);
        const normalizedLum = ((rawLum - minLum) / lumRange) * 255;
        const boostedLum = Math.min(255, normalizedLum * Math.sqrt(contrastFactor));
        const yNorm = y / height;
        const gradient = Math.pow(yNorm, 0.7) * 255;
        let gx = 0, gy = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const sampleIdx = ((y + ky) * width + (x + kx)) * 4;
            const sampleLum = getLum(sampleIdx);
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            gx += sampleLum * (sobelX[kernelIdx] ?? 0);
            gy += sampleLum * (sobelY[kernelIdx] ?? 0);
          }
        }
        const edgeMagnitude = Math.sqrt(gx * gx + gy * gy);
        edgeBuffer[idx] = Math.min(255, edgeMagnitude);
        const edgeWeight = Math.min(1, edgeMagnitude / 128);
        const lumWeight = 0.5 + 0.3 * edgeWeight;
        const gradWeight = 0.5 - 0.3 * edgeWeight;
        depthBuffer[idx] = boostedLum * lumWeight + gradient * gradWeight;
      }
    }
    const applyBoxBlur = (buffer: Float32Array, w: number, h: number, radius: number): Float32Array => {
      const result = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let sum = 0, count = 0;
          for (let ky = -radius; ky <= radius; ky++) {
            for (let kx = -radius; kx <= radius; kx++) {
              const sy = Math.max(0, Math.min(h - 1, y + ky));
              const sx = Math.max(0, Math.min(w - 1, x + kx));
              sum += buffer[sy * w + sx] ?? 0;
              count++;
            }
          }
          result[y * w + x] = sum / count;
        }
      }
      return result;
    };
    const fineBlur = applyBoxBlur(depthBuffer, width, height, 2);
    const coarseBlur = applyBoxBlur(depthBuffer, width, height, 8);
    for (let i = 0; i < depthBuffer.length; i++) {
      const edge = (edgeBuffer[i] ?? 0) / 255;
      const blended = (fineBlur[i] ?? 0) * edge + (coarseBlur[i] ?? 0) * (1 - edge);
      const depth = Math.min(255, Math.max(0, blended));
      const pixelIdx = i * 4;
      data[pixelIdx] = depth;
      data[pixelIdx + 1] = depth;
      data[pixelIdx + 2] = depth;
    }
    ctx.putImageData(imageData, 0, 0);
    if (blurAmount > 0) {
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.drawImage(canvas, 0, 0, width, height);
    }
    resolve(canvas.toDataURL('image/jpeg', 0.9));
  }).catch(reject);
});

export const generateBlurredBackground = (imageUrl: string): Promise<string> => new Promise((resolve, reject) => {
  safeLoadImage(imageUrl).then(img => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('Context error')); return; }
    canvas.width = 256;
    canvas.height = 256;
    ctx.filter = 'blur(20px)';
    ctx.drawImage(img, -20, -20, 296, 296);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, 256, 256);
    resolve(canvas.toDataURL('image/jpeg', 0.7));
  }).catch(reject);
});

export const resizeImage = (imageUrl: string, maxDimension = 512): Promise<string> => new Promise((resolve, reject) => {
  safeLoadImage(imageUrl).then(img => {
    const canvas = document.createElement('canvas');
    let width = img.width, height = img.height;
    if (width > height) { if (width > maxDimension) { height *= maxDimension / width; width = maxDimension; } }
    else { if (height > maxDimension) { width *= maxDimension / height; height = maxDimension; } }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('Could not get canvas context')); return; }
    ctx.drawImage(img, 0, 0, width, height);
    resolve(canvas.toDataURL('image/jpeg', 0.8));
  }).catch(reject);
});

export const getImageDimensions = (url: string): Promise<{ width: number; height: number; aspectRatio: number }> => new Promise((resolve, reject) => {
  safeLoadImage(url).then(img => {
    resolve({ width: img.width, height: img.height, aspectRatio: img.width / img.height });
  }).catch(() => reject(new Error('Failed to get image dimensions. Invalid link, not an image, or CORS blocked.')));
});


export const resolveWebPageVideoUrl = async (pageUrl: string): Promise<string> => {
  const validation = validateUrl(pageUrl);
  if (!validation.valid) throw new Error(validation.error);
  
  try {
    let html = '';
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(pageUrl)}`;
      const response = await fetch(proxyUrl);
      if (response.ok) { const data = await response.json(); html = data.contents; }
    } catch (e) { logger.warn('AllOrigins proxy failed', { error: String(e) }); }
    
    if (!html) {
      try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(pageUrl)}`);
        if (response.ok) html = await response.text();
      } catch (e) { logger.warn('CorsProxy failed', { error: String(e) }); }
    }
    
    if (!html) throw new Error("Failed to fetch page content via proxies.");
    
    const normalizedHtml = html.replace(/\\\//g, '/');
    const toAbsoluteUrl = (url: string) => {
      try {
        if (url.startsWith('//')) return `https:${url}`;
        if (!url.startsWith('http')) return new URL(url, pageUrl).href;
        return url;
      } catch { return url; }
    };
    
    const strictUrlRegex = /(?:["']?(?:url|vurl|link|main|video|now)["']?)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/i;
    const strictMatch = strictUrlRegex.exec(normalizedHtml);
    if (strictMatch?.[1]) return toAbsoluteUrl(strictMatch[1]);
    
    const videoFileRegex = /((?:https?:)?\/\/[^"'\s<>]+\.(?:m3u8|mp4)(?:\?[^"'\s<>]*)?)/gi;
    const fileMatches = normalizedHtml.match(videoFileRegex);
    if (fileMatches && fileMatches.length > 0) {
      const m3u8 = fileMatches.find(m => m.toLowerCase().includes('.m3u8'));
      if (m3u8) return toAbsoluteUrl(m3u8);
      return toAbsoluteUrl(fileMatches[0]);
    }
    
    const jsonUrlRegex = /["']?url["']?\s*[:=]\s*["']([^"']+)["']/i;
    const jsonMatch = jsonUrlRegex.exec(normalizedHtml);
    if (jsonMatch?.[1]) {
      const u = jsonMatch[1];
      if (u.includes('.m3u8') || u.includes('.mp4')) return toAbsoluteUrl(u);
    }
    
    const varRegex = /var\s+(?:url|main|video|now)\s*=\s*["']([^"']+)["']/i;
    const varMatch = varRegex.exec(normalizedHtml);
    if (varMatch?.[1]) {
      const u = varMatch[1];
      if (u.includes('.m3u8') || u.includes('.mp4')) return toAbsoluteUrl(u);
    }
    
    throw new Error("Could not find a valid video URL (.m3u8 or .mp4) on the page.");
  } catch (error) {
    logger.error('Video resolution failed', { error: String(error) });
    throw error;
  }
};

export const extractFrameFromVideo = (
  videoUrl: string,
  maxDimension = 4096,
  timeoutMs = 60000
): Promise<{ base64: string; width: number; height: number; aspectRatio: number; duration: number }> => new Promise((resolve, reject) => {
  const validation = validateUrl(videoUrl);
  if (!validation.valid) { reject(new Error(validation.error)); return; }
  
  const video = document.createElement('video');
  video.style.display = 'none';
  document.body.appendChild(video);
  video.crossOrigin = 'Anonymous';
  video.setAttribute('referrerPolicy', 'no-referrer');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  
  let hls: Hls | null = null;
  let isCleanedUp = false;
  
  const timeoutId = setTimeout(() => {
    cleanup();
    reject(new Error('Video processing timed out. The file may be too large or the format/codec is not supported.'));
  }, timeoutMs);
  
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    clearTimeout(timeoutId);
    video.onloadedmetadata = null;
    video.onseeked = null;
    video.onerror = null;
    video.oncanplay = null;
    video.onloadeddata = null;
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (hls) { hls.destroy(); hls = null; }
    if (video.parentNode) video.parentNode.removeChild(video);
  };
  
  const captureFrame = () => {
    try {
      const width = video.videoWidth, height = video.videoHeight;
      if (!width || !height) throw new Error('Video dimensions not available.');
      
      const attemptDraw = (scaleMax: number): string => {
        let targetWidth = width, targetHeight = height;
        if (width > height) { if (width > scaleMax) { targetHeight *= scaleMax / width; targetWidth = scaleMax; } }
        else { if (height > scaleMax) { targetWidth *= scaleMax / height; targetHeight = scaleMax; } }
        targetWidth = Math.floor(targetWidth);
        targetHeight = Math.floor(targetHeight);
        if (targetWidth < 1 || targetHeight < 1) return '';
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context failed');
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        return canvas.toDataURL('image/jpeg', 0.9);
      };
      
      let dataUrl = '';
      try { dataUrl = attemptDraw(maxDimension); }
      catch { logger.warn('High-res capture failed, retrying 1024px'); dataUrl = attemptDraw(1024); }
      
      if (!dataUrl) throw new Error('Failed to generate image data.');
      const duration = video.duration;
      cleanup();
      resolve({ base64: dataUrl, width, height, aspectRatio: width / height, duration });
    } catch (e: unknown) {
      cleanup();
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes("Tainted")) {
        reject(new Error("CORS Error: The video source prevents processing. Please use a file or a server that allows Cross-Origin access."));
      } else {
        reject(e instanceof Error ? e : new Error(errorMessage));
      }
    }
  };
  
  let hasSeeked = false;
  const trySeek = () => {
    if (hasSeeked) return;
    if (!video.videoWidth || !video.videoHeight) return;
    hasSeeked = true;
    const duration = video.duration;
    let seekTime = 0.1;
    if (isFinite(duration) && duration > 0) seekTime = Math.min(1.0, duration * 0.1);
    if (video.seekable.length === 0 && duration === Infinity) { captureFrame(); return; }
    try { video.currentTime = seekTime; } catch { captureFrame(); }
  };
  
  video.onloadeddata = () => { if (video.readyState >= 2) trySeek(); };
  video.oncanplay = () => trySeek();
  video.onseeked = () => captureFrame();
  video.onerror = () => { cleanup(); reject(new Error('Video loading failed or codec unsupported.')); };
  
  const isHls = videoUrl.includes('.m3u8') || videoUrl.includes('application/x-mpegURL');
  
  if (isHls && Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(videoUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) { logger.warn('HLS Fatal Error', { type: data.type }); cleanup(); reject(new Error("HLS Stream Error")); }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl') && isHls) {
    video.src = videoUrl;
    video.load();
  } else {
    video.src = videoUrl;
    video.load();
  }
});
