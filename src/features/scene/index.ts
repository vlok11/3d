import type { ILifecycleAware } from '@/core/LifecycleManager';

export { SceneViewer } from './SceneViewer';
export type { SceneViewerHandle } from './SceneViewer';

class SceneModuleImpl implements ILifecycleAware {
  readonly serviceId = 'scene-module';
  readonly dependencies: string[] = [];

  async initialize(): Promise<void> {}

  async destroy(): Promise<void> {}
}

let sceneModuleInstance: SceneModuleImpl | null = null;

export const getSceneModule = (): SceneModuleImpl => {
  sceneModuleInstance ??= new SceneModuleImpl();
  return sceneModuleInstance;
};

export const resetSceneModule = (): void => {
  sceneModuleInstance = null;
};
