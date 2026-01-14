import { getEventBus } from './EventBus';
import { LifecycleEvents, SystemEvents } from './EventTypes';
import { createLogger } from './Logger';

export enum LifecycleState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  PAUSED = 'paused',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed',
}

export interface ILifecycleAware {
  readonly serviceId: string;
  readonly dependencies?: string[];
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  pause?(): void;
  resume?(): void;
}

export interface LifecycleManagerOptions {
  /** Timeout for individual service initialization (ms), default 30000 */
  initTimeout?: number;
  /** Whether to continue on non-critical service failure */
  continueOnError?: boolean;
}

interface ServiceMetadata {
  service: ILifecycleAware;
  state: LifecycleState;
  initOrder: number;
  initDuration?: number;
}

const logger = createLogger({ module: 'LifecycleManager' });
const DEFAULT_INIT_TIMEOUT = 30000;

class LifecycleManagerImpl {
  private static instance: LifecycleManagerImpl | null = null;
  private services = new Map<string, ServiceMetadata>();
  private state: LifecycleState = LifecycleState.UNINITIALIZED;
  private initStartTime = 0;
  private options: Required<LifecycleManagerOptions>;

  private constructor(options: LifecycleManagerOptions = {}) {
    this.options = {
      initTimeout: options.initTimeout ?? DEFAULT_INIT_TIMEOUT,
      continueOnError: options.continueOnError ?? false,
    };
  }

  static getInstance(options?: LifecycleManagerOptions): LifecycleManagerImpl {
    LifecycleManagerImpl.instance ??= new LifecycleManagerImpl(options);
    return LifecycleManagerImpl.instance;
  }

  static resetInstance(): void {
    if (LifecycleManagerImpl.instance) {
      LifecycleManagerImpl.instance.services.clear();
      LifecycleManagerImpl.instance.state = LifecycleState.UNINITIALIZED;
    }
    LifecycleManagerImpl.instance = null;
  }

  getState(): LifecycleState {
    return this.state;
  }

  register(service: ILifecycleAware): void {
    if (this.services.has(service.serviceId)) {
      logger.warn(`Service ${service.serviceId} already registered`);
      return;
    }

    this.services.set(service.serviceId, {
      service,
      state: LifecycleState.UNINITIALIZED,
      initOrder: -1,
    });
  }

  unregister(serviceId: string): void {
    this.services.delete(serviceId);
  }

  async initializeAll(): Promise<void> {
    if (this.state !== LifecycleState.UNINITIALIZED) {
      logger.warn('Already initialized or initializing');
      return;
    }

    this.state = LifecycleState.INITIALIZING;
    this.initStartTime = Date.now();

    try {
      const order = this.calculateInitOrder();
      
      for (let i = 0; i < order.length; i++) {
        const serviceId = order[i]!;
        const metadata = this.services.get(serviceId);
        
        if (!metadata) { continue; }
        
        metadata.state = LifecycleState.INITIALIZING;
        const serviceStartTime = Date.now();
        
        try {
          await this.initializeWithTimeout(metadata.service, serviceId);
          metadata.initDuration = Date.now() - serviceStartTime;
          metadata.state = LifecycleState.READY;
          metadata.initOrder = i;
          
          getEventBus().emit(LifecycleEvents.SERVICE_INITIALIZED, { serviceId });
        } catch (error) {
          metadata.state = LifecycleState.DESTROYED;
          const errorMsg = error instanceof Error ? error.message : String(error);
          
          getEventBus().emit(SystemEvents.ERROR, {
            error: error instanceof Error ? error : new Error(errorMsg),
            context: `LifecycleManager.initializeAll(${serviceId})`,
            recoverable: this.options.continueOnError,
          });
          
          if (!this.options.continueOnError) {
            throw error;
          }
          logger.error(`Service ${serviceId} failed to initialize, continuing...`, { error: errorMsg });
        }
      }

      this.state = LifecycleState.READY;
      
      const initTime = Date.now() - this.initStartTime;
      getEventBus().emit(LifecycleEvents.APP_READY, { initTime });
      
    } catch (error) {
      logger.error('Initialization failed', { error: String(error) });
      this.state = LifecycleState.UNINITIALIZED;
      throw error;
    }
  }

