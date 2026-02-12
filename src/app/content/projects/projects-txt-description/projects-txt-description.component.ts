import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Project text/description component.
 *
 * Responsibilities:
 * - Renders the textual metadata for a single portfolio project.
 * - Uses ngx-translate to render the project description from a translation key.
 *
 * Inputs:
 * - name: project title shown in the UI.
 * - usedProgramms: list of technologies used by the project.
 * - description: translation key for the project description text.
 * - gitLink: URL to the project's repository.
 * - livetest: URL to the live demo.
 */
@Component({
  selector: 'app-projects-txt-description',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe
  ],
  templateUrl: './projects-txt-description.component.html',
  styleUrl: './projects-txt-description.component.sass'
})
export class ProjectsTxtDescriptionComponent {
  /**
   * Project title shown in the UI.
   */
  @Input() name!: string;

  /**
   * List of technologies used by the project.
   */
  @Input() usedProgramms!: string[];

  /**
   * Translation key for the project description text.
   */
  @Input() description!: string;

  /**
   * URL to the project's source repository.
   */
  @Input() gitLink!: string;

  /**
   * URL to the project's live demo.
   */
  @Input() livetest!: string;
}
