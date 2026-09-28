import { useEffect, useRef } from 'react';

export function useScrollLockPoints({
  sectionId,
  points,
  lockDuration = 650,
}) {
  const lockedUntil = useRef(0);
  const currentPoint = useRef(-1);
  const releasedPoint = useRef(-1);

  useEffect(() => {
    const section = document.getElementById(sectionId);

    if (!section) return;

    const getMetrics = () => {
      const sectionTop =
        section.getBoundingClientRect().top + window.scrollY;

      const travel = Math.max(
        1,
        section.offsetHeight - window.innerHeight
      );

      const progress =
        (window.scrollY - sectionTop) / travel;

      return {
        sectionTop,
        travel,
        progress,
      };
    };

    const onWheel = (event) => {
      const now = performance.now();

      /*
       * Dok traje lock, gutamo wheel momentum.
       */
      if (now < lockedUntil.current) {
        event.preventDefault();
        return;
      }

      const { sectionTop, travel, progress } = getMetrics();

      if (progress < 0 || progress > 1) {
        currentPoint.current = -1;
        releasedPoint.current = -1;
        return;
      }

      const direction = Math.sign(event.deltaY);

      if (!direction) return;

      /*
       * Kada smo već pustili korisnika sa trenutne
       * tačke, ne zaključavaj je ponovo dok je ne napusti.
       */
      if (releasedPoint.current !== -1) {
        const released = points[releasedPoint.current];

        if (Math.abs(progress - released) > 0.06) {
          releasedPoint.current = -1;
        } else {
          return;
        }
      }

      const targetIndex = points.findIndex((point) => {
        if (direction > 0) {
          return progress < point && point - progress < 0.08;
        }

        return progress > point && progress - point < 0.08;
      });

      if (targetIndex === -1) return;

      event.preventDefault();

      const point = points[targetIndex];

      currentPoint.current = targetIndex;
      lockedUntil.current = now + lockDuration;

      window.scrollTo({
        top: sectionTop + travel * point,
        behavior: 'smooth',
      });

      window.setTimeout(() => {
        releasedPoint.current = targetIndex;
        currentPoint.current = -1;
      }, lockDuration);
    };

    window.addEventListener('wheel', onWheel, {
      passive: false,
    });

    return () => {
      window.removeEventListener('wheel', onWheel);
    };
  }, [sectionId, points, lockDuration]);
}