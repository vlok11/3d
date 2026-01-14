/**
 * SceneViewer - 3D 场景查看器
 * 
 * 职责：组合 Canvas、场景内容、录制导出等子组件
 * - 使用 useColorGrade 处理色彩分级
 * - 使用 useVideoControl 处理视频控制
 * - 委托 SceneContent 处理场景渲染
 */

import { Preload } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useRef, useEffect, forwardRef, useImperativeHandle, memo } from 'react';
import { type Group, type VideoTexture, ACESFilmicToneMapping } from 'three';

import { getEventBus } from '@/core/EventBus';
import { TrackingEvents } from '@/core/EventTypes';
import { createLogger } from '@/core/Logger';
import { CoreControllerProvider, calculatePresetPose, calculateDistance } from '@/services/camera';
import { PerformanceOverlay } from '@/shared/components.tsx';
import { loadImageDataFromUrl, mapMediaPixelToDisplacedWorldPoint, pickFirstIntersectionFromElementPoint, sampleImageDataGray01, uvAndDepthToWorldPointOnPlane, uvToPlaneLocal, planeLocalToWorld } from '@/shared/coordinates';
import { useSceneStore } from '@/shared/store';
import { MirrorMode, RenderStyle } from '@/shared/types';

import { CameraRig, SceneRecorder, SceneExporter, type RecordingRef, type ExporterRef } from './components';
import { SceneContent } from './components/SceneContent';
import { useColorGrade, useVideoControl } from './hooks';

import type { CameraPresetType } from '@/services/camera';
import type { CameraViewPreset } from '@/shared/types';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

// ============================================================================
// ToneMappingEffect
// ============================================================================

interface ToneMappingEffectProps {
  exposure: number;
}

const ToneMappingEffect = memo(({ exposure }: ToneMappingEffectProps) => {
  const { gl } = useThree();
  
  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  
  return null;
});

ToneMappingEffect.displayName = 'ToneMappingEffect';

interface CoordinateDebugProps {
  sceneGroupRef: React.RefObject<Group>;
  planeWidth: number;
  planeHeight: number;
  depthUrl: string;
}

const coordLogger = createLogger({ module: 'CoordinateDebug' });

const CoordinateDebug = memo(({ sceneGroupRef, planeWidth, planeHeight, depthUrl }: CoordinateDebugProps) => {
  const { camera, gl, scene } = useThree();
  const displacementScale = useSceneStore((s) => s.config.displacementScale);
  const depthInvert = useSceneStore((s) => s.config.depthInvert);
  const depthImageRef = useRef<ImageData | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    let cancelled = false;
    depthImageRef.current = null;

    const load = async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load depth image'));
          img.src = depthUrl;
        });
        if (cancelled) return;

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Cannot get depth canvas context');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
        if (cancelled) return;
        depthImageRef.current = imageData;
      } catch (e) {
        coordLogger.warn('Depth image load failed', { error: String(e) });
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [depthUrl]);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    const bus = getEventBus();
    const lastLogAtRef = { current: 0 };

    const handle = (payload: unknown) => {
      const p = payload as { position?: { x: number; y: number } } | null;
      if (!p?.position) return;

      const now = performance.now();
      if (now - lastLogAtRef.current < 200) return;
      lastLogAtRef.current = now;

      const root = sceneGroupRef.current ?? scene;
      const mesh = root.getObjectByName('SceneMesh') ?? root.getObjectByName('ScenePoints');
      if (!mesh) return;

      const hit = pickFirstIntersectionFromElementPoint({
        point: p.position,
        element: gl.domElement,
        camera,
        objects: mesh,
        recursive: true
      });
      if (!hit?.screenUv) return;

      const planeLocal = uvToPlaneLocal(hit.screenUv, planeWidth, planeHeight);
      const planeWorld = planeLocalToWorld(planeLocal, mesh);

      const depthImage = depthImageRef.current;
      const depth01 = depthImage ? sampleImageDataGray01({ image: depthImage, uv: hit.screenUv, mode: 'bilinear' }) : null;

      const scale = depthInvert ? -displacementScale : displacementScale;
      const bias = -scale / 2;
      const displacedWorld = depth01 === null ? null : uvAndDepthToWorldPointOnPlane({
        uv: hit.screenUv,
        depth01,
        planeWidth,
        planeHeight,
        planeObject: mesh,
        displacementScale: scale,
        displacementBias: bias
      });

      // Coordinate debug logging disabled - uncomment to debug
      // coordLogger.info('coord', {
      //   elementPoint: p.position,
      //   screenUv: hit.screenUv,
      //   planeLocal,
      //   planeWorld,
      //   hitWorld: hit.worldPoint,
      //   depth01,
      //   displacedWorld
      // });
    };

    const offStart = bus.on('input:interaction-start', handle);
    const offUpdate = bus.on('input:interaction-update', handle);
    return () => {
      offStart();
      offUpdate();
    };
  }, [camera, depthInvert, displacementScale, gl, planeHeight, planeWidth, scene, sceneGroupRef]);

  return null;
});

