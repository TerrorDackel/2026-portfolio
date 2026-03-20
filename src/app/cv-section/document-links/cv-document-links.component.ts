import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';

interface CvDocumentLink {
  id: string;
  titleKey: string;
  descriptionKey: string;
  routerLink: string[];
  queryParams: Record<string, string>;
  imgSrc: string;
  imgAltKey: string;
}

@Component({
  selector: 'app-cv-document-links',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterLink],
  templateUrl: './cv-document-links.component.html',
  styleUrls: ['./cv-document-links.component.sass']
})
export class CvDocumentLinksComponent {
  readonly documents: CvDocumentLink[] = [
    {
      id: 'resume',
      titleKey: 'CV_SECTION.DOC_RESUME_TITLE',
      descriptionKey: 'CV_SECTION.DOC_RESUME_DESC',
      routerLink: ['/cv-section/home/resume'],
      queryParams: { returnTo: 'home' },
      imgSrc: 'assets/img/resume.png',
      imgAltKey: 'CV_SECTION.DOC_RESUME_ALT'
    },
    {
      id: 'certificate',
      titleKey: 'CV_SECTION.DOC_CERT_TITLE',
      descriptionKey: 'CV_SECTION.DOC_CERT_DESC',
      routerLink: ['/cv-section/home/certificate'],
      queryParams: { returnTo: 'home' },
      imgSrc: 'assets/img/da-certificate.png',
      imgAltKey: 'CV_SECTION.DOC_CERT_ALT'
    }
  ];
}

