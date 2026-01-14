import { getEventBus } from '@/core/EventBus';
import { InputEvents } from '@/core/EventTypes';
import { LONG_PRESS_THRESHOLD, DOUBLE_TAP_THRESHOLD, SWIPE_VELOCITY_THRESHOLD } from '@/shared/constants';
import { clientPointToElementPoint } from '@/shared/coordinates';

import type {
  IInputService,
  InteractionType,
  InteractionState,
  GestureEvent,
  InputSensitivity,
  Point2D
} from '@/shared/types';

const DEFAULT_SENSITIVITY: InputSensitivity = { rotate: 1.0, pan: 1.0, zoom: 1.0, pinch: 1.0 };
type InteractionCallback = (type: InteractionType) => void;
type EndCallback = () => void;
type GestureCallback = (gesture: GestureEvent) => void;

// Inertia system configuration
const INERTIA_DECAY = 0.92; // Velocity decay factor per frame
const INERTIA_MIN_VELOCITY = 0.5; // Minimum velocity to continue inertia
const INERTIA_FRAME_MS = 16; // ~60fps

// Interaction intent detection
export type InteractionIntent = 'viewing' | 'adjusting' | 'exploring';
const INTENT_VELOCITY_THRESHOLD = 50; // px/s - fast movement = exploring
const INTENT_DURATION_THRESHOLD = 500; // ms - long interaction = adjusting
const INTENT_DISTANCE_THRESHOLD = 100; // px - large movement = exploring

export interface InertiaState {
  isActive: boolean;
  velocity: Point2D;
  lastTime: number;
}

export interface InteractionIntentState {
  intent: InteractionIntent;
  confidence: number; // 0-1
  totalDistance: number;
  peakVelocity: number;
}

class InputServiceImpl implements IInputService {
  private static instance: InputServiceImpl | null = null;
  private element: HTMLElement | null = null;
  private enabled = true;
  private sensitivity: InputSensitivity = { ...DEFAULT_SENSITIVITY };

  private state: InteractionState = {
    isInteracting: false,
    type: 'none',
    startPosition: null,
    currentPosition: null,
    startTime: 0,
    lastUpdateTime: 0
  };
  private startCallbacks: InteractionCallback[] = [];
  private endCallbacks: EndCallback[] = [];
  private gestureCallbacks: GestureCallback[] = [];
  private touchStartDistance = 0;
  private lastTapTime = 0;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private wheelEndTimer: ReturnType<typeof setTimeout> | null = null;
  private velocityHistory: { position: Point2D; time: number }[] = [];

  // Inertia system state
  private inertia: InertiaState = { isActive: false, velocity: { x: 0, y: 0 }, lastTime: 0 };
  private inertiaTimer: ReturnType<typeof setInterval> | null = null;
  private inertiaCallbacks: ((velocity: Point2D) => void)[] = [];

  // Interaction intent detection
  private intentState: InteractionIntentState = {
    intent: 'viewing',
    confidence: 0,
    totalDistance: 0,
    peakVelocity: 0
  };
  private intentCallbacks: ((intent: InteractionIntent, confidence: number) => void)[] = [];

  private constructor() {
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
  }

  static getInstance(): InputServiceImpl {
    InputServiceImpl.instance ??= new InputServiceImpl();
    return InputServiceImpl.instance;
  }

  static resetInstance(): void {
    if (InputServiceImpl.instance) {InputServiceImpl.instance.unbind();}
    InputServiceImpl.instance = null;
  }

  isInteracting(): boolean {
    return this.state.isInteracting;
  }

  getInteractionType(): InteractionType {
    return this.state.type;
  }

  getState(): InteractionState {
    return { ...this.state };
  }

  onInteractionStart(callback: InteractionCallback): () => void {
    this.startCallbacks.push(callback);
    return () => {
      const idx = this.startCallbacks.indexOf(callback);
      if (idx !== -1) {this.startCallbacks.splice(idx, 1);}
    };
  }

  onInteractionEnd(callback: EndCallback): () => void {
    this.endCallbacks.push(callback);
    return () => {
      const idx = this.endCallbacks.indexOf(callback);
      if (idx !== -1) {this.endCallbacks.splice(idx, 1);}
    };
  }