  /** Initialize a service with timeout */
  private async initializeWithTimeout(service: ILifecycleAware, serviceId: string): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Service ${serviceId} initialization timed out after ${this.options.initTimeout}ms`));
      }, this.options.initTimeout);
    });

    await Promise.race([service.initialize(), timeoutPromise]);
  }

  async destroyAll(): Promise<void> {
    if (this.state === LifecycleState.DESTROYED || 
        this.state === LifecycleState.DESTROYING) {
      return;
    }

    this.state = LifecycleState.DESTROYING;

    const sortedServices = [...this.services.entries()]
      .filter(([, meta]) => meta.initOrder >= 0)
      .sort((a, b) => b[1].initOrder - a[1].initOrder);

    for (const [serviceId, metadata] of sortedServices) {
      try {
        metadata.state = LifecycleState.DESTROYING;
        await metadata.service.destroy();
        metadata.state = LifecycleState.DESTROYED;
        
        getEventBus().emit(LifecycleEvents.SERVICE_DESTROYED, { serviceId });
      } catch (error) {
        logger.error(`Error destroying ${serviceId}`, { error: String(error) });
      }
    }

    this.state = LifecycleState.DESTROYED;
  }

  pause(): void {
    if (this.state !== LifecycleState.READY) {return;}

    for (const [, metadata] of this.services) {
      if (metadata.service.pause) {
        metadata.service.pause();
      }
    }

    this.state = LifecycleState.PAUSED;
    getEventBus().emit(LifecycleEvents.APP_PAUSED, undefined as unknown as void);
  }

  resume(): void {
    if (this.state !== LifecycleState.PAUSED) {return;}

    for (const [, metadata] of this.services) {
      if (metadata.service.resume) {
        metadata.service.resume();
      }
    }

    this.state = LifecycleState.READY;
    getEventBus().emit(LifecycleEvents.APP_RESUMED, undefined as unknown as void);
  }

  getServiceState(serviceId: string): LifecycleState | undefined {
    return this.services.get(serviceId)?.state;
  }

  isServiceReady(serviceId: string): boolean {
    return this.services.get(serviceId)?.state === LifecycleState.READY;
  }

  private calculateInitOrder(): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const path: string[] = []; // Track current path for better error messages

    const visit = (serviceId: string): void => {
      if (visited.has(serviceId)) { return; }
      if (visiting.has(serviceId)) {
        // Build detailed cycle path
        const cycleStart = path.indexOf(serviceId);
        const cyclePath = [...path.slice(cycleStart), serviceId].join(' -> ');
        throw new Error(
          `[LifecycleManager] Circular dependency detected!\n` +
          `  Cycle: ${cyclePath}\n` +
          `  Service "${serviceId}" depends on itself through: ${path.slice(cycleStart).join(' -> ')}`
        );
      }

      const metadata = this.services.get(serviceId);
      if (!metadata) { return; }

      visiting.add(serviceId);
      path.push(serviceId);

      const deps = metadata.service.dependencies ?? [];
      for (const dep of deps) {
        if (!this.services.has(dep)) {
          logger.warn(`Missing dependency: ${dep} for ${serviceId}. Skipping.`);
          continue;
        }
        visit(dep);
      }

      path.pop();
      visiting.delete(serviceId);
      visited.add(serviceId);
      result.push(serviceId);
    };

    for (const serviceId of this.services.keys()) {
      visit(serviceId);
    }

    return result;
  }
}

export const getLifecycleManager = (): LifecycleManagerImpl => 
  LifecycleManagerImpl.getInstance();

export const resetLifecycleManager = (): void => 
  { LifecycleManagerImpl.resetInstance(); };

export { LifecycleManagerImpl as LifecycleManager };
