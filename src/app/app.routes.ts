import { Routes } from '@angular/router';
import { LegalNoticeComponent } from './legal-notice/legal-notice.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { ContentComponent } from './content/content.component';

/**
 * Application route configuration.
 *
 * Defines the URL paths that are available in the application and maps them to
 * their corresponding components.
 *
 * Routes:
 * - ''               -> Main content/landing page
 * - 'legal-notice'   -> Legal notice / imprint page
 * - 'privacy-policy' -> Privacy policy page
 * - '**'             -> Fallback (redirect to home)
 */
export const routes: Routes = [
  {
    path: '',
    component: ContentComponent
  },
  {
    path: 'legal-notice',
    component: LegalNoticeComponent
  },
  {
    path: 'privacy-policy',
    component: PrivacyPolicyComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
