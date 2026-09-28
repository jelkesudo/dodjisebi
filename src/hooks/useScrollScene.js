import { useEffect, useRef } from 'react';
import { clamp } from '../utils/scroll';

export function useScrollScene(onProgress) {
  const ref = useRef(null);
  const handler = useRef(onProgress);
  handler.current = onProgress;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const travel = Math.max(1, element.offsetHeight - window.innerHeight);
      handler.current(element, clamp(-rect.top / travel));
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    return () => {
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
}
