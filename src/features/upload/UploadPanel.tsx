import { 
  Upload, Image as ImageIcon, Link as LinkIcon, ArrowRight, X, 
  Film, Sparkles, Clock, ChevronRight 
} from 'lucide-react';
import React, { memo, useState, useCallback, useRef } from 'react';

// Sample assets for quick demo
const SAMPLE_ASSETS = [
  { 
    id: 'landscape', 
    name: '山水风景', 
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920',
    thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200',
    type: 'image' as const
  },
  { 
    id: 'city', 
    name: '城市夜景', 
    url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1920',
    thumb: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=200',
    type: 'image' as const
  },
  { 
    id: 'interior', 
    name: '室内空间', 
    url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1920',
    thumb: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=200',
    type: 'image' as const
  },
];

interface UploadPanelProps {
  showUrlInput: boolean;
  setShowUrlInput: (show: boolean) => void;
  urlInput: string;
  setUrlInput: (url: string) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUrlSubmit: () => void | Promise<void>;
  acceptedFormats: string;
}

export const UploadPanel = memo(({
  showUrlInput,
  setShowUrlInput,
  urlInput,
  setUrlInput,
  onFileUpload,
  onUrlSubmit,
  acceptedFormats
}: UploadPanelProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Create a synthetic event for the file input handler
      const syntheticEvent = {
        target: { files }
      } as React.ChangeEvent<HTMLInputElement>;
      onFileUpload(syntheticEvent);
    }
  }, [onFileUpload]);

  const handleSampleSelect = useCallback((url: string) => {
    setUrlInput(url);
    setShowSamples(false);
    // Auto submit after selecting sample
    setTimeout(() => {
      void onUrlSubmit();
    }, 100);
  }, [setUrlInput, onUrlSubmit]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Main Upload Card */}
      <div 
        className={`relative p-8 border-2 border-dashed rounded-2xl bg-zinc-900/50 backdrop-blur-sm shadow-2xl transition-all duration-300 ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' 
            : 'border-zinc-700 hover:border-zinc-600'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 rounded-2xl z-10">
            <div className="text-center">
              <Upload className="w-12 h-12 text-indigo-400 mx-auto mb-2 animate-bounce" />
              <p className="text-indigo-300 font-medium">释放以上传文件</p>
            </div>
          </div>
        )}

        {!showUrlInput && !showSamples ? (
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-xl" />
              <div className="relative w-full h-full bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                <ImageIcon className="w-10 h-10 text-zinc-400" />
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">上传资源</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                支持 4K 超清视频与全景照片
                <br />
                <span className="text-zinc-500">AI 深度估计技术将把它们转化为交互式 3D 场景</span>
              </p>
            </div>

            {/* Upload Button */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedFormats}
                onChange={onFileUpload}
                className="hidden"
              />
              <button 
                onClick={triggerFileInput}
                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 flex items-center justify-center gap-2 group"
              >
                <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                选择本地文件
              </button>

              <p className="text-xs text-zinc-600">
                或将文件拖拽到此处
              </p>
            </div>

            {/* Secondary Actions */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setShowUrlInput(true)}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors px-3 py-2 rounded-lg hover:bg-zinc-800 border border-transparent hover:border-zinc-700"
              >
                <LinkIcon className="w-3.5 h-3.5" /> 
                使用链接
              </button>
              <div className="w-px h-4 bg-zinc-700" />
              <button
                onClick={() => setShowSamples(true)}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors px-3 py-2 rounded-lg hover:bg-zinc-800 border border-transparent hover:border-zinc-700"
              >
                <Sparkles className="w-3.5 h-3.5" /> 
                体验示例
              </button>
            </div>

            {/* Format Info */}
            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-600">
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> JPG, PNG, WebP
                </span>
                <span className="flex items-center gap-1">
                  <Film className="w-3 h-3" /> MP4, MOV, M3U8
                </span>
              </div>
            </div>
          </div>
        ) : showUrlInput ? (
          /* URL Input View */
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
                  <LinkIcon className="w-4 h-4 text-zinc-400" />
                </div>
                <h2 className="text-lg font-bold text-white">输入链接</h2>
              </div>
              <button 
                onClick={() => setShowUrlInput(false)} 
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 mb-4">
              支持直链或流媒体地址 (mp4, m3u8, webm 等)
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/video.mp4"
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                onKeyDown={(e) => { if (e.key === 'Enter') void onUrlSubmit(); }}
                autoFocus
              />
              <button
                onClick={() => void onUrlSubmit()}
                disabled={!urlInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white px-4 rounded-lg flex items-center justify-center transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                提示：视频处理时间取决于时长和分辨率
              </p>
            </div>
          </div>
        ) : (
          /* Sample Assets View */
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <h2 className="text-lg font-bold text-white">示例素材</h2>
              </div>
              <button 
                onClick={() => setShowSamples(false)} 
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 mb-4">
              选择一个示例快速体验 3D 转换效果
            </p>

            <div className="grid grid-cols-3 gap-3">
              {SAMPLE_ASSETS.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => handleSampleSelect(asset.url)}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-700 hover:border-indigo-500 transition-all hover:scale-105"
                >
                  <img 
                    src={asset.thumb} 
                    alt={asset.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white font-medium truncate">{asset.name}</p>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-white" />
                  </div>
                </button>
              ))}
            </div>

            <p className="text-[10px] text-zinc-600 text-center mt-4">
              图片来源: Unsplash (免费商用)
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

UploadPanel.displayName = 'UploadPanel';
