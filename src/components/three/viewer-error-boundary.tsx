"use client";

import { Component, type ReactNode } from "react";

interface Props {
  fallback: (error: unknown, reset: () => void) => ReactNode;
  children: ReactNode;
}

/** Catches WebGL/model-loading errors so the rest of the page keeps working. */
export class ViewerErrorBoundary extends Component<Props, { error: unknown; failed: boolean }> {
  state = { error: null as unknown, failed: false };

  static getDerivedStateFromError(error: unknown) {
    return { error, failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[3d-viewer]", error);
  }

  reset = () => this.setState({ error: null, failed: false });

  render() {
    return this.state.failed ? this.props.fallback(this.state.error, this.reset) : this.props.children;
  }
}
