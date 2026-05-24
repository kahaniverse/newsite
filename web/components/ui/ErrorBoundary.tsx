'use client';
import { Component, type ReactNode } from 'react';

interface Props    { children: ReactNode; fallback?: ReactNode; }
interface State    { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State { return { hasError: true }; }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 text-center text-text-muted">
          <p className="text-lg font-serif mb-2">Something went wrong.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-sm text-accent hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
