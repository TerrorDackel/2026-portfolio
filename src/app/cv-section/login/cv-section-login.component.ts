import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { CvSectionSessionService } from '../cv-section-session.service';

/** Successful login response from `/api/cv-section/login/`. */
interface CvSectionMeResponse {
  name: string;
  company: string;
  role: 'ROLE_ADMIN' | 'ROLE_CV_ACCESS';
}

/**
 * CV-section login screen: dual flow for site admin vs. CV-only visitors.
 *
 * Responsibilities:
 * - Build and validate a reactive form (`name`, `company`, `password`).
 * - Apply **dynamic** rules: company is optional when name is exactly `Admin`, otherwise required.
 * - POST credentials to `/api/cv-section/login/` (trailing slash avoids redirect/body issues).
 * - On success: {@link CvSectionSessionService.start}, route to `/cv-section/admin` or `/cv-section/home` by role.
 * - Map backend error codes to translation keys; surface `INVALID_PASSWORD` on the password control.
 * - Subscribe to {@link CvSectionSessionService.warning$} for the idle banner while staying on this page.
 * - Read `?reason=timeout` to show a friendly “session expired” toast once.
 *
 * Validation highlights:
 * - Non-admin names must be **two tokens** (e.g. first + last), each ≥3 letters, Latin letters only (incl. German umlauts).
 * - Company (when validated) must be letters/spaces with ≥3 letters total.
 *
 * Notes:
 * - Uses `withCredentials: true` on all CV-section HTTP calls for cookie sessions.
 * - Inline error toasts auto-hide after a few seconds; password errors persist until the user edits the field.
 */
