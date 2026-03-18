import { Routes } from '@angular/router';
import { LegalNoticeComponent } from './legal-notice/legal-notice.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { ContentComponent } from './content/content.component';
import { CvSectionLoginComponent } from './cv-section/login/cv-section-login.component';
import { CvSectionHomeComponent } from './cv-section/home/cv-section-home.component';
import { CvSectionAdminComponent } from './cv-section/admin/cv-section-admin.component';
import { CvResumePageComponent } from './cv-section/home/documents/resume/cv-resume-page.component';
import { CvCertificatePageComponent } from './cv-section/home/documents/certificate/cv-certificate-page.component';

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
    path: 'cv-section/login',
    component: CvSectionLoginComponent
  },
  {
    path: 'cv-section/home',
    component: CvSectionHomeComponent
  },
  {
    path: 'cv-section/home/resume',
    component: CvResumePageComponent
  },
  {
    path: 'cv-section/home/certificate',
    component: CvCertificatePageComponent
  },
  {
    path: 'cv-section/admin',
    component: CvSectionAdminComponent
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
