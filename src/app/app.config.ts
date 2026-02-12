import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';

/**
 * Factory function used by ngx-translate to create an HTTP-based translation loader.
 *
 * Loads translation JSON files from the configured assets path.
 *
 * @param http Angular HttpClient instance used to fetch translation files.
 * @returns A TranslateHttpLoader configured for this application's i18n files.
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
