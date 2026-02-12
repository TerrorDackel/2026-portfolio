import { isPlatformBrowser } from '@angular/common';

export function observeAnimationReveal(
  className: string,
  delay: number = 0,
  platformId?: object
) {
  if (platformId && !isPlatformBrowser(platformId)) {
    return;
  }

  const elements = document.querySelectorAll<HTMLElement>(`.${className}`);

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const el = entry.target as HTMLElement;
        el.classList.add('in-view');
        el.style.setProperty('--reveal-delay', `${delay}ms`);
        observer.unobserve(el);
      });
    },
    { threshold: 0.3 }
  );

  elements.forEach(el => {
    if (el.dataset['revealObserved'] === 'true') return;
    el.dataset['revealObserved'] = 'true';

    el.classList.add('reveal-init');
    observer.observe(el);
  });
}
