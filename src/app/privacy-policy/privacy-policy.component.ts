import { Component, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { observeAnimationReveal } from '../utils/scroll-animations';

/**
 * Privacy Policy page component.
 *
 * Responsibilities:
 * - Renders the privacy policy content.
 * - Initializes a scroll-based "reveal" animation for elements using the
 *   `reveal-zoom` class once the view has been rendered in the browser.
 *
 * Notes:
 * - The reveal logic is SSR-safe because `platformId` is passed to the helper,
 *   which avoids DOM access on non-browser platforms.
 */
@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [
    TranslatePipe
  ],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.sass'
})
export class PrivacyPolicyComponent implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);

  /**
   * Initializes intersection-observer based reveal animations after the view
   * has been created.
   *
   * This runs once per component instance and triggers the reveal setup for all
   * `.reveal-zoom` elements on the page.
   */
  ngAfterViewInit(): void {
    observeAnimationReveal('reveal-zoom', 0, this.platformId);
  }
}
