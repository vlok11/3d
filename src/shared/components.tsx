import { Activity, Box, Settings, X } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { getPerformanceMonitor } from '@/core/PerformanceMonitor';

import type { PerformanceMetrics } from '@/core/PerformanceMonitor';
import type { ReactNode } from 'react';

// ============================================================================
// AppHeader
// ============================================================================

export const AppHeader = memo(() => (
  <header style={{
    height: '4rem',
    borderBottom: '1px solid #27272a',
    backgroundColor: 'rgba(24, 24, 27, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    zIndex: 20
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{
        width: '2rem',
        height: '2rem',
        backgroundColor: '#4f46e5',
        borderRadius: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Box style={{ color: 'white', width: '1.25rem', height: '1.25rem' }} />
      </div>
      <div>
        <h1 style={{
          color: 'white',
          fontWeight: 'bold',
          fontSize: '1.125rem',
          letterSpacing: '-0.025em',
          margin: 0
        }}>Immersa 3D</h1>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <span className="hidden sm:block" style={{ fontSize: '0.75rem', color: '#71717a' }}>
        由 Gemini &amp; WebGL 驱动
      </span>
      <button 
        type="button"
        style={{ fontSize: '0.875rem', color: '#a1a1aa', transition: 'color 0.2s', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseOver={(e) => (e.currentTarget.style.color = 'white')}
        onMouseOut={(e) => (e.currentTarget.style.color = '#a1a1aa')}
      >
        文档
      </button>
    </div>
  </header>
));

AppHeader.displayName = 'AppHeader';

// ============================================================================
// MobileDrawer
// ============================================================================

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  children: ReactNode;
}

export const MobileDrawer = memo(({ isOpen, onClose, onOpen, children }: MobileDrawerProps) => (
  <>
    <div 
      className={`mobile-drawer-backdrop desktop-hidden ${isOpen ? 'mobile-drawer-backdrop--visible' : ''}`}
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="button"
      tabIndex={isOpen ? 0 : -1}
      aria-label="关闭控制面板"
    />
    
    <div className={`mobile-drawer desktop-hidden ${isOpen ? 'mobile-drawer--open' : ''}`}>
      <button 
        className="mobile-drawer-close"
        onClick={onClose}
        aria-label="关闭控制面板"
      >
        <X style={{ width: '1rem', height: '1rem' }} />
      </button>
      {children}
    </div>

    <button 
      className="mobile-fab desktop-hidden"
      onClick={onOpen}
      aria-label="打开控制面板"
    >
      <Settings style={{ width: '1.5rem', height: '1.5rem' }} />
    </button>
  </>
));

MobileDrawer.displayName = 'MobileDrawer';

// ============================================================================
// PerformanceOverlay
// ============================================================================

interface PerformanceOverlayProps {
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const getFpsColorHex = (fps: number): string => {
  if (fps >= 55) return '#34d399';
  if (fps >= 30) return '#facc15';
  return '#f87171';
};

const formatMemory = (bytes?: number): string => {
  if (!bytes) return 'N/A';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

const getPositionStyles = (pos: string): React.CSSProperties => {
  switch (pos) {
    case 'top-left': return { top: '1rem', left: '1rem' };
    case 'top-right': return { top: '1rem', right: '1rem' };
    case 'bottom-left': return { bottom: '1rem', left: '1rem' };
    case 'bottom-right': return { bottom: '1rem', right: '1rem' };
    default: return { bottom: '1rem', left: '1rem' };
  }
};

export const PerformanceOverlay = memo(({ visible = true, position = 'bottom-left' }: PerformanceOverlayProps) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({ fps: 0, frameTime: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const monitorRef = useRef(getPerformanceMonitor());
  const isStartedRef = useRef(false);

  useEffect(() => {
    const monitor = monitorRef.current;
    
    if (visible && !isStartedRef.current) {
      monitor.start();
      isStartedRef.current = true;
    }

    if (!visible) return;

    const interval = setInterval(() => {
      setMetrics(monitor.getMetrics());
    }, 500);

    return () => { clearInterval(interval); };
  }, [visible]);
  
  useEffect(() => () => {
    if (isStartedRef.current) {
      monitorRef.current.stop();
      isStartedRef.current = false;
    }
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  if (!visible) return null;

  const memoryPercent = metrics.memoryUsed && metrics.memoryTotal
    ? (metrics.memoryUsed / metrics.memoryTotal) * 100
    : null;

  return (
    <div
      style={{ position: 'absolute', zIndex: 50, userSelect: 'none', ...getPositionStyles(position) }}
      onClick={toggleExpanded}
      onKeyDown={(e) => e.key === 'Enter' && toggleExpanded()}
      role="button"
      tabIndex={0}
      aria-label="切换性能面板详情"
    >
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          borderRadius: '0.5rem',
          border: '1px solid rgba(63, 63, 70, 0.5)',
          cursor: 'pointer',
          transition: 'all 200ms',
          minWidth: isExpanded ? '140px' : '70px',
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)')}
      >
        <div style={{ padding: '0.375rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity style={{ width: '0.75rem', height: '0.75rem', color: '#a1a1aa' }} />
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold', color: getFpsColorHex(metrics.fps) }}>
            {metrics.fps}
          </span>
          <span style={{ color: '#71717a', fontSize: '0.625rem' }}>FPS</span>
        </div>

        {isExpanded && (
          <div style={{ padding: '0 0.5rem 0.5rem', borderTop: '1px solid rgba(63, 63, 70, 0.5)', paddingTop: '0.375rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem' }}>
              <span style={{ color: '#71717a' }}>Frame</span>
              <span style={{ color: '#d4d4d8', fontFamily: 'monospace' }}>{metrics.frameTime.toFixed(1)}ms</span>
            </div>
            
            {metrics.memoryUsed && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem' }}>
                <span style={{ color: '#71717a' }}>Memory</span>
                <span style={{ color: '#d4d4d8', fontFamily: 'monospace' }}>{formatMemory(metrics.memoryUsed)}</span>
              </div>
            )}

            {memoryPercent !== null && (
              <div style={{ height: '0.25rem', backgroundColor: '#27272a', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    transition: 'all 300ms',
                    backgroundColor: memoryPercent > 80 ? '#ef4444' : memoryPercent > 60 ? '#eab308' : '#10b981',
                    width: `${Math.min(memoryPercent, 100)}%`
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

PerformanceOverlay.displayName = 'PerformanceOverlay';
