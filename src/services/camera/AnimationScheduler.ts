import { getEventBus } from '@/core/EventBus';

import type {
  EasingType,
  EasingFunction,
  AnimationOptions,
  AnimationHandle,
  AnimationInfo,
  QueuedAnimation,
  IAnimationService,
  Vec3
} from '@/shared/types';

const EASING_FUNCTIONS: Record<EasingType, EasingFunction> = {
  'linear': (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'ease-in-cubic': (t) => t * t * t,
  'ease-out-cubic': (t) => 1 - Math.pow(1 - t, 3),
  'ease-in-out-cubic': (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  'ease-in-elastic': (t) => {
    if (t === 0 || t === 1) {return t;}
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
  },
  'ease-out-elastic': (t) => {
    if (t === 0 || t === 1) {return t;}
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  'ease-in-out-elastic': (t) => {
    if (t === 0 || t === 1) {return t;}
    if (t < 0.5) {return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2;}
    return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2 + 1;
  },
  'ease-in-bounce': (t) => 1 - EASING_FUNCTIONS['ease-out-bounce'](1 - t),
  'ease-out-bounce': (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {return n1 * t * t;}
    if (t < 2 / d1) {return n1 * (t -= 1.5 / d1) * t + 0.75;}
    if (t < 2.5 / d1) {return n1 * (t -= 2.25 / d1) * t + 0.9375;}
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

interface ActiveAnimation {
  id: string;
  startTime: number;
  duration: number;
  easing: EasingFunction;
  isPaused: boolean;
  pausedAt: number;
  pausedProgress: number;
  onUpdate: (progress: number) => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

export const getEasingFunction = (type: EasingType): EasingFunction => EASING_FUNCTIONS[type] || EASING_FUNCTIONS.linear;

class AnimationSchedulerImpl implements IAnimationService {
  private static instance: AnimationSchedulerImpl | null = null;
  private activeAnimations = new Map<string, ActiveAnimation>();
  private animationQueue: QueuedAnimation[] = [];
  private frameId: number | null = null;
  private idCounter = 0;

  private constructor() {
    this.tick = this.tick.bind(this);
  }

  static getInstance(): AnimationSchedulerImpl {
    AnimationSchedulerImpl.instance ??= new AnimationSchedulerImpl();
    return AnimationSchedulerImpl.instance;
  }

  static resetInstance(): void {
    if (AnimationSchedulerImpl.instance) {
      AnimationSchedulerImpl.instance.cancelAll();
      AnimationSchedulerImpl.instance.clearQueue();
    }
    AnimationSchedulerImpl.instance = null;
  }

  animate<T>(from: T, to: T, options: AnimationOptions<T>): AnimationHandle {
    const { duration, easing = 'ease-out-cubic', onUpdate, onComplete, onCancel } = options;
    const id = this.generateId();
    const easingFn = getEasingFunction(easing);

    const animation: ActiveAnimation = {
      id,
      startTime: performance.now(),
      duration,
      easing: easingFn,
      isPaused: false,
      pausedAt: 0,
      pausedProgress: 0,
      onUpdate: (progress) => {
        const value = this.interpolate(from, to, progress);
        onUpdate?.(value, progress);
      },
      onComplete,
      onCancel
    };

    this.activeAnimations.set(id, animation);
    this.startLoop();
    getEventBus().emit('animation:started', { id, duration });

    return this.createHandle(id);
  }

  animateNumber(from: number, to: number, options: AnimationOptions<number>): AnimationHandle {
    return this.animate(from, to, options);
  }

  animateVec3(from: Vec3, to: Vec3, options: AnimationOptions<Vec3>): AnimationHandle {
    return this.animate(from, to, options);
  }

  enqueue(animation: QueuedAnimation): void {
    this.animationQueue.push(animation);
    this.animationQueue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this.processQueue();
  }

  clearQueue(): void {
    this.animationQueue = [];
  }

  isAnimating(): boolean {
    return this.activeAnimations.size > 0;
  }

  getActiveAnimations(): AnimationInfo[] {
    const now = performance.now();
    const result: AnimationInfo[] = [];

    this.activeAnimations.forEach((anim) => {
      const elapsed = anim.isPaused ? anim.pausedAt - anim.startTime : now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      result.push({
        id: anim.id,
        startTime: anim.startTime,
        duration: anim.duration,
        progress,
        isPaused: anim.isPaused
      });
    });

    return result;
  }

  cancel(handle: AnimationHandle, snapToEnd = false): void {
    const id = (handle as { id: string }).id;
    const animation = this.activeAnimations.get(id);
    if (!animation) {return;}

    if (snapToEnd) {animation.onUpdate(1);}
    animation.onCancel?.();
    this.activeAnimations.delete(id);

    const progress = snapToEnd ? 1 : this.getAnimationProgress(animation);
    getEventBus().emit('animation:cancelled', { id, progress, snappedToEnd: snapToEnd });

    this.checkStopLoop();
    this.processQueue();
  }

  cancelAll(snapToEnd = false): void {
    this.activeAnimations.forEach((animation) => {
      if (snapToEnd) {animation.onUpdate(1);}
      animation.onCancel?.();
      const progress = snapToEnd ? 1 : this.getAnimationProgress(animation);
      getEventBus().emit('animation:cancelled', { id: animation.id, progress, snappedToEnd: snapToEnd });
    });

    this.activeAnimations.clear();
    this.checkStopLoop();
  }

  private generateId(): string {
    return `anim_${++this.idCounter}_${Date.now()}`;
  }

  private createHandle(id: string): AnimationHandle {
    return {
      id,
      cancel: (snapToEnd) => { this.cancel({ id } as AnimationHandle, snapToEnd); },
      pause: () => { this.pauseAnimation(id); },
      resume: () => { this.resumeAnimation(id); },
      isActive: () => this.activeAnimations.has(id),
      getProgress: () => {
        const anim = this.activeAnimations.get(id);
        return anim ? this.getAnimationProgress(anim) : 1;
      }
    };
  }

  private pauseAnimation(id: string): void {
    const animation = this.activeAnimations.get(id);
    if (!animation || animation.isPaused) {return;}

    animation.isPaused = true;
    animation.pausedAt = performance.now();
    animation.pausedProgress = this.getAnimationProgress(animation);
    getEventBus().emit('animation:paused', { id, progress: animation.pausedProgress });
  }

  private resumeAnimation(id: string): void {
    const animation = this.activeAnimations.get(id);
    if (!animation?.isPaused) {return;}

    const pauseDuration = performance.now() - animation.pausedAt;
    animation.startTime += pauseDuration;
    animation.isPaused = false;
    getEventBus().emit('animation:resumed', { id, progress: animation.pausedProgress });
    this.startLoop();
  }

  private getAnimationProgress(animation: ActiveAnimation): number {
    if (animation.isPaused) {return animation.pausedProgress;}
    const elapsed = performance.now() - animation.startTime;
    return Math.min(elapsed / animation.duration, 1);
  }

  private interpolate<T>(from: T, to: T, progress: number): T {
    if (typeof from === 'number' && typeof to === 'number') {
      return (from + (to - from) * progress) as T;
    }

    if (this.isVec3(from) && this.isVec3(to)) {
      return {
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
        z: from.z + (to.z - from.z) * progress
      } as T;
    }

    return progress >= 1 ? to : from;
  }

  private isVec3(value: unknown): value is Vec3 {
    return typeof value === 'object' && value !== null && 'x' in value && 'y' in value && 'z' in value;
  }

  private startLoop(): void {
    this.frameId ??= requestAnimationFrame(this.tick);
  }

  private checkStopLoop(): void {
    if (this.activeAnimations.size === 0 && this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  private processQueue(): void {
    if (this.activeAnimations.size === 0 && this.animationQueue.length > 0) {
      const next = this.animationQueue.shift();
      if (next) {next.execute();}
    }
  }

  private tick(now: number): void {
    const completed: string[] = [];
    const animations = Array.from(this.activeAnimations.entries());

    for (const [id, animation] of animations) {
      if (animation.isPaused) {continue;}

      const elapsed = now - animation.startTime;
      const rawProgress = Math.min(elapsed / animation.duration, 1);
      const easedProgress = animation.easing(rawProgress);

      animation.onUpdate(easedProgress);
      getEventBus().emit('animation:progress', { id, progress: rawProgress });

      if (rawProgress >= 1) {completed.push(id);}
    }

    for (const id of completed) {
      const animation = this.activeAnimations.get(id);
      if (animation) {
        animation.onComplete?.();
        this.activeAnimations.delete(id);
        getEventBus().emit('animation:completed', { id, duration: animation.duration });
      }
    }

    if (this.activeAnimations.size > 0) {
      this.frameId = requestAnimationFrame(this.tick);
    } else {
      this.frameId = null;
      this.processQueue();
    }
  }
}

export const getAnimationScheduler = (): IAnimationService => AnimationSchedulerImpl.getInstance();
export { AnimationSchedulerImpl as AnimationScheduler };