import {useEffect} from 'react';

export function CursorEffects({enabled=true}:{enabled?:boolean}) {
  useEffect(() => {
    if (!enabled) return;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reducedMotion) return;

    const cursor = document.createElement('span');
    const trail = document.createElement('span');
    cursor.className = 'cursor-vfx';
    trail.className = 'cursor-vfx-trail';
    cursor.setAttribute('aria-hidden', 'true');
    trail.setAttribute('aria-hidden', 'true');
    document.body.append(cursor, trail);

    let frame = 0;
    let x = -100;
    let y = -100;
    let trailX = x;
    let trailY = y;
    let visible = false;

    const render = () => {
      trailX += (x - trailX) * 0.18;
      trailY += (y - trailY) * 0.18;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      trail.style.transform = `translate3d(${trailX}px, ${trailY}px, 0)`;
      if (Math.abs(x-trailX)>0.35||Math.abs(y-trailY)>0.35) frame=requestAnimationFrame(render);
      else frame=0;
    };
    const setMode = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      const root = document.documentElement;
      const mode = element?.closest('input, textarea, [contenteditable="true"]') ? 'text'
        : element?.closest('button, a, select, summary, [role="button"], [role="link"]') ? 'action'
        : 'idle';
      root.dataset.cursorMode = mode;
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      x = event.clientX;
      y = event.clientY;
      if (!visible) {
        visible = true;
        cursor.classList.add('is-visible');
        trail.classList.add('is-visible');
      }
      setMode(event.target);
      if (!frame) frame=requestAnimationFrame(render);
    };
    const onDown = () => cursor.classList.add('is-pressed');
    const onUp = () => cursor.classList.remove('is-pressed');
    const onLeave = () => {
      visible = false;
      cursor.classList.remove('is-visible', 'is-pressed');
      trail.classList.remove('is-visible');
      delete document.documentElement.dataset.cursorMode;
    };

    window.addEventListener('pointermove', onMove, {passive: true});
    window.addEventListener('pointerdown', onDown, {passive: true});
    window.addEventListener('pointerup', onUp, {passive: true});
    document.documentElement.addEventListener('mouseleave', onLeave);
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      delete document.documentElement.dataset.cursorMode;
      cursor.remove();
      trail.remove();
    };
  }, [enabled]);

  return null;
}
