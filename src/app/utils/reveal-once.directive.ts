import { Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';

/**
 * Reveals an element with a CSS animation the first time it enters the viewport.
 *
 * Usage example:
 * ```html
 * <h2 [revealOnce]="'reveal-zoom'" [revealDelay]="150">Hello</h2>
 * ```
 *
 * Behavior:
 * - Adds `reveal-init` and the configured animation class to the host element.
 * - Applies `--reveal-delay` as a CSS custom property (e.g. used in `animation-delay`).
 * - If the user prefers reduced motion, immediately adds `in-view` and skips observation.
 * - Otherwise uses IntersectionObserver to add `in-view` once the element becomes visible,
 *   then disconnects the observer to run only once.
 *
 * CSS contract:
 * - The animation class (e.g. `reveal-from-left`, `reveal-zoom`) should define the hidden
 *   initial state.
 * - The `.in-view` modifier should define the animated/visible state.
 */
@Directive({
  selector: '[revealOnce]',
  standalone: true
})
export class RevealOnceDirective implements OnInit, OnDestroy {
  /**
   * CSS class that defines the reveal animation preset (e.g. 'reveal-from-left').
   *
   * Bound via the directive selector input:
   *   [revealOnce]="'reveal-zoom'"
   */
  @Input('revealOnce') animClass: string = 'reveal-from-left';

  /**
   * Delay for the reveal animation.
   *
   * - number => treated as milliseconds (e.g. 150 -> '150ms')
   * - string => used as-is (e.g. '0ms', '0.2s')
   */
  @Input() revealDelay: string | number = '0ms';

  private observer?: IntersectionObserver;

  constructor(private el: ElementRef<HTMLElement>, private r: Renderer2) {}

  ngOnInit(): void {
    this.initBaseClassesAndDelay();
    if (this.shouldReduceMotion()) {
      this.showImmediately();
      return;
    }

    this.observeOnce();
  }

  /**
   * Disconnects the observer to prevent memory leaks when the directive is destroyed.
   */
  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  /**
   * Applies base CSS classes and the CSS custom property for the reveal delay.
   */
  private initBaseClassesAndDelay(): void {
    const node = this.el.nativeElement;

    this.r.addClass(node, 'reveal-init');
    this.r.addClass(node, this.animClass);
    this.r.setStyle(node, '--reveal-delay', this.normalizeDelay(this.revealDelay));
  }

  /**
   * Returns whether the user has enabled reduced motion preferences.
   */
  private shouldReduceMotion(): boolean {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Makes the element visible immediately by applying the `in-view` class.
   */
  private showImmediately(): void {
    this.r.addClass(this.el.nativeElement, 'in-view');
  }

  /**
   * Observes the element and applies the `in-view` class once it becomes visible.
   * The observer is disconnected immediately after the first reveal.
   */
  private observeOnce(): void {
    const node = this.el.nativeElement;

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        this.r.addClass(node, 'in-view');
        this.observer?.disconnect();
      },
      { threshold: 0.25 }
    );

    this.observer.observe(node);
  }

  /**
   * Normalizes the delay input to a CSS time value.
   *
   * @param value Delay value as number (ms) or string (CSS time).
   * @returns A valid CSS time value (e.g. '150ms', '0.2s').
   */
  private normalizeDelay(value: string | number): string {
    return typeof value === 'number' ? `${value}ms` : value;
  }
}
