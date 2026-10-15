"use client";

import { useRouter } from "next/navigation";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { ErrorState } from "@/components/shared/error-state";

type BoundaryProps = { title: string; message: string; onRetry: () => void; children: ReactNode };

class Boundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ErrorState
        title={this.props.title}
        message={this.props.message}
        onRetry={() => {
          this.setState({ failed: false });
          this.props.onRetry();
        }}
      />
    );
  }
}

/**
 * Keeps a client chart or table failure inside its own card: the rest of the
 * page stays usable, and Retry re-renders the card after refreshing the
 * server data.
 */
export function CardErrorBoundary({
  title,
  message,
  children,
}: {
  /** The card's title, so the failure names what it replaces. */
  title: string;
  /** For example "This chart could not be drawn." */
  message: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Boundary title={title} message={message} onRetry={() => router.refresh()}>
      {children}
    </Boundary>
  );
}
