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

  ngOnInit(): void {
    this.warningSub = this.sessionService.warning$.subscribe((show) => {
      this.showInactivityWarning = show;
    });

    this.syncCompanyRequirement(this.loginForm.controls.name.value);
    this.nameSub = this.loginForm.controls.name.valueChanges.subscribe((value) => {
      this.syncCompanyRequirement(value);
    });

    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'timeout') {
      this.inlineErrorKey = 'CV_SECTION.SESSION_EXPIRED';
      this.showInlineError = true;
      void this.router.navigate([], {
        queryParams: { reason: null },
        queryParamsHandling: 'merge'
      });

      setTimeout(() => {
        this.showInlineError = false;
      }, 3000);
    }
  }

  ngOnDestroy(): void {
    this.warningSub?.unsubscribe();
    this.nameSub?.unsubscribe();
  }

  private syncCompanyRequirement(nameValue: string | null | undefined): void {
    const trimmed = String(nameValue ?? '').trim();
    const isAdminAttempt = trimmed === 'Admin';

    const companyControl = this.loginForm.controls.company;
    companyControl.setValidators(isAdminAttempt ? [this.validateCompanyLetters] : [Validators.required, this.validateCompanyLetters]);
    companyControl.updateValueAndValidity({ emitEvent: false });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.inlineErrorKey = null;
    this.showInlineError = false;

    const { name, company, password } = this.loginForm.value as { name: string; company: string; password: string };

    this.http
      .post<CvSectionMeResponse>(
        '/api/cv-section/login',
        { name, company, password },
        {
          withCredentials: true
        }
      )
      .subscribe({
        next: (response) => {
          void this.translate
            .get('CV_SECTION.LOGIN_SUCCESS', {
              name: response.name
            })
            .toPromise();
          this.isSubmitting = false;
          this.sessionService.start();
          if (response.role === 'ROLE_ADMIN') {
            void this.router.navigate(['/cv-section/admin']);
          } else {
            void this.router.navigate(['/cv-section/home']);
          }
        },
        error: (error) => {
          this.isSubmitting = false;

          if (error?.error?.error === 'INVALID_PASSWORD') {
            this.inlineErrorKey = 'CV_SECTION.ERROR_INVALID_PASSWORD';
          } else if (error?.error?.error === 'INVALID_NAME') {
            this.inlineErrorKey = 'CV_SECTION.ERROR_INVALID_NAME';
          } else if (error?.error?.error === 'INVALID_COMPANY') {
            this.inlineErrorKey = 'CV_SECTION.ERROR_INVALID_COMPANY';
          } else {
            this.inlineErrorKey = 'CV_SECTION.ERROR_GENERIC';
          }

          this.showInlineError = true;

          setTimeout(() => {
            this.showInlineError = false;
          }, 3000);
        }
      });
  }
}

