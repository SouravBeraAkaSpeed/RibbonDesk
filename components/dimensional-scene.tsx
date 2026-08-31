'use client';

import { useEffect } from 'react';

export function DimensionalScene() {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const commitPointer = (clientX: number, clientY: number) => {
      const x = clientX / Math.max(window.innerWidth, 1) - 0.5;
      const y = clientY / Math.max(window.innerHeight, 1) - 0.5;
      root.style.setProperty('--scene-x', `${x * 28}px`);
      root.style.setProperty('--scene-y', `${y * 20}px`);
      root.style.setProperty('--scene-rotate-x', `${y * -2.2}deg`);
      root.style.setProperty('--scene-rotate-y', `${x * 3.2}deg`);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion.matches || event.pointerType === 'touch') return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() =>
        commitPointer(event.clientX, event.clientY),
      );
    };

    const resetPointer = () =>
      commitPointer(window.innerWidth / 2, window.innerHeight / 2);

    resetPointer();
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('blur', resetPointer);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('blur', resetPointer);
      root.style.removeProperty('--scene-x');
      root.style.removeProperty('--scene-y');
      root.style.removeProperty('--scene-rotate-x');
      root.style.removeProperty('--scene-rotate-y');
    };
  }, []);

  return (
    <div className="dimensional-atmosphere" aria-hidden="true">
      <div className="dimensional-world">
        <span className="dimensional-orb dimensional-orb-coral" />
        <span className="dimensional-orb dimensional-orb-sage" />
        <span className="dimensional-orb dimensional-orb-gold" />
        <span className="dimensional-ribbon dimensional-ribbon-one" />
        <span className="dimensional-ribbon dimensional-ribbon-two" />
        <span className="dimensional-ribbon dimensional-ribbon-three" />
        <span className="dimensional-grid-plane" />
      </div>
      <span className="dimensional-grain" />
    </div>
  );
}
