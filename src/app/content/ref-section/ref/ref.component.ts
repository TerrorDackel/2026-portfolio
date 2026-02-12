import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Reference card component.
 *
 * Responsibilities:
 * - Displays a single colleague reference entry (name, project, and a translated
 *   feedback/commit text).
 *
 * Inputs:
 * - name: Display name of the colleague.
 * - project: Project context associated with the reference.
 * - commit: Translation key used to render the reference text via ngx-translate.
 */
@Component({
  selector: 'app-ref',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe
  ],
  templateUrl: './ref.component.html',
  styleUrl: './ref.component.sass'
})
export class RefComponent {
  /**
   * Colleague name displayed in the reference card.
   */
  @Input() name!: string;

  /**
   * Project label displayed in the reference card.
   */
  @Input() project!: string;

  /**
   * Translation key for the reference text displayed in the card.
   */
  @Input() commit!: string;
}
