import { createLogger } from './Logger';

import type {
  CoreEventType,
  CoreEventPayloadMap,
  CoreEventHandler,
  EventSubscriptionOptions,
  EventRecord,
  IEventBus,
} from './EventTypes';

const logger = createLogger({ module: 'EventBus' });

interface Subscriber {
  handler: (payload: unknown) => void;
  priority: number;
  once: boolean;
}

class EventBusImpl implements IEventBus {
  private static instance: EventBusImpl | null = null;
  private subscribers = new Map<string, Subscriber[]>();
  private history: EventRecord[] = [];
  private maxHistoryLength = 100;
  private loggingEnabled = false;

  private constructor() {}

  static getInstance(): EventBusImpl {
    EventBusImpl.instance ??= new EventBusImpl();
    return EventBusImpl.instance;
  }

  static resetInstance(): void {
    if (EventBusImpl.instance) {
      EventBusImpl.instance.subscribers.clear();
      EventBusImpl.instance.history = [];
    }
    EventBusImpl.instance = null;
  }

  emit<T extends CoreEventType>(type: T, payload: CoreEventPayloadMap[T]): void;
  emit(type: string, payload: unknown): void;
  emit(type: string, payload: unknown): void {
    const subscribers = this.subscribers.get(type);

    this.recordEvent(type, payload, subscribers?.length ?? 0);

    if (this.loggingEnabled) {
      logger.debug(`Event: ${type}`, { payload });
    }

    if (!subscribers || subscribers.length === 0) {
      return;
    }

    const sortedSubscribers = [...subscribers].sort((a, b) => b.priority - a.priority);
    const toRemove: Subscriber[] = [];

    for (const subscriber of sortedSubscribers) {
      try {
        subscriber.handler(payload);

        if (subscriber.once) {
          toRemove.push(subscriber);
        }
      } catch (error) {
        logger.error(`Error in subscriber for ${type}`, { error: String(error) });
      }
    }

    if (toRemove.length > 0) {
      const remaining = subscribers.filter((s) => !toRemove.includes(s));
      this.subscribers.set(type, remaining);
    }
  }

  on<T extends CoreEventType>(type: T, handler: CoreEventHandler<T>, options?: EventSubscriptionOptions): () => void;
  on(type: string, handler: (payload: unknown) => void, options?: EventSubscriptionOptions): () => void;
  on(type: string, handler: (payload: unknown) => void, options: EventSubscriptionOptions = {}): () => void {
    const { once = false, priority = 0 } = options;

    const subscriber: Subscriber = {
      handler,
      priority,
      once,
    };

    const subscribers = this.subscribers.get(type) ?? [];
    subscribers.push(subscriber);
    this.subscribers.set(type, subscribers);

    return () => { this.off(type, handler); };
  }

  once<T extends CoreEventType>(type: T, handler: CoreEventHandler<T>): () => void;
  once(type: string, handler: (payload: unknown) => void): () => void;
  once(type: string, handler: (payload: unknown) => void): () => void {
    return this.on(type, handler, { once: true });
  }

  off<T extends CoreEventType>(type: T, handler: CoreEventHandler<T>): void;
  off(type: string, handler: (payload: unknown) => void): void;
  off(type: string, handler: (payload: unknown) => void): void {
    const subscribers = this.subscribers.get(type);
    if (!subscribers) {return;}

    const filtered = subscribers.filter((s) => s.handler !== handler);
    if (filtered.length === 0) {
      this.subscribers.delete(type);
    } else {
      this.subscribers.set(type, filtered);
    }
  }

  offAll(type?: CoreEventType | string): void {
    if (type) {
      this.subscribers.delete(type);
    } else {
      this.subscribers.clear();
    }
  }

  enableLogging(enabled: boolean): void {
    this.loggingEnabled = enabled;
  }

  getEventHistory(limit?: number): EventRecord[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  clearEventHistory(): void {
    this.history = [];
  }

  getSubscriberCount(type: CoreEventType | string): number {
    return this.subscribers.get(type)?.length ?? 0;
  }

  private recordEvent(
    type: string,
    payload: unknown,
    subscriberCount: number
  ): void {
    const record: EventRecord = {
      type,
      payload,
      timestamp: Date.now(),
      subscriberCount,
    };

    this.history.push(record);

    if (this.history.length > this.maxHistoryLength) {
      this.history = this.history.slice(-this.maxHistoryLength);
    }
  }
}

export const getEventBus = (): IEventBus => EventBusImpl.getInstance();

export const resetEventBus = (): void => { EventBusImpl.resetInstance(); };

export const emitEvent = <T extends CoreEventType>(
  type: T,
  payload: CoreEventPayloadMap[T]
): void => {
  EventBusImpl.getInstance().emit(type, payload);
};

export const onEvent = <T extends CoreEventType>(
  type: T,
  handler: CoreEventHandler<T>,
  options?: EventSubscriptionOptions
): (() => void) => EventBusImpl.getInstance().on(type, handler as (payload: unknown) => void, options);

export { EventBusImpl as EventBus };
