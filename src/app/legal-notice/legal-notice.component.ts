import { Component, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { observeAnimationReveal } from '../utils/scroll-animations';

/**
 * Legal Notice / Imprint page component.
 *
 * Responsibilities:
 * - Renders the legal notice content.
 * - Initializes a scroll-based "reveal" animation for elements using the
 *   `reveal-zoom` class once the view has been rendered in the browser.
 *
 * Notes:
 * - The reveal helper is called with `platformId` to remain SSR-safe and avoid
 *   DOM access on non-browser platforms.
 */
@Component({
  selector: 'app-legal-notice',
  standalone: true,
  imports: [
    TranslatePipe
  ],
  templateUrl: './legal-notice.component.html',
  styleUrl: './legal-notice.component.sass'
})
export class LegalNoticeComponent implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);

  /**
   * Initializes intersection-observer based reveal animations after the view
   * has been created.
   *
   * This triggers the reveal setup for all `.reveal-zoom` elements on the page.
   */
  ngAfterViewInit(): void {
    observeAnimationReveal('reveal-zoom', 0, this.platformId);
  }
}
