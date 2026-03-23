import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { resolveCvSectionBackRoute } from '../../../cv-section-navigation.util';

/** Layout variant for one timeline row under “Werdegang” (matches original HTML semantics). */
type WerdegangLayout = 'paragraphSubtitle' | 'divSubtitleAndBody' | 'divSubtitleOnly';

/**
 * Standalone printable résumé view under the CV-section.
 *
 * Responsibilities:
 * - Render résumé copy from `assets/i18n` keys under `CV_SECTION` (e.g. `RESUME_*`, `DOC_*`).
 * - {@link CvResumePageComponent.print} delegates to `window.print()`.
 * - {@link CvResumePageComponent.onBack} respects the `returnTo` query param.
 */
@Component({
  selector: 'app-cv-resume-page',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './cv-resume-page.component.html',
  styleUrl: './cv-resume-page.component.sass'
})
export class CvResumePageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /**
   * Drives the Werdegang `@for` loop; `id` maps to keys `RESUME_WG{{id}}_*`.
   */
  readonly werdegangSegments: { id: string; layout: WerdegangLayout }[] = [
    { id: '01', layout: 'paragraphSubtitle' },
    { id: '02', layout: 'divSubtitleAndBody' },
    { id: '03', layout: 'divSubtitleAndBody' },
    { id: '04', layout: 'divSubtitleAndBody' },
    { id: '05', layout: 'divSubtitleAndBody' },
    { id: '06', layout: 'divSubtitleAndBody' },
    { id: '07', layout: 'divSubtitleAndBody' },
    { id: '08', layout: 'divSubtitleOnly' },
    { id: '09', layout: 'divSubtitleAndBody' },
    { id: '10', layout: 'divSubtitleAndBody' },
    { id: '11', layout: 'divSubtitleAndBody' },
    { id: '12', layout: 'divSubtitleOnly' },
    { id: '13', layout: 'divSubtitleOnly' },
    { id: '14', layout: 'divSubtitleOnly' }
  ];

  /**
   * Builds an ngx-translate key under `CV_SECTION` (same pattern as `CONTACT.TITLE` → `CV_SECTION.RESUME_ABOUT_TITLE`).
   */
  cvSection(key: string): string {
    return `CV_SECTION.${key}`;
  }

  /** Opens the browser print dialog for this CV page. */
  print(): void {
    window.print();
  }

  /**
   * Navigates back to Home or Admin depending on `returnTo`:
   * - `returnTo=admin` → `/cv-section/admin`
   * - otherwise → `/cv-section/home`
   */
  onBack(): void {
    void this.router.navigateByUrl(resolveCvSectionBackRoute(this.route.snapshot));
  }
}
