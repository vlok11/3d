import {
  Box, Camera, Sparkles, Play, Pause, Volume2, VolumeX, RotateCcw,
  Sun, Moon, Zap, Eye, Grid3X3, Layers, Palette, Sliders,
  ChevronDown, ChevronRight, Info, Maximize2, Move3D, Focus,
  Download, Image as ImageIcon, Loader2, Circle, Square, Wand2
} from 'lucide-react';
import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';

import { useSceneStore } from '@/shared/store';
import {
  ProjectionMode, CameraMode, CameraMotionType, RenderStyle,
  ColorGradePreset, MirrorMode, HologramType
} from '@/shared/types';
import { useSessionStore } from '@/stores/useSessionStore';

import type { SceneConfig, CameraViewPreset } from '@/shared/types';

type TabType = 'scene' | 'camera' | 'effects';

interface ControlPanelNewProps {
  hasVideo: boolean;
  videoState?: { isPlaying: boolean; currentTime: number; duration: number };
  onVideoTogglePlay?: () => void;
  onVideoSeek?: (time: number) => void;
  onSetCameraView?: (view: CameraViewPreset) => void;
  activeCameraView?: CameraViewPreset | null;
  onExportScene?: () => void;
  onDownloadSnapshot?: () => void;
  onToggleRecording?: () => void;
  isRecording?: boolean;
}

const TABS: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: 'scene', label: '场景', icon: <Box className="w-4 h-4" /> },
  { key: 'camera', label: '相机', icon: <Camera className="w-4 h-4" /> },
  { key: 'effects', label: '效果', icon: <Sparkles className="w-4 h-4" /> },
];

// Quick presets for one-click configuration
const QUICK_PRESETS = [
  { id: 'cinematic', name: '电影感', icon: '🎬', config: { renderStyle: RenderStyle.REALISTIC, colorGrade: ColorGradePreset.CINEMATIC, enableVignette: true, vignetteStrength: 0.4, exposure: 1.1, contrast: 1.1 } },
  { id: 'dreamy', name: '梦幻', icon: '✨', config: { renderStyle: RenderStyle.REALISTIC, colorGrade: ColorGradePreset.DREAMY, enableVignette: true, vignetteStrength: 0.3, saturation: 0.9, brightness: 1.1 } },
  { id: 'cyberpunk', name: '赛博', icon: '🌆', config: { renderStyle: RenderStyle.CYBERPUNK, colorGrade: ColorGradePreset.NONE, enableVignette: true, vignetteStrength: 0.5, saturation: 1.3 } },
  { id: 'vintage', name: '复古', icon: '📷', config: { renderStyle: RenderStyle.REALISTIC, colorGrade: ColorGradePreset.VHS, enableVignette: true, vignetteStrength: 0.6, saturation: 0.8 } },
];

const PROJECTIONS = [
  { mode: ProjectionMode.PLANE, label: '平面', icon: '▭', desc: '标准2.5D效果' },
  { mode: ProjectionMode.CYLINDER, label: '曲面', icon: '◠', desc: '柔和弧形包裹' },
  { mode: ProjectionMode.SPHERE, label: '球面', icon: '◯', desc: '360度球形投影' },
  { mode: ProjectionMode.PANORAMA, label: '全景', icon: '◡', desc: '沉浸式全景' },
  { mode: ProjectionMode.CUBE, label: '立方', icon: '⬡', desc: '六面体投影' },
  { mode: ProjectionMode.GAUSSIAN_SPLAT, label: '点云', icon: '✦', desc: '高斯点云渲染' },
];

const RENDER_STYLES = [
  { style: RenderStyle.REALISTIC, label: '真实', icon: <Eye className="w-3.5 h-3.5" />, desc: '写实渲染' },
  { style: RenderStyle.HOLOGRAPHIC, label: '全息', icon: <Zap className="w-3.5 h-3.5" />, desc: '科幻全息效果' },
  { style: RenderStyle.PAINTING, label: '油画', icon: <Palette className="w-3.5 h-3.5" />, desc: '艺术油画风格' },
  { style: RenderStyle.SKETCH, label: '素描', icon: '✏️', desc: '手绘素描效果' },
  { style: RenderStyle.PIXEL, label: '像素', icon: <Grid3X3 className="w-3.5 h-3.5" />, desc: '复古像素风' },
  { style: RenderStyle.CYBERPUNK, label: '赛博', icon: '🌆', desc: '霓虹赛博朋克' },
];

