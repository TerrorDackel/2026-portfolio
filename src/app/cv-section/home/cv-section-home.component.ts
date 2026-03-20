import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CvSectionSessionService } from '../cv-section-session.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CvDocumentLinksComponent } from '../document-links/cv-document-links.component';

interface CvSectionMeResponse {
  name: string;
  company?: string;
  role: 'ROLE_ADMIN' | 'ROLE_CV_ACCESS';
}

@Component({
  selector: 'app-cv-section-home',
  standalone: true,
  imports: [CommonModule, TranslateModule, CvDocumentLinksComponent],
  templateUrl: './cv-section-home.component.html',
  styleUrls: ['./cv-section-home.component.sass']
})
export class CvSectionHomeComponent implements OnInit {
  private readonly sessionService = inject(CvSectionSessionService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

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

  onLogoutClick(): void {
    this.http
      .post('/api/cv-section/logout/', {}, { withCredentials: true })
      .subscribe({
        next: () => {
          this.sessionService.stop();
          void this.router.navigate(['/cv-section/login']);
        },
        error: () => {
          this.sessionService.stop();
          void this.router.navigate(['/cv-section/login']);
        }
      });
  }
}

