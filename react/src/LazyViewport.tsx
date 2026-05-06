"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type LazyViewportProps = {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number | number[];
};

export function LazyViewport({
  children,
  fallback = null,
  rootMargin = "300px",
  threshold = 0,
}: LazyViewportProps) {
  const ref = useRef<HTMLDivElement>(null);
  const activated = useRef(false);
  const [isActive, setIsActive] = useState(false);

  const activate = useCallback(() => {
    if (activated.current) return;
    activated.current = true;

    const run = () => setIsActive(true);
    const requestIdle = globalThis.requestIdleCallback;

    if (typeof requestIdle === "function") {
      requestIdle(run);
      return;
    }

    setTimeout(run, 0);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      activate();
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        activate();
      },
      { rootMargin, threshold },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [activate, rootMargin, threshold]);

  return (
    <div ref={ref} data-rakun-lazy>
      {isActive ? children : fallback}
    </div>
  );
}
