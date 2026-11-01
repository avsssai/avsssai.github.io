import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import StackScene from './StackScene';
import type { Point, SceneLayout, StackId } from './stack-items';

export type Recoil = Readonly<{ id: StackId; amount: number }>;
export type RecoilChannel = { current: Recoil | null; invalidate(): void };

export type SceneReport = Readonly<{
  revision: number;
  points: readonly Point[];
  drawCalls: number;
  time: number;
}>;
export interface SceneSession {
  update(layout: SceneLayout, active: boolean): void;
  recoil(value: Recoil | null): void;
  dispose(): void;
}

class SceneBoundary extends Component<
  { children: ReactNode; onFailure(reason: string): void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onFailure('render');
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function attachStackScene(
  host: HTMLElement,
  onFrame: (value: SceneReport) => void,
  onFailure: (reason: string) => void,
): SceneSession {
  const root = createRoot(host);
  const motion: RecoilChannel = { current: null, invalidate() {} };
  let disposed = false;
  let generation = 0;
  const contextLost = (event: Event) => {
    event.preventDefault();
    queueMicrotask(() => {
      if (!disposed) onFailure('context-loss');
    });
  };
  host.addEventListener('webglcontextlost', contextLost, true);
  return {
    update(layout, active) {
      if (disposed) return;
      const own = ++generation;
      root.render(
        <SceneBoundary
          onFailure={(reason) =>
            queueMicrotask(() => {
              if (!disposed) onFailure(reason);
            })
          }
        >
          <StackScene
            layout={layout}
            active={active}
            motion={motion}
            onFrame={(value) => {
              if (!disposed && own === generation) onFrame(value);
            }}
          />
        </SceneBoundary>,
      );
    },
    recoil(value) {
      if (disposed) return;
      motion.current = value;
      motion.invalidate();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation++;
      host.removeEventListener('webglcontextlost', contextLost, true);
      root.unmount();
    },
  };
}
