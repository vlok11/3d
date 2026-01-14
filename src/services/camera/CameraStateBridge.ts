/**
 * CameraStateBridge - 统一相机状态管理
 * 
 * 职责：作为 Service 层与 Zustand Store 之间的桥接层
 * - Service 层通过此模块读写状态
 * - 避免 Service 维护独立状态导致的同步问题
 * - 提供类型安全的状态访问接口
 */

import { useCameraStore } from '@/shared/store';

import type { CameraPose } from '@/shared/types';

// ============================================================================
// Camera State Bridge
// ============================================================================

export interface CameraStateAccessor {
  // Pose
  getPose(): CameraPose;
  setPose(pose: Partial<CameraPose>, source?: 'user' | 'motion' | 'preset' | 'animation'): void;
  
  // Interaction
  isInteracting(): boolean;
  getInteractionType(): string;
  startInteraction(type: 'rotate' | 'pan' | 'zoom' | 'touch'): void;
  endInteraction(): void;
  
  // Base Pose (for motion blending)
  getBasePose(): CameraPose | null;
  captureBasePose(): void;
  clearBasePose(): void;
  
  // Motion
  getMotionState(): {
    isActive: boolean;
    isPaused: boolean;
    type: string;
    progress: number;
  };
  startMotion(type: string): void;
  stopMotion(): void;
  pauseMotion(): void;
  resumeMotion(): void;
  updateMotionProgress(progress: number): void;
  
  // Bookmarks
  getBookmarks(): Array<{ id: string; name: string; pose: CameraPose; createdAt: number }>;
  addBookmark(name: string): string;
  removeBookmark(id: string): void;
  applyBookmark(id: string): void;
  
  // History
  canUndo(): boolean;
  undo(): void;
  
  // Reset
  reset(): void;
}

/**
 * 创建相机状态访问器
 * 所有状态操作都通过 Zustand Store 进行
 */
export function createCameraStateAccessor(): CameraStateAccessor {
  const store = useCameraStore;
  
  return {
    // ========== Pose ==========
    getPose(): CameraPose {
      const state = store.getState();
      return {
        position: { ...state.pose.position },
        target: { ...state.pose.target },
        up: { ...state.pose.up },
        fov: state.pose.fov
      };
    },
    
    setPose(pose: Partial<CameraPose>, source = 'user'): void {
      store.getState().setPose(pose, source as 'user' | 'motion' | 'preset' | 'reset');
    },
    
    // ========== Interaction ==========
    isInteracting(): boolean {
      return store.getState().interaction.isInteracting;
    },
    
    getInteractionType(): string {
      return store.getState().interaction.interactionType;
    },
    
    startInteraction(type: 'rotate' | 'pan' | 'zoom' | 'touch'): void {
      store.getState().startInteraction(type);
    },
    
    endInteraction(): void {
      store.getState().endInteraction();
    },
    
    // ========== Base Pose ==========
    getBasePose(): CameraPose | null {
      return store.getState().basePose;
    },
    
    captureBasePose(): void {
      store.getState().captureBasePose();
    },
    
    clearBasePose(): void {
      store.getState().clearBasePose();
    },
    
    // ========== Motion ==========
    getMotionState() {
      const { motion } = store.getState();
      return {
        isActive: motion.isActive,
        isPaused: motion.isPaused,
        type: motion.type,
        progress: motion.progress
      };
    },
    
    startMotion(type: string): void {
      store.getState().startMotion(type);
    },
    
    stopMotion(): void {
      store.getState().stopMotion();
    },
    
    pauseMotion(): void {
      store.getState().pauseMotion();
    },
    
    resumeMotion(): void {
      store.getState().resumeMotion();
    },
    
    updateMotionProgress(progress: number): void {
      store.getState().updateMotionProgress(progress);
    },
    
    // ========== Bookmarks ==========
    getBookmarks() {
      return store.getState().bookmarks.map(b => ({
        id: b.id,
        name: b.name,
        pose: { ...b.pose },
        createdAt: b.createdAt
      }));
    },
    
    addBookmark(name: string): string {
      store.getState().addBookmark(name);
      const bookmarks = store.getState().bookmarks;
      return bookmarks[bookmarks.length - 1]?.id ?? '';
    },
    
    removeBookmark(id: string): void {
      store.getState().removeBookmark(id);
    },
    
    applyBookmark(id: string): void {
      store.getState().applyBookmark(id);
    },
    
    // ========== History ==========
    canUndo(): boolean {
      return store.getState().history.length > 1;
    },
    
    undo(): void {
      store.getState().undo();
    },
    
    // ========== Reset ==========
    reset(): void {
      store.getState().reset();
    }
  };
}

// 单例访问器
let stateAccessor: CameraStateAccessor | null = null;

export function getCameraStateAccessor(): CameraStateAccessor {
  stateAccessor ??= createCameraStateAccessor();
  return stateAccessor;
}

export function resetCameraStateAccessor(): void {
  stateAccessor = null;
}
