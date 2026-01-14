/**
 * MotionService - 相机运动服务
 * 
 * 职责：计算各种相机运动轨迹
 * - 支持 ORBIT, FLY_BY, SPIRAL, ARC, TRACKING, DOLLY_ZOOM 等运动类型
 * - 自动从 Store 同步 basePose，无需手动调用 setBasePose
 * - 支持 override, additive, manual-priority 三种混合模式
 * - 智能暂停/恢复：基于用户交互强度动态调整
 * - 动态混合因子：根据运动类型和交互意图调整
 */

import { getEventBus } from '@/core/EventBus';
import { TrackingEvents, InputEvents } from '@/core/EventTypes';
import { DEFAULT_FOV } from '@/shared/constants';
import { useCameraStore } from '@/shared/store';
import { easeInOutSine, easeInOutCubic, degToRad, radToDeg, lerp } from '@/shared/utils';

import type { InputIntentChangedPayload } from '@/core/EventTypes';
import type {
  IMotionService,
  MotionType,
  MotionConfig,
  MotionParams,
  MotionResult,
  MotionPoint,
  MotionState,
  BlendMode,
  CameraPose,
  TrackedPoint3D,
  Vec3
} from '@/shared/types';

const DEFAULT_PARAMS: MotionParams = {
  speed: 1.0,
  scale: 1.0,
  orbitRadius: 9,
  orbitTilt: 15,
  flyByHeight: 2,
  flyBySwing: 8,
  spiralLoops: 2,
  spiralHeight: 5,
  arcAngle: 90,
  arcRhythm: 1,
  trackingDistance: 6,
  trackingOffset: 1,
  dollyRange: 10,
  dollyIntensity: 0.8
};

// Dynamic blend factors based on motion type
const MOTION_BLEND_FACTORS: Record<MotionType, number> = {
  STATIC: 0,
  ORBIT: 0.35,
  FLY_BY: 0.25,
  SPIRAL: 0.3,
  ARC: 0.4,
  TRACKING: 0.2,
  DOLLY_ZOOM: 0.15
};

// Intent-based blend multipliers
type InteractionIntent = 'viewing' | 'adjusting' | 'exploring';
const INTENT_BLEND_MULTIPLIERS: Record<InteractionIntent, number> = {
  viewing: 1.0,      // Normal blend
  adjusting: 0.3,    // Reduce motion influence during fine-tuning
  exploring: 0.1     // Minimal motion influence during exploration
};

// Bezier curve control points for smooth transitions
const BEZIER_EASE_IN_OUT_QUART = (t: number): number => 
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

class MotionServiceImpl implements IMotionService {
  private static instance: MotionServiceImpl | null = null;

  private state: MotionState = {
    isActive: false,
    isPaused: false,
    type: 'STATIC',
    progress: 0,
    startTime: 0
  };

  private blendMode: BlendMode = 'override';
  private params: MotionParams = { ...DEFAULT_PARAMS };
  private pauseTimeOffset = 0;
  private lastResult: MotionResult | null = null;
  private unsubscribe: (() => void) | null = null;

  private trackingOff: (() => void) | null = null;
  private trackingRawTarget: Vec3 | null = null;
  private trackingSmoothedTarget: Vec3 | null = null;
  private trackingLastSeenPerfMs = 0;

  // Smart pause/resume state
  private currentIntent: InteractionIntent = 'viewing';
  private intentUnsubscribe: (() => void) | null = null;
  private resumeTransition = {
    isActive: false,
    startTime: 0,
    duration: 300,
    startBlendFactor: 0,
    targetBlendFactor: 1
  };

  // Dynamic blend factor
  private currentBlendFactor = 1.0;
  private targetBlendFactor = 1.0;

  private constructor() {
    this.setupStoreSync();
    this.setupTrackingSync();
    this.setupIntentSync();
  }

  static getInstance(): MotionServiceImpl {
    MotionServiceImpl.instance ??= new MotionServiceImpl();
    return MotionServiceImpl.instance;
  }

  static resetInstance(): void {
    if (MotionServiceImpl.instance) {
      MotionServiceImpl.instance.dispose();
    }
    MotionServiceImpl.instance = null;
  }

