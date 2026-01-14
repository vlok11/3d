import { useThree } from '@react-three/fiber';
import { useImperativeHandle, forwardRef, memo } from 'react';
import { GLTFExporter } from 'three-stdlib';

import { createLogger } from '@/core/Logger';
import { useSessionStore } from '@/stores/useSessionStore';

import type { RefObject } from 'react';
import type { Group } from 'three';

const logger = createLogger({ module: 'SceneExporter' });

export interface ExporterRef {
  exportScene: () => void;
  downloadSnapshot: () => void;
}

interface SceneExporterProps {
  sceneGroupRef: RefObject<Group>;
}

export const SceneExporter = memo(forwardRef<ExporterRef, SceneExporterProps>(({ sceneGroupRef }, ref) => {
  const { startExport, finishExport } = useSessionStore();
  const { gl } = useThree();

  const exportScene = () => {
    if (!sceneGroupRef.current) return;
    
    startExport('glb'); // Defaulting to glb for now
    
    // Small delay to allow UI to update (React render cycle)
    setTimeout(() => {
        const exporter = new GLTFExporter();
        exporter.parse(
          sceneGroupRef.current!, 
          (result) => {
            try {
              if (result instanceof ArrayBuffer) {
                const blob = new Blob([result], { type: 'model/gltf-binary' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `immersa_scene_${Date.now()}.glb`;
                link.click();
                URL.revokeObjectURL(url);
              } else {
                const output = JSON.stringify(result, null, 2);
                const blob = new Blob([output], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `immersa_scene_${Date.now()}.gltf`;
                link.click();
                URL.revokeObjectURL(url);
              }
            } catch (e) {
              logger.error('Export download failed', { error: String(e) });
            } finally {
              finishExport();
            }
          },
          (error) => { 
            logger.error('Export error', { error: String(error) }); 
            finishExport(); 
          },
          { binary: true }
        );
    }, 100);
  };

  const downloadSnapshot = () => {
    const canvas = gl.domElement;
    if (!canvas) return;
    
    startExport('png');
    
    // Immediate execution for snapshot
    requestAnimationFrame(() => {
        const url = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = url;
        link.download = `snapshot_${Date.now()}.png`;
        link.click();
        finishExport();
    });
  };

  useImperativeHandle(ref, () => ({
    exportScene,
    downloadSnapshot
  }));

  return null;
}));

SceneExporter.displayName = 'SceneExporter';
