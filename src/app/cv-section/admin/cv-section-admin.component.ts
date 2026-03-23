import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CvSectionSessionService } from '../cv-section-session.service';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import {
  CV_SECTION_RETURN_TO_QUERY_PARAM
} from '../cv-section-navigation.util';

/**
 * One parsed row from the plain-text CV-section access log (`ROLE | name | company` columns after timestamp).
 */
interface CvSectionAdminLogEntry {
  timestamp: string;
  role: string;
  name: string;
  company: string;
}

/**
 * CV-section admin landing page: stats, log tail, document shortcuts, and maintenance actions.
 *
 * Responsibilities:
 * - GET `/api/cv-section/admin/logs` as **text**, parse lines, keep only `ROLE_CV_ACCESS`, show newest 200.
 * - GET `/api/cv-section/admin/stats` for “unique CV visitors since last admin login” counter.
 * - POST `/api/cv-section/admin/logs/clear/` to wipe logs (with browser `confirm` guard).
 * - Logout: same pattern as home — POST `/api/cv-section/logout/`, {@link CvSectionSessionService.stop}, navigate to login.
 *
 * Notes:
 * - Log parsing is defensive: malformed lines are dropped rather than breaking the view.
 * - {@link CvSectionAdminComponent.formatTimestamp} uses `de-DE` locale for display consistency.
 */
