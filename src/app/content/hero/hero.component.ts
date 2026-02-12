import { Component, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { observeAnimationReveal } from '../../utils/scroll-animations';

/**
 * Hero section component.
 *
 * Responsibilities:
 * - Renders the hero section content (translated via ngx-translate).
 * - Initializes scroll-based reveal animations for elements using the `reveal-zoom`
 *   class after the view has been rendered.
 *
 * Notes:
 * - The reveal helper is called with `platformId` to remain SSR-safe and avoid
 *   DOM access on non-browser platforms.
 */
@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [
    TranslatePipe
  ],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.sass'
})
export class HeroComponent implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);

  /**
   * Initializes intersection-observer based reveal animations after the view
   * has been created.
   */
  ngAfterViewInit(): void {
    observeAnimationReveal('reveal-zoom', 0, this.platformId);
  }
}
