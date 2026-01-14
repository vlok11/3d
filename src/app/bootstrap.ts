import { getEventBus, resetEventBus } from '@/core/EventBus';
import { getLifecycleManager, resetLifecycleManager, LifecycleState } from '@/core/LifecycleManager';
import { createLogger } from '@/core/Logger';
import { getControlsModule, resetControlsModule } from '@/features/controls';
import { getSceneModule, resetSceneModule } from '@/features/scene';
import { getAIService, resetAIService } from '@/services/ai';
import { getShaderService, resetShaderService } from '@/services/shader';

const logger = createLogger({ module: 'Bootstrap' });

// 保存全局错误处理器引用，以便清理
let globalErrorHandlers: {
  unhandledRejection?: (event: PromiseRejectionEvent) => void;
  error?: (event: ErrorEvent) => void;
} = {};

export interface BootstrapConfig {
  enableAI?: boolean;
  enableShaders?: boolean;
  enableModules?: boolean;
  onProgress?: (stage: string, progress: number) => void;
}

const DEFAULT_CONFIG: BootstrapConfig = {
  enableAI: true,
  enableShaders: true,
  enableModules: true,
};

export async function bootstrap(config: BootstrapConfig = {}): Promise<void> {
  // Prevent double initialization (React StrictMode calls useEffect twice)
  const lifecycleManager = getLifecycleManager();
  const currentState = lifecycleManager.getState();
  if (currentState === LifecycleState.READY || currentState === LifecycleState.INITIALIZING) {
    logger.info('Already initialized, skipping');
    return;
  }

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { onProgress } = mergedConfig;

  logger.info('Starting...');
  onProgress?.('initializing', 0);

  try {
    if (mergedConfig.enableAI) {
      onProgress?.('registering-ai-service', 20);
      lifecycleManager.register(getAIService());
    }

    if (mergedConfig.enableShaders) {
      onProgress?.('registering-shader-service', 30);
      lifecycleManager.register(getShaderService());
    }

    if (mergedConfig.enableModules) {
      onProgress?.('registering-modules', 40);
      lifecycleManager.register(getSceneModule());
      lifecycleManager.register(getControlsModule());
    }

    onProgress?.('initializing-services', 50);
    await lifecycleManager.initializeAll();

    onProgress?.('configuring-error-handling', 90);
    setupGlobalErrorHandling();

    onProgress?.('complete', 100);
    logger.info('Started');
  } catch (error) {
    logger.error('Failed to start', { error });
    throw error;
  }
}

export async function shutdown(): Promise<void> {
  logger.info('Shutting down...');

  try {
    // 清理全局错误处理�?
    cleanupGlobalErrorHandling();
    
    const lifecycleManager = getLifecycleManager();
    await lifecycleManager.destroyAll();

    resetSceneModule();
    resetControlsModule();
    resetShaderService();
    resetAIService();
    resetLifecycleManager();
    resetEventBus();

    logger.info('Shutdown complete');
  } catch (error) {
    logger.error('Shutdown error', { error });
    throw error;
  }
}

function setupGlobalErrorHandling(): void {
  const eventBus = getEventBus();

  if (typeof window !== 'undefined') {
    // 先清理旧的处理器
    cleanupGlobalErrorHandling();
    
    globalErrorHandlers.unhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled rejection', { reason: event.reason });
      eventBus.emit('system:error', {
        error: event.reason,
        context: 'unhandled-rejection',
        recoverable: false
      });
    };

    globalErrorHandlers.error = (event: ErrorEvent) => {
      logger.error('Uncaught error', { error: event.error });
      eventBus.emit('system:error', {
        error: event.error,
        context: 'uncaught-error',
        recoverable: false
      });
    };

    window.addEventListener('unhandledrejection', globalErrorHandlers.unhandledRejection);
    window.addEventListener('error', globalErrorHandlers.error);
  }
}

function cleanupGlobalErrorHandling(): void {
  if (typeof window !== 'undefined') {
    if (globalErrorHandlers.unhandledRejection) {
      window.removeEventListener('unhandledrejection', globalErrorHandlers.unhandledRejection);
    }
    if (globalErrorHandlers.error) {
      window.removeEventListener('error', globalErrorHandlers.error);
    }
    globalErrorHandlers = {};
  }
}

export function isInitialized(): boolean {
  return getLifecycleManager().getState() === LifecycleState.READY;
}
