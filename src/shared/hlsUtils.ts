/**
 * HLS Utilities
 * 
 * Shared HLS.js helper functions to avoid duplicate implementations.
 */

import Hls from 'hls.js';

import { createLogger } from '@/core/Logger';

const logger = createLogger({ module: 'HlsUtils' });

export interface HlsPlayerResult {
  hls: Hls | null;
  isNative: boolean;
}

/**
 * Create and attach HLS player to a video element.
 * Returns the Hls instance if using hls.js, or null if using native playback.
 */
export function createHlsPlayer(
  videoElement: HTMLVideoElement,
  url: string,
  onManifestParsed?: () => void,
  onError?: (error: string) => void
): HlsPlayerResult {
  // Check if URL is HLS
  const isHlsUrl = url.includes('.m3u8') || url.includes('application/x-mpegURL');

  if (isHlsUrl && Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(videoElement);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoElement.play().catch(() => {});
      onManifestParsed?.();
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        logger.warn('HLS Fatal Error', { type: data.type });
        onError?.(`HLS Error: ${data.type}`);
      }
    });

    return { hls, isNative: false };
  }

  // Native HLS support (Safari) or non-HLS video
  if (videoElement.canPlayType('application/vnd.apple.mpegurl') && isHlsUrl) {
    videoElement.src = url;
    videoElement.load();
    onManifestParsed?.();
    return { hls: null, isNative: true };
  }

  // Regular video
  videoElement.src = url;
  videoElement.load();
  onManifestParsed?.();
  return { hls: null, isNative: false };
}

/**
 * Properly destroy HLS player instance.
 */
export function destroyHlsPlayer(hls: Hls | null): void {
  if (hls) {
    try {
      hls.stopLoad();
      hls.detachMedia();
      hls.destroy();
    } catch (e) {
      logger.warn('Error destroying HLS player', { error: String(e) });
    }
  }
}

/**
 * Check if a URL is an HLS stream.
 */
export function isHlsUrl(url: string): boolean {
  return url.includes('.m3u8') || url.includes('application/x-mpegURL');
}
