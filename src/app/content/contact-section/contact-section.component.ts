import { Component, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { scrollUp } from '../../utils/scroll-to';
import { setReturnAnchor } from '../../utils/scroll-memory';
import { observeAnimationReveal } from '../../utils/scroll-animations';

/**
 * Contact section component.
 *
 * Responsibilities:
 * - Renders and validates the contact form (name, email, message, privacy consent).
 * - Provides inline required-field messaging depending on focus/blur state.
 * - Submits the form data to Formspree when the form is valid.
 * - Provides navigation to the privacy policy and a "back to top" action.
 * - Initializes reveal animations for section headings when entering the viewport.
 *
 * Notes:
 * - Uses browser-only APIs (document/window, local focus handling). SSR safety is
 *   ensured where needed via `isPlatformBrowser()` checks and by passing `platformId`
 *   to `observeAnimationReveal()`.
 */
@Component({
  selector: 'app-contact-section',
  standalone: true,
  imports: [
    TranslatePipe,
    ReactiveFormsModule,
    HttpClientModule,
    CommonModule
  ],
  templateUrl: './contact-section.component.html',
  styleUrl: './contact-section.component.sass'
})
export class ContactSectionComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  /**
   * Reactive form group for the contact form.
   *
   * Validation rules:
   * - name: required
   * - email: required + valid email format
   * - message: required
   * - privacy: requiredTrue (must be checked)
   *
   * Update strategy:
   * - Group updates on blur to reduce validation churn while typing
   * - Privacy checkbox updates on change for immediate validity updates
   */
  contactForm = this.fb.group(
    {
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      message: ['', Validators.required],
      privacy: this.fb.control(false, {
        validators: Validators.requiredTrue,
        updateOn: 'change'
      })
    },
    { updateOn: 'blur' }
  );

  /**
   * Tracks whether a submit attempt was made.
   * Currently used as a general state flag; can be used for UI decisions.
   */
  submitted = false;

  /**
   * When true, the UI should show a successful submit message.
   */
  formSuccess = false;

  /**
   * When true, the UI should show an error submit message.
   */
  formError = false;

  /**
   * Tracks the currently focused text field to control inline required messaging.
   */
  focusedField: 'name' | 'email' | 'message' | null = null;

  /**
   * Initializes intersection-observer based reveal animations after the view
   * has been created.
   */
  ngAfterViewInit(): void {
    observeAnimationReveal('reveal-zoom', 1000, this.platformId);
  }

  /**
   * Returns whether a given text control is empty (null/undefined/whitespace-only).
   *
   * @param ctrl Name of the control to evaluate.
   * @returns True when the value is missing or only whitespace.
   */
  private isEmpty(ctrl: 'name' | 'email' | 'message'): boolean {
    const v = this.contactForm.get(ctrl)?.value as string | null | undefined;
    return !v || v.trim() === '';
  }

  /**
   * Determines whether the inline "required" placeholder/error should be shown
   * for a given field.
   *
   * Conditions:
   * - The control exists
   * - It was touched
   * - It is invalid
   * - It is empty (required case)
   * - It is NOT currently focused (do not show while user is editing)
   *
   * @param ctrl Control name to evaluate.
   * @returns True when the inline required UI should be active.
   */
  showInlineRequired(ctrl: 'name' | 'email' | 'message'): boolean {
    const c = this.contactForm.get(ctrl);
    return !!(
      c &&
      c.touched &&
      c.invalid &&
      this.isEmpty(ctrl) &&
      this.focusedField !== ctrl
    );
  }

  /**
   * Sets the currently focused field for inline messaging logic.
   *
   * @param field Field that received focus.
   */
  onFocus(field: 'name' | 'email' | 'message'): void {
    this.focusedField = field;
  }

  /**
   * Clears the focused field if the given field is the one currently stored.
   *
   * @param field Field that lost focus.
   */
  onBlur(field: 'name' | 'email' | 'message'): void {
    if (this.focusedField === field) {
      this.focusedField = null;
    }
  }

  /**
   * Handles click on the privacy checkbox.
   *
   * Purpose:
   * - Removes focus from the active input/textarea to make blur-based validation
   *   more consistent.
   * - Forces form validity re-evaluation after toggling privacy.
   *
   * SSR:
   * - Early returns when not running in the browser.
   */
  onPrivacyClick(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const active = document.activeElement as HTMLElement | null;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      active.blur();
    }

    this.contactForm.updateValueAndValidity();
  }

  /**
   * Intercepts the privacy link click and navigates via the Angular router
   * instead of performing a full page navigation.
   *
   * @param event Mouse click event.
   */
  onPrivacyLinkClick(event: MouseEvent): void {
    event.preventDefault();
    this.navigateTo('/privacy-policy');
  }

  /**
   * Provides keyboard activation for the privacy link on Space.
   *
   * Note:
   * - Enter activation is handled by default for anchor elements; Space is added
   *   here to mimic button-like behavior.
   *
   * @param event Keyboard event from keydown.
   */
  onPrivacyLinkKeydown(event: KeyboardEvent): void {
    if (event.key !== ' ') return;

    event.preventDefault();
    this.navigateTo('/privacy-policy');
  }

  /**
   * Provides keyboard activation for the "back to top" action.
   *
   * @param event Keyboard event from keydown.
   */
  onBackToTopKeydown(event: KeyboardEvent): void {
    if (!this.isActivationKey(event)) return;

    event.preventDefault();
    this.scrollUp();
  }

  /**
   * Submits the form data to the configured Formspree endpoint when valid.
   *
   * Behavior:
   * - Marks submit attempt and resets success/error flags.
   * - If invalid: marks all controls as touched and aborts.
   * - If valid: sends a POST request with name/email/message.
   * - On success: shows success message, resets form, hides message after 5s.
   * - On error: shows error message.
   */
  onSubmit(): void {
    this.submitted = true;
    this.formSuccess = false;
    this.formError = false;

    if (!this.contactForm.valid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.submitValidForm();
  }

  /**
   * Scrolls to the top of the page (or to an anchor depending on `scrollUp` utility behavior).
   */
  scrollUp(): void {
    scrollUp('scrollUp', 100);
  }

  /**
   * Stores the return anchor and navigates to the given route.
   *
   * @param path Router path to navigate to.
   */
  navigateTo(path: string): void {
    setReturnAnchor('contact');
    this.router.navigate([path]);
  }

  /**
   * Submits the already validated form to Formspree.
   *
   * This method assumes `contactForm.valid === true` and exists to keep
   * `onSubmit()` short and single-purpose.
   */
  private submitValidForm(): void {
    const formData = this.contactForm.value;
    const body = {
      name: formData.name,
      email: formData.email,
      message: formData.message
    };

    const formspreeEndpoint = 'https://formspree.io/f/xyzedkbw';
    this.http.post(formspreeEndpoint, body).subscribe({
      next: () => {
        this.handleSubmitSuccess();
      },
      error: () => {
        this.formError = true;
      }
    });
  }

  /**
   * Handles the successful form submission state.
   *
   * - Shows the success UI.
   * - Resets the form.
   * - Clears the submitted state.
   * - Hides the success message after 5 seconds.
   */
  private handleSubmitSuccess(): void {
    this.formSuccess = true;
    this.contactForm.reset();
    this.submitted = false;

    setTimeout(() => {
      this.formSuccess = false;
    }, 5000);
  }

  /**
   * Checks whether a KeyboardEvent is an activation key (Enter or Space).
   *
   * @param event Keyboard event to check.
   * @returns True when Enter or Space was pressed.
   */
  private isActivationKey(event: KeyboardEvent): boolean {
    return event.key === 'Enter' || event.key === ' ';
  }
}
