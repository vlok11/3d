import { AlertCircle, X, Loader2, CheckCircle2, Sparkles, Brain, Layers } from 'lucide-react';
import { memo, useMemo } from 'react';

import type { ProcessingState } from '@/shared/types';

interface StatusDisplayProps {
  processingState: ProcessingState;
  onRetry: () => void;
  onCancel?: () => void;
}

// Processing stages with icons and descriptions
const STAGES = {
  analyzing: {
    icon: Brain,
    title: 'AI 分析中',
    description: '正在识别图像内容和场景结构',
    color: 'indigo'
  },
  generating_depth: {
    icon: Layers,
    title: '生成深度图',
    description: '计算场景深度信息，构建 3D 结构',
    color: 'purple'
  },
  preparing: {
    icon: Sparkles,
    title: '准备渲染',
    description: '优化网格和材质，即将完成',
    color: 'emerald'
  }
} as const;

export const StatusDisplay = memo(({ processingState, onRetry, onCancel }: StatusDisplayProps) => {
  const stage = useMemo(() => {
    if (processingState.status === 'analyzing') return STAGES.analyzing;
    if (processingState.status === 'generating_depth') return STAGES.generating_depth;
    return STAGES.preparing;
  }, [processingState.status]);

  const estimatedTime = useMemo(() => {
    const progress = processingState.progress;
    if (progress < 10) return '预计 30-60 秒';
    if (progress < 30) return '预计 20-40 秒';
    if (progress < 60) return '预计 10-20 秒';
    if (progress < 90) return '即将完成';
    return '几乎完成';
  }, [processingState.progress]);

  if (processingState.status === 'analyzing' || processingState.status === 'generating_depth') {
    const Icon = stage.icon;
    const colorClasses = {
      indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', progress: 'bg-indigo-500', glow: 'shadow-indigo-500/20' },
      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', progress: 'bg-purple-500', glow: 'shadow-purple-500/20' },
      emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', progress: 'bg-emerald-500', glow: 'shadow-emerald-500/20' }
    }[stage.color];

    return (
      <div className="text-center max-w-sm mx-auto">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className={`absolute inset-0 rounded-full ${colorClasses.bg} animate-pulse`} />
          <div className="absolute inset-0">
            <svg className="w-full h-full animate-spin" style={{ animationDuration: '3s' }}>
              <circle cx="48" cy="48" r="44" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="70 200" className={colorClasses.text} />
            </svg>
          </div>
          <div className={`absolute inset-4 rounded-full ${colorClasses.bg} border ${colorClasses.border} flex items-center justify-center`}>
            <Icon className={`w-8 h-8 ${colorClasses.text}`} />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-white mb-1">{stage.title}</h3>
        <p className="text-sm text-zinc-500 mb-6">{stage.description}</p>

        <div className="space-y-3">
          <div className="relative">
            <div className="w-72 h-2 bg-zinc-800 rounded-full mx-auto overflow-hidden">
              <div className={`h-full ${colorClasses.progress} transition-all duration-500 ease-out rounded-full`} style={{ width: `${processingState.progress}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs px-1 max-w-[18rem] mx-auto">
            <span className="text-zinc-500">{estimatedTime}</span>
            <span className={`font-mono ${colorClasses.text}`}>{processingState.progress}%</span>
          </div>
          {processingState.message && <p className="text-xs text-zinc-600 mt-2">{processingState.message}</p>}
        </div>

        {onCancel && (
          <button onClick={onCancel} className="mt-6 px-4 py-2 text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1.5 mx-auto">
            <X className="w-3.5 h-3.5" /> 取消处理
          </button>
        )}

        <div className="flex items-center justify-center gap-2 mt-8">
          {Object.entries(STAGES).map(([key], index) => {
            const isActive = processingState.status === key;
            const isPast = Object.keys(STAGES).indexOf(processingState.status) > index;
            return (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full transition-all ${isActive ? `${colorClasses.progress} shadow-lg ${colorClasses.glow}` : isPast ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                {index < Object.keys(STAGES).length - 1 && <div className={`w-8 h-0.5 ${isPast ? 'bg-emerald-500' : 'bg-zinc-700'}`} />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (processingState.status === 'error') {
    return (
      <div className="text-center max-w-sm mx-auto">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">处理失败</h3>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{processingState.message || '处理过程中发生错误，请重试'}</p>
        <button onClick={onRetry} className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2 mx-auto">
          <Loader2 className="w-4 h-4" /> 重新上传
        </button>
      </div>
    );
  }

  if (processingState.status === 'ready') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-medium text-white">处理完成</h3>
        <p className="text-sm text-zinc-500">正在加载 3D 场景...</p>
      </div>
    );
  }

  return null;
});

StatusDisplay.displayName = 'StatusDisplay';
