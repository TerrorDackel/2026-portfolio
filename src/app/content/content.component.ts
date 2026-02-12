import { Component, AfterViewInit } from '@angular/core';
import { HeroComponent } from './hero/hero.component';
import { WorkTogetherComponent } from './work-together/work-together.component';
import { SkillSetComponent } from './skill-set/skill-set.component';
import { MyWorkComponent } from './my-work/my-work.component';
import { ProjectsComponent } from './projects/projects.component';
import { RefSectionComponent } from './ref-section/ref-section.component';
import { ContactSectionComponent } from './contact-section/contact-section.component';
import { consumeReturnAnchor } from '../utils/scroll-memory';

/**
 * Main content (landing page) composition component.
 *
 * Responsibilities:
 * - Composes all content sections shown on the home route.
 * - Restores a previously stored "return anchor" after navigation (e.g. when the
 *   user navigates back from legal/privacy pages) by scrolling to the stored
 *   section id.
 *
 * Notes:
 * - Uses browser DOM APIs (`document`, `window`) and is intended to run in a
 *   browser context.
 */
@Component({
  selector: 'app-content',
  standalone: true,
  imports: [
    HeroComponent,
    WorkTogetherComponent,
    SkillSetComponent,
    MyWorkComponent,
    ProjectsComponent,
    RefSectionComponent,
    ContactSectionComponent
  ],
  templateUrl: './content.component.html',
  styleUrl: './content.component.sass'
})
export class ContentComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    this.scrollToReturnAnchor();
  }

  /**
   * Scrolls to the stored return anchor if one exists.
   *
   * Implementation details:
   * - Reads and clears the anchor id from sessionStorage via `consumeReturnAnchor()`.
   * - Locates the element by id.
   * - Scrolls to the element while compensating for a fixed header offset.
   */
  private scrollToReturnAnchor(): void {
    const id = consumeReturnAnchor();
    if (!id) return;

    const el = document.getElementById(id);
    if (!el) return;

    const headerOffset = 117;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({ top, behavior: 'smooth' });
  }
}
