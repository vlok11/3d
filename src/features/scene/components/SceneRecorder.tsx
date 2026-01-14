import { useThree } from '@react-three/fiber';
import { useRef, useImperativeHandle, forwardRef, memo, useEffect } from 'react';

import { createLogger } from '@/core/Logger';

import type { VideoTexture } from 'three';


const logger = createLogger({ module: 'SceneRecorder' });

export interface RecordingRef {
  startRecording: (withAudio?: boolean) => void;
  stopRecording: () => void;
  captureVideoFrame: () => void;
}

interface SceneRecorderProps {
  videoTexture: VideoTexture | null;
}

export const SceneRecorder = memo(forwardRef<RecordingRef, SceneRecorderProps>(({ videoTexture }, ref) => {
  const { gl } = useThree();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const wasMutedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => { try { track.stop(); } catch { /* ignore */ } });
        mediaStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
      recordedChunksRef.current = [];
    }, []);

  const getVideoElement = () => videoTexture?.image;

  const startRecording = (withAudio = false) => {
    // Prevent duplicate recording
    if (mediaRecorderRef.current?.state === 'recording') {
      logger.warn('Recording already in progress, ignoring duplicate start');
      return;
    }

    const canvas = gl.domElement;
    if (!canvas) {return;}

    const canvasStream = canvas.captureStream(60);
    const tracks = [...canvasStream.getVideoTracks()];

    if (withAudio && videoTexture) {
      const video = getVideoElement();
      if (video) {
        wasMutedRef.current = video.muted;
        if (video.muted) { video.muted = false; }

        try {
          const videoWithCapture = video as HTMLVideoElement & {
            captureStream?: () => MediaStream;
            mozCaptureStream?: () => MediaStream;
          };
          const videoStream = videoWithCapture.captureStream?.() ?? videoWithCapture.mozCaptureStream?.() ?? null;
          if (videoStream) {
            const firstTrack = videoStream.getAudioTracks()[0];
            if (firstTrack) { tracks.push(firstTrack); }
            else if (wasMutedRef.current) { video.muted = true; }
          }
        } catch (e) {
          logger.warn('Audio capture failed', { error: String(e) });
          if (wasMutedRef.current) {video.muted = true;}
        }
      }
    }

    const combinedStream = new MediaStream(tracks);
    mediaStreamRef.current = combinedStream;

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {mimeType = 'video/webm;codecs=vp8,opus';}
    if (!MediaRecorder.isTypeSupported(mimeType)) {mimeType = 'video/webm';}

    const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 30000000 });
    recordedChunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) { recordedChunksRef.current.push(event.data); }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording_${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);

      const video = getVideoElement();
      if (wasMutedRef.current && video) {video.muted = true;}

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => { track.stop(); });
        mediaStreamRef.current = null;
      }
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const captureVideoFrame = () => {
    const video = getVideoElement();
    if (!video) {return;}

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = url;
      link.download = `frame_${video.currentTime.toFixed(2)}s.png`;
      link.click();
    }
  };

  useImperativeHandle(ref, () => ({ startRecording, stopRecording, captureVideoFrame }));

  return null;
}));

SceneRecorder.displayName = 'SceneRecorder';
