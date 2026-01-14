/**
 * CameraService - 相机服务 (Facade 模式)
 * 
 * 职责：提供相机操作的业务接口，内部委托给 Store
 * - 不维护独立状态，所有状态存储在 useCameraStore
 * - 提供动画过渡、预设应用等高级功能
 * - 与 Three.js 相机同步
 */

import { getEventBus } from '@/core/EventBus';
import { DEFAULT_ANIMATION_DURATION } from '@/shared/constants';
import { useCameraStore } from '@/shared/store';
import { lerpVec3 } from '@/shared/utils';

import { getAnimationScheduler } from './AnimationScheduler';
import { calculatePresetPose, calculateDistance, type CameraPresetType } from './CameraPresets';

import type {
  ICameraService,
  CameraPose,
  CameraPreset,
  CameraBookmark,
  ProjectionType,
  TransitionOptions,
  Vec3,
  AnimationHandle
} from '@/shared/types';
import type { Camera } from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

class CameraServiceImpl implements ICameraService {
  private static instance: CameraServiceImpl | null = null;
  private projectionMode: ProjectionType = 'perspective';
  private animationId: AnimationHandle | null = null;

  private constructor() {}

  static getInstance(): CameraServiceImpl {
    CameraServiceImpl.instance ??= new CameraServiceImpl();
    return CameraServiceImpl.instance;
  }

  static resetInstance(): void {
    CameraServiceImpl.instance = null;
  }

  // ========== State Access (delegate to Store) ==========
  
  private get store() {
    return useCameraStore.getState();
  }

  getPose(): CameraPose {
    const { pose } = this.store;
    return {
      position: { ...pose.position },
      target: { ...pose.target },
      up: { ...pose.up },
      fov: pose.fov,
      near: 0.1,
      far: 1000
    };
  }

  setPose(newPose: Partial<CameraPose>, options?: TransitionOptions): void {
    const previousPose = this.getPose();

    if (options?.duration && options.duration > 0) {
      this.animatePose(previousPose, newPose, options);
    } else {
      this.store.setPose(newPose, 'user');
      getEventBus().emit('camera:pose-changed', {
        pose: this.getPose(),
        previousPose,
        source: 'user'
      });
    }
  }

  // ========== Movement Methods ==========

  async moveTo(position: Vec3, duration = DEFAULT_ANIMATION_DURATION): Promise<void> {
    return new Promise((resolve) => {
      this.setPose({ position }, {
        duration,
        easing: 'ease-out-cubic',
        onComplete: resolve
      });
    });
  }

  async lookAt(target: Vec3, duration = DEFAULT_ANIMATION_DURATION): Promise<void> {
    return new Promise((resolve) => {
      this.setPose({ target }, {
        duration,
        easing: 'ease-out-cubic',
        onComplete: resolve
      });
    });
  }

  async setFov(fov: number, duration = 300): Promise<void> {
    const clampedFov = Math.max(10, Math.min(120, fov));
    return new Promise((resolve) => {
      this.setPose({ fov: clampedFov }, {
        duration,
        easing: 'ease-out-cubic',
        onComplete: resolve
      });
    });
  }

  // ========== Projection ==========

  setProjection(mode: ProjectionType): void {
    const previousMode = this.projectionMode;
    this.projectionMode = mode;
    getEventBus().emit('camera:projection-changed', { mode, previousMode });
  }

  // ========== Presets ==========

  async applyPreset(preset: CameraPreset): Promise<void> {
    const currentPose = this.getPose();
    const currentDist = calculateDistance(currentPose.position, currentPose.target);
    const presetPose = calculatePresetPose(preset as CameraPresetType, currentDist);

    return new Promise((resolve) => {
      this.setPose(presetPose, {
        duration: 600,
        easing: 'ease-in-out-cubic',
        onComplete: () => {
          getEventBus().emit('camera:preset-applied', { preset, pose: this.getPose() });
          resolve();
        }
      });
    });
  }

  // ========== Bookmarks (delegate to Store) ==========

  saveBookmark(name: string): string {
    this.store.addBookmark(name);
    const bookmarks = this.store.bookmarks;
    const bookmark = bookmarks[bookmarks.length - 1];
    if (bookmark) {
      getEventBus().emit('camera:bookmark-saved', { bookmark });
      return bookmark.id;
    }
    return '';
  }

