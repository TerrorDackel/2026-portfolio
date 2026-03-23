import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { resolveCvSectionBackRoute } from '../../../cv-section-navigation.util';

/**
 * Certificate viewer within the CV-section (PDF + intro copy).
 *
 * Copy uses flat `CV_SECTION.*` keys in `de.json` / `en.json` (e.g. `DOC_CERT_HEADING`, `RESUME_LOCATION`).
 */
@Component({
  selector: 'app-cv-certificate-page',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './cv-certificate-page.component.html',
  styleUrl: './cv-certificate-page.component.sass'
})
export class CvCertificatePageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** ngx-translate key under `CV_SECTION` (aligned with {@link CvResumePageComponent.cvSection}). */
  cvSection(key: string): string {
    return `CV_SECTION.${key}`;
  }

  /**
   * Navigates back to Home or Admin depending on `returnTo`.
   */
  onBack(): void {
    void this.router.navigateByUrl(resolveCvSectionBackRoute(this.route.snapshot));
  }
}
