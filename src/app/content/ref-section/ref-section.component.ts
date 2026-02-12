import { Component, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { RefComponent } from './ref/ref.component';
import { TranslatePipe } from '@ngx-translate/core';
import { DragScrollXDirective } from './drag-scroll-x.directive';
import { observeAnimationReveal } from '../../utils/scroll-animations';

/**
 * References section component.
 *
 * Responsibilities:
 * - Renders a horizontally scrollable list of reference cards (colleague feedback).
 * - Initializes reveal animations for headers/content when the section enters the viewport.
 *
 * Implementation notes:
 * - Uses `DragScrollXDirective` to enable mouse drag scrolling on the card row.
 * - Uses `observeAnimationReveal()` to add the `in-view` class once elements
 *   intersect the viewport, enabling CSS-based reveal animations.
 * - Skips animation initialization when the user prefers reduced motion.
 */
@Component({
  selector: 'app-ref-section',
  standalone: true,
  imports: [
    RefComponent,
    TranslatePipe,
    DragScrollXDirective
  ],
  templateUrl: './ref-section.component.html',
  styleUrl: './ref-section.component.sass'
})
export class RefSectionComponent implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);

  /**
   * Reference entries rendered by the template.
   *
   * Each item maps to one `app-ref` card and contains:
   * - name: colleague name
   * - project: project context shown in the card
   * - commit: translation key for the feedback text
   */
  ref = [
    {
      name: 'Catalina Acosta',
      project: 'Project Kochwelt',
      commit: 'REF_SECTION.CATALINA.COMMIT'
    },
    {
      name: 'Caryen Song',
      project: 'Project Kochwelt',
      commit: 'REF_SECTION.CARYEN.COMMIT'
    },
    {
      name: 'Patrick Frey',
      project: 'Project Join',
      commit: 'REF_SECTION.PATRICK.COMMIT'
    },
    {
      name: 'Stephanie Englberger',
      project: 'Project Join',
      commit: 'REF_SECTION.STEPHIE.COMMIT'
    },
    {
      name: 'Jonathan Michutta',
      project: 'Project Join',
      commit: 'REF_SECTION.JON.COMMIT'
    }
  ];

  /**
   * Initializes reveal animations after the view has been created.
   *
   * Behavior:
   * - Aborts early when reduced motion is enabled.
   * - Registers reveal observers for supported reveal classes used in this section.
   *
   * SSR safety:
   * - The helper receives `platformId` and exits on non-browser platforms.
   */
  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    observeAnimationReveal('reveal-zoom', 0, this.platformId);
    observeAnimationReveal('reveal-from-left', 150, this.platformId);
    observeAnimationReveal('reveal-from-right', 150, this.platformId);
  }
}
