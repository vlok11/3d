const MAX_LOG_HISTORY = 500;

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  timestamp: number;
  correlationId?: string;
  context?: Record<string, unknown>;
}

export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  getHistory(limit?: number): LogEntry[];
  clearHistory(): void;
}

export interface LoggerOptions {
  module: string;
  level?: LogLevel;
  maxHistory?: number;
  correlationId?: string;
}

class LoggerImpl implements ILogger {
  private static globalLevel: LogLevel = LogLevel.INFO;
  private static history: LogEntry[] = [];
  private static maxHistory = MAX_LOG_HISTORY;

  private module: string;
  private localLevel?: LogLevel;
  private correlationId?: string;

  constructor(options: LoggerOptions) {
    this.module = options.module;
    this.localLevel = options.level;
    this.correlationId = options.correlationId;

    if (options.maxHistory !== undefined) {
      LoggerImpl.maxHistory = options.maxHistory;
    }
  }

  static setGlobalLevel(level: LogLevel): void {
    LoggerImpl.globalLevel = level;
  }

  static getGlobalLevel(): LogLevel {
    return LoggerImpl.globalLevel;
  }

  static resetHistory(): void {
    LoggerImpl.history = [];
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  setLevel(level: LogLevel): void {
    this.localLevel = level;
  }

  getLevel(): LogLevel {
    return this.localLevel ?? LoggerImpl.globalLevel;
  }

  getHistory(limit?: number): LogEntry[] {
    if (limit) {
      return LoggerImpl.history.slice(-limit);
    }
    return [...LoggerImpl.history];
  }

  clearHistory(): void {
    LoggerImpl.history = [];
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const effectiveLevel = this.localLevel ?? LoggerImpl.globalLevel;
    if (level < effectiveLevel) {return;}

    const entry: LogEntry = {
      level,
      module: this.module,
      message,
      timestamp: Date.now(),
      correlationId: this.correlationId,
      context,
    };

    LoggerImpl.history.push(entry);

    if (LoggerImpl.history.length > LoggerImpl.maxHistory) {
      LoggerImpl.history = LoggerImpl.history.slice(-LoggerImpl.maxHistory);
    }

    this.output(entry);
  }

  private output(entry: LogEntry): void {
    const prefix = `[${this.formatTime(entry.timestamp)}] [${this.module}]`;
    const msg = entry.context
      ? `${prefix} ${entry.message} ${JSON.stringify(entry.context)}`
      : `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console -- Logger is the designated console output handler
        console.debug(msg);
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console -- Logger is the designated console output handler
        console.info(msg);
        break;
      case LogLevel.WARN:
        console.warn(msg);
        break;
      case LogLevel.ERROR:
        console.error(msg);
        break;
    }
  }

  private formatTime(timestamp: number): string {
    const d = new Date(timestamp);
    return d.toISOString().slice(11, 23);
  }
}

export function createLogger(options: LoggerOptions): ILogger {
  return new LoggerImpl(options);
}

export const setGlobalLogLevel = LoggerImpl.setGlobalLevel;
export const getGlobalLogLevel = LoggerImpl.getGlobalLevel;
export const resetLogHistory = LoggerImpl.resetHistory;

export { LoggerImpl as Logger };
