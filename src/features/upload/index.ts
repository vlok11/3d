import { createUploadPipeline } from './pipeline';

import type { ProcessedResult } from './pipeline';

export { UploadPanel } from './UploadPanel';
export { StatusDisplay } from './StatusDisplay';
export * from './pipeline';

export type ProcessCallback = (stage: string, progress: number, message?: string) => void;

export async function processPipeline(
  input: File | string,
  onProgress?: ProcessCallback
): Promise<ProcessedResult & { videoUrl?: string }> {
  const pipeline = createUploadPipeline();
  
  if (onProgress) {
    pipeline.onProgress((p) => {
      onProgress(p.stage, p.progress, p.message);
    });
  }
  
  const result = await pipeline.process(input);
  
  // Check if input is video
  const isVideo = input instanceof File 
    ? input.type.startsWith('video/') 
    : /\.(mp4|webm|mov|m3u8)$/i.test(input);
  
  return {
    ...result,
    videoUrl: isVideo ? (input instanceof File ? URL.createObjectURL(input) : input) : undefined
  };
}