@Component({
  selector: 'app-cv-section-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './cv-section-login.component.html',
  styleUrl: './cv-section-login.component.sass'
})
export class CvSectionLoginComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionService = inject(CvSectionSessionService);

  /** Subscription to {@link CvSectionSessionService.warning$}. */
  private warningSub?: Subscription;

  /** Keeps company `Validators.required` in sync with the name field. */
  private nameSub?: Subscription;

  /** Clears server-side password error when the user types again. */
  private passwordSub?: Subscription;

  /**
   * Custom validator for the name field (non-admin users).
   *
   * @returns `null` if empty (let `Validators.required` handle it), valid, or `Admin`; otherwise structured errors.
   */
  private readonly validateName = (
    control: AbstractControl
  ): { invalidName: true; nameTooShort?: true; nameIncomplete?: true } | null => {
    const trimmed = String(control.value ?? '').trim();
    if (!trimmed) return null;
    if (trimmed === 'Admin') return null;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return { invalidName: true, nameIncomplete: true };
    if (parts.some((part) => !/^[A-Za-zÄÖÜäöüß]+$/.test(part))) return { invalidName: true };
    if (parts.some((part) => part.length < 3)) return { invalidName: true, nameTooShort: true };
    return null;
  };

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

  /**
   * Root form group for the login template.
   *
   * Company validators are patched at runtime via {@link syncCompanyRequirement}.
   */
  loginForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, this.validateName]],
    // Company requirement is dynamic:
    // - optional when the name is "Admin"
    // - required for all other CV-access users
    company: ['', [this.validateCompanyLetters]],
    password: ['', [Validators.required]]
  });

  /** True while the login POST is in flight (disables submit UI). */
  isSubmitting = false;

  /** After first submit attempt, invalid fields may show messages even if still pristine. */
  submitAttempted = false;

  /** ngx-translate key for the floating error toast, or `null` when hidden. */
  inlineErrorKey: string | null = null;

  /** Controls visibility of the generic inline error toast. */
  showInlineError = false;

  /** Toggles password field between `password` and `text`. */
  showPassword = false;

  /** Mirrors {@link CvSectionSessionService.warning$} for the yellow idle banner. */
  showInactivityWarning = false;

  /**
   * Sets up UI subscriptions and initializes conditional validators.
   */
  ngOnInit(): void {
    this.setupInactivityWarning();
    this.setupDynamicCompanyValidator();
    this.setupPasswordErrorReset();
    this.handleTimeoutQueryParam();
  }

  /** Cleans up subscriptions. */
  ngOnDestroy(): void {
    this.warningSub?.unsubscribe();
    this.nameSub?.unsubscribe();
    this.passwordSub?.unsubscribe();
  }

  /**
   * Adds or removes `Validators.required` on `company` based on whether the user is attempting admin login.
   *
   * @param nameValue Current or latest `name` control value.
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
    this.submitAttempted = true;
    if (!this.canSubmit()) {
      this.markFormTouched();
      return;
    }
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

  /** Marks all login controls as touched to reveal validation hints. */
  private markFormTouched(): void {
    this.loginForm.markAllAsTouched();
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
    // Use trailing slash to avoid server redirects (POST -> GET), which would break JSON body parsing.
    return this.http.post<CvSectionMeResponse>('/api/cv-section/login/', payload, { withCredentials: true });
  }

  /** Handles the successful login response. */
  private handleLoginSuccess(response: CvSectionMeResponse): void {
    void firstValueFrom(this.translate.get('CV_SECTION.LOGIN_SUCCESS', { name: response.name })).catch(() => undefined);
    this.finishSubmitState();
    this.sessionService.start();
    const route = response.role === 'ROLE_ADMIN' ? '/cv-section/admin' : '/cv-section/home';
    void this.router.navigate([route]);
  }

  /** Applies the error UI state after a failed login. */
  private handleLoginError(error: unknown): void {
    this.finishSubmitState();
    if (this.applyPasswordErrorIfNeeded(error)) return;
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
    if (code === 'MISSING_CREDENTIALS') return 'CV_SECTION.ERROR_PASSWORD_REQUIRED';
    if (code === 'INVALID_PASSWORD') return 'CV_SECTION.ERROR_INVALID_PASSWORD';
    if (code === 'INVALID_NAME') return 'CV_SECTION.ERROR_INVALID_NAME';
    if (code === 'INVALID_COMPANY') return 'CV_SECTION.ERROR_INVALID_COMPANY';
    return 'CV_SECTION.ERROR_GENERIC';
  }

  /** Extracts the backend error code from an unknown HTTP error object. */
  private getLoginErrorCode(error: unknown): string | null {
    const typedError = error as { error?: { error?: string } } | null;
    return typedError?.error?.error ?? null;
  }

  /** Shows invalid password as field error instead of toast. */
  private applyPasswordErrorIfNeeded(error: unknown): boolean {
    const code = this.getLoginErrorCode(error);
    if (code !== 'INVALID_PASSWORD') return false;

    const passwordControl = this.loginForm.controls['password'];
    const currentErrors = passwordControl.errors ?? {};
    passwordControl.setErrors({ ...currentErrors, invalidPassword: true });
    passwordControl.markAsTouched();
    return true;
  }

  /**
   * Whether the template should show Angular validation messages under a field.
   *
   * @param controlName Reactive control key.
   * @returns `true` when invalid and (touched or {@link submitAttempted}).
   */
  shouldShowFieldError(controlName: 'name' | 'company' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return Boolean(control?.invalid && (control.touched || this.submitAttempted));
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

  /** Removes backend password error as soon as the user edits the password. */
  private setupPasswordErrorReset(): void {
    const passwordControl = this.loginForm.controls['password'];
    this.passwordSub = passwordControl.valueChanges.subscribe(() => this.clearInvalidPasswordError(passwordControl));
  }

  /** Clears only the invalidPassword error while keeping other errors intact. */
  private clearInvalidPasswordError(control: AbstractControl): void {
    const errors = control.errors;
    if (!errors?.['invalidPassword']) return;
    const { invalidPassword, ...rest } = errors;
    void invalidPassword;
    control.setErrors(Object.keys(rest).length ? rest : null);
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