  onGesture(callback: GestureCallback): () => void {
    this.gestureCallbacks.push(callback);
    return () => {
      const idx = this.gestureCallbacks.indexOf(callback);
      if (idx !== -1) {this.gestureCallbacks.splice(idx, 1);}
    };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    getEventBus().emit(InputEvents.ENABLED_CHANGED, { enabled });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setSensitivity(sensitivity: Partial<InputSensitivity>): void {
    this.sensitivity = { ...this.sensitivity, ...sensitivity };
  }

  getSensitivity(): InputSensitivity {
    return { ...this.sensitivity };
  }

  bindToElement(element: HTMLElement): void {
    this.unbind();
    this.element = element;

    element.addEventListener('mousedown', this.handleMouseDown);
    element.addEventListener('contextmenu', this.handleContextMenu);
    element.addEventListener('wheel', this.handleWheel, { passive: false });
    element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    element.addEventListener('touchend', this.handleTouchEnd);

    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  unbind(): void {
    if (!this.element) {return;}

    this.element.removeEventListener('mousedown', this.handleMouseDown);
    this.element.removeEventListener('contextmenu', this.handleContextMenu);
    this.element.removeEventListener('wheel', this.handleWheel);
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);

    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);

    this.clearLongPressTimer();
    this.stopInertia();
    if (this.wheelEndTimer) {
      clearTimeout(this.wheelEndTimer);
      this.wheelEndTimer = null;
    }
    this.element = null;
  }

  // ========== Inertia System ==========

  /** Subscribe to inertia updates */
  onInertia(callback: (velocity: Point2D) => void): () => void {
    this.inertiaCallbacks.push(callback);
    return () => {
      const idx = this.inertiaCallbacks.indexOf(callback);
      if (idx !== -1) this.inertiaCallbacks.splice(idx, 1);
    };
  }

  /** Get current inertia state */
  getInertiaState(): InertiaState {
    return { ...this.inertia };
  }

  /** Check if inertia is active */
  isInertiaActive(): boolean {
    return this.inertia.isActive;
  }

  /** Stop inertia immediately */
  stopInertia(): void {
    if (this.inertiaTimer) {
      clearInterval(this.inertiaTimer);
      this.inertiaTimer = null;
    }
    this.inertia = { isActive: false, velocity: { x: 0, y: 0 }, lastTime: 0 };
    getEventBus().emit(InputEvents.INERTIA_END, {});
  }

  private startInertia(velocity: Point2D): void {
    const speed = Math.hypot(velocity.x, velocity.y);
    if (speed < INERTIA_MIN_VELOCITY * 2) return; // Need minimum velocity to start

    this.stopInertia(); // Clear any existing inertia

    this.inertia = {
      isActive: true,
      velocity: { ...velocity },
      lastTime: performance.now()
    };

    getEventBus().emit(InputEvents.INERTIA_START, { velocity });

    this.inertiaTimer = setInterval(() => {
      this.updateInertia();
    }, INERTIA_FRAME_MS);
  }

  private updateInertia(): void {
    if (!this.inertia.isActive) {
      this.stopInertia();
      return;
    }

    // Apply decay
    this.inertia.velocity.x *= INERTIA_DECAY;
    this.inertia.velocity.y *= INERTIA_DECAY;

    const speed = Math.hypot(this.inertia.velocity.x, this.inertia.velocity.y);

    if (speed < INERTIA_MIN_VELOCITY) {
      this.stopInertia();
      return;
    }

    // Emit inertia update
    this.inertiaCallbacks.forEach(cb => cb(this.inertia.velocity));
    getEventBus().emit(InputEvents.INERTIA_UPDATE, { velocity: this.inertia.velocity });
  }

  // ========== Interaction Intent Detection ==========

  /** Subscribe to intent changes */
  onIntentChange(callback: (intent: InteractionIntent, confidence: number) => void): () => void {
    this.intentCallbacks.push(callback);
    return () => {
      const idx = this.intentCallbacks.indexOf(callback);
      if (idx !== -1) this.intentCallbacks.splice(idx, 1);
    };
  }

  /** Get current interaction intent */
  getIntent(): InteractionIntentState {
    return { ...this.intentState };
  }

  private resetIntentState(): void {
    this.intentState = {
      intent: 'viewing',
      confidence: 0,
      totalDistance: 0,
      peakVelocity: 0
    };
  }

