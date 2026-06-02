"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import type { PageModule } from "@rakun-kit/core/contracts";
import type { ModuleErrorRenderer } from "./registry";

type Props<TModule extends PageModule = PageModule> = {
  children: ReactNode;
  module?: TModule;
  index?: number;
  renderError?: ModuleErrorRenderer<TModule>;
  onError?: (error: unknown, info: ErrorInfo) => void;
};

type State = {
  error: unknown;
};

export class ModuleErrorBoundary<
  TModule extends PageModule = PageModule,
> extends Component<Props<TModule>, State> {
  state: State = {
    error: null,
  };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  render(): ReactNode {
    if (this.state.error) {
      return this.props.renderError?.({
        error: this.state.error,
        module: this.props.module,
        index: this.props.index,
      }) ?? null;
    }

    return this.props.children;
  }
}
