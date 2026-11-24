import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught ErrorBoundary exception:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white text-neutral-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full border border-neutral-200 p-6">
            <p className="text-xs font-mono-num text-red-900 mb-2">EXCEPTION_DETECTED</p>
            <h1 className="text-lg font-semibold text-neutral-950 mb-2">
              Terjadi kesalahan sinkronisasi data
            </h1>
            <p className="text-sm text-neutral-600 mb-4 break-words font-mono-num">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800 transition-colors"
            >
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