  private updateIntent(delta: Point2D): void {
    const velocity = this.calculateVelocity();
    const currentSpeed = velocity ? Math.hypot(velocity.x, velocity.y) : 0;
    const deltaDistance = Math.hypot(delta.x, delta.y);

    // Accumulate metrics
    this.intentState.totalDistance += deltaDistance;
    this.intentState.peakVelocity = Math.max(this.intentState.peakVelocity, currentSpeed);

    const duration = Date.now() - this.state.startTime;

    // Determine intent based on interaction characteristics
    let newIntent: InteractionIntent = 'viewing';
    let confidence = 0;

    if (currentSpeed > INTENT_VELOCITY_THRESHOLD || this.intentState.totalDistance > INTENT_DISTANCE_THRESHOLD) {
      // Fast or large movement = exploring
      newIntent = 'exploring';
      confidence = Math.min(1, Math.max(
        currentSpeed / (INTENT_VELOCITY_THRESHOLD * 2),
        this.intentState.totalDistance / (INTENT_DISTANCE_THRESHOLD * 2)
      ));
    } else if (duration > INTENT_DURATION_THRESHOLD && this.intentState.totalDistance < INTENT_DISTANCE_THRESHOLD * 0.5) {
      // Long duration with small movement = adjusting (fine-tuning)
      newIntent = 'adjusting';
      confidence = Math.min(1, duration / (INTENT_DURATION_THRESHOLD * 2));
    } else {
      // Default = viewing
      newIntent = 'viewing';
      confidence = 0.5;
    }

    // Only emit if intent changed
    if (newIntent !== this.intentState.intent) {
      this.intentState.intent = newIntent;
      this.intentState.confidence = confidence;
      this.intentCallbacks.forEach(cb => cb(newIntent, confidence));
      getEventBus().emit(InputEvents.INTENT_CHANGED, { intent: newIntent, confidence });
    } else {
      this.intentState.confidence = confidence;
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.enabled) {return;}
    const position = this.getMousePosition(e);
    let type: InteractionType = 'rotate';
    if (e.button === 2 || e.button === 1) {type = 'pan';}
    this.startInteraction(type, position);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.enabled || !this.state.isInteracting) {return;}
    const position = this.getMousePosition(e);
    this.updateInteraction(position);
  }

  private handleMouseUp(_e: MouseEvent): void {
    if (!this.state.isInteracting) {return;}
    this.endInteraction();
  }

  private handleWheel(e: WheelEvent): void {
    if (!this.enabled) {return;}
    e.preventDefault();
    const position = this.getMousePosition(e);

    if (!this.state.isInteracting) {
      this.startInteraction('pinch', position);
    } else if (this.state.type === 'pinch') {
      this.updateInteraction(position);
    }

    const delta = e.deltaY * this.sensitivity.zoom * 0.001;
    this.emitGesture({ type: 'pinch', position, scale: 1 - delta, timestamp: Date.now() });

    if (this.wheelEndTimer) {
      clearTimeout(this.wheelEndTimer);
    }
    this.wheelEndTimer = setTimeout(() => {
      if (this.state.isInteracting && this.state.type === 'pinch') {
        this.endInteraction();
      }
    }, 140);
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  private handleTouchStart(e: TouchEvent): void {
    if (!this.enabled) {return;}
    e.preventDefault();

    const touches = e.touches;
    const firstTouch = touches[0];
    if (!firstTouch) {return;}

    const position = this.getTouchPosition(firstTouch);

    if (touches.length === 1) {
      this.startInteraction('touch', position);
      this.startLongPressTimer(position);

      const now = Date.now();
      if (now - this.lastTapTime < DOUBLE_TAP_THRESHOLD) {
        this.emitGesture({ type: 'double-tap', position, timestamp: now });
      }
      this.lastTapTime = now;
    } else if (touches.length === 2) {
      const secondTouch = touches[1];
      if (!secondTouch) {return;}
      this.clearLongPressTimer();
      this.touchStartDistance = this.getTouchDistance(firstTouch, secondTouch);
      this.startInteraction('pinch', position);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.enabled || !this.state.isInteracting) {return;}
    e.preventDefault();

    const touches = e.touches;
    this.clearLongPressTimer();

    if (touches.length === 1) {
      const firstTouch = touches[0];
      if (!firstTouch) {return;}
      const position = this.getTouchPosition(firstTouch);
      this.updateInteraction(position);
    } else if (touches.length === 2) {
      const firstTouch = touches[0];
      const secondTouch = touches[1];
      if (!firstTouch || !secondTouch) {return;}
      const position = this.getTouchPosition(firstTouch);
      const currentDistance = this.getTouchDistance(firstTouch, secondTouch);
      const scale = currentDistance / this.touchStartDistance;
      this.emitGesture({ type: 'pinch', position, scale: scale * this.sensitivity.pinch, timestamp: Date.now() });
      this.touchStartDistance = currentDistance;
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    this.clearLongPressTimer();

    if (e.touches.length === 0) {
      const velocity = this.calculateVelocity();
      if (velocity && Math.hypot(velocity.x, velocity.y) > SWIPE_VELOCITY_THRESHOLD) {
        this.emitGesture({
          type: 'swipe',
          position: this.state.currentPosition ?? { x: 0, y: 0 },
          velocity,
          timestamp: Date.now()
        });
      }
      this.endInteraction();
    }
  }

  private startInteraction(type: InteractionType, position: Point2D): void {
    const now = Date.now();
    this.stopInertia(); // Stop any ongoing inertia when new interaction starts
    this.resetIntentState(); // Reset intent detection

    this.state = {
      isInteracting: true,
      type,
      startPosition: position,
      currentPosition: position,
      startTime: now,
      lastUpdateTime: now
    };
    this.velocityHistory = [{ position, time: now }];
    this.startCallbacks.forEach(cb => { cb(type); });
    getEventBus().emit(InputEvents.INTERACTION_START, { type, position, timestamp: now });
  }

  private updateInteraction(position: Point2D): void {
    if (!this.state.isInteracting || !this.state.currentPosition) {return;}

    const now = Date.now();
    const delta = { x: position.x - this.state.currentPosition.x, y: position.y - this.state.currentPosition.y };
    this.state.currentPosition = position;
    this.state.lastUpdateTime = now;

    this.velocityHistory.push({ position, time: now });
    if (this.velocityHistory.length > 5) {this.velocityHistory.shift();}

    // Update interaction intent
    this.updateIntent(delta);

    getEventBus().emit(InputEvents.INTERACTION_UPDATE, { type: this.state.type, position, delta });
  }

  private endInteraction(): void {
    const duration = Date.now() - this.state.startTime;
    const type = this.state.type;
    const velocity = this.calculateVelocity();
    const intent = this.intentState.intent;

    // Start inertia if velocity is sufficient and intent is exploring
    if (velocity && intent === 'exploring') {
      this.startInertia(velocity);
    }

    this.state = {
      isInteracting: false,
      type: 'none',
      startPosition: null,
      currentPosition: null,
      startTime: 0,
      lastUpdateTime: Date.now()
    };

    this.endCallbacks.forEach(cb => { cb(); });
    getEventBus().emit(InputEvents.INTERACTION_END, { type, duration, intent, velocity: velocity ?? undefined });
  }

  private getMousePosition(e: MouseEvent): Point2D {
    const client = { x: e.clientX, y: e.clientY };
    if (this.element) {
      return clientPointToElementPoint(client, this.element);
    }
    return client;
  }

  private getTouchPosition(touch: Touch): Point2D {
    const client = { x: touch.clientX, y: touch.clientY };
    if (this.element) {
      return clientPointToElementPoint(client, this.element);
    }
    return client;
  }

  private getTouchDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  }

  private calculateVelocity(): Point2D | null {
    if (this.velocityHistory.length < 2) {return null;}
    const first = this.velocityHistory[0];
    const last = this.velocityHistory[this.velocityHistory.length - 1];
    if (!first || !last) {return null;}
    const dt = (last.time - first.time) / 1000;
    if (dt === 0) {return null;}
    return { x: (last.position.x - first.position.x) / dt, y: (last.position.y - first.position.y) / dt };
  }

  private startLongPressTimer(position: Point2D): void {
    this.clearLongPressTimer();
    this.longPressTimer = setTimeout(() => {
      this.emitGesture({ type: 'long-press', position, timestamp: Date.now() });
    }, LONG_PRESS_THRESHOLD);
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private emitGesture(gesture: GestureEvent): void {
    this.gestureCallbacks.forEach(cb => { cb(gesture); });
    getEventBus().emit(InputEvents.GESTURE, { gesture });
  }
}

export const getInputService = (): IInputService => InputServiceImpl.getInstance();
export { InputServiceImpl as InputService };