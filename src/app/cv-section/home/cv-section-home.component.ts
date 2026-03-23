import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { CvSectionSessionService } from '../cv-section-session.service';
import { HttpClient } from '@angular/common/http';
import { CvDocumentLinksComponent } from '../document-links/cv-document-links.component';

/** Shape of `/api/cv-section/me` used to personalize the greeting line. */
interface CvSectionMeResponse {
  name: string;
  company?: string;
  role: 'ROLE_ADMIN' | 'ROLE_CV_ACCESS';
}

/**
 * CV-section home route: personalized greeting and links into résumé / certificate pages.
 *
 * Responsibilities:
 * - Load the current user display name from `/api/cv-section/me` (cookie session).
 * - Render {@link CvDocumentLinksComponent} for document entry points.
 * - Perform manual logout: POST `/api/cv-section/logout/`, {@link CvSectionSessionService.stop}, navigate to login.
 *
 * Notes:
 * - On `/me` failure, {@link CvSectionHomeComponent.loggedInName} falls back to an em dash placeholder.
 * - Logout always stops idle tracking, even when the HTTP call errors (same pattern as other CV-section logout UIs).
 */
@Component({
  selector: 'app-cv-section-home',
  standalone: true,
  imports: [CommonModule, TranslatePipe, CvDocumentLinksComponent],
  templateUrl: './cv-section-home.component.html',
  styleUrl: './cv-section-home.component.sass'
})
export class CvSectionHomeComponent implements OnInit {
  private readonly sessionService = inject(CvSectionSessionService);
  private readonly http = inject(HttpClient);

  protected loggedInName = '—';

  ngOnInit(): void {
    this.http
      .get<CvSectionMeResponse>('/api/cv-section/me', { withCredentials: true })
      .subscribe({
        next: (me) => {
          this.loggedInName = me?.name || '—';
        },
        error: () => {
          this.loggedInName = '—';
        }
      });
  }

  /**
   * Logs the user out server-side, stops idle timers, and returns to the CV login screen.
   */
  onLogoutClick(): void {
    this.sessionService.logoutToLogin();
  }
}

