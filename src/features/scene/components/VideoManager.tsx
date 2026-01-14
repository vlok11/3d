import Hls from 'hls.js';
import { useEffect, useState, useRef, memo } from 'react';
import { VideoTexture, SRGBColorSpace, LinearMipmapLinearFilter, LinearFilter } from 'three';

import { useSceneStore } from '@/shared/store';

interface VideoManagerProps {
  videoUrl: string | null;
  onTextureReady: (texture: VideoTexture | null) => void;
}

export const VideoManager = memo<VideoManagerProps>(({ videoUrl, onTextureReady }) => {
  const config = useSceneStore((state) => state.config);
  const [videoTexture, setVideoTexture] = useState<VideoTexture | null>(null);

  const isPowerOfTwo = (value: number): boolean => (value & (value - 1)) === 0;
  
  // 保存当前配置的引用，避免依赖数组问题
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (!videoUrl) { 
      setVideoTexture(null); 
      return; 
    }
    
    let isMounted = true;
    const vid = document.createElement('video');
    vid.crossOrigin = 'Anonymous';
    vid.loop = true;
    vid.muted = configRef.current.videoMuted; 
    vid.volume = 1.0; 
    vid.playsInline = true;
    vid.autoplay = true;

    let hls: Hls | null = null;
    let texture: VideoTexture | null = null;

    const setupTexture = () => {
      if (!isMounted) return;
      // Ensure video dimensions are available before creating texture
      if (!vid.videoWidth || !vid.videoHeight) return;
      texture = new VideoTexture(vid);
      texture.colorSpace = SRGBColorSpace;

      const canUseMipmaps =
        configRef.current.enableFrameInterpolation &&
        isPowerOfTwo(vid.videoWidth) &&
        isPowerOfTwo(vid.videoHeight);

      texture.minFilter = canUseMipmaps ? LinearMipmapLinearFilter : LinearFilter;
      texture.magFilter = LinearFilter;
      texture.generateMipmaps = canUseMipmaps;
      setVideoTexture(texture);
    };

    // Wait for metadata to ensure valid texture creation
    vid.onloadedmetadata = () => setupTexture();

    if (videoUrl.includes('.m3u8') && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(vid);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { vid.play().catch(() => {}); });
    } else {
      vid.src = videoUrl;
      vid.play().catch(() => {});
    }
    
    return () => { 
      isMounted = false;
      // 完整清理 HLS
      if (hls) {
        hls.stopLoad();
        hls.detachMedia();
        hls.destroy();
      }
      // 完整清理 video 元素
      vid.pause();
      vid.removeAttribute('src');
      vid.load(); // 强制释放资源
      // 清理纹理
      if (texture) {texture.dispose();} 
    };
  }, [videoUrl]); 

  useEffect(() => {
    if (videoTexture?.image) {
      videoTexture.image.muted = config.videoMuted;
    }
  }, [videoTexture, config.videoMuted]);

  useEffect(() => {
    if (videoTexture) {
      const vid = videoTexture.image as HTMLVideoElement | undefined;
      const w = vid?.videoWidth ?? 0;
      const h = vid?.videoHeight ?? 0;
      const canUseMipmaps =
        config.enableFrameInterpolation &&
        w > 0 &&
        h > 0 &&
        isPowerOfTwo(w) &&
        isPowerOfTwo(h);

      videoTexture.minFilter = canUseMipmaps ? LinearMipmapLinearFilter : LinearFilter;
      videoTexture.generateMipmaps = canUseMipmaps;
      videoTexture.needsUpdate = true;
    }
  }, [videoTexture, config.enableFrameInterpolation]);
  // Use ref to avoid infinite loop from callback reference changes
  const onTextureReadyRef = useRef(onTextureReady);
  onTextureReadyRef.current = onTextureReady;
  
  useEffect(() => {
    onTextureReadyRef.current(videoTexture);
  }, [videoTexture]); // Only depend on videoTexture, not the callback

  return null;
});

VideoManager.displayName = 'VideoManager';
