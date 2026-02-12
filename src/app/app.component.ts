import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    FooterComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass'
})
export class AppComponent {
  private translate = inject(TranslateService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    this.initLanguage();
    this.initRouteScrollBehavior();
  }

  /**
   * Initializes the application's active language.
   *
   * Behavior:
   * - Registers supported languages.
   * - Uses 'en' as the default language.
   * - Restores the previously selected language from localStorage when running
   *   in the browser; falls back to 'en' for SSR/non-browser contexts.
   */
  private initLanguage(): void {
    const savedLang = this.getSavedLanguage();

    this.translate.addLangs(['de', 'en']);
    this.translate.setDefaultLang('en');
    this.translate.use(savedLang);
  }

  /**
   * Subscribes to router navigation events and applies scroll-to-top behavior
   * for specific routes.
   *
   * Current behavior:
   * - When navigating to '/legal-notice' or '/privacy-policy', the page scrolls
   *   to the top with smooth scrolling.
   *
   * Note:
   * - This is guarded for SSR by checking the browser platform before calling
   *   window APIs.
   */
  private initRouteScrollBehavior(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        if (!this.isLegalOrPrivacyRoute(e.urlAfterRedirects)) return;
        if (!isPlatformBrowser(this.platformId)) return;

        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }

  /**
   * Reads the persisted language from localStorage if available.
   *
   * @returns The saved language code ('de' | 'en') or 'en' as a safe default.
   */
  private getSavedLanguage(): string {
    if (!isPlatformBrowser(this.platformId)) return 'en';
    return localStorage.getItem('lang') || 'en';
  }

  /**
   * Checks whether the given route URL matches one of the routes that should
   * trigger scroll-to-top behavior.
   *
   * @param urlAfterRedirects Router URL after redirects have been applied.
   * @returns True if the URL is a legal/privacy route; otherwise false.
   */
  private isLegalOrPrivacyRoute(urlAfterRedirects: string): boolean {
    return urlAfterRedirects === '/legal-notice' || urlAfterRedirects === '/privacy-policy';
  }
}
