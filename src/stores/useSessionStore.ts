/**
 * Session Store
 * 
 * Manages the global application lifecycle (Upload -> Process -> View).
 * Emits events for state changes instead of direct store calls.
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import { isValidStatusTransition, SESSION_STATUS_TRANSITIONS } from '@/core/domain/types';
import { getEventBus } from '@/core/EventBus';
import { UploadEvents, MediaEvents, SessionEvents } from '@/core/EventTypes';
import { SceneConfigurator } from '@/core/logic/SceneConfigurator';

import type { Asset, ProcessedAsset, SessionStatus } from '@/core/domain/types';

// Re-export SessionStatus from domain
export type { SessionStatus } from '@/core/domain/types';

// ============================================================================
// Types
// ============================================================================

export interface VideoPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
}

export interface ExportStateInfo {
  isExporting: boolean;
  progress: number;
  format: 'gltf' | 'glb' | 'png' | 'video' | null;
}

export interface SessionState {
  // Workflow
  status: SessionStatus;
  statusMessage: string;
  progress: number; // 0-100
  error: string | null;

  // Data
  currentAsset: Asset | null;
  processedResult: ProcessedAsset | null;
  
  // Playback
  videoState: VideoPlaybackState;
  
  // Export
  exportState: ExportStateInfo;

  // Actions
  uploadStart: () => void;
  updateProgress: (status: SessionStatus, progress: number, message?: string) => void;
  uploadComplete: (result: ProcessedAsset) => void;
  uploadError: (error: string) => void;
  resetSession: () => void;

  // Video Actions
  setVideoDuration: (duration: number) => void;
  setVideoTime: (time: number) => void;
  togglePlay: () => void;
  setMuted: (muted: boolean) => void;

  // Export Actions
  startExport: (format: ExportStateInfo['format']) => void;
  updateExportProgress: (progress: number) => void;
  finishExport: () => void;
}

// ============================================================================
// Helper: Validate and transition status
// ============================================================================

function validateTransition(from: SessionStatus, to: SessionStatus): boolean {
  if (!isValidStatusTransition(from, to)) {
    console.warn(
      `[SessionStore] Invalid status transition: ${from} -> ${to}. ` +
      `Valid transitions from "${from}": ${SESSION_STATUS_TRANSITIONS[from]?.join(', ') ?? 'none'}`
    );
    return false;
  }
  return true;
}

// ============================================================================
// Store
// ============================================================================

export const useSessionStore = create<SessionState>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        // Initial State
        status: 'idle',
        statusMessage: '',
        progress: 0,
        error: null,
        currentAsset: null,
        processedResult: null,
        videoState: {
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          isMuted: true
        },
        exportState: {
          isExporting: false,
          progress: 0,
          format: null
        },

        // Use Cases
        uploadStart: () => {
          const current = get().status;
          if (!validateTransition(current, 'uploading')) return;
          
          set({ status: 'uploading', progress: 0, error: null, statusMessage: '开始上传...' });
          getEventBus().emit(UploadEvents.STARTED, { 
            fileName: '', 
            fileType: '', 
            fileSize: 0 
          });
        },

        updateProgress: (status, progress, message) => {
          const current = get().status;
          // Allow same-status updates for progress
          if (current !== status && !validateTransition(current, status)) return;
          
          set({ status, progress, statusMessage: message ?? '' });
          getEventBus().emit(UploadEvents.PROGRESS, { progress, stage: status });
        },

        uploadComplete: (result) => {
          const current = get().status;
          if (!validateTransition(current, 'ready')) return;

          // 1. Save Data
          set({ 
            status: 'ready', 
            progress: 100, 
            statusMessage: '就绪', 
            currentAsset: result.asset,
            processedResult: result
          });

          // 2. Emit completion event
          getEventBus().emit(UploadEvents.COMPLETED, { result: result as unknown as Record<string, unknown> });
          getEventBus().emit(MediaEvents.LOADED, { 
            type: result.asset.type, 
            url: result.asset.sourceUrl 
          });

          // 3. Derive and apply config (side effect, but necessary for UX)
          const recommended = SceneConfigurator.deriveConfig({
            analysis: result.analysis,
            assetType: result.asset.type
          });
          // Emit event for scene module to handle config
          getEventBus().emit(SessionEvents.CONFIG_RECOMMENDED, { config: recommended });
        },

        uploadError: (error) => {
          const current = get().status;
          if (!validateTransition(current, 'error')) return;
          
          set({ status: 'error', error, statusMessage: '发生错误' });
          getEventBus().emit(UploadEvents.ERROR, { error, stage: current });
        },

        resetSession: () => {
          const current = get().status;
          if (!validateTransition(current, 'idle')) return;
          
          set({ 
            status: 'idle', 
            currentAsset: null, 
            processedResult: null, 
            progress: 0,
            error: null,
            statusMessage: ''
          });
          
          getEventBus().emit(MediaEvents.UNLOADED, undefined as unknown as void);
          getEventBus().emit(SessionEvents.RESET_REQUESTED, undefined as unknown as void);
        },

        // Video Controls
        setVideoDuration: (duration) => {
          set(s => ({ videoState: { ...s.videoState, duration } }));
        },
        
        setVideoTime: (time) => {
          set(s => ({ videoState: { ...s.videoState, currentTime: time } }));
        },
        
        togglePlay: () => {
          const newState = !get().videoState.isPlaying;
          set(s => ({ videoState: { ...s.videoState, isPlaying: newState } }));
          
          if (newState) {
            getEventBus().emit(MediaEvents.VIDEO_PLAY, undefined as unknown as void);
          } else {
            getEventBus().emit(MediaEvents.VIDEO_PAUSE, undefined as unknown as void);
          }
        },
        
        setMuted: (muted) => {
          set(s => ({ videoState: { ...s.videoState, isMuted: muted } }));
        },

        // Export Actions
        startExport: (format) => {
          set({ exportState: { isExporting: true, progress: 0, format } });
        },
        
        updateExportProgress: (progress) => {
          set(s => ({ exportState: { ...s.exportState, progress } }));
        },
        
        finishExport: () => {
          set({ exportState: { isExporting: false, progress: 100, format: null } });
        },
      })
    ),
    { name: 'SessionStore' }
  )
);
