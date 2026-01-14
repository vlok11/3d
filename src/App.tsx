/**
 * Main Application Component
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';

import { bootstrap } from '@/app/index';
import { ControlPanel } from '@/features/controls';
import { SceneViewer, type SceneViewerHandle } from '@/features/scene';
import { UploadPanel, StatusDisplay } from '@/features/upload';
import { createUploadPipeline } from '@/features/upload/pipeline';
import { AppHeader, MobileDrawer } from '@/shared/components';
import { useSceneConfigSubscriber } from '@/shared/hooks/useSceneConfigSubscriber';
import { useCameraStore, useSceneStore } from '@/shared/store';
import { CameraMotionType } from '@/shared/types';
import { useSessionStore } from '@/stores/useSessionStore';

import type { CameraViewPreset, ProcessingState } from '@/shared/types';

type AppCameraView = CameraViewPreset | 'default';

const App = memo(() => {
  // Global Session State
  // Global Session State
  const { 
    status, 
    progress, 
    statusMessage, 
    currentAsset,
    processedResult,
    videoState,
    uploadStart,
    updateProgress,
    uploadComplete,
    uploadError,
    resetSession,
    // Video Actions
    setVideoTime,
    setVideoDuration,
    togglePlay: toggleVideoPlay,
    // setMuted: setVideoMuted // Unused
  } = useSessionStore();

  // Local UI State
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeCameraView, setActiveCameraView] = useState<AppCameraView>('default');
  const [isRecording, setIsRecording] = useState(false);

  // Refs
  const sceneRef = useRef<SceneViewerHandle>(null);
  const bootstrapRef = useRef(false);
  const pipelineRef = useRef(createUploadPipeline());

  // Store
  const { setConfig } = useSceneStore();
  const resetCamera = useCameraStore(s => s.resetCamera);

  // Subscribe to session events for config application
  useSceneConfigSubscriber();

  // Bootstrap
  useEffect(() => {
    if (bootstrapRef.current) return;
    bootstrapRef.current = true;
    bootstrap().catch(console.error);
    
    // Bind pipeline callbacks to store actions
    const pipeline = pipelineRef.current;
    
    pipeline.onProgress((p) => {
      if (p.stage === 'complete') return;
      // Map pipeline stages to session status
      const statusMap: Record<string, 'analyzing' | 'processing_depth'> = {
        'analyze': 'analyzing',
        'depth': 'processing_depth'
      };
      const sessionStatus = statusMap[p.stage] ?? 'analyzing';
      updateProgress(sessionStatus, p.progress, p.message);
    });

    pipeline.onError((err) => {
      uploadError(err.message);
    });

    pipeline.onComplete((result) => {
      uploadComplete(result);
    });

  }, [updateProgress, uploadComplete, uploadError]);

  const processInput = useCallback(async (input: File | string) => {
    uploadStart();
    resetCamera();
    try {
      await pipelineRef.current.process(input);
    } catch (error) {
      console.error(error);
    }
  }, [uploadStart, resetCamera]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void processInput(file);
    }
  }, [processInput]);

  const handleUrlSubmit = useCallback(() => {
    if (urlInput.trim()) {
      void processInput(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    }
  }, [urlInput, processInput]);

  const handleRetry = useCallback(() => {
    // Cancel pipeline first to prevent state pollution, then reset
    pipelineRef.current.cancel();
    resetSession();
  }, [resetSession]);

  // Camera view
  const handleSetCameraView = useCallback((view: CameraViewPreset) => {
    setActiveCameraView(view);
    setConfig({ cameraMotionType: CameraMotionType.STATIC });
    sceneRef.current?.setCameraView(view);
  }, [setConfig]);

  // Video controls
  const handleVideoSeek = useCallback((time: number) => {
    sceneRef.current?.seekVideo?.(time);
    setVideoTime(time);
  }, [setVideoTime]);

  // Export actions
  const handleExportScene = useCallback(() => {
    sceneRef.current?.exportScene();
  }, []);

  const handleDownloadSnapshot = useCallback(() => {
    sceneRef.current?.downloadSnapshot();
  }, []);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      sceneRef.current?.stopRecording();
      setIsRecording(false);
    } else {
      sceneRef.current?.startRecording(true); // Default with audio if available
      setIsRecording(true);
    }
  }, [isRecording]);


  // Render states
  const showUpload = status === 'idle';
  const showProcessing = ['uploading', 'analyzing', 'processing_depth'].includes(status);
  const showScene = status === 'ready' && currentAsset && processedResult;
  const isVideo = currentAsset?.type === 'video';

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden flex flex-col">
      <AppHeader />
      
      <main className="flex-1 flex overflow-hidden">
        {showUpload && (
          <div className="flex-1 flex items-center justify-center">
            <UploadPanel
              showUrlInput={showUrlInput}
              setShowUrlInput={setShowUrlInput}
              urlInput={urlInput}
              setUrlInput={setUrlInput}
              onFileUpload={handleFileUpload}
              onUrlSubmit={handleUrlSubmit}
              acceptedFormats=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov"
            />
          </div>
        )}

        {showProcessing && (
          <div className="flex-1 flex items-center justify-center">
            <StatusDisplay 
              processingState={{
                status: status === 'processing_depth' ? 'generating_depth' : status as ProcessingState['status'],
                progress,
                message: statusMessage
              }} 
              onRetry={handleRetry} 
            />
          </div>
        )}

        {showScene && (
          <>
            <div className="flex-1 relative">
              <SceneViewer
                ref={sceneRef}
                imageUrl={processedResult.imageUrl}
                depthUrl={processedResult.depthMapUrl}
                backgroundUrl={processedResult.backgroundUrl ?? null}
                videoUrl={processedResult.asset.type === 'video' ? processedResult.asset.sourceUrl : null}
                aspectRatio={processedResult.asset.aspectRatio}
                isVideoPlaying={videoState.isPlaying}
                onVideoTimeUpdate={setVideoTime}
                onVideoDurationChange={setVideoDuration}
                onVideoEnded={() => toggleVideoPlay()} // Pause on end
              />
            </div>
            
            <div className="w-80 border-l border-zinc-800 overflow-y-auto">
              <ControlPanel
                hasVideo={isVideo}
                videoState={videoState}
                onVideoTogglePlay={toggleVideoPlay}
                onVideoSeek={handleVideoSeek}
                onSetCameraView={handleSetCameraView}
                activeCameraView={activeCameraView === 'default' ? null : activeCameraView}
                onExportScene={handleExportScene}
                onDownloadSnapshot={handleDownloadSnapshot}
                onToggleRecording={handleToggleRecording}
                isRecording={isRecording}
              />
            </div>
          </>
        )}
      </main>

      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        onOpen={() => setMobileDrawerOpen(true)}
      >
        {showScene && (
          <ControlPanel
            hasVideo={isVideo}
            videoState={videoState}
            onVideoTogglePlay={toggleVideoPlay}
            onVideoSeek={handleVideoSeek}
            onSetCameraView={handleSetCameraView}
            activeCameraView={activeCameraView === 'default' ? null : activeCameraView}
            onExportScene={handleExportScene}
            onDownloadSnapshot={handleDownloadSnapshot}
            onToggleRecording={handleToggleRecording}
            isRecording={isRecording}
          />
        )}
      </MobileDrawer>
    </div>
  );
});

App.displayName = 'App';

export { App };