const COLOR_GRADES = [
  { grade: ColorGradePreset.NONE, label: '无', color: '#888' },
  { grade: ColorGradePreset.CINEMATIC, label: '电影', color: '#f4a460' },
  { grade: ColorGradePreset.VINTAGE, label: '复古', color: '#daa520' },
  { grade: ColorGradePreset.WARM, label: '暖调', color: '#ff7f50' },
  { grade: ColorGradePreset.COLD, label: '冷调', color: '#87ceeb' },
  { grade: ColorGradePreset.NOIR, label: '黑白', color: '#666' },
  { grade: ColorGradePreset.DREAMY, label: '梦幻', color: '#dda0dd' },
  { grade: ColorGradePreset.VHS, label: 'VHS', color: '#ff6b6b' },
  { grade: ColorGradePreset.JAPANESE, label: '日系', color: '#ffb7c5' },
];

const MOTIONS = [
  { type: CameraMotionType.STATIC, label: '静止', icon: '⏸', desc: '固定视角' },
  { type: CameraMotionType.ORBIT, label: '环绕', icon: '🔄', desc: '围绕主体旋转' },
  { type: CameraMotionType.FLY_BY, label: '飞越', icon: '✈️', desc: '平滑飞行穿越' },
  { type: CameraMotionType.SPIRAL, label: '螺旋', icon: '🌀', desc: '螺旋上升下降' },
  { type: CameraMotionType.DOLLY_ZOOM, label: '推拉', icon: '🎬', desc: '希区柯克变焦' },
  { type: CameraMotionType.ARC, label: '弧线', icon: '↷', desc: '弧形运动轨迹' },
];

const MIRROR_MODES = [
  { mode: MirrorMode.NONE, label: '无' },
  { mode: MirrorMode.HORIZONTAL, label: '水平' },
  { mode: MirrorMode.VERTICAL, label: '垂直' },
  { mode: MirrorMode.QUAD, label: '四象' },
];

const HOLOGRAM_TYPES = [
  { type: HologramType.CLASSIC, label: '经典' },
  { type: HologramType.CYBER, label: '赛博' },
  { type: HologramType.TACTICAL, label: '战术' },
  { type: HologramType.GHOST, label: '幽灵' },
];

