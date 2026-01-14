import * as tf from '@tensorflow/tfjs';
import * as depthEstimation from '@tensorflow-models/depth-estimation';

import { createLogger } from '@/core/Logger';

import type { IAIProvider, DepthResult, ImageAnalysis } from '../types';

const logger = createLogger({ module: 'TensorFlowProvider' });

export class TensorFlowProvider implements IAIProvider {
  readonly providerId = 'tensorflow';

  private estimator: depthEstimation.DepthEstimator | null = null;
  private _isAvailable = false;
  private isLoading = false;
  private loadError: Error | null = null;

  get isAvailable(): boolean {
    return this._isAvailable;
  }

  async initialize(): Promise<void> {
    if (this.estimator) {
      this._isAvailable = true;
      return;
    }

    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isLoading = true;

    try {
      await tf.setBackend('webgl');
      await tf.ready();
      this.estimator = await depthEstimation.createEstimator(
        depthEstimation.SupportedModels.ARPortraitDepth,
        {} as depthEstimation.ARPortraitDepthModelConfig
      );
      this._isAvailable = true;
      logger.info('TensorFlow depth model loaded');
    } catch (error) {
      this.loadError = error as Error;
      this._isAvailable = false;
      logger.error('Failed to load depth model', { error });
    } finally {
      this.isLoading = false;
    }
  }

  async dispose(): Promise<void> {
    if (this.estimator) {
      try {
        this.estimator = null;
        this.loadError = null;
        this._isAvailable = false;
        logger.info('TensorFlow depth model disposed');
      } catch (error) {
        logger.error('Failed to dispose depth model', { error });
      }
    }
  }

  async estimateDepth(imageUrl: string): Promise<DepthResult> {
    if (!this.estimator) {
      throw new Error('TensorFlowProvider not initialized');
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => { resolve(); };
      img.onerror = () => { reject(new Error('Failed to load image')); };
      img.src = imageUrl;
    });

    try {
      const depthMap = await this.estimator.estimateDepth(img, {
        flipHorizontal: false,
        minDepth: 0,
        maxDepth: 1
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {throw new Error('Cannot get canvas context');}

      const depthData = await depthMap.toCanvasImageSource();
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(depthData, 0, 0, canvas.width, canvas.height);

      const depthUrl = canvas.toDataURL('image/jpeg', 0.9);
      // Release canvas memory to prevent accumulation
      canvas.width = 0;
      canvas.height = 0;
      return { depthUrl, method: 'ai' };
    } catch (error) {
      logger.error('AI Depth estimation failed', { error });
      throw error;
    }
  }

  async analyzeScene(_base64Image: string): Promise<ImageAnalysis> {
    throw new Error('TensorFlowProvider does not support scene analysis');
  }

  async editImage(_base64Image: string, _prompt: string): Promise<string> {
    throw new Error('TensorFlowProvider does not support image editing');
  }

  getStatus(): { isLoaded: boolean; isLoading: boolean; error: Error | null } {
    return {
      isLoaded: this.estimator !== null,
      isLoading: this.isLoading,
      error: this.loadError
    };
  }
}
