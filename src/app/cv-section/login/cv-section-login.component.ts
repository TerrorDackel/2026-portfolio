import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CvSectionSessionService } from '../cv-section-session.service';

interface CvSectionMeResponse {
  name: string;
  company: string;
  role: 'ROLE_ADMIN' | 'ROLE_CV_ACCESS';
}

@Component({
  selector: 'app-cv-section-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './cv-section-login.component.html',
  styleUrls: ['./cv-section-login.component.sass']
})
export class CvSectionLoginComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionService = inject(CvSectionSessionService);

  private warningSub?: Subscription;
  private nameSub?: Subscription;

  private readonly validateCompanyLetters = (control: AbstractControl): { invalidCompany: true } | null => {
    const raw = String(control.value ?? '');
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Only letters (plus spaces) and at least 3 letters overall.
    const cleanedLetters = trimmed.replace(/\s+/g, '');
    const lettersOnly = /^[A-Za-zÄÖÜäöüß]+$/.test(cleanedLetters);
    if (!lettersOnly) return { invalidCompany: true };
    if (cleanedLetters.length < 3) return { invalidCompany: true };

    return null;
  };

  loginForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    // Requirement ist dynamisch:
    // - bei Admin (Name == "Admin") ist Firma optional
    // - bei allen anderen (CV-Zugang) ist Firma Pflicht
    company: ['', [this.validateCompanyLetters]],
    password: ['', [Validators.required]]
  });

  isSubmitting = false;
  inlineErrorKey: string | null = null;
  showInlineError = false;
  showPassword = false;
  showInactivityWarning = false;

  /**
   * Sets up UI subscriptions and initializes conditional validators.
   */
  ngOnInit(): void {
    this.setupInactivityWarning();
    this.setupDynamicCompanyValidator();
    this.handleTimeoutQueryParam();
  }

  /** Cleans up subscriptions. */
  ngOnDestroy(): void {
    this.warningSub?.unsubscribe();
    this.nameSub?.unsubscribe();
  }

  /**
   * Makes the company field required only for CV-access users.
   * Admin attempts are detected by the special name "Admin".
   */
  private syncCompanyRequirement(nameValue: string | null | undefined): void {
    const trimmed = String(nameValue ?? '').trim();
    const isAdminAttempt = trimmed === 'Admin';

    const companyControl = this.loginForm.controls['company'];
    const validators = isAdminAttempt ? [this.validateCompanyLetters] : [Validators.required, this.validateCompanyLetters];
    companyControl.setValidators(validators);
    companyControl.updateValueAndValidity({ emitEvent: false });
  }

  /** Toggles the password visibility input. */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /** Handles the submit action from the login form. */
  onSubmit(): void {
    if (!this.canSubmit()) return;
    this.startSubmitState();

    const payload = this.buildLoginPayload();
    this.requestLogin(payload).subscribe({
      next: (response) => this.handleLoginSuccess(response),
      error: (error) => this.handleLoginError(error)
    });
  }

  /** Returns true if we are allowed to submit the form. */
  private canSubmit(): boolean {
    return !this.isSubmitting && this.loginForm.valid;
  }

  /** Applies a submitting UI state. */
  private startSubmitState(): void {
    this.isSubmitting = true;
    this.inlineErrorKey = null;
    this.showInlineError = false;
  }

  /** Builds the backend payload from the reactive form. */
  private buildLoginPayload(): { name: string; company: string; password: string } {
    const { name, company, password } = this.loginForm.value as { name: string; company: string; password: string };
    return { name, company, password };
  }

  /** Requests the login endpoint and returns an observable. */
  private requestLogin(payload: { name: string; company: string; password: string }) {
    return this.http.post<CvSectionMeResponse>('/api/cv-section/login', payload, { withCredentials: true });
  }

  /** Handles the successful login response. */
  private handleLoginSuccess(response: CvSectionMeResponse): void {
    void this.translate.get('CV_SECTION.LOGIN_SUCCESS', { name: response.name }).toPromise();
    this.finishSubmitState();
    this.sessionService.start();
    const route = response.role === 'ROLE_ADMIN' ? '/cv-section/admin' : '/cv-section/home';
    void this.router.navigate([route]);
  }

  /** Applies the error UI state after a failed login. */
  private handleLoginError(error: unknown): void {
    this.finishSubmitState();
    this.inlineErrorKey = this.mapLoginErrorToKey(error);
    this.showInlineError = true;
    setTimeout(() => (this.showInlineError = false), 3000);
  }

  /** Sets submitting flags back to idle. */
  private finishSubmitState(): void {
    this.isSubmitting = false;
  }

  /** Maps backend error codes to the translation keys. */
  private mapLoginErrorToKey(error: unknown): string {
    const typedError = error as { error?: { error?: string } } | null;
    const code = typedError?.error?.error;
    if (code === 'INVALID_PASSWORD') return 'CV_SECTION.ERROR_INVALID_PASSWORD';
    if (code === 'INVALID_NAME') return 'CV_SECTION.ERROR_INVALID_NAME';
    if (code === 'INVALID_COMPANY') return 'CV_SECTION.ERROR_INVALID_COMPANY';
    return 'CV_SECTION.ERROR_GENERIC';
  }

  /** Subscribes to inactivity warnings shown by the session service. */
  private setupInactivityWarning(): void {
    this.warningSub = this.sessionService.warning$.subscribe((show) => {
      this.showInactivityWarning = show;
    });
  }

  /** Enables or disables the company field requirement based on user name. */
  private setupDynamicCompanyValidator(): void {
    const nameControl = this.loginForm.controls['name'];
    this.syncCompanyRequirement(nameControl.value);
    this.nameSub = nameControl.valueChanges.subscribe((value) => this.syncCompanyRequirement(value));
  }

  /** Shows an inline error if the login page was opened after session timeout. */
  private handleTimeoutQueryParam(): void {
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason !== 'timeout') return;

    this.inlineErrorKey = 'CV_SECTION.SESSION_EXPIRED';
    this.showInlineError = true;
    void this.router.navigate([], { queryParams: { reason: null }, queryParamsHandling: 'merge' });
    setTimeout(() => (this.showInlineError = false), 3000);
  }
}

