import type { ILifecycleAware } from '@/core/LifecycleManager';

export { default as ControlPanel } from './ControlPanelNew';

class ControlsModuleImpl implements ILifecycleAware {
  readonly serviceId = 'controls-module';
  readonly dependencies: string[] = [];

  async initialize(): Promise<void> {
  }

  async destroy(): Promise<void> {
  }
}

let controlsModuleInstance: ControlsModuleImpl | null = null;

export const getControlsModule = (): ControlsModuleImpl => {
  controlsModuleInstance ??= new ControlsModuleImpl();
  return controlsModuleInstance;
};

export const resetControlsModule = (): void => {
  controlsModuleInstance = null;
};
