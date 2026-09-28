export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const range = (progress, start, end) => clamp((progress - start) / (end - start));
export function scrollToSceneProgress(id, progress) {
  const section = document.getElementById(id);

  if (!section) return;

  const travel = Math.max(1, section.offsetHeight - window.innerHeight);
  const sectionTop = section.getBoundingClientRect().top + window.scrollY;

  window.scrollTo({
    top: sectionTop + travel * progress,
    behavior: 'smooth',
  });

  history.replaceState(null, '', `#${id}`);
}