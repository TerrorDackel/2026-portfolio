import { Component, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { observeAnimationReveal } from '../../utils/scroll-animations';

/**
 * "My Work" section component.
 *
 * Responsibilities:
 * - Renders the "My Work" section content (translated via ngx-translate).
 * - Initializes scroll-based reveal animations for elements using the `reveal-zoom`
 *   class after the view has been rendered.
 *
 * Notes:
 * - A delay of 1000ms is applied via the `--reveal-delay` CSS variable.
 * - The reveal helper is called with `platformId` to remain SSR-safe and avoid
 *   DOM access on non-browser platforms.
 */
@Component({
  selector: 'app-my-work',
  standalone: true,
  imports: [
    TranslatePipe
  ],
  templateUrl: './my-work.component.html',
  styleUrl: './my-work.component.sass'
})
export class MyWorkComponent implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);

  /**
   * Initializes intersection-observer based reveal animations after the view
   * has been created.
   */
  ngAfterViewInit(): void {
    observeAnimationReveal('reveal-zoom', 1000, this.platformId);
  }
}
