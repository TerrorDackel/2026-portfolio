import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';

/**
 * Factory for ngx-translate: loads `assets/i18n/<lang>.json` (includes all `CV_SECTION.*` strings).
 *
 * @param http HttpClient used to fetch translation JSON.
 */
const httpLoaderFactory = (http: HttpClient): TranslateHttpLoader => {
  return new TranslateHttpLoader(http, '../assets/i18n/', '.json');
};

/**
 * Global application configuration for the standalone bootstrap API.
 *
 * Registers application-wide providers, including:
 * - Router configuration (routes)
 * - HttpClient
 * - ngx-translate setup (default language + HTTP loader)
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideTranslateService({
      defaultLanguage: 'en',
      useDefaultLang: true,
      loader: {
        provide: TranslateLoader,
        useFactory: httpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ]
};