CoordinateDebug.displayName = 'CoordinateDebug';

interface TrackingBridgeProps {
  sceneGroupRef: React.RefObject<Group>;
  planeWidth: number;
  planeHeight: number;
  depthUrl: string;
}

const trackingLogger = createLogger({ module: 'TrackingBridge' });

const TrackingBridge = memo(({ sceneGroupRef, planeWidth, planeHeight, depthUrl }: TrackingBridgeProps) => {
  const displacementScale = useSceneStore((s) => s.config.displacementScale);
  const depthInvert = useSceneStore((s) => s.config.depthInvert);
  const depthImageRef = useRef<ImageData | null>(null);

  useEffect(() => {
    let cancelled = false;
    depthImageRef.current = null;

    const load = async () => {
      try {
        const imageData = await loadImageDataFromUrl(depthUrl);
        if (cancelled) return;
        depthImageRef.current = imageData;
      } catch (e) {
        trackingLogger.warn('Depth image load failed', { error: String(e) });
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [depthUrl]);

  useEffect(() => {
    const bus = getEventBus();

    const off = bus.on(TrackingEvents.POINT_2D, (p) => {
      const planeObject = sceneGroupRef.current;
      const depthImage = depthImageRef.current;
      if (!planeObject || !depthImage) return;

      const scale = depthInvert ? -displacementScale : displacementScale;
      const bias = -scale / 2;
      const { uv, depth01, world } = mapMediaPixelToDisplacedWorldPoint({
        pixel: p.pixel,
        mediaWidth: p.mediaWidth,
        mediaHeight: p.mediaHeight,
        depthImage,
        planeWidth,
        planeHeight,
        planeObject,
        displacementScale: scale,
        displacementBias: bias,
        flipX: p.flipX,
        flipY: p.flipY,
        sampleMode: 'bilinear'
      });

      bus.emit(TrackingEvents.POINT_3D, {
        uv,
        depth01,
        world,
        timestamp: p.timestamp,
        source: p.source
      });
    });

    return () => { off(); };
  }, [depthInvert, displacementScale, planeHeight, planeWidth, sceneGroupRef]);

  return null;
});

TrackingBridge.displayName = 'TrackingBridge';

const simulatedTrackerLogger = createLogger({ module: 'SimulatedTracker' });

const SimulatedTracker = memo(() => {
  const { gl } = useThree();
  const mirrorMode = useSceneStore((s) => s.config.mirrorMode);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    const bus = getEventBus();
    const lastEmitAtRef = { current: 0 };

    const handle = (payload: unknown) => {
      const p = payload as { position?: { x: number; y: number } } | null;
      if (!p?.position) return;

      const now = performance.now();
      if (now - lastEmitAtRef.current < 33) return;
      lastEmitAtRef.current = now;

      const rect = gl.domElement.getBoundingClientRect();
      const mediaWidth = Math.max(1, Math.round(rect.width));
      const mediaHeight = Math.max(1, Math.round(rect.height));

      const px = Math.max(0, Math.min(mediaWidth - 1, p.position.x));
      const py = Math.max(0, Math.min(mediaHeight - 1, p.position.y));

      const flipX = mirrorMode === MirrorMode.HORIZONTAL || mirrorMode === MirrorMode.QUAD;
      const flipY = mirrorMode === MirrorMode.VERTICAL || mirrorMode === MirrorMode.QUAD;

      try {
        bus.emit(TrackingEvents.POINT_2D, {
          pixel: { x: px, y: py },
          mediaWidth,
          mediaHeight,
          flipX,
          flipY,
          timestamp: now,
          source: 'user'
        });
      } catch (e) {
        simulatedTrackerLogger.warn('Emit tracking point2d failed', { error: String(e) });
      }
    };

    const offStart = bus.on('input:interaction-start', handle);
    const offUpdate = bus.on('input:interaction-update', handle);
    return () => {
      offStart();
      offUpdate();
    };
  }, [gl, mirrorMode]);

  return null;
});

SimulatedTracker.displayName = 'SimulatedTracker';

// ============================================================================
// SceneViewer
// ============================================================================

export interface SceneViewerHandle {
  exportScene: () => void;
  downloadSnapshot: () => void;
  captureVideoFrame: () => void;
  startRecording: (withAudio?: boolean) => void;
  stopRecording: () => void;
  seekVideo: (time: number) => void;
  setCameraView: (view: CameraViewPreset) => void;
}

interface SceneViewerProps {
  imageUrl: string | null;
  depthUrl: string | null;
  backgroundUrl: string | null;
  videoUrl: string | null;
  aspectRatio: number;
  isVideoPlaying: boolean;
  onVideoTimeUpdate?: (time: number) => void;
  onVideoDurationChange?: (duration: number) => void;
  onVideoEnded?: () => void;
}

export const SceneViewer = memo(forwardRef<SceneViewerHandle, SceneViewerProps>(
  (props, ref) => {
    const {
      imageUrl,
      depthUrl,
      backgroundUrl,
      videoUrl,
      aspectRatio,
      isVideoPlaying,
      onVideoTimeUpdate,
      onVideoDurationChange,
      onVideoEnded
    } = props;

    // Store selectors
    const renderStyle = useSceneStore((state) => state.config.renderStyle);
    const hologramType = useSceneStore((state) => state.config.hologramType);
    const enableVignette = useSceneStore((state) => state.config.enableVignette);
    const exposure = useSceneStore((state) => state.config.exposure);
    const config = useSceneStore((state) => state.config);

    // Refs
    const exporterRef = useRef<ExporterRef>(null);
    const recorderRef = useRef<RecordingRef>(null);
    const controlsRef = useRef<OrbitControlsType | null>(null);
    const videoTextureRef = useRef<VideoTexture | null>(null);
    const sceneGroupRef = useRef<Group>(null);

    // Hooks
    const colorGradeStyle = useColorGrade();
    const { seek } = useVideoControl({
      videoTextureRef,
      isPlaying: isVideoPlaying,
      onTimeUpdate: onVideoTimeUpdate,
      onDurationChange: onVideoDurationChange,
      onEnded: onVideoEnded
    });

    // Imperative handle
    useImperativeHandle(ref, () => ({
      exportScene: () => exporterRef.current?.exportScene(),
      downloadSnapshot: () => exporterRef.current?.downloadSnapshot(),
      captureVideoFrame: () => recorderRef.current?.captureVideoFrame(),
      startRecording: (withAudio) => recorderRef.current?.startRecording(withAudio),
      stopRecording: () => recorderRef.current?.stopRecording(),
      seekVideo: seek,
      setCameraView: (view) => {
        const controls = controlsRef.current;
        if (!controls) return;
        
        const camera = controls.object;
        const currentDist = calculateDistance(
          { x: camera.position.x, y: camera.position.y, z: camera.position.z },
          { x: controls.target.x, y: controls.target.y, z: controls.target.z }
        );
        const presetPose = calculatePresetPose(view as CameraPresetType, currentDist);
        camera.position.set(presetPose.position.x, presetPose.position.y, presetPose.position.z);
        controls.target.set(presetPose.target.x, presetPose.target.y, presetPose.target.z);
        controls.update();
      }
    }));

    // Early return if no image
    if (!imageUrl || !depthUrl) return null;

    const planeWidth = 10;
    const planeHeight = planeWidth / aspectRatio;

    return (
      <div
        className="w-full h-full bg-black relative rounded-lg overflow-hidden shadow-2xl border border-zinc-800 transition-all duration-200"
        style={colorGradeStyle}
      >
        <PerformanceOverlay visible position="bottom-left" />
        
        {/* Vignette overlay */}
        {enableVignette && (
          <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.8)_100%)] mix-blend-multiply" />
        )}
        
        {/* Hologram indicator */}
        {renderStyle === RenderStyle.HOLOGRAPHIC && (
          <div className="absolute top-4 right-4 z-10 text-cyan-400 text-xs font-mono animate-pulse border border-cyan-500/50 px-2 py-1 rounded bg-cyan-900/20 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
            HOLOGRAM ACTIVE · {hologramType}
          </div>
        )}
        
        {/* Three.js Canvas */}
        <CoreControllerProvider autoInit>
          <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
            <ToneMappingEffect exposure={exposure} />
            <CoordinateDebug sceneGroupRef={sceneGroupRef} planeWidth={planeWidth} planeHeight={planeHeight} depthUrl={depthUrl} />
            <TrackingBridge sceneGroupRef={sceneGroupRef} planeWidth={planeWidth} planeHeight={planeHeight} depthUrl={depthUrl} />
            <SimulatedTracker />
            <CameraRig config={config} controlsRef={controlsRef}>
              <SceneContent
                imageUrl={imageUrl}
                depthUrl={depthUrl}
                backgroundUrl={backgroundUrl}
                videoUrl={videoUrl}
                aspectRatio={aspectRatio}
                videoTextureRef={videoTextureRef}
                sceneGroupRef={sceneGroupRef}
              />
            </CameraRig>
            <SceneRecorder ref={recorderRef} videoTexture={videoTextureRef.current} />
            <SceneExporter ref={exporterRef} sceneGroupRef={sceneGroupRef} />
            <Preload all />
          </Canvas>
        </CoreControllerProvider>
      </div>
    );
  }
));

SceneViewer.displayName = 'SceneViewer';
