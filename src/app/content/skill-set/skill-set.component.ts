import { Component, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { ProgrammBoxComponent } from './programm-box/programm-box.component';
import { TranslatePipe } from '@ngx-translate/core';
import { observeAnimationReveal } from '../../utils/scroll-animations';

/**
 * Skill Set section component.
 *
 * Responsibilities:
 * - Renders the skill set section content.
 * - Displays skill/program boxes via `ProgrammBoxComponent`.
 * - Initializes scroll-based reveal animations for elements using the `reveal-zoom`
 *   class after the view has been rendered.
 *
 * Notes:
 * - The reveal helper is called with `platformId` to remain SSR-safe and avoid
 *   DOM access on non-browser platforms.
 */
@Component({
  selector: 'app-skill-set',
  standalone: true,
  imports: [
    ProgrammBoxComponent,
    TranslatePipe
  ],
  templateUrl: './skill-set.component.html',
  styleUrl: './skill-set.component.sass'
})
export class SkillSetComponent implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);

  /**
   * Initializes intersection-observer based reveal animations after the view
   * has been created.
   */
  ngAfterViewInit(): void {
    observeAnimationReveal('reveal-zoom', 0, this.platformId);
  }
}
