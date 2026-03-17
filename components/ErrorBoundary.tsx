import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-red-50">
            <AlertTriangle size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-500 mb-8 max-w-xs mx-auto">
            The application encountered an unexpected error. Don't worry, your data is safe.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold active:scale-95 transition-all"
          >
            <RefreshCcw size={18} />
            Reload Application
          </button>
          
          {import.meta.env.DEV && (
            <div className="mt-8 p-4 bg-gray-100 rounded-xl text-left overflow-auto max-w-full">
              <p className="text-xs font-mono text-red-600">{this.state.error?.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
