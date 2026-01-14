import { getEventBus } from './EventBus';
import { ErrorEvents } from './EventTypes';

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface RecoveryOption {
  label: string;
  action: () => void | Promise<void>;
}

export interface AppError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  context: string;
  timestamp: number;
  recoverable: boolean;
  recoveryOptions?: RecoveryOption[];
  originalError?: Error;
}

export interface IErrorHandler {
  handle(error: Error | AppError, context?: { context?: string }): AppError;
  createError(code: string, message: string, options?: Partial<AppError>): AppError;
  getHistory(): AppError[];
  clearHistory(): void;
  onFatalError(callback: (error: AppError) => void): () => void;
}

class ErrorHandlerImpl implements IErrorHandler {
  private static instance: ErrorHandlerImpl | null = null;
  private history: AppError[] = [];
  private maxHistory = 100;
  private fatalCallbacks = new Set<(error: AppError) => void>();

  private constructor() {}

  static getInstance(): ErrorHandlerImpl {
    ErrorHandlerImpl.instance ??= new ErrorHandlerImpl();
    return ErrorHandlerImpl.instance;
  }

  static resetInstance(): void {
    if (ErrorHandlerImpl.instance) {
      ErrorHandlerImpl.instance.history = [];
      ErrorHandlerImpl.instance.fatalCallbacks.clear();
    }
    ErrorHandlerImpl.instance = null;
  }

  handle(error: Error | AppError, context?: { context?: string }): AppError {
    const appError = this.normalizeError(error, context?.context);
    this.recordError(appError);
    this.emitEvent(appError);

    if (appError.severity === ErrorSeverity.FATAL) {
      this.notifyFatalCallbacks(appError);
    }

    return appError;
  }

  createError(code: string, message: string, options?: Partial<AppError>): AppError {
    return {
      code,
      message,
      severity: options?.severity ?? ErrorSeverity.ERROR,
      context: options?.context ?? 'unknown',
      timestamp: Date.now(),
      recoverable: options?.recoverable ?? true,
      recoveryOptions: options?.recoveryOptions,
      originalError: options?.originalError,
    };
  }

  getHistory(): AppError[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  onFatalError(callback: (error: AppError) => void): () => void {
    this.fatalCallbacks.add(callback);
    return () => this.fatalCallbacks.delete(callback);
  }

  private normalizeError(error: Error | AppError, context?: string): AppError {
    if (this.isAppError(error)) {
      return error;
    }

    const severity = this.categorizeSeverity(error);
    return {
      code: error.name || 'UNKNOWN_ERROR',
      message: error.message,
      severity,
      context: context ?? 'unknown',
      timestamp: Date.now(),
      recoverable: severity !== ErrorSeverity.FATAL,
      recoveryOptions: this.suggestRecovery(error, severity),
      originalError: error,
    };
  }

  private isAppError(error: unknown): error is AppError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'severity' in error &&
      'timestamp' in error
    );
  }

  private categorizeSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    if (message.includes('fatal') || message.includes('critical')) {
      return ErrorSeverity.FATAL;
    }
    if (message.includes('warning') || message.includes('deprecated')) {
      return ErrorSeverity.WARNING;
    }
    if (message.includes('info') || message.includes('notice')) {
      return ErrorSeverity.INFO;
    }
    return ErrorSeverity.ERROR;
  }

  private suggestRecovery(_error: Error, severity: ErrorSeverity): RecoveryOption[] | undefined {
    if (severity === ErrorSeverity.FATAL) {
      return [{ label: 'Reload Page', action: () => { window.location.reload(); } }];
    }
    if (severity === ErrorSeverity.ERROR) {
      return [{ label: 'Retry', action: () => {} }];
    }
    return undefined;
  }

  private recordError(error: AppError): void {
    this.history.push(error);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  private emitEvent(error: AppError): void {
    const eventType = error.severity === ErrorSeverity.FATAL 
      ? ErrorEvents.FATAL_ERROR 
      : ErrorEvents.ERROR_OCCURRED;

    getEventBus().emit(eventType, {
      type: error.code,
      message: error.message,
      context: { severity: error.severity, recoverable: error.recoverable },
    });
  }

  private notifyFatalCallbacks(error: AppError): void {
    for (const callback of this.fatalCallbacks) {
      try {
        callback(error);
      } catch (_e) {
        // Ignore callback errors
      }
    }
  }
}

export const getErrorHandler = (): IErrorHandler => ErrorHandlerImpl.getInstance();
export const resetErrorHandler = (): void => { ErrorHandlerImpl.resetInstance(); };
export { ErrorHandlerImpl as ErrorHandler };