  async loadBookmark(id: string): Promise<void> {
    const bookmark = this.store.bookmarks.find(b => b.id === id);
    if (!bookmark) return;

    return new Promise((resolve) => {
      this.setPose(bookmark.pose, {
        duration: 800,
        easing: 'ease-in-out-cubic',
        onComplete: () => {
          getEventBus().emit('camera:bookmark-loaded', { bookmark });
          resolve();
        }
      });
    });
  }

  deleteBookmark(id: string): void {
    this.store.removeBookmark(id);
    getEventBus().emit('camera:bookmark-deleted', { bookmarkId: id });
  }

  getBookmarks(): CameraBookmark[] {
    return this.store.bookmarks.map(b => ({
      id: b.id,
      name: b.name,
      pose: { ...b.pose, near: 0.1, far: 1000 },
      createdAt: b.createdAt
    }));
  }

  // ========== History (delegate to Store) ==========

  undo(): void {
    this.store.undo();
    this.emitHistoryChanged();
  }

  redo(): void {
    // Store 暂不支持 redo，保留接口
  }

  canUndo(): boolean {
    return this.store.history.length > 1;
  }

  canRedo(): boolean {
    return false;
  }

  // ========== Three.js Sync ==========

  syncFromThree(camera: Camera, controls: OrbitControlsType): void {
    const threeCamera = camera as THREE.PerspectiveCamera;
    
    this.store.setPose({
      position: { x: threeCamera.position.x, y: threeCamera.position.y, z: threeCamera.position.z },
      target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
      up: { x: threeCamera.up.x, y: threeCamera.up.y, z: threeCamera.up.z },
      fov: threeCamera.fov
    }, 'user');
  }

  syncToThree(camera: Camera, controls: OrbitControlsType): void {
    const pose = this.getPose();
    const threeCamera = camera as THREE.PerspectiveCamera;

    threeCamera.position.set(pose.position.x, pose.position.y, pose.position.z);
    controls.target.set(pose.target.x, pose.target.y, pose.target.z);
    threeCamera.up.set(pose.up.x, pose.up.y, pose.up.z);

    if (pose.fov !== undefined) {
      threeCamera.fov = pose.fov;
      threeCamera.updateProjectionMatrix();
    }

    controls.update();
  }

  // ========== Private Methods ==========

  private animatePose(from: CameraPose, to: Partial<CameraPose>, options: TransitionOptions): void {
    const scheduler = getAnimationScheduler();
    const targetPose: CameraPose = {
      ...from,
      ...to,
      position: to.position ? { ...from.position, ...to.position } : from.position,
      target: to.target ? { ...from.target, ...to.target } : from.target,
      up: to.up ? { ...from.up, ...to.up } : from.up
    };

    // Cancel previous animation
    if (this.animationId) {
      scheduler.cancel(this.animationId);
    }

    this.animationId = scheduler.animate(0, 1, {
      duration: options.duration ?? 500,
      easing: options.easing ?? 'ease-out-cubic',
      onUpdate: (progress) => {
        const interpolated = this.interpolatePose(from, targetPose, progress);
        this.store.setPose(interpolated, 'motion');
        options.onUpdate?.(progress);

        getEventBus().emit('camera:pose-animating', {
          currentPose: interpolated,
          targetPose,
          progress
        });
      },
      onComplete: () => {
        this.animationId = null;
        this.store.setPose(targetPose, 'preset');

        getEventBus().emit('camera:pose-changed', {
          pose: targetPose,
          previousPose: from,
          source: 'animation'
        });

        options.onComplete?.();
      }
    });
  }

  private interpolatePose(from: CameraPose, to: CameraPose, t: number): CameraPose {
    return {
      position: lerpVec3(from.position, to.position, t),
      target: lerpVec3(from.target, to.target, t),
      up: lerpVec3(from.up, to.up, t),
      fov: from.fov + (to.fov - from.fov) * t,
      near: from.near,
      far: from.far
    };
  }

  private emitHistoryChanged(): void {
    getEventBus().emit('camera:history-changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      historyLength: this.store.history.length
    });
  }
}

export const getCameraService = (): ICameraService => CameraServiceImpl.getInstance();
export { CameraServiceImpl as CameraService };

// eslint-disable-next-line @typescript-eslint/no-namespace -- Required for THREE.js type augmentation
declare namespace THREE {
  interface PerspectiveCamera extends Camera {
    fov: number;
    near: number;
    far: number;
    updateProjectionMatrix(): void;
  }
}
