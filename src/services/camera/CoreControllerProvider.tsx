import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useRef,
  useMemo,
  useCallback,
  memo
} from 'react';

import { createLogger } from '@/core/Logger';

import { getCoreController } from './CoreController';

import type { ICoreController } from '@/shared/types';
import type { ReactNode } from 'react';

const logger = createLogger({ module: 'CoreControllerProvider' });

interface CoreControllerContextValue {
  controller: ICoreController | null;
  isReady: boolean;
  bindInput: (element: HTMLElement) => void;
}

interface CoreControllerProviderProps {
  children: ReactNode;
  autoInit?: boolean;
}

const CoreControllerContext = createContext<CoreControllerContextValue>({
  controller: null,
  isReady: false,
  bindInput: () => {}
});

export const CoreControllerProvider = memo(({
  children,
  autoInit = true
}: CoreControllerProviderProps) => {
  const [isReady, setIsReady] = useState(false);
  
  const controllerRef = useRef<ICoreController | null>(null);
  
  useEffect(() => {
    if (!autoInit) {return;}
    const controller = getCoreController();
    controllerRef.current = controller;
    const init = async (): Promise<void> => {
      try {
        await controller.initialize();
        setIsReady(true);
      } catch (error) {
        logger.error('Init failed', { error: String(error) });
      }
    };
    void init();
    return () => {
      controller.dispose();
      setIsReady(false);
    };
  }, [autoInit]);
  
  const bindInput = useCallback((element: HTMLElement) => {
    if (controllerRef.current?.isInitialized) {
      controllerRef.current.input.bindToElement(element);
    }
  }, []);

  const value = useMemo<CoreControllerContextValue>(() => ({
    controller: controllerRef.current,
    isReady,
    bindInput
  }), [isReady, bindInput]);

  return (
    <CoreControllerContext.Provider value={value}>
      {children}
    </CoreControllerContext.Provider>
  );
});

CoreControllerProvider.displayName = 'CoreControllerProvider';

export function useCoreController(): CoreControllerContextValue {
  const context = useContext(CoreControllerContext);
  if (!context) {
    throw new Error('useCoreController must be used within CoreControllerProvider');
  }
  return context;
}

export function useCameraService() {
  const { controller, isReady } = useCoreController();
  return isReady ? controller?.camera : null;
}

export function useMotionService() {
  const { controller, isReady } = useCoreController();
  return isReady ? controller?.motion : null;
}

export function useInputService() {
  const { controller, isReady } = useCoreController();
  return isReady ? controller?.input : null;
}

export function useAnimationService() {
  const { controller, isReady } = useCoreController();
  return isReady ? controller?.animation : null;
}

export { CoreControllerContext };