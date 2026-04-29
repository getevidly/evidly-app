import React, { Component, ErrorInfo, ReactNode } from 'react';
import { reportError } from '../lib/errorReporting';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'section' | 'widget';
  resetKey?: string;
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
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] error.message:', error.message);
    console.error('[ErrorBoundary] error.stack:', error.stack);
    console.error('[ErrorBoundary] componentStack:', errorInfo.componentStack);
    this.setState({ componentStack: errorInfo.componentStack || null });
    reportError(error, { componentStack: errorInfo.componentStack });
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props): void {
    if (
      this.props.resetKey !== undefined &&
      prevProps.resetKey !== this.props.resetKey &&
      this.state.hasError
    ) {
      this.setState({ hasError: false, error: null, componentStack: null });
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, componentStack: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      return (
        <ErrorFallback
          level={this.props.level ?? 'page'}
          error={this.state.error}
          componentStack={this.state.componentStack}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
