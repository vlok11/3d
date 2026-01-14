import { getEventBus } from '@/core/EventBus';
import { createLogger } from '@/core/Logger';
import { useSceneStore } from '@/shared/store';

import { getAnimationScheduler } from './AnimationScheduler';
import { getCameraService } from './CameraService';
import { getInputService } from './InputService';
import { getMotionService } from './MotionService';

import type {
  ICoreController,
  ICameraService,
  IMotionService,
  IInputService,
  IAnimationService,
  CameraPose
} from '@/shared/types';

interface MotionServiceWithBasePose extends IMotionService {
  setBasePose?(pose: CameraPose): void;
}

type PoseChangedPayload = { pose: CameraPose; source?: string };
type SystemErrorPayload = { error: Error; recoverable?: boolean };

const logger = createLogger({ module: 'CoreController' });
const VERSION = '1.0.0';

class CoreControllerImpl implements ICoreController {
  private static instance: CoreControllerImpl | null = null;
  private _isInitialized = false;
  private _isPaused = false;
  private pauseTimestamp = 0;

  private _camera: ICameraService;
  private _motion: IMotionService;
  private _input: IInputService;
  private _animation: IAnimationService;
  private unsubscribers: (() => void)[] = [];

  private constructor() {
    this._camera = getCameraService();
    this._motion = getMotionService();
    this._input = getInputService();
    this._animation = getAnimationScheduler();
  }

  static getInstance(): CoreControllerImpl {
    CoreControllerImpl.instance ??= new CoreControllerImpl();
    return CoreControllerImpl.instance;
  }

  static resetInstance(): void {
    if (CoreControllerImpl.instance) {
      CoreControllerImpl.instance.dispose();
    }
    CoreControllerImpl.instance = null;
  }

  async initialize(): Promise<void> {
    if (this._isInitialized) {
      logger.warn('Already initialized');
      return;
    }

    try {
      this.setupEventListeners();
      this._isInitialized = true;

      getEventBus().emit('system:initialized', {
        timestamp: Date.now(),
        version: VERSION
      });

      logger.info('Initialized');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      getEventBus().emit('system:error', {
        error: err,
        context: 'CoreController.initialize',
        recoverable: false
      });

      throw err;
    }
  }

  dispose(): void {
    if (!this._isInitialized) {return;}

    this._motion.stop();
    this._animation.cancelAll();
    this._input.unbind();
    this.unsubscribers.forEach(unsub => { unsub(); });
    this.unsubscribers = [];
    this._isInitialized = false;

    getEventBus().emit('system:disposed', { timestamp: Date.now() });
    logger.info('Disposed');
  }

  get camera(): ICameraService { return this._camera; }
  get motion(): IMotionService { return this._motion; }
  get input(): IInputService { return this._input; }
  get animation(): IAnimationService { return this._animation; }
  get isInitialized(): boolean { return this._isInitialized; }

  reset(): void {
    this._motion.stop();
    this._animation.cancelAll();
    this._camera.setPose({
      position: { x: 0, y: 0, z: 9 },
      target: { x: 0, y: 0, z: 0 },
      fov: 55
    });
    logger.info('Reset to default state');
  }

  pause(): void {
    if (this._isPaused) {return;}

    this._isPaused = true;
    this.pauseTimestamp = Date.now();
    this._motion.pause();
    this._input.setEnabled(false);

    getEventBus().emit('system:paused', { timestamp: this.pauseTimestamp });
  }

  resume(): void {
    if (!this._isPaused) {return;}

    const pauseDuration = Date.now() - this.pauseTimestamp;
    this._isPaused = false;
    this._motion.resume();
    this._input.setEnabled(true);

    getEventBus().emit('system:resumed', { timestamp: Date.now(), pauseDuration });
  }

  private setupEventListeners(): void {
    const bus = getEventBus();

    const unsubInteractionStart = bus.on('input:interaction-start', () => {
      const blendMode = this._motion.getBlendMode();
      if (blendMode === 'manual-priority' && this._motion.isActive()) {
        this._motion.pause();
      }
    });
    this.unsubscribers.push(unsubInteractionStart);

    const unsubInteractionEnd = bus.on('input:interaction-end', () => {
      const blendMode = this._motion.getBlendMode();
      if (blendMode === 'manual-priority' && this._motion.isPaused()) {
        const { motionResumeDelayMs } = useSceneStore.getState().config;
        const timeoutId = setTimeout(() => {
          if (this._motion.isPaused() && !this._input.isInteracting()) {
            this._motion.resume();
          }
        }, motionResumeDelayMs);
        this.unsubscribers.push(() => clearTimeout(timeoutId));
      }
    });
    this.unsubscribers.push(unsubInteractionEnd);

    const unsubPoseChanged = bus.on('camera:pose-changed', (payload: unknown) => {
      const p = payload as PoseChangedPayload | null;
      if (p?.source === 'user') {
        const motionService = this._motion as MotionServiceWithBasePose;
        if (motionService.setBasePose) {
          motionService.setBasePose(p.pose);
        }
      }
    });
    this.unsubscribers.push(unsubPoseChanged);

    const unsubError = bus.on('system:error', (payload: unknown) => {
      const p = payload as SystemErrorPayload | null;
      logger.error('System error', { message: p?.error?.message ?? 'Unknown error' });
      if (!p?.recoverable) {
        this.reset();
      }
    });
    this.unsubscribers.push(unsubError);
  }
}

export const getCoreController = (): ICoreController => CoreControllerImpl.getInstance();

export { CoreControllerImpl as CoreController };