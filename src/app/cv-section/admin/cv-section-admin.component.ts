import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CvSectionSessionService } from '../cv-section-session.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-cv-section-admin',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './cv-section-admin.component.html',
  styleUrls: ['./cv-section-admin.component.sass']
})
export class CvSectionAdminComponent implements OnInit {
  private readonly sessionService = inject(CvSectionSessionService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected isLoadingLogs = true;
  protected logFetchError: string | null = null;
  protected visibleLogs: { timestamp: string; role: string; name: string; company: string }[] = [];

  protected isLoadingStats = true;
  protected statsFetchError: string | null = null;
  protected cvAccessUniqueUsersSinceLastAdmin: number | null = null;

  ngOnInit(): void {
    this.http
      .get('/api/cv-section/admin/logs', { withCredentials: true, responseType: 'text' })
      .pipe(
        catchError(() => {
          this.isLoadingLogs = false;
          this.logFetchError = 'LOGS_COULD_NOT_BE_LOADED';
          return of('');
        })
      )
      .subscribe((raw) => {
        this.isLoadingLogs = false;
        if (!raw?.trim()) {
          this.visibleLogs = [];
          return;
        }

        const lines = raw
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

        const parsed = lines
          .map((line) => {
            const parts = line.split(' | ');
            const timestamp = parts[0] ?? '';
            const role = parts[1] ?? '';
            const name = parts[2] ?? '';
            const company = parts[3] ?? '';
            return { timestamp, role, name, company };
          })
          .filter((e) => e.timestamp && e.role && e.name);

        // Per requirement: show only non-admin login attempts in the admin area.
        this.visibleLogs = parsed
          .filter((e) => e.role === 'ROLE_CV_ACCESS')
          .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
          .slice(0, 200);
      });

    this.http
      .get<{ lastAdminLogin: string | null; cvAccessUniqueUsersSinceLastAdmin: number }>(
        '/api/cv-section/admin/stats',
        { withCredentials: true }
      )
      .pipe(
        catchError(() => {
          this.isLoadingStats = false;
          this.statsFetchError = 'STATS_COULD_NOT_BE_LOADED';
          return of({ lastAdminLogin: null, cvAccessUniqueUsersSinceLastAdmin: 0 });
        })
      )
      .subscribe((stats) => {
        this.isLoadingStats = false;
        this.cvAccessUniqueUsersSinceLastAdmin = stats.cvAccessUniqueUsersSinceLastAdmin ?? 0;
      });
  }

  protected formatTimestamp(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  onLogoutClick(): void {
    this.http
      .post('/api/cv-section/logout', {}, { withCredentials: true })
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

