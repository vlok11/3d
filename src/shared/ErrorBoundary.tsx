import { AlertTriangle, RefreshCw } from 'lucide-react';
import React, { Component, type ReactNode } from 'react';

import { createLogger } from '@/core/Logger';

const logger = createLogger({ module: 'ErrorBoundary' });

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, componentStack: null };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('React Error Boundary caught error', {
      error: error.message,
      componentStack: errorInfo.componentStack,
    });

    this.setState({ componentStack: errorInfo.componentStack ?? null });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, componentStack: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">出现了一些问题</h2>
            <p className="text-zinc-400 text-sm mb-6">
              {this.state.error?.message ?? '未知错误，可能是由于 3D 上下文丢失或资源加载失败引起的'}
            </p>
            {import.meta.env.DEV && this.state.componentStack && (
              <pre className="text-left text-zinc-400 text-xs mb-6 whitespace-pre-wrap break-words max-h-64 overflow-auto">
                {this.state.componentStack}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors"
              >
                重试
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
