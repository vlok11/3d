import { MAX_IMAGE_FILE_SIZE, MAX_VIDEO_FILE_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from '@/shared/constants';
import { validateUrl, extractFrameFromVideo, getObjectURLManager } from '@/shared/utils';

import type { PipelineStage, StageInput, StageOutput } from '../types';

const ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  'video/x-msvideo'
];

const isVideoFile = (file: File): boolean => file.type.startsWith('video/');
const isVideoUrl = (url: string): boolean => /\.(mp4|webm|mov|m3u8|avi|mkv)(\?|$)/i.test(url);

export class ReadStage implements PipelineStage {
  readonly name = 'read';
  readonly order = 0;
  private formatLimitMb(bytes: number): number {
    return Math.round((bytes / 1024 / 1024) * 10) / 10;
  }
  async execute(input: StageInput): Promise<StageOutput> {
    try {
      if (input.file) {
        const file = input.file;
        const isVideo = isVideoFile(file);
        const maxSize = isVideo ? MAX_VIDEO_FILE_SIZE : MAX_IMAGE_FILE_SIZE;
        if (file.size > maxSize) {
          throw new Error(`文件过大，最大允许 ${this.formatLimitMb(maxSize)}MB`);
        }
        const isValidType = ALLOWED_MIME_TYPES.some(type => 
          file.type === type || file.type.startsWith('image/') || file.type.startsWith('video/')
        );
        if (!isValidType && file.type) {
          throw new Error(`不支持的文件类型: ${file.type}`);
        }
        
        const fileUrl = getObjectURLManager().create(file);
        
        let imageBase64: string;
        let imageUrl: string;
        let aspectRatio: number;
        let videoUrl: string | undefined;
        
        if (isVideo) {
          // Extract frame from video
          const frameResult = await extractFrameFromVideo(fileUrl);
          imageBase64 = frameResult.base64;
          imageUrl = frameResult.base64;
          aspectRatio = frameResult.aspectRatio;
          videoUrl = fileUrl;
          
          Object.assign(input, { metadata: { 
             ...input.metadata, 
             duration: frameResult.duration 
          }});
        } else {
          imageBase64 = await this.fileToBase64(file);
          imageUrl = fileUrl;
          aspectRatio = await this.getImageAspectRatio(fileUrl);
        }
        
        return {
          ...input,
          imageBase64,
          imageUrl,
          videoUrl,
          metadata: {
            ...input.metadata,
            aspectRatio,
            fileName: this.sanitizeFileName(file.name),
            fileSize: file.size,
            fileType: file.type,
            isVideo,
            // Only add duration if it was captured above (for video)
            duration: (input.metadata as { duration?: number })?.duration
          },
          success: true
        };
      } else if (input.url) {
        const validation = validateUrl(input.url);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
        
        const url = input.url;
        const isVideo = isVideoUrl(url);
        
        let imageBase64: string;
        let imageUrl: string;
        let aspectRatio: number;
        let videoUrl: string | undefined;
        
        if (isVideo) {
          const frameResult = await extractFrameFromVideo(url);
          imageBase64 = frameResult.base64;
          imageUrl = frameResult.base64;
          aspectRatio = frameResult.aspectRatio;
          videoUrl = url;
        } else {
          imageUrl = url;
          imageBase64 = await this.urlToBase64(url, input.signal);
          aspectRatio = await this.getImageAspectRatio(url);
        }
        
        return {
          ...input,
          imageBase64,
          imageUrl,
          videoUrl,
          metadata: { ...input.metadata, aspectRatio, isUrl: true, isVideo },
          success: true
        };
      }
      throw new Error('No file or URL provided');
    } catch (error) {
      return {
        ...input,
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  private fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => { resolve(reader.result as string); };
      reader.onerror = () => { reject(new Error('Failed to read file')); };
      reader.readAsDataURL(file);
    });
  }
  private async urlToBase64(url: string, signal?: AbortSignal): Promise<string> {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const blob = await response.blob();
    const maxSize = isVideoUrl(url) ? MAX_VIDEO_FILE_SIZE : MAX_IMAGE_FILE_SIZE;
    if (blob.size > maxSize) {
      throw new Error(`资源过大，最大允许 ${this.formatLimitMb(maxSize)}MB`);
    }
    return this.fileToBase64(blob);
  }
  private getImageAspectRatio(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { resolve(img.naturalWidth / img.naturalHeight); };
      img.onerror = () => { reject(new Error('Failed to load image')); };
      img.src = url;
    });
  }
  private sanitizeFileName(name: string): string {
    return name.replace(/[/\\:*?"<>|]/g, '_').slice(0, 255);
  }
}
