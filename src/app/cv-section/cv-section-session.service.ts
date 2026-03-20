import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Subscription, timer } from 'rxjs';

const INACTIVITY_TOTAL_MS = 5 * 60 * 1000; // 5 Minuten
const INACTIVITY_WARNING_MS = INACTIVITY_TOTAL_MS - 30 * 1000; // 30 Sekunden vor Ablauf

@Injectable({
  providedIn: 'root'
})
export class CvSectionSessionService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private warningTimeoutSub: Subscription | null = null;
  private logoutTimeoutSub: Subscription | null = null;
  private listenersAttached = false;

  private readonly warningSubject = new BehaviorSubject<boolean>(false);
  private readonly activeSubject = new BehaviorSubject<boolean>(false);

  warning$ = this.warningSubject.asObservable();
  active$ = this.activeSubject.asObservable();

  start(): void {
    this.activeSubject.next(true);
    this.attachActivityListeners();
    this.resetTimers();
  }

  stop(): void {
    this.activeSubject.next(false);
    this.clearTimers();
    this.detachActivityListeners();
    this.warningSubject.next(false);
  }

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

  private onActivity = (): void => {
    if (!this.activeSubject.getValue()) {
      return;
    }

    if (this.warningSubject.getValue()) {
      this.warningSubject.next(false);
    }

    this.resetTimers();
  };

  private resetTimers(): void {
    this.clearTimers();

    this.warningTimeoutSub = timer(INACTIVITY_WARNING_MS).subscribe(() => {
      this.warningSubject.next(true);
    });

    this.logoutTimeoutSub = timer(INACTIVITY_TOTAL_MS).subscribe(() => {
      this.handleAutoLogout();
    });
  }

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