  private dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.trackingOff) {
      this.trackingOff();
      this.trackingOff = null;
    }
    if (this.intentUnsubscribe) {
      this.intentUnsubscribe();
      this.intentUnsubscribe = null;
    }
  }

  private setupIntentSync(): void {
    // Listen for intent changes from InputService
    this.intentUnsubscribe = getEventBus().on(InputEvents.INTENT_CHANGED, (data: InputIntentChangedPayload) => {
      this.currentIntent = data.intent;
      this.updateTargetBlendFactor();
    });

    // Listen for inertia to smoothly reduce motion influence
    getEventBus().on(InputEvents.INERTIA_UPDATE, () => {
      // During inertia, gradually restore motion influence
      if (this.targetBlendFactor < 1) {
        this.targetBlendFactor = Math.min(1, this.targetBlendFactor + 0.02);
      }
    });

    getEventBus().on(InputEvents.INERTIA_END, () => {
      // After inertia ends, restore full motion influence
      this.startBlendTransition(1.0, 500);
    });
  }

  private updateTargetBlendFactor(): void {
    const motionFactor = MOTION_BLEND_FACTORS[this.state.type] || 0.3;
    const intentMultiplier = INTENT_BLEND_MULTIPLIERS[this.currentIntent] || 1.0;
    this.targetBlendFactor = motionFactor * intentMultiplier;
  }

  private startBlendTransition(target: number, duration: number): void {
    this.resumeTransition = {
      isActive: true,
      startTime: performance.now(),
      duration,
      startBlendFactor: this.currentBlendFactor,
      targetBlendFactor: target
    };
  }

  private updateBlendTransition(): void {
    if (!this.resumeTransition.isActive) return;

    const elapsed = performance.now() - this.resumeTransition.startTime;
    const progress = Math.min(1, elapsed / this.resumeTransition.duration);
    const eased = BEZIER_EASE_IN_OUT_QUART(progress);

    this.currentBlendFactor = lerp(
      this.resumeTransition.startBlendFactor,
      this.resumeTransition.targetBlendFactor,
      eased
    );

    if (progress >= 1) {
      this.resumeTransition.isActive = false;
      this.currentBlendFactor = this.resumeTransition.targetBlendFactor;
    }
  }

  /** Get current dynamic blend factor */
  getDynamicBlendFactor(): number {
    return this.currentBlendFactor;
  }

  private setupTrackingSync(): void {
    this.trackingOff = getEventBus().on(TrackingEvents.POINT_3D, (p: TrackedPoint3D) => {
      this.trackingRawTarget = { ...p.world };
      this.trackingLastSeenPerfMs = performance.now();
    });
  }

  private lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      z: lerp(a.z, b.z, t)
    };
  }

  /**
   * 自动同步 Store 中的 basePose
   * 当用户交互结束时，自动捕获当前 pose 作为 basePose
   */
  private setupStoreSync(): void {
    this.unsubscribe = useCameraStore.subscribe(
      (state) => state.interaction.isInteracting,
      (isInteracting, wasInteracting) => {
        // 用户交互结束时，自动捕获 basePose
        if (wasInteracting && !isInteracting && this.blendMode === 'additive') {
          useCameraStore.getState().captureBasePose();
        }
      }
    );
  }

  // ========== State Access ==========

  private get store() {
    return useCameraStore.getState();
  }

  private getBasePose(): CameraPose | null {
    const basePose = this.store.basePose;
    if (basePose) return basePose;
    
    // Fallback to current pose
    const { pose } = this.store;
    return {
      position: { ...pose.position },
      target: { ...pose.target },
      up: { ...pose.up },
      fov: pose.fov
    };
  }

  // ========== Motion Control ==========

  start(type: MotionType, config?: Partial<MotionConfig>): void {
    if (type === 'STATIC') {
      this.stop();
      return;
    }

    const previousType = this.state.type;

    // Capture base pose when starting motion
    if (this.blendMode === 'additive') {
      this.store.captureBasePose();
    }

    this.state = {
      isActive: true,
      isPaused: false,
      type,
      progress: 0,
      startTime: performance.now()
    };

    if (config?.blendMode) this.blendMode = config.blendMode;
    if (config?.params) this.params = { ...this.params, ...config.params };

    this.pauseTimeOffset = 0;
    this.lastResult = null;

    // Sync to store
    this.store.startMotion(type);

    getEventBus().emit('motion:started', { type, blendMode: this.blendMode });

    if (previousType !== type) {
      getEventBus().emit('motion:type-changed', { type, previousType });
    }
  }

  stop(): void {
    if (!this.state.isActive) return;

    const type = this.state.type;

    this.state = {
      isActive: false,
      isPaused: false,
      type: 'STATIC',
      progress: 0,
      startTime: 0
    };

    this.lastResult = null;

    // Sync to store
    this.store.stopMotion();
    this.store.clearBasePose();

    getEventBus().emit('motion:stopped', { type, reason: 'user' });
  }

  pause(): void {
    if (!this.state.isActive || this.state.isPaused) return;

    this.state.isPaused = true;
    this.pauseTimeOffset = performance.now() - this.state.startTime;

    // Sync to store
    this.store.pauseMotion();

    getEventBus().emit('motion:paused', { type: this.state.type, progress: this.state.progress });
  }

  resume(): void {
    if (!this.state.isActive || !this.state.isPaused) return;

    this.state.isPaused = false;
    this.state.startTime = performance.now() - this.pauseTimeOffset;

    // Sync to store
    this.store.resumeMotion();

    getEventBus().emit('motion:resumed', { type: this.state.type, progress: this.state.progress });
  }

  // ========== State Getters ==========

  isActive(): boolean { return this.state.isActive; }
  isPaused(): boolean { return this.state.isPaused; }
  getType(): MotionType { return this.state.type; }
  getProgress(): number { return this.state.progress; }
  getState(): MotionState { return { ...this.state }; }

  // ========== Blend Mode ==========

  setBlendMode(mode: BlendMode): void {
    const previousMode = this.blendMode;
    this.blendMode = mode;

    // Capture base pose when switching to additive
    if (mode === 'additive' && previousMode !== 'additive') {
      this.store.captureBasePose();
    }

    getEventBus().emit('motion:blend-mode-changed', { mode, previousMode });
  }

  getBlendMode(): BlendMode { return this.blendMode; }

  // ========== Legacy API (for backward compatibility) ==========

  setBasePose(pose: CameraPose): void {
    useCameraStore.setState({
      basePose: {
        ...pose,
        position: { ...pose.position },
        target: { ...pose.target },
        up: { ...pose.up }
      }
    });
  }

  // ========== Motion Calculation ==========

  calculate(time: number, basePose?: CameraPose): MotionResult | null {
    if (!this.state.isActive || this.state.type === 'STATIC') return null;
    if (this.state.isPaused) return this.lastResult;

    const elapsed = (time - this.state.startTime) / 1000;
    let result: MotionResult;

    switch (this.state.type) {
      case 'ORBIT': result = this.calculateOrbit(elapsed); break;
      case 'FLY_BY': result = this.calculateFlyBy(elapsed); break;
      case 'SPIRAL': result = this.calculateSpiral(elapsed); break;
      case 'ARC': result = this.calculateArc(elapsed); break;
      case 'TRACKING': result = this.calculateTracking(elapsed); break;
      case 'DOLLY_ZOOM': result = this.calculateDollyZoom(elapsed); break;
      default: return null;
    }

    // Apply additive blend
    if (this.blendMode === 'additive') {
      const base = basePose ?? this.getBasePose();
      if (base) result = this.applyAdditiveBlend(result, base);
    }

    this.lastResult = result;

    // Update progress in store
    const progress = (elapsed % 10) / 10; // Normalize to 0-1 over 10 seconds
    this.store.updateMotionProgress(progress);

    getEventBus().emit('motion:progress', { type: this.state.type, progress, state: this.state });

    return result;
  }

  generatePreview(duration: number, samples: number): MotionPoint[] {
    const points: MotionPoint[] = [];
    const savedState = { ...this.state };
    const savedLastResult = this.lastResult;
    const previewStartTime = performance.now();

    this.state = {
      ...this.state,
      isActive: true,
      isPaused: false,
      startTime: previewStartTime
    };

    try {
      for (let i = 0; i <= samples; i++) {
        const t = (i / samples) * duration;
        const fakeTime = previewStartTime + t * 1000;
        const result = this.calculateInternal(fakeTime);

        if (result) {
          points.push({ position: result.position, target: result.target, fov: result.fov, time: t });
        }
      }
    } finally {
      this.state = savedState;
      this.lastResult = savedLastResult;
    }

    return points;
  }

  private calculateInternal(time: number): MotionResult | null {
    if (this.state.type === 'STATIC') return null;

    const elapsed = (time - this.state.startTime) / 1000;

    switch (this.state.type) {
      case 'ORBIT': return this.calculateOrbit(elapsed);
      case 'FLY_BY': return this.calculateFlyBy(elapsed);
      case 'SPIRAL': return this.calculateSpiral(elapsed);
      case 'ARC': return this.calculateArc(elapsed);
      case 'TRACKING': return this.calculateTracking(elapsed);
      case 'DOLLY_ZOOM': return this.calculateDollyZoom(elapsed);
      default: return null;
    }
  }

  // ========== Parameters ==========

  setParameter<K extends keyof MotionParams>(key: K, value: MotionParams[K]): void {
    const previousValue = this.params[key];
    this.params[key] = value;
    getEventBus().emit('motion:params-changed', { key, value, previousValue });
  }

  getParameters(): MotionParams { return { ...this.params }; }

  // ========== Motion Calculations ==========

  private calculateOrbit(time: number): MotionResult {
    const { speed, scale, orbitRadius, orbitTilt } = this.params;
    const orbitSpeed = speed * 0.5;
    const radius = orbitRadius * scale;
    const tiltRad = degToRad(orbitTilt);
    const angle = time * orbitSpeed;

    return {
      position: { x: Math.sin(angle) * radius, y: Math.sin(tiltRad) * radius * 0.5, z: Math.cos(angle) * radius },
      target: { x: 0, y: 0, z: 0 },
      fov: DEFAULT_FOV
    };
  }

  private calculateFlyBy(time: number): MotionResult {
    const { speed, scale, flyByHeight, flyBySwing } = this.params;
    const flySpeed = speed * 0.4;
    const swingAmp = flyBySwing * scale;
    const heightAmp = flyByHeight * scale;

    const tNorm = (Math.sin(time * flySpeed) + 1) / 2;
    const eased = easeInOutSine(tNorm);
    const xPos = (eased * 2 - 1) * swingAmp;
    const zAmp = 4 * scale;
    const zEased = easeInOutSine((Math.cos(time * flySpeed * 0.5) + 1) / 2);
    const zPos = 12 + (zEased * 2 - 1) * zAmp;
    const yPos = Math.sin(time * flySpeed * 0.7) * heightAmp;

    return { position: { x: xPos, y: yPos, z: zPos }, target: { x: 0, y: 0, z: 0 }, fov: DEFAULT_FOV };
  }

  private calculateSpiral(time: number): MotionResult {
    const { speed, scale, spiralLoops, spiralHeight } = this.params;
    const spiralSpeed = speed * 0.3;
    const heightAmp = spiralHeight * scale;
    const radiusBase = 15;
    const radiusT = (Math.sin(time * spiralSpeed * 0.25) + 1) / 2;
    const radius = radiusBase + easeInOutSine(radiusT) * (4 * scale);
    const heightT = (Math.sin(time * spiralSpeed * 0.4 / spiralLoops) + 1) / 2;
    const height = (easeInOutCubic(heightT) * 2 - 1) * heightAmp;
    const angle = time * spiralSpeed * spiralLoops * 0.5;

    return {
      position: { x: Math.cos(angle) * radius, y: height, z: Math.sin(angle) * radius },
      target: { x: 0, y: 0, z: 0 },
      fov: DEFAULT_FOV
    };
  }

  private calculateArc(time: number): MotionResult {
    const { speed, scale, arcAngle, arcRhythm } = this.params;
    const arcSpeed = speed * 0.25 * arcRhythm;
    const arcRange = degToRad(arcAngle);
    const baseRadius = 12;
    const arcT = (Math.sin(time * arcSpeed) + 1) / 2;
    const azimuth = (easeInOutSine(arcT) * 2 - 1) * arcRange * 0.5;
    const elevT = (Math.sin(time * arcSpeed * 1.5) + 1) / 2;
    const elevation = (easeInOutCubic(elevT) * 2 - 1) * 3 * scale;

    return {
      position: { x: Math.sin(azimuth) * baseRadius, y: elevation, z: Math.cos(azimuth) * baseRadius },
      target: { x: 0, y: 0, z: 0 },
      fov: DEFAULT_FOV
    };
  }

  private calculateTracking(time: number): MotionResult {
    const { speed, scale, trackingDistance, trackingOffset } = this.params;

    const nowMs = performance.now();
    const hasRecentTracking = this.trackingRawTarget && (nowMs - this.trackingLastSeenPerfMs) < 800;
    if (hasRecentTracking) {
      const desired = this.trackingRawTarget!;
      const current = this.trackingSmoothedTarget ?? desired;
      const baseAlpha = 0.18;
      const alpha = Math.max(0.02, Math.min(0.45, baseAlpha * (0.6 + speed * 0.4)));
      this.trackingSmoothedTarget = this.lerpVec3(current, desired, alpha);

      const t = this.trackingSmoothedTarget;
      return {
        position: { x: t.x, y: t.y + trackingOffset, z: t.z + 12 },
        target: { x: t.x, y: t.y, z: t.z },
        fov: DEFAULT_FOV
      };
    }

    this.trackingSmoothedTarget = null;
    const trackSpeed = speed * 0.35;
    const amplitude = trackingDistance * scale;
    const trackT = (Math.sin(time * trackSpeed) + 1) / 2;
    const x = (easeInOutSine(trackT) * 2 - 1) * amplitude;
    return { position: { x, y: trackingOffset, z: 12 }, target: { x, y: trackingOffset * 0.5, z: 0 }, fov: DEFAULT_FOV };
  }

  private calculateDollyZoom(time: number): MotionResult {
    const { speed, dollyRange, dollyIntensity } = this.params;
    const dollySpeed = speed * 0.4;
    const tRaw = (Math.sin(time * dollySpeed) + 1) / 2;
    const t = easeInOutCubic(tRaw);
    const minD = 5;
    const maxD = minD + dollyRange;
    const currentDist = lerp(minD, maxD, t);
    const visibleHeight = 2 * minD * Math.tan(degToRad(DEFAULT_FOV) / 2);
    const newFovRad = 2 * Math.atan(visibleHeight / (2 * currentDist));
    const targetFov = radToDeg(newFovRad);
    const finalFov = lerp(DEFAULT_FOV, targetFov, dollyIntensity);

    return { position: { x: 0, y: 0, z: currentDist }, target: { x: 0, y: 0, z: 0 }, fov: finalFov };
  }

  private applyAdditiveBlend(result: MotionResult, base: CameraPose): MotionResult {
    // Update blend transition
    this.updateBlendTransition();

    const defaultPos = { x: 0, y: 0, z: 9 };
    
    // Use dynamic blend factor instead of fixed value
    const blendFactor = this.currentBlendFactor * MOTION_BLEND_FACTORS[this.state.type];
    
    const offset = {
      x: (result.position.x - defaultPos.x) * blendFactor,
      y: (result.position.y - defaultPos.y) * blendFactor,
      z: (result.position.z - defaultPos.z) * blendFactor
    };
    const targetOffset = {
      x: result.target.x * blendFactor,
      y: result.target.y * blendFactor,
      z: result.target.z * blendFactor
    };

    return {
      position: {
        x: base.position.x + offset.x,
        y: base.position.y + offset.y,
        z: base.position.z + offset.z
      },
      target: {
        x: base.target.x + targetOffset.x,
        y: base.target.y + targetOffset.y,
        z: base.target.z + targetOffset.z
      },
      fov: result.fov
    };
  }
}

export const getMotionService = (): IMotionService => MotionServiceImpl.getInstance();
export { MotionServiceImpl as MotionService };
