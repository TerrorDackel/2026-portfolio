import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

/**
 * Bootstraps the Angular application using the standalone API.
 *
 * The bootstrap process wires up the root component and applies the global
 * application configuration (providers, routing, etc.).
 *
 * Any bootstrap errors are caught and logged to the console to make startup
 * issues visible during development and in production diagnostics.
 */
bootstrapApplication(AppComponent, appConfig).catch(err => {
  console.error(err);
});
