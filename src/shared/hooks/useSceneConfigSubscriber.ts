/**
 * Scene Config Subscriber Hook
 * 
 * Subscribes to session events and applies recommended config to SceneStore.
 * This decouples SessionStore from SceneStore via event-driven architecture.
 */

import { useEffect } from 'react';

import { getEventBus } from '@/core/EventBus';
import { SessionEvents } from '@/core/EventTypes';
import { useSceneStore } from '@/shared/store';

import type { SceneConfig } from '@/shared/types';

/**
 * Hook that listens for session events and applies config to scene store.
 * Should be called once at the app root level.
 */
export function useSceneConfigSubscriber(): void {
  useEffect(() => {
    const eventBus = getEventBus();

    // Subscribe to config recommendation
    const unsubConfig = eventBus.on(SessionEvents.CONFIG_RECOMMENDED, (payload) => {
      const config = payload.config as Partial<SceneConfig>;
      useSceneStore.getState().setConfig(config);
    });

    // Subscribe to reset request
    const unsubReset = eventBus.on(SessionEvents.RESET_REQUESTED, () => {
      useSceneStore.getState().resetViewConfig();
    });

    return () => {
      unsubConfig();
      unsubReset();
    };
  }, []);
}
