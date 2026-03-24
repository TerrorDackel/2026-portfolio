import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

/**
 * Application header component.
 *
 * Responsibilities:
 * - Handles language switching (DE/EN) and persists the choice in localStorage.
 * - Handles accent theme switching and persists the choice in localStorage.
 * - Controls the mobile burger menu open/close state.
 * - Provides "scroll to top" behavior and keyboard-accessible interactions.
 *
 * Notes:
 * - This component uses browser APIs (window, document, localStorage, matchMedia).
 *   It is intended to run in a browser context.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    RouterLink
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.sass'
})
export class HeaderComponent {
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  private readonly availableAccents = [
    'blue',
    'emerald',
    'purple',
    'pink',
    'black',
    'white'
  ] as const;

  private readonly prefersDarkMedia = window.matchMedia('(prefers-color-scheme: dark)');

  menuValue = false;
  menuIcon = 'bi bi-list';
  currentLanguage: 'en' | 'de';
  currentAccent = 'purple';
  prefersDark = this.prefersDarkMedia.matches;

  constructor() {
    this.currentLanguage = this.getInitialLanguage();
    this.initLanguage(this.currentLanguage);

    this.setAccent(this.readStoredAccent());
    this.syncAccentForColorScheme(this.prefersDark);
    this.attachDarkModeListener();
  }

  /**
   * Toggles the burger menu state and updates the icon accordingly.
   */
  openMenu(): void {
    this.setMenuState(!this.menuValue);
  }

  /**
   * Closes the burger menu and resets the icon to the default state.
   */
  closeMenu(): void {
    this.setMenuState(false);
  }

  /**
   * Switches the application language to German (DE) and closes the menu.
   */
  switchToGerman(): void {
    this.setLanguage('de');
    this.closeMenu();
  }

  /**
   * Switches the application language to English (EN) and closes the menu.
   */
  switchToEnglish(): void {
    this.setLanguage('en');
    this.closeMenu();
  }

  /**
   * Handles accent selection changes from a select element.
   *
   * @param event Change event emitted by the accent select.
   */
  onAccentChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) return;

    const requestedAccent = target.value;
    if (!this.isAccentAllowed(requestedAccent)) {
      this.setAccent('blue');
      target.value = this.currentAccent;
      return;
    }

    this.setAccent(requestedAccent);
  }

  /**
   * Returns whether an accent is currently selectable for the active color scheme.
   *
   * @param accent Accent option value.
   * @returns True if the accent is allowed for the current light/dark mode.
   */
  isAccentAllowed(accent: string): boolean {
    if (this.prefersDark && accent === 'black') return false;
    if (!this.prefersDark && accent === 'white') return false;
    return true;
  }

  /**
   * Scrolls to the top of the page.
   *
   * If the user is not on the home route, it navigates to '/' first and then
   * scrolls to top after navigation.
   */
  scrollUp(): void {
    if (this.isOnHomeRoute()) {
      this.scrollToTopSmooth();
      return;
    }

    this.navigateHomeThenScroll();
  }

  /**
   * Handles click on the logo element and triggers scroll-to-top behavior.
   *
   * @param event Mouse event from the click interaction.
   */
  onLogoClick(event: MouseEvent): void {
    event.preventDefault();
    this.scrollUp();
  }

  /**
   * Handles keyboard interaction for the logo element and triggers scroll-to-top
   * when the activation key is pressed.
   *
   * @param event Keyboard event from the keydown interaction.
   */
  onLogoKeydown(event: KeyboardEvent | Event): void {
    if (!this.isActivationKey(event)) return;

    event.preventDefault();
    this.scrollUp();
  }

  /**
   * Handles keyboard interaction for the burger menu button and toggles the menu
   * when the activation key is pressed.
   *
   * @param event Keyboard event from the keydown interaction.
   */
  onBurgerKeydown(event: KeyboardEvent | Event): void {
    if (!this.isActivationKey(event)) return;

    event.preventDefault();
    this.openMenu();
  }

  /**
   * Handles keyboard interaction for language selection and switches language
   * when the activation key is pressed.
   *
   * @param event Keyboard event from the keydown interaction.
   * @param lang Target language to activate.
   */
  onLanguageKeydown(event: KeyboardEvent | Event, lang: 'en' | 'de'): void {
    if (!this.isActivationKey(event)) return;

    event.preventDefault();
    this.setLanguage(lang);
    this.closeMenu();
  }

  /**
   * Sets the active language in ngx-translate and persists the selection.
   *
   * @param lang Language code to activate.
   */
  private setLanguage(lang: 'en' | 'de'): void {
    this.currentLanguage = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  /**
   * Applies and persists an accent theme.
   *
   * - Normalizes unknown values to a safe default ('blue').
   * - Writes `data-accent` on the document root.
   * - Persists to localStorage.
   *
   * @param accent Accent name.
   */
  private setAccent(accent: string): void {
    const normalizedAccent = this.normalizeAccent(accent);
    this.currentAccent = normalizedAccent;
    document.documentElement.dataset['accent'] = normalizedAccent;
    localStorage.setItem('accent', normalizedAccent);
  }

  /**
   * Reads a previously stored accent value.
   *
   * @returns Stored accent or the default ('blue') if not set.
   */
  private readStoredAccent(): string {
    const storedAccent = localStorage.getItem('accent');
    return storedAccent ?? 'blue';
  }

  private syncAccentForColorScheme(prefersDark: boolean): void {
    this.prefersDark = prefersDark;

    if (!this.isAccentAllowed(this.currentAccent)) {
      this.setAccent('blue');
    }
  }

  /**
   * Attaches a listener to respond to system color scheme changes.
   *
   * Uses addEventListener when available; falls back to addListener for older browsers.
   */
  private attachDarkModeListener(): void {
    if (typeof this.prefersDarkMedia.addEventListener === 'function') {
      this.prefersDarkMedia.addEventListener('change', event => {
        this.syncAccentForColorScheme(event.matches);
      });
      return;
    }

    if (typeof this.prefersDarkMedia.addListener === 'function') {
      this.prefersDarkMedia.addListener(event => {
        this.syncAccentForColorScheme(event.matches);
      });
    }
  }

  /**
   * Computes the initial language from TranslateService.
   *
   * @returns The normalized initial language ('de' | 'en').
   */
  private getInitialLanguage(): 'en' | 'de' {
    const lang = this.translate.currentLang as 'en' | 'de' | undefined;
    return lang === 'de' ? 'de' : 'en';
  }

  /**
   * Initializes ngx-translate with supported languages and activates the selected one.
   *
   * @param lang Initial language to activate.
   */
  private initLanguage(lang: 'en' | 'de'): void {
    this.translate.addLangs(['de', 'en']);
    this.translate.setDefaultLang('en');
    this.translate.use(lang);
  }

  /**
   * Updates the menu state and sets the correct icon for the current state.
   *
   * @param isOpen Whether the menu should be open.
   */
  private setMenuState(isOpen: boolean): void {
    this.menuValue = isOpen;
    this.menuIcon = isOpen ? 'bi bi-x' : 'bi bi-list';
  }

  /**
   * Normalizes arbitrary accent input against the allowed accent list.
   *
   * @param accent Accent string input.
   * @returns A valid accent value; defaults to 'blue' if invalid.
   */
  private normalizeAccent(accent: string): string {
    const allowed = this.availableAccents.includes(
      accent as typeof this.availableAccents[number]
    );

    return allowed ? accent : 'blue';
  }

  /**
   * Determines whether the current route is the home route.
   *
   * @returns True if the router URL resolves to home; otherwise false.
   */
  private isOnHomeRoute(): boolean {
    return this.router.url === '/' || this.router.url === '';
  }

  /**
   * Navigates to the home route and then scrolls to top on the next frame.
   */
  private navigateHomeThenScroll(): void {
    this.router.navigateByUrl('/').then(() => {
      requestAnimationFrame(() => {
        this.scrollToTopSmooth();
      });
    });
  }

  /**
   * Smoothly scrolls the window to the top.
   */
  private scrollToTopSmooth(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Checks whether the given event is an activation key (Enter or Space).
   *
   * @param event KeyboardEvent or a generic Event.
   * @returns True when the event is a KeyboardEvent with Enter/Space pressed.
   */
  private isActivationKey(event: KeyboardEvent | Event): boolean {
    const keyEvent = event as KeyboardEvent;
    return keyEvent.key === 'Enter' || keyEvent.key === ' ';
  }
}
