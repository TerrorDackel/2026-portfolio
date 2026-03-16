import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-cv-section-admin',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './cv-section-admin.component.html',
  styleUrls: ['./cv-section-admin.component.sass']
})
export class CvSectionAdminComponent {}

