import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, timer } from 'rxjs';

/**
 * Wall-clock duration of inactivity (ms) after which the CV-section session is ended automatically.
 *
 * When this fires, the service calls the logout API and navigates to the login route with `reason=timeout`.
 */
const INACTIVITY_TOTAL_MS = 5 * 60 * 1000;

/**
 * Delay (ms) before emitting {@link CvSectionSessionService.warning$} — 30 seconds before {@link INACTIVITY_TOTAL_MS}.
 *
 * Gives the user a short window to move the mouse or press a key and reset the idle countdown.
 */
const INACTIVITY_WARNING_MS = INACTIVITY_TOTAL_MS - 30 * 1000;

/**
 * CV-section session lifecycle and idle detection.
 *
 * Responsibilities:
 * - Mark the session as **active** after login and attach global activity listeners.
 * - Reset two RxJS timers on every qualifying user event: a **warning** timer and a **logout** timer.
 * - Expose {@link warning$} so the login (or other) UI can show an “about to log out” banner.
 * - On logout timeout: POST `/api/cv-section/logout/`, then {@link CvSectionSessionService.stop} and redirect to login.
 *
 * Lifecycle (callers — typically {@link CvSectionLoginComponent} and logout handlers):
 * - {@link CvSectionSessionService.start} — right after successful authentication.
 * - {@link CvSectionSessionService.stop} — on explicit logout or when tearing down the CV-section experience.
 *
 * Activity detection:
 * - Listens on `document` for `click`, `keydown`, `mousemove`, `scroll`, and `touchstart`.
 * - Uses the **capture** phase so events are still seen if inner components call `stopPropagation()` on bubble.
 *
 * Notes:
 * - {@link CvSectionSessionService.stop} clears timers, removes listeners, and resets `warning$` to `false`.
 * - Logout navigation runs even if the HTTP logout request fails, so the user is never stuck on a protected view.
 * - On non-browser platforms (SSR), {@link start} only flips {@link active$}; timers and `document` listeners are skipped.
 */
@Injectable({
  providedIn: 'root'
})
export class CvSectionSessionService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  /** Subscription for the warning timer, or `null` when cleared. */
  private warningTimeoutSub: Subscription | null = null;

  /** Subscription for the hard logout timer, or `null` when cleared. */
  private logoutTimeoutSub: Subscription | null = null;

  /** Prevents double registration of `document` listeners. */
  private listenersAttached = false;

  /**
   * Internal source for {@link warning$}.
   * `true` = UI should show the inactivity warning; `false` = no warning or user just interacted.
   */
  private readonly warningSubject = new BehaviorSubject<boolean>(false);

  /**
   * Internal source for {@link active$}.
   * `true` while {@link start} has run and {@link stop} has not yet torn everything down.
   */
  private readonly activeSubject = new BehaviorSubject<boolean>(false);

  /**
   * Emits whether the short **idle warning** should be visible.
   *
   * @remarks
   * Fires `true` once {@link INACTIVITY_WARNING_MS} has passed without activity (while session is active).
   * Returns to `false` on the next activity or when {@link stop} is called.
   */
  readonly warning$: Observable<boolean> = this.warningSubject.asObservable();

  /**
   * Emits whether idle tracking is currently **armed** (timers + listeners active).
   *
   * @remarks
   * Primarily useful for tests and debugging; most templates rely on {@link warning$} instead.
   */
  readonly active$: Observable<boolean> = this.activeSubject.asObservable();

  /**
   * Arms idle detection: marks the session active, attaches listeners, and starts warning/logout timers.
   *
   * @remarks
   * Idempotent regarding listeners: if already attached, only timers are reset via {@link resetTimers}.
   */
  start(): void {
    this.activeSubject.next(true);
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.attachActivityListeners();
    this.resetTimers();
  }

  /**
   * Disarms idle detection: clears timers, removes listeners, and hides the warning state.
   *
   * @remarks
   * Safe to call multiple times (e.g. logout error path followed by navigation).
   */
  stop(): void {
    this.activeSubject.next(false);
    if (isPlatformBrowser(this.platformId)) {
      this.clearTimers();
      this.detachActivityListeners();
    }
    this.warningSubject.next(false);
  }

  /**
   * Registers document-level activity listeners exactly once.
   */
  private attachActivityListeners(): void {
    if (this.listenersAttached) {
      return;
    }

    this.listenersAttached = true;

    const events: (keyof DocumentEventMap)[] = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    for (const event of events) {
      document.addEventListener(event, this.onActivity, true);
    }
  }

  /**
   * Removes document listeners if they were previously attached.
   */
  private detachActivityListeners(): void {
    if (!this.listenersAttached) {
      return;
    }

    this.listenersAttached = false;

    const events: (keyof DocumentEventMap)[] = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    for (const event of events) {
      document.removeEventListener(event, this.onActivity, true);
    }
  }

  /**
   * Bound handler: ignores events when inactive; otherwise clears warning and restarts timers.
   */
  private onActivity = (): void => {
    if (!this.activeSubject.getValue()) {
      return;
    }

    if (this.warningSubject.getValue()) {
      this.warningSubject.next(false);
    }

    this.resetTimers();
  };

  /**
   * Cancels existing timer subscriptions and schedules fresh warning + logout deadlines.
   */
  private resetTimers(): void {
    this.clearTimers();

    this.warningTimeoutSub = timer(INACTIVITY_WARNING_MS).subscribe(() => {
      this.warningSubject.next(true);
    });

    this.logoutTimeoutSub = timer(INACTIVITY_TOTAL_MS).subscribe(() => {
      this.handleAutoLogout();
    });
  }

  /**
   * Unsubscribes both timer subscriptions and nulls their handles.
   */
  private clearTimers(): void {
    if (this.warningTimeoutSub) {
      this.warningTimeoutSub.unsubscribe();
      this.warningTimeoutSub = null;
    }

    if (this.logoutTimeoutSub) {
      this.logoutTimeoutSub.unsubscribe();
      this.logoutTimeoutSub = null;
    }
  }

  /**
   * Ends the session after total idle time: server logout, local {@link stop}, navigate with `reason=timeout`.
   *
   * @remarks
   * Both HTTP success and error paths perform the same client-side cleanup so the user always leaves protected routes.
   */
  private handleAutoLogout(): void {
    this.http
      .post('/api/cv-section/logout/', {}, { withCredentials: true })
      .subscribe({
        next: () => {
          this.stop();
          void this.router.navigate(['/cv-section/login'], {
            queryParams: { reason: 'timeout' }
          });
        },
        error: () => {
          this.stop();
          void this.router.navigate(['/cv-section/login'], {
            queryParams: { reason: 'timeout' }
          });
        }
      });
  }
}