@Component({
  selector: 'app-cv-section-admin',
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterLink],
  templateUrl: './cv-section-admin.component.html',
  styleUrl: './cv-section-admin.component.sass'
})
export class CvSectionAdminComponent implements OnInit {
  private readonly sessionService = inject(CvSectionSessionService);
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService);

  /** True while the clear-logs POST is running. */
  protected isClearingLogs = false;

  /** Translation key when log deletion fails; `null` when no error banner. */
  protected clearLogsErrorKey: string | null = null;

  /** Shown until the first successful `/admin/logs` response (or hard failure). */
  protected isLoadingLogs = true;

  /** i18n token when logs could not be loaded (template maps to a message). */
  protected logFetchError: string | null = null;

  /** Newest-first slice of CV-access rows for the table UI. */
  protected visibleLogs: CvSectionAdminLogEntry[] = [];

  /** Shown until `/admin/stats` returns or errors. */
  protected isLoadingStats = true;

  /** i18n token when stats could not be loaded. */
  protected statsFetchError: string | null = null;

  /** Backend counter; `null` only before first successful stats load. */
  protected cvAccessUniqueUsersSinceLastAdmin: number | null = null;

  protected readonly resumeRoute = ['/cv-section/home/resume'];
  protected readonly certificateRoute = ['/cv-section/home/certificate'];
  protected readonly adminReturnQueryParams = { [CV_SECTION_RETURN_TO_QUERY_PARAM]: 'admin' };

  /**
   * Triggers parallel loads for logs and stats.
   */
  ngOnInit(): void {
    this.loadLogs();
    this.loadStats();
  }

  /**
   * Loads logs for the admin page.
   * The backend returns raw log lines which we parse and filter.
   */
  private loadLogs(): void {
    this.setLogsLoadingState();
    this.requestAdminLogsRaw()
      .pipe(catchError(() => this.handleLogsFetchError()))
      .subscribe((raw) => this.applyLogsFromRaw(raw));
  }

  /** Requests the raw log content from the backend. */
  private requestAdminLogsRaw() {
    return this.http.get('/api/cv-section/admin/logs', {
      withCredentials: true,
      responseType: 'text'
    });
  }

  /** Sets loading/error state for logs UI. */
  private setLogsLoadingState(): void {
    this.isLoadingLogs = true;
    this.logFetchError = null;
  }

  /** Returns an empty raw response when logs fetch fails. */
  private handleLogsFetchError() {
    this.isLoadingLogs = false;
    this.logFetchError = 'LOGS_COULD_NOT_BE_LOADED';
    return of('');
  }

  /**
   * Parses backend raw log lines, filters them to CV-access entries,
   * sorts them newest-first, and limits the result.
   */
  private applyLogsFromRaw(raw: string): void {
    this.isLoadingLogs = false;
    const parsed = this.parseLogsRaw(raw);
    this.visibleLogs = this.filterAndSortLogs(parsed).slice(0, 200);
  }

  /** Splits raw text into valid log entries. */
  private parseLogsRaw(raw: string): CvSectionAdminLogEntry[] {
    const lines = this.getRawLogLines(raw);
    return lines
      .map((line) => this.parseSingleLogLine(line))
      .filter((e): e is CvSectionAdminLogEntry => Boolean(e));
  }

  /** Converts raw log text into non-empty lines. */
  private getRawLogLines(raw: string): string[] {
    return String(raw ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  /** Parses a single log line into an entry object. */
  private parseSingleLogLine(line: string): CvSectionAdminLogEntry | null {
    const parts = line.split(' | ');
    const timestamp = parts[0] ?? '';
    const role = parts[1] ?? '';
    const name = parts[2] ?? '';
    const company = parts[3] ?? '';

    if (!timestamp || !role || !name) return null;
    return { timestamp, role, name, company };
  }

  /** Filters to CV-access logs and sorts them newest-first. */
  private filterAndSortLogs(entries: CvSectionAdminLogEntry[]): CvSectionAdminLogEntry[] {
    return entries
      .filter((e) => e.role === 'ROLE_CV_ACCESS')
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }

  /** Loads admin statistics for the greeting block. */
  private loadStats(): void {
    this.setStatsLoadingState();
    this.requestAdminStats()
      .pipe(catchError(() => this.handleStatsFetchError()))
      .subscribe((stats) => this.applyStats(stats));
  }

  /** Requests the stats JSON from the backend. */
  private requestAdminStats() {
    return this.http.get<{ lastAdminLogin: string | null; cvAccessUniqueUsersSinceLastAdmin: number }>(
      '/api/cv-section/admin/stats',
      { withCredentials: true }
    );
  }

  /** Sets loading/error state for stats UI. */
  private setStatsLoadingState(): void {
    this.isLoadingStats = true;
    this.statsFetchError = null;
  }

  /** Returns a default stats object when stats fetch fails. */
  private handleStatsFetchError() {
    this.isLoadingStats = false;
    this.statsFetchError = 'STATS_COULD_NOT_BE_LOADED';
    return of({ lastAdminLogin: null, cvAccessUniqueUsersSinceLastAdmin: 0 });
  }

  /** Applies stats value to the greeting block. */
  private applyStats(stats: { cvAccessUniqueUsersSinceLastAdmin: number }): void {
    this.isLoadingStats = false;
    this.cvAccessUniqueUsersSinceLastAdmin = stats.cvAccessUniqueUsersSinceLastAdmin ?? 0;
  }

  /**
   * Formats an ISO-8601 timestamp for the logs table using German locale conventions.
   *
   * @param iso Raw timestamp string from the log line.
   * @returns Human-readable date/time, or the original string if parsing fails.
   */
  protected formatTimestamp(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  /**
   * User gesture: asks for confirmation, then clears server-side CV logs.
   */
  onClearLogsClick(): void {
    if (this.isClearingLogs) return;
    if (!this.confirmClearLogs()) return;
    this.clearLogs();
  }

  /** Shows a confirmation dialog for destructive actions. */
  private confirmClearLogs(): boolean {
    return window.confirm(this.translate.instant('CV_SECTION.ADMIN_CONFIRM_CLEAR_LOGS'));
  }

  /** Calls the backend endpoint to clear logs and refreshes UI afterwards. */
  private clearLogs(): void {
    this.isClearingLogs = true;
    this.clearLogsErrorKey = null;

    this.http
      .post('/api/cv-section/admin/logs/clear/', {}, { withCredentials: true, responseType: 'text' })
      .subscribe({
        next: () => this.onClearLogsSuccess(),
        error: () => this.onClearLogsError()
      });
  }

  /** Applies UI state after successful log deletion. */
  private onClearLogsSuccess(): void {
    this.isClearingLogs = false;
    this.loadLogs();
    this.loadStats();
  }

  /** Applies UI state when the clear logs request fails. */
  private onClearLogsError(): void {
    this.isClearingLogs = false;
    this.clearLogsErrorKey = 'CV_SECTION.CLEAR_LOGS_FAILED';
  }

  /**
   * Logs the admin out and returns to the CV login route.
   */
  onLogoutClick(): void {
    this.sessionService.logoutToLogin();
  }
}

