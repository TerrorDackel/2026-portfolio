import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface CvSectionMeResponse {
  name: string;
  role: 'ROLE_ADMIN' | 'ROLE_CV_ACCESS';
}

@Component({
  selector: 'app-cv-section-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './cv-section-login.component.html',
  styleUrls: ['./cv-section-login.component.sass']
})
export class CvSectionLoginComponent {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  loginForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  isSubmitting = false;
  inlineErrorKey: string | null = null;
  showInlineError = false;

  onSubmit(): void {
    if (this.loginForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.inlineErrorKey = null;
    this.showInlineError = false;

    const { name, password } = this.loginForm.value as { name: string; password: string };

    this.http
      .post<CvSectionMeResponse>(
        '/api/cv-section/login',
        { name, password },
        {
          withCredentials: true
        }
      )
      .subscribe({
        next: (response) => {
          // Für Sprint 2 reicht es, nach erfolgreichem Login die Begrüßung anzuzeigen.
          // Routing zu geschützten Unterseiten folgt in einem späteren Schritt.
          void this.translate
            .get('CV_SECTION.LOGIN_SUCCESS', {
              name: response.name
            })
            .toPromise();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.isSubmitting = false;

          if (error?.error?.error === 'INVALID_PASSWORD') {
            this.inlineErrorKey = 'CV_SECTION.ERROR_INVALID_PASSWORD';
          } else if (error?.error?.error === 'INVALID_NAME') {
            this.inlineErrorKey = 'CV_SECTION.ERROR_INVALID_NAME';
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

