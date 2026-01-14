/**
 * useVideoControl - 视频控制 Hook
 * 
 * 职责：管理视频播放状态和事件监听
 */

import { useEffect, useCallback, useRef } from 'react';

import type { VideoTexture } from 'three';

export interface VideoControlOptions {
  videoTextureRef: React.MutableRefObject<VideoTexture | null>;
  isPlaying: boolean;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
}

export interface VideoControlReturn {
  seek: (time: number) => void;
}

export function useVideoControl({
  videoTextureRef,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  onEnded
}: VideoControlOptions): VideoControlReturn {
  const callbacksRef = useRef({ onTimeUpdate, onDurationChange, onEnded });
  const lastDurationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const boundVideoRef = useRef<HTMLVideoElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    callbacksRef.current = { onTimeUpdate, onDurationChange, onEnded };
  }, [onTimeUpdate, onDurationChange, onEnded]);
  
  // Sync play/pause state
  useEffect(() => {
    const video = videoTextureRef.current?.image as HTMLVideoElement | undefined;
    if (!video) return;
    
    if (isPlaying && video.paused) {
      void video.play().catch(() => { /* Ignore play errors */ });
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying, videoTextureRef]);

  // Setup event listeners
  useEffect(() => {
    const attachIfNeeded = (): void => {
      const video = videoTextureRef.current?.image as HTMLVideoElement | undefined;
      if (!video) return;
      if (boundVideoRef.current === video) return;

      cleanupRef.current?.();
      boundVideoRef.current = video;
      lastDurationRef.current = null;
      lastTimeRef.current = null;

      const handleTimeUpdate = () => {
        const t = video.currentTime;
        if (lastTimeRef.current !== t) {
          lastTimeRef.current = t;
          callbacksRef.current.onTimeUpdate?.(t);
        }
      };

      const handleDurationChange = () => {
        const d = video.duration;
        if (!d || isNaN(d)) return;
        if (lastDurationRef.current !== d) {
          lastDurationRef.current = d;
          callbacksRef.current.onDurationChange?.(d);
        }
      };

      const handleEnded = () => {
        callbacksRef.current.onEnded?.();
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('durationchange', handleDurationChange);
      video.addEventListener('ended', handleEnded);

      handleDurationChange();

      cleanupRef.current = () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('durationchange', handleDurationChange);
        video.removeEventListener('ended', handleEnded);
      };
    };

    attachIfNeeded();
    const id = window.setInterval(attachIfNeeded, 300);

    return () => {
      window.clearInterval(id);
      cleanupRef.current?.();
      cleanupRef.current = null;
      boundVideoRef.current = null;
    };
  }, [videoTextureRef]);

  const seek = useCallback((time: number) => {
    const video = videoTextureRef.current?.image as HTMLVideoElement | undefined;
    if (video) {
      video.currentTime = time;
    }
  }, [videoTextureRef]);

  return { seek };
}
