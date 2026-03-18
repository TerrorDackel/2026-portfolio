import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

interface CvDocumentLink {
  id: string;
  titleKey: string;
  descriptionKey: string;
  href: string;
  imgSrc: string;
  imgAltKey: string;
}

@Component({
  selector: 'app-cv-document-links',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './cv-document-links.component.html',
  styleUrls: ['./cv-document-links.component.sass']
})
export class CvDocumentLinksComponent {
  readonly documents: CvDocumentLink[] = [
    {
      id: 'resume',
      titleKey: 'CV_SECTION.DOC_RESUME_TITLE',
      descriptionKey: 'CV_SECTION.DOC_RESUME_DESC',
      href: '/cv-section/cv/resume',
      imgSrc: 'assets/img/resume.png',
      imgAltKey: 'CV_SECTION.DOC_RESUME_ALT'
    },
    {
      id: 'certificate',
      titleKey: 'CV_SECTION.DOC_CERT_TITLE',
      descriptionKey: 'CV_SECTION.DOC_CERT_DESC',
      href: '/cv-section/cv/certificate',
      imgSrc: 'assets/img/da-certificate.png',
      imgAltKey: 'CV_SECTION.DOC_CERT_ALT'
    }
  ];
}

