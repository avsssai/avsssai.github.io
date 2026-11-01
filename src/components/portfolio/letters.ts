import { letterEffects, letterFrames } from './letter-effects';

export function mountLetters(root: HTMLElement) {
  const word = root.querySelector<HTMLElement>('[data-imagination-word]')!;
  const source = word.querySelector<HTMLElement>('[data-letter-source]')!;
  const decoration = word.querySelector<HTMLElement>(
    '[data-letter-decoration]',
  )!;
  const demo = root.querySelector<HTMLButtonElement>('[data-letter-demo]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const lifetime = new AbortController();
  let disposed = false;
  let frame = 0;
  let generation = 0;
  let lastIndex = -1;
  let animation: Animation | undefined;
  let bounds: Array<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  }> = [];
  const glyphs = letterEffects.map((spec) => {
    const glyph = document.createElement('span');
    glyph.dataset.letterEffect = spec.effect;
    glyph.textContent = source.textContent![spec.index];
    decoration.append(glyph);
    return glyph;
  });
  const reset = () => {
    generation++;
    animation?.cancel();
    animation = undefined;
    glyphs.forEach((glyph) => {
      glyph.style.opacity = '0';
    });
    root.dataset.letterActive = '';
    demo.setAttribute('aria-pressed', 'false');
  };
  const measure = () => {
    if (disposed) return;
    reset();
    const box = word.getBoundingClientRect();
    const text = source.firstChild!;
    bounds = letterEffects.map((spec, i) => {
      const range = document.createRange();
      range.setStart(text, spec.index);
      range.setEnd(text, spec.index + 1);
      const rect = range.getBoundingClientRect();
      glyphs[i].style.left = `${rect.x - box.x}px`;
      glyphs[i].style.top = `${rect.y - box.y}px`;
      glyphs[i].style.width = `${rect.width}px`;
      glyphs[i].style.height = `${rect.height}px`;
      const cloneRange = document.createRange();
      cloneRange.selectNodeContents(glyphs[i]);
      const cloneRect = cloneRange.getBoundingClientRect();
      glyphs[i].style.top = `${rect.y - box.y + rect.y - cloneRect.y}px`;
      return {
        left: rect.x,
        right: rect.right,
        top: rect.y,
        bottom: rect.bottom,
      };
    });
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measure);
  };
  const play = async (index: number, own: number) => {
    if (disposed || reduce.matches || own !== generation) return;
    root.dataset.letterActive = String(letterEffects[index].index);
    animation = glyphs[index].animate(
      letterFrames(letterEffects[index].effect),
      {
        duration: 480,
        easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    );
    try {
      await animation.finished;
    } catch {}
    if (own === generation) root.dataset.letterActive = '';
  };
  word.addEventListener(
    'pointermove',
    (event) => {
      if (
        !fine.matches ||
        event.pointerType === 'touch' ||
        reduce.matches ||
        demo.getAttribute('aria-pressed') === 'true'
      )
        return;
      const index = bounds.findIndex(
        (box) =>
          event.clientX >= box.left &&
          event.clientX <= box.right &&
          event.clientY >= box.top &&
          event.clientY <= box.bottom,
      );
      if (index === lastIndex) return;
      lastIndex = index;
      reset();
      if (index >= 0) void play(index, generation);
    },
    { signal: lifetime.signal },
  );
  word.addEventListener(
    'pointerleave',
    () => {
      lastIndex = -1;
    },
    { signal: lifetime.signal },
  );
  demo.addEventListener(
    'click',
    async () => {
      if (reduce.matches) return;
      reset();
      const own = generation;
      demo.setAttribute('aria-pressed', 'true');
      for (let i = 0; i < glyphs.length && own === generation; i++)
        await play(i, own);
      if (own === generation) reset();
    },
    { signal: lifetime.signal },
  );
  const preferences = () => {
    reset();
    demo.disabled = reduce.matches;
  };
  reduce.addEventListener('change', preferences, { signal: lifetime.signal });
  window.addEventListener('resize', schedule, { signal: lifetime.signal });
  window.addEventListener('scroll', schedule, {
    signal: lifetime.signal,
    passive: true,
  });
  window.addEventListener('pagehide', reset, { signal: lifetime.signal });
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) reset();
    },
    { signal: lifetime.signal },
  );
  const observer = new ResizeObserver(schedule);
  observer.observe(word);
  document.fonts.ready.then(() => {
    if (!disposed) schedule();
  });
  demo.hidden = false;
  preferences();
  measure();
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      reset();
      lifetime.abort();
      observer.disconnect();
      cancelAnimationFrame(frame);
      decoration.replaceChildren();
      demo.hidden = true;
    },
  };
}
