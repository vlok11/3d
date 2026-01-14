import type { ILifecycleAware } from '@/core/LifecycleManager';

class ShaderServiceImpl implements ILifecycleAware {
  readonly serviceId = 'shader-service';
  readonly dependencies: string[] = [];

  async initialize(): Promise<void> {
  }

  async destroy(): Promise<void> {
  }
}

let instance: ShaderServiceImpl | null = null;

export const getShaderService = (): ShaderServiceImpl => {
  instance ??= new ShaderServiceImpl();
  return instance;
};

export const resetShaderService = (): void => {
  instance = null;
};

export { ShaderServiceImpl as ShaderService };