const PARTICLE_TYPES = [
  { type: 'dust', label: '尘埃' },
  { type: 'snow', label: '雪花' },
  { type: 'rain', label: '雨滴' },
  { type: 'firefly', label: '萤火' },
  { type: 'sparkle', label: '星光' },
];

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const ControlPanelNew: React.FC<ControlPanelNewProps> = memo(({
  hasVideo, videoState, onVideoTogglePlay, onVideoSeek, onSetCameraView, activeCameraView,
  onExportScene, onDownloadSnapshot, onToggleRecording, isRecording
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('scene');
  const [sliderValue, setSliderValue] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    presets: true, projection: true, depth: false, camera: true, motion: true, style: true, color: false, lighting: false
  });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  const config = useSceneStore((s) => s.config);
  const setConfig = useSceneStore((s) => s.setConfig);
  const resetConfig = useSceneStore((s) => s.resetConfig);
  const { exportState } = useSessionStore();

  useEffect(() => {
    if (!dragging && videoState) setSliderValue(videoState.currentTime);
  }, [videoState, dragging]);

  const set = useCallback(<K extends keyof SceneConfig>(k: K, v: SceneConfig[K]) => {
    setConfig((p) => ({ ...p, [k]: v }));
  }, [setConfig]);

  const applyPreset = useCallback((presetConfig: Partial<SceneConfig>) => {
    setConfig((p) => ({ ...p, ...presetConfig }));
  }, [setConfig]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const activeProjection = useMemo(() => PROJECTIONS.find(p => p.mode === config.projectionMode), [config.projectionMode]);
  const activeStyle = useMemo(() => RENDER_STYLES.find(r => r.style === config.renderStyle), [config.renderStyle]);
  const activeMotion = useMemo(() => MOTIONS.find(m => m.type === config.cameraMotionType), [config.cameraMotionType]);
  const isExporting = exportState.isExporting;

  return (
    <div className="w-80 bg-zinc-900/98 backdrop-blur-md flex flex-col h-full border-l border-zinc-800/80 shadow-2xl relative">
      {/* Export Overlay */}
      {isExporting && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            <div className="text-sm font-medium text-white">{exportState.format ? `导出 ${exportState.format.toUpperCase()}...` : '导出中...'}</div>
            <div className="w-32 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${exportState.progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/50">
        <span className="text-xs font-medium text-zinc-300 tracking-wide">控制面板</span>
        <div className="flex items-center gap-1">
          <button onClick={onToggleRecording} disabled={isExporting} className={`p-1.5 rounded-md transition-all disabled:opacity-50 ${isRecording ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`} title={isRecording ? "停止录制" : "开始录制"}>
            {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Circle className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onDownloadSnapshot} disabled={isExporting} className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50" title="保存截图">
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={onExportScene} disabled={isExporting} className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50" title="导出GLB">
            <Download className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3 bg-zinc-800 mx-1" />
          <button onClick={resetConfig} disabled={isExporting} className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50" title="重置">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800/60 bg-zinc-900/30">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-3 flex flex-col items-center gap-1.5 text-xs transition-all relative ${activeTab === t.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}>
            <div className={`p-1.5 rounded-lg transition-colors ${activeTab === t.key ? 'bg-indigo-600/20' : ''}`}>{t.icon}</div>
            <span className="font-medium">{t.label}</span>
            {activeTab === t.key && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />}
          </button>
        ))}
      </div>

      {/* Video Controls */}
      {hasVideo && videoState && (
        <div className="p-3 border-b border-zinc-800/60 bg-zinc-800/20">
          <div className="flex items-center gap-3">
            <button onClick={onVideoTogglePlay} className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-shadow">
              {videoState.isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
            </button>
            <div className="flex-1">
              <input type="range" min="0" max={videoState.duration || 1} step="0.1" value={sliderValue}
                onMouseDown={() => setDragging(true)}
                onMouseUp={(e) => { setDragging(false); onVideoSeek?.(parseFloat((e.target as HTMLInputElement).value)); }}
                onChange={(e) => setSliderValue(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(sliderValue / (videoState.duration || 1)) * 100}%, #3f3f46 ${(sliderValue / (videoState.duration || 1)) * 100}%, #3f3f46 100%)` }}
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                <span>{formatTime(sliderValue)}</span>
                <span>{formatTime(videoState.duration)}</span>
              </div>
            </div>
            <button onClick={() => set('videoMuted', !config.videoMuted)} className={`p-2 rounded-lg transition-colors ${config.videoMuted ? 'text-zinc-500 bg-zinc-800/50' : 'text-indigo-400 bg-indigo-500/10'}`}>
              {config.videoMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <div className="p-3 space-y-1">
          {activeTab === 'scene' && (
            <>
              {/* Quick Presets - Always visible at top */}
              <CollapsibleSection title="快捷预设" icon={<Wand2 className="w-3.5 h-3.5" />} expanded={expandedSections.presets} onToggle={() => toggleSection('presets')} highlight>
                <div className="grid grid-cols-4 gap-1.5">
                  {QUICK_PRESETS.map((preset) => (
                    <button key={preset.id} onClick={() => applyPreset(preset.config)}
                      className="py-2 px-1 text-[10px] rounded-lg border border-zinc-700/50 bg-gradient-to-b from-zinc-800/80 to-zinc-800/40 hover:border-indigo-500/50 hover:from-indigo-500/10 hover:to-indigo-500/5 transition-all flex flex-col items-center gap-1 group">
                      <span className="text-base group-hover:scale-110 transition-transform">{preset.icon}</span>
                      <span className="text-zinc-400 group-hover:text-white">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </CollapsibleSection>

              {/* Current Status Card */}
              <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-zinc-800/80 to-zinc-800/40 border border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-lg">{activeProjection?.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{activeProjection?.label}投影</div>
                    <div className="text-[10px] text-zinc-500 truncate">{activeProjection?.desc}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-zinc-400">深度</div>
                    <div className="text-sm font-mono text-indigo-400">{config.displacementScale.toFixed(1)}x</div>
                  </div>
                </div>
              </div>

              <CollapsibleSection title="投影模式" icon={<Layers className="w-3.5 h-3.5" />} expanded={expandedSections.projection} onToggle={() => toggleSection('projection')}>
                <div className="grid grid-cols-3 gap-1.5">
                  {PROJECTIONS.map((p) => (
                    <CardBtn key={p.mode} active={config.projectionMode === p.mode} onClick={() => set('projectionMode', p.mode)}
                      onMouseEnter={() => setHoveredItem(p.mode)} onMouseLeave={() => setHoveredItem(null)}>
                      <span className="text-base mb-0.5">{p.icon}</span>
                      <span>{p.label}</span>
                    </CardBtn>
                  ))}
                </div>
                {hoveredItem && PROJECTIONS.find(p => p.mode === hoveredItem) && (
                  <div className="mt-2 px-2 py-1.5 rounded-lg bg-zinc-800/50 text-[10px] text-zinc-400 flex items-center gap-1.5">
                    <Info className="w-3 h-3 shrink-0" />
                    {PROJECTIONS.find(p => p.mode === hoveredItem)?.desc}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="深度控制" icon={<Sliders className="w-3.5 h-3.5" />} expanded={expandedSections.depth} onToggle={() => toggleSection('depth')}>
                <Slider label="深度强度" value={config.displacementScale} min={0} max={8} step={0.1} onChange={(v) => set('displacementScale', v)} showPresets presets={[0.5, 1.2, 2.5, 5]} />
                <Slider label="网格密度" value={config.meshDensity} min={64} max={512} step={32} onChange={(v) => set('meshDensity', v)} />
                <Toggle label="深度反转" checked={config.depthInvert} onChange={(v) => set('depthInvert', v)} />
                <Slider label="边缘淡化" value={config.edgeFade} min={0} max={1} step={0.05} onChange={(v) => set('edgeFade', v)} />
              </CollapsibleSection>

              <CollapsibleSection title="镜像模式" icon={<Maximize2 className="w-3.5 h-3.5" />}>
                <div className="grid grid-cols-4 gap-1.5">
                  {MIRROR_MODES.map((m) => (
                    <Btn key={m.mode} active={config.mirrorMode === m.mode} onClick={() => set('mirrorMode', m.mode)}>{m.label}</Btn>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="环境设置" icon={<Sun className="w-3.5 h-3.5" />}>
                <Slider label="背景强度" value={config.backgroundIntensity} min={0} max={1} step={0.05} onChange={(v) => set('backgroundIntensity', v)} />
                <Slider label="视差强度" value={config.parallaxScale} min={0} max={1} step={0.05} onChange={(v) => set('parallaxScale', v)} />
                <div className="flex gap-2 mt-2">
                  <Toggle label="显示网格" checked={config.showGrid} onChange={(v) => set('showGrid', v)} compact />
                  <Toggle label="显示坐标轴" checked={config.showAxes} onChange={(v) => set('showAxes', v)} compact />
                </div>
              </CollapsibleSection>
            </>
          )}

          {activeTab === 'camera' && (
            <>
              <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-zinc-800/80 to-zinc-800/40 border border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{config.cameraMode === CameraMode.PERSPECTIVE ? '透视' : '正交'}相机</div>
                    <div className="text-[10px] text-zinc-500">{activeMotion?.label} · FOV {config.fov}°</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">速度</div>
                    <div className="text-sm font-mono text-purple-400">{config.cameraMotionSpeed.toFixed(1)}x</div>
                  </div>
                </div>
              </div>

              <CollapsibleSection title="快捷视角" icon={<Focus className="w-3.5 h-3.5" />} expanded={expandedSections.camera} onToggle={() => toggleSection('camera')}>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['FRONT', 'TOP', 'SIDE', 'ISO', 'FOCUS'] as const).map((v) => (
                    <CardBtn key={v} active={activeCameraView === v} onClick={() => onSetCameraView?.(v)} small>
                      {v === 'FRONT' ? '正' : v === 'TOP' ? '顶' : v === 'SIDE' ? '侧' : v === 'ISO' ? '等轴' : '聚焦'}
                    </CardBtn>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="相机模式" icon={<Camera className="w-3.5 h-3.5" />}>
                <div className="grid grid-cols-2 gap-1.5">
                  <CardBtn active={config.cameraMode === CameraMode.PERSPECTIVE} onClick={() => set('cameraMode', CameraMode.PERSPECTIVE)}>
                    <Eye className="w-4 h-4 mb-1" /><span>透视</span>
                  </CardBtn>
                  <CardBtn active={config.cameraMode === CameraMode.ORTHOGRAPHIC} onClick={() => set('cameraMode', CameraMode.ORTHOGRAPHIC)}>
                    <Grid3X3 className="w-4 h-4 mb-1" /><span>正交</span>
                  </CardBtn>
                </div>
                {config.cameraMode === CameraMode.PERSPECTIVE ? (
                  <Slider label="视角 (FOV)" value={config.fov} min={20} max={120} step={1} onChange={(v) => set('fov', v)} showPresets presets={[35, 55, 85, 120]} />
                ) : (
                  <Slider label="正交缩放" value={config.orthoZoom} min={5} max={50} step={1} onChange={(v) => set('orthoZoom', v)} />
                )}
              </CollapsibleSection>

              <CollapsibleSection title="自动运镜" icon={<Move3D className="w-3.5 h-3.5" />} expanded={expandedSections.motion} onToggle={() => toggleSection('motion')}>
                <div className="grid grid-cols-3 gap-1.5">
                  {MOTIONS.map((m) => (
                    <CardBtn key={m.type} active={config.cameraMotionType === m.type} onClick={() => set('cameraMotionType', m.type)}>
                      <span className="text-sm mb-0.5">{m.icon}</span><span>{m.label}</span>
                    </CardBtn>
                  ))}
                </div>
                {config.cameraMotionType !== CameraMotionType.STATIC && (
                  <>
                    <Slider label="运镜速度" value={config.cameraMotionSpeed} min={0.1} max={3} step={0.1} onChange={(v) => set('cameraMotionSpeed', v)} />
                    {config.cameraMotionType === CameraMotionType.ORBIT && (
                      <>
                        <Slider label="环绕半径" value={config.orbitRadius} min={5} max={30} step={1} onChange={(v) => set('orbitRadius', v)} />
                        <Slider label="倾斜角度" value={config.orbitTilt} min={0} max={45} step={1} onChange={(v) => set('orbitTilt', v)} />
                      </>
                    )}
                  </>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="控制参数" icon={<Sliders className="w-3.5 h-3.5" />}>
                <Slider label="阻尼系数" value={config.dampingFactor} min={0.01} max={0.3} step={0.01} onChange={(v) => set('dampingFactor', v)} />
                <Slider label="旋转速度" value={config.rotateSpeed} min={0.2} max={2} step={0.1} onChange={(v) => set('rotateSpeed', v)} />
                <Toggle label="启用平移" checked={config.enablePan} onChange={(v) => set('enablePan', v)} />
              </CollapsibleSection>
            </>
          )}

          {activeTab === 'effects' && (
            <>
              <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-zinc-800/80 to-zinc-800/40 border border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    {typeof activeStyle?.icon === 'string' ? <span className="text-lg">{activeStyle.icon}</span> : <span className="text-emerald-400">{activeStyle?.icon}</span>}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{activeStyle?.label}风格</div>
                    <div className="text-[10px] text-zinc-500">{activeStyle?.desc}</div>
                  </div>
                  <div className="flex gap-1">
                    {config.enableParticles && <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-400">粒子</span>}
                    {config.enableVignette && <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-400">暗角</span>}
                  </div>
                </div>
              </div>

              <CollapsibleSection title="渲染风格" icon={<Palette className="w-3.5 h-3.5" />} expanded={expandedSections.style} onToggle={() => toggleSection('style')}>
                <div className="grid grid-cols-3 gap-1.5">
                  {RENDER_STYLES.map((r) => (
                    <CardBtn key={r.style} active={config.renderStyle === r.style} onClick={() => set('renderStyle', r.style)}>
                      {typeof r.icon === 'string' ? <span className="text-sm mb-0.5">{r.icon}</span> : <span className="mb-0.5">{r.icon}</span>}
                      <span>{r.label}</span>
                    </CardBtn>
                  ))}
                </div>
                {config.renderStyle === RenderStyle.HOLOGRAPHIC && (
                  <div className="mt-3 p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/20 space-y-2">
                    <div className="text-[10px] text-cyan-400 font-medium mb-2">全息参数</div>
                    <div className="grid grid-cols-4 gap-1">
                      {HOLOGRAM_TYPES.map((h) => (
                        <Btn key={h.type} active={config.hologramType === h.type} onClick={() => set('hologramType', h.type)} small>{h.label}</Btn>
                      ))}
                    </div>
                    <Slider label="扫描线" value={config.hologramScanlines} min={0} max={20} step={0.5} onChange={(v) => set('hologramScanlines', v)} />
                    <Slider label="故障效果" value={config.hologramGlitch} min={0} max={1} step={0.05} onChange={(v) => set('hologramGlitch', v)} />
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="色彩滤镜" icon={<Moon className="w-3.5 h-3.5" />} expanded={expandedSections.color} onToggle={() => toggleSection('color')}>
                <div className="grid grid-cols-3 gap-1.5">
                  {COLOR_GRADES.map((c) => (
                    <button key={c.grade} onClick={() => set('colorGrade', c.grade)}
                      className={`py-2 px-2 text-[11px] rounded-lg border transition-all flex flex-col items-center gap-1 ${
                        config.colorGrade === c.grade ? 'bg-zinc-800 border-zinc-600 text-white ring-1 ring-zinc-500' : 'bg-zinc-800/30 border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                      }`}>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="光影调节" icon={<Sun className="w-3.5 h-3.5" />} expanded={expandedSections.lighting} onToggle={() => toggleSection('lighting')}>
                <Slider label="曝光" value={config.exposure} min={0.5} max={3} step={0.1} onChange={(v) => set('exposure', v)} showPresets presets={[0.8, 1.1, 1.5, 2]} />
                <Slider label="亮度" value={config.brightness} min={0.5} max={2} step={0.05} onChange={(v) => set('brightness', v)} />
                <Slider label="饱和度" value={config.saturation} min={0} max={2} step={0.05} onChange={(v) => set('saturation', v)} />
                <Slider label="对比度" value={config.contrast} min={0.5} max={2} step={0.05} onChange={(v) => set('contrast', v)} />
              </CollapsibleSection>

              <CollapsibleSection title="特效开关" icon={<Sparkles className="w-3.5 h-3.5" />}>
                <div className="space-y-1">
                  <Toggle label="粒子效果" checked={config.enableParticles} onChange={(v) => set('enableParticles', v)} />
                  {config.enableParticles && (
                    <div className="ml-4 grid grid-cols-5 gap-1 mt-1 mb-2">
                      {PARTICLE_TYPES.map((p) => (
                        <Btn key={p.type} active={config.particleType === p.type} onClick={() => set('particleType', p.type)} small>{p.label}</Btn>
                      ))}
                    </div>
                  )}
                  <Toggle label="电影暗角" checked={config.enableVignette} onChange={(v) => set('enableVignette', v)} />
                  {config.enableVignette && (
                    <div className="ml-4 mt-1 mb-2">
                      <Slider label="暗角强度" value={config.vignetteStrength} min={0} max={1} step={0.05} onChange={(v) => set('vignetteStrength', v)} />
                    </div>
                  )}
                  <Toggle label="裸眼3D" checked={config.enableNakedEye3D} onChange={(v) => set('enableNakedEye3D', v)} />
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="材质属性" icon={<Layers className="w-3.5 h-3.5" />}>
                <Slider label="粗糙度" value={config.roughness} min={0} max={1} step={0.05} onChange={(v) => set('roughness', v)} />
                <Slider label="金属度" value={config.metalness} min={0} max={1} step={0.05} onChange={(v) => set('metalness', v)} />
                <Toggle label="线框模式" checked={config.wireframe} onChange={(v) => set('wireframe', v)} />
              </CollapsibleSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

ControlPanelNew.displayName = 'ControlPanelNew';

// Sub-components
const CollapsibleSection = ({ title, icon, children, expanded = true, onToggle, highlight }: { 
  title: string; icon?: React.ReactNode; children: React.ReactNode; expanded?: boolean; onToggle?: () => void; highlight?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(expanded);
  const handleToggle = onToggle ?? (() => setIsOpen(!isOpen));
  const open = onToggle ? expanded : isOpen;

  return (
    <div className={`rounded-lg overflow-hidden ${highlight ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20' : 'bg-zinc-800/30 border border-zinc-800/50'}`}>
      <button onClick={handleToggle} className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-zinc-800/50 transition-colors">
        {open ? <ChevronDown className="w-3 h-3 text-zinc-500" /> : <ChevronRight className="w-3 h-3 text-zinc-500" />}
        {icon && <span className={highlight ? 'text-indigo-400' : 'text-zinc-400'}>{icon}</span>}
        <span className={`text-xs font-medium flex-1 ${highlight ? 'text-indigo-300' : 'text-zinc-300'}`}>{title}</span>
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
};

const Btn = ({ active, onClick, children, small }: { active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) => (
  <button onClick={onClick}
    className={`${small ? 'py-1 px-1.5 text-[10px]' : 'py-1.5 px-2 text-[11px]'} rounded-md border transition-all ${
      active ? 'bg-indigo-600/20 border-indigo-500/60 text-white shadow-sm shadow-indigo-500/10' : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
    }`}>
    {children}
  </button>
);

const CardBtn = ({ active, onClick, children, small, onMouseEnter, onMouseLeave }: { 
  active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean; onMouseEnter?: () => void; onMouseLeave?: () => void;
}) => (
  <button onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
    className={`${small ? 'py-1.5 px-1' : 'py-2 px-2'} text-[11px] rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 ${
      active ? 'bg-gradient-to-b from-indigo-600/30 to-indigo-600/10 border-indigo-500/60 text-white shadow-sm shadow-indigo-500/20' : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60'
    }`}>
    {children}
  </button>
);

const Slider = ({ label, value, min, max, step, onChange, showPresets, presets }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; showPresets?: boolean; presets?: number[];
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const percentage = max !== min ? ((value - min) / (max - min)) * 100 : 0;

  const handleInputSubmit = () => {
    const num = parseFloat(inputValue);
    if (!isNaN(num)) {
      onChange(Math.max(min, Math.min(max, num)));
    }
    setIsEditing(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-zinc-500">{label}</span>
        {isEditing ? (
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleInputSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit()}
            className="w-16 text-[11px] text-right bg-zinc-800 border border-indigo-500 rounded px-1.5 py-0.5 text-white focus:outline-none"
            autoFocus
            min={min}
            max={max}
            step={step}
          />
        ) : (
          <button
            onClick={() => { setInputValue(value.toString()); setIsEditing(true); }}
            className="text-[11px] text-zinc-300 font-mono bg-zinc-800/50 px-1.5 py-0.5 rounded hover:bg-zinc-700 transition-colors cursor-text"
          >
            {typeof value === 'number' ? (Number.isInteger(step) ? value : value.toFixed(step < 0.1 ? 2 : 1)) : value}
          </button>
        )}
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${percentage}%, #3f3f46 ${percentage}%, #3f3f46 100%)` }}
      />
      {showPresets && presets && (
        <div className="flex gap-1 mt-1">
          {presets.map((p) => (
            <button key={p} onClick={() => onChange(p)}
              className={`flex-1 py-0.5 text-[9px] rounded transition-colors ${Math.abs(value - p) < step ? 'bg-indigo-600/30 text-indigo-300' : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-400'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Toggle = ({ label, checked, onChange, compact }: { label: string; checked: boolean; onChange: (v: boolean) => void; compact?: boolean }) => (
  <button type="button" onClick={() => onChange(!checked)} className={`flex items-center justify-between ${compact ? 'py-1 flex-1' : 'py-1.5 w-full'} text-left group`}>
    <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-zinc-400 group-hover:text-zinc-300 transition-colors`}>{label}</span>
    <div className={`${compact ? 'w-7 h-3.5' : 'w-9 h-5'} rounded-full transition-all relative ${checked ? 'bg-indigo-600' : 'bg-zinc-700'}`}>
      <div className={`${compact ? 'w-2.5 h-2.5' : 'w-4 h-4'} rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${checked ? (compact ? 'left-[calc(100%-0.75rem)]' : 'left-[calc(100%-1.125rem)]') : 'left-0.5'}`} />
    </div>
  </button>
);

export default ControlPanelNew;
