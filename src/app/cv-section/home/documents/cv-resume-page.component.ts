import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cv-resume-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cv-resume-page.component.html',
  styleUrls: ['./cv-document-page.sass'],
  encapsulation: ViewEncapsulation.None
})
export class CvResumePageComponent {}

