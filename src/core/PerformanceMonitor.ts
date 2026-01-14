import { getEventBus } from './EventBus';
import { PerformanceEvents } from './EventTypes';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsed?: number;
  memoryTotal?: number;
}

export interface PerformanceThresholds {
  minFps: number;
  maxFrameTime: number;
  maxMemoryPercent: number;
}

export interface IPerformanceMonitor {
  start(): void;
  stop(): void;
  getMetrics(): PerformanceMetrics;
  setThresholds(thresholds: Partial<PerformanceThresholds>): void;
  getThresholds(): PerformanceThresholds;
  recordServiceInitTime(serviceId: string, timeMs: number): void;
  getInitTimes(): Map<string, number>;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  minFps: 30,
  maxFrameTime: 33,
  maxMemoryPercent: 80,
};

class PerformanceMonitorImpl implements IPerformanceMonitor {
  private static instance: PerformanceMonitorImpl | null = null;
  
  private running = false;
  private frameCount = 0;
  private lastTime = 0;
  private fps = 60;
  private frameTime = 16;
  private thresholds: PerformanceThresholds = { ...DEFAULT_THRESHOLDS };
  private initTimes = new Map<string, number>();
  private rafId = 0;
  private updateInterval = 1000;

  private constructor() {}

  static getInstance(): PerformanceMonitorImpl {
    PerformanceMonitorImpl.instance ??= new PerformanceMonitorImpl();
    return PerformanceMonitorImpl.instance;
  }

  static resetInstance(): void {
    if (PerformanceMonitorImpl.instance) {
      PerformanceMonitorImpl.instance.stop();
      PerformanceMonitorImpl.instance.initTimes.clear();
    }
    PerformanceMonitorImpl.instance = null;
  }

  start(): void {
    if (this.running) {return;}
    this.running = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  getMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {
      fps: this.fps,
      frameTime: this.frameTime,
    };

    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      if (memory) {
        metrics.memoryUsed = memory.usedJSHeapSize;
        metrics.memoryTotal = memory.totalJSHeapSize;
      }
    }

    return metrics;
  }

  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  recordServiceInitTime(serviceId: string, timeMs: number): void {
    this.initTimes.set(serviceId, timeMs);
  }

  getInitTimes(): Map<string, number> {
    return new Map(this.initTimes);
  }

  private tick(): void {
    if (!this.running) {return;}

    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastTime;

    if (elapsed >= this.updateInterval) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameTime = elapsed / this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;

      this.emitMetrics();
      this.checkThresholds();
    }

    this.rafId = requestAnimationFrame(() => { this.tick(); });
  }

  private emitMetrics(): void {
    getEventBus().emit(PerformanceEvents.FPS_UPDATE, {
      fps: this.fps,
      frameTime: this.frameTime,
    });
  }

  private checkThresholds(): void {
    if (this.fps < this.thresholds.minFps) {
      getEventBus().emit(PerformanceEvents.THRESHOLD_EXCEEDED, {
        metric: 'fps',
        value: this.fps,
        threshold: this.thresholds.minFps,
      });
    }

    if (this.frameTime > this.thresholds.maxFrameTime) {
      getEventBus().emit(PerformanceEvents.THRESHOLD_EXCEEDED, {
        metric: 'frameTime',
        value: this.frameTime,
        threshold: this.thresholds.maxFrameTime,
      });
    }

    const metrics = this.getMetrics();
    if (metrics.memoryUsed && metrics.memoryTotal) {
      const memoryPercent = (metrics.memoryUsed / metrics.memoryTotal) * 100;
      if (memoryPercent > this.thresholds.maxMemoryPercent) {
        getEventBus().emit(PerformanceEvents.MEMORY_WARNING, {
          used: metrics.memoryUsed,
          total: metrics.memoryTotal,
          percentage: memoryPercent,
        });
      }
    }
  }
}

export const getPerformanceMonitor = (): IPerformanceMonitor => PerformanceMonitorImpl.getInstance();
export const resetPerformanceMonitor = (): void => { PerformanceMonitorImpl.resetInstance(); };
export { PerformanceMonitorImpl as PerformanceMonitor };
