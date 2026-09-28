import { useEffect } from 'react';

/** Optional scene pacing: wheel magnet on desktop, one scene beat per swipe on touch. */
export function useScrollLockPoints({ sectionId, points, lockDuration = 650 }) {
  useEffect(() => {
    const section = document.getElementById(sectionId);
    if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ordered = [...points].sort((a, b) => a - b);
    const touchDevice = window.matchMedia('(pointer: coarse)').matches;
    let lockedUntil = 0;
    let lastPoint = -1;
    let startY = null;
    let startProgress = 0;
    let touchCaptured = false;
    let navigationUntil = 0;
    const onNavigate = (event) => {
      navigationUntil = performance.now() + 950;
      lockedUntil = 0;
      startY = null;
      touchCaptured = false;
      lastPoint = event.detail?.sectionId === sectionId
        ? ordered.findIndex((point) => Math.abs(point - event.detail.progress) < 0.015)
        : -1;
    };
    window.addEventListener('scene:navigate', onNavigate);

    const metrics = () => {
      const top = section.getBoundingClientRect().top + window.scrollY;
      const travel = Math.max(1, section.offsetHeight - window.innerHeight);
      return { top, travel, progress: (window.scrollY - top) / travel };
    };
    const go = (index, m) => {
      lastPoint = index;
      lockedUntil = performance.now() + lockDuration;
      window.scrollTo({ top: m.top + m.travel * ordered[index], behavior: 'smooth' });
    };
    const interactive = (target) => target instanceof Element &&
      Boolean(target.closest('a, button, input, textarea, select, .feelings-grid, .accept-list, .apply-modal'));

    const wheel = (event) => {
      if (touchDevice || event.ctrlKey || interactive(event.target) || performance.now() < navigationUntil) return;
      const m = metrics();
      if (performance.now() < lockedUntil) {
        if (m.progress >= -0.02 && m.progress <= 1.02) event.preventDefault();
        return;
      }
      const direction = Math.sign(event.deltaY);
      if (!direction || m.progress < -0.04 || m.progress > 1.04) return;
      const index = direction > 0
        ? ordered.findIndex((point, i) => i !== lastPoint && point >= m.progress && point - m.progress < 0.10)
        : ordered.findLastIndex((point, i) => i !== lastPoint && point <= m.progress && m.progress - point < 0.10);
      if (index !== -1) {
        event.preventDefault();
        go(index, m);
      }
      if (lastPoint !== -1 && Math.abs(m.progress - ordered[lastPoint]) > 0.10) lastPoint = -1;
    };
    const touchStart = (event) => {
      if (!touchDevice || event.touches.length !== 1 || interactive(event.target) || performance.now() < navigationUntil) return;
      const m = metrics();
      if (m.progress < -0.02 || m.progress > 1.02) return;
      startY = event.touches[0].clientY;
      startProgress = m.progress;
      touchCaptured = false;
    };
    const touchMove = (event) => {
      if (startY === null || event.touches.length !== 1) return;
      const delta = startY - event.touches[0].clientY;
      if (Math.abs(delta) < 9 && !touchCaptured) return;
      const direction = Math.sign(delta);
      // Let users enter/leave a scene normally at its boundaries.
      if ((startProgress >= 0.985 && direction > 0) ||
          (startProgress <= 0.015 && direction < 0)) return;
      event.preventDefault();
      touchCaptured = true;
    };
    const touchEnd = (event) => {
      if (startY === null) return;
      const delta = startY - (event.changedTouches[0]?.clientY ?? startY);
      const captured = touchCaptured;
      startY = null;
      touchCaptured = false;
      if (!captured || Math.abs(delta) < 32 || performance.now() < lockedUntil) return;
      const m = metrics();
      const direction = Math.sign(delta);
      const nearest = ordered.reduce((best, point, i) =>
        Math.abs(point - startProgress) < Math.abs(ordered[best] - startProgress) ? i : best, 0);
      let next;
      if (Math.abs(startProgress - ordered[nearest]) < 0.055) next = nearest + direction;
      else if (direction > 0) next = ordered.findIndex(point => point > startProgress);
      else next = ordered.findLastIndex(point => point < startProgress);
      if (next >= 0 && next < ordered.length) go(next, m);
      else window.scrollTo({ top: direction > 0 ? m.top + m.travel + 3 : m.top - 3, behavior: 'smooth' });
    };
    window.addEventListener('wheel', wheel, { passive: false });
    section.addEventListener('touchstart', touchStart, { passive: true });
    section.addEventListener('touchmove', touchMove, { passive: false });
    section.addEventListener('touchend', touchEnd, { passive: true });
    return () => {
      window.removeEventListener('scene:navigate', onNavigate);
      window.removeEventListener('wheel', wheel);
      section.removeEventListener('touchstart', touchStart);
      section.removeEventListener('touchmove', touchMove);
      section.removeEventListener('touchend', touchEnd);
    };
  }, [sectionId, points, lockDuration]);
}
