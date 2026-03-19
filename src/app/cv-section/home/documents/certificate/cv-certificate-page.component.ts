import { Component, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-cv-certificate-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cv-certificate-page.component.html',
  styleUrls: ['./cv-certificate-page.component.sass'],
  encapsulation: ViewEncapsulation.None
})
export class CvCertificatePageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /**
   * Navigates back to either the Home CV entry or the Admin area.
   *
   * The target is determined by the `returnTo` query parameter:
   * - `returnTo=admin` -> `/cv-section/admin`
   * - otherwise -> `/cv-section/home`
   */
  onBack(): void {
    const returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    const targetUrl = this.resolveBackUrl(returnTo);
    void this.router.navigateByUrl(targetUrl);
  }

  /**
   * Resolves the back target URL from the `returnTo` query parameter.
   *
   * @param returnTo Query param value from the current URL.
   * @returns A full Angular URL for navigation.
   */
  private resolveBackUrl(returnTo: string | null): string {
    if (returnTo === 'admin') {
      return '/cv-section/admin';
    }

    return '/cv-section/home';
  }
}

