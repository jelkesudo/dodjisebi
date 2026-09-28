export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const range = (progress, start, end) => clamp((progress - start) / (end - start));

const targets = {
  zastani: ['zastani', 0.10],
  rad: ['rad', 0.16],
  price: ['price', 0.26],
  kontakt: ['kontakt-scene', 0.65],
};

export function scrollToSceneProgress(id, progress, behavior = 'instant') {
  const section = document.getElementById(id);
  if (!section) return false;
  const travel = Math.max(1, section.offsetHeight - window.innerHeight);
  const top = section.getBoundingClientRect().top + window.scrollY;
  window.dispatchEvent(new CustomEvent('scene:navigate', {
    detail: { sectionId: id, progress },
  }));
  window.scrollTo({ top: top + travel * progress, behavior });
  return true;
}

export function navigateToAnchor(anchor) {
  if (anchor === 'top') {
    window.dispatchEvent(new CustomEvent('scene:navigate', { detail: { sectionId: null } }));
    window.scrollTo({ top: 0, behavior: 'instant' });
    return true;
  }
  if (targets[anchor]) return scrollToSceneProgress(...targets[anchor]);
  const element = document.getElementById(anchor);
  if (!element) return false;
  window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
  return true;
}
