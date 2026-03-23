import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { CV_SECTION_RETURN_TO_QUERY_PARAM } from '../cv-section-navigation.util';

/**
 * One document tile: translation keys + router target + static image asset.
 *
 * @property id Stable key for `@for` tracking.
 * @property titleKey ngx-translate key for the card title (used for `aria-label` / `title`).
 * @property descriptionKey ngx-translate key for the short description under the image.
 * @property routerLink Angular router commands for the document page.
 * @property queryParams Merged into the URL — e.g. `returnTo: 'home'` so document pages know where “back” goes.
 * @property imgSrc Public asset path for the preview image.
 * @property imgAltKey ngx-translate key for accessible `alt` text.
 */
interface CvDocumentLink {
  id: string;
  titleKey: string;
  descriptionKey: string;
  routerLink: string[];
  queryParams: Record<string, string>;
  imgSrc: string;
  imgAltKey: string;
}

/**
 * Responsive grid of CV document entry cards (résumé + certificate).
 *
 * Responsibilities:
 * - Declare static {@link CvDocumentLinksComponent.documents} metadata consumed by the template.
 * - Delegate rendering to the template (`RouterLink`, `translate` pipe, lazy-loaded images).
 *
 * Notes:
 * - Layout/CSS: `cv-section-doc-*` classes (aligned with `cv-section-home`, `cv-section-document`).
 * - Each card is a focusable `routerLink` wrapper with preview art under `assets/img/`.
 */
@Component({
  selector: 'app-cv-document-links',
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterLink],
  templateUrl: './cv-document-links.component.html',
  styleUrl: './cv-document-links.component.sass'
})
export class CvDocumentLinksComponent {
  /**
   * Built-in routes for the two protected documents; extend this array to add more tiles.
   */
  readonly documents: CvDocumentLink[] = [
    {
      id: 'resume',
      titleKey: 'CV_SECTION.DOC_RESUME_TITLE',
      descriptionKey: 'CV_SECTION.DOC_RESUME_DESC',
      routerLink: ['/cv-section/home/resume'],
      queryParams: { [CV_SECTION_RETURN_TO_QUERY_PARAM]: 'home' },
      imgSrc: 'assets/img/resume.png',
      imgAltKey: 'CV_SECTION.DOC_RESUME_ALT'
    },
    {
      id: 'certificate',
      titleKey: 'CV_SECTION.DOC_CERT_TITLE',
      descriptionKey: 'CV_SECTION.DOC_CERT_DESC',
      routerLink: ['/cv-section/home/certificate'],
      queryParams: { [CV_SECTION_RETURN_TO_QUERY_PARAM]: 'home' },
      imgSrc: 'assets/img/da-certificate.png',
      imgAltKey: 'CV_SECTION.DOC_CERT_ALT'
    }
  ];
}

