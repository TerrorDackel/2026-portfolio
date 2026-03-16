import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-cv-section-home',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './cv-section-home.component.html',
  styleUrls: ['./cv-section-home.component.sass']
})
export class CvSectionHomeComponent {}

