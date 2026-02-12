import { Component } from '@angular/core';
import { ProjectsTxtDescriptionComponent } from './projects-txt-description/projects-txt-description.component';
import { RevealOnceDirective } from '../../utils/reveal-once.directive';

/**
 * Projects section component.
 *
 * Responsibilities:
 * - Provides the list of portfolio projects to be rendered by the template.
 * - Uses `ProjectsTxtDescriptionComponent` for project text rendering.
 * - Uses `RevealOnceDirective` for one-time reveal animations when elements enter the viewport.
 *
 * Notes:
 * - This component is currently a static data provider (no inputs/outputs).
 */
@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    ProjectsTxtDescriptionComponent,
    RevealOnceDirective
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.sass'
})
export class ProjectsComponent {
  /**
   * Portfolio projects rendered in the projects section.
   *
   * Each project contains:
   * - name: project title shown in the UI
   * - usedProgramms: list of technologies displayed (currently a single formatted string)
   * - description: translation key for the project description
   * - gitLink: GitHub repository link
   * - projectImg: preview image path
   * - livetest: link to the live demo
   */
  projects = [
    {
      name: 'Join',
      usedProgramms: [
        'Angular | TypeScript | HTML | CSS | Firebase'
      ],
      description: 'PROJECTS.JOIN.DESCRIPTION',
      gitLink: 'https://github.com/TerrorDackel/Join',
      projectImg: 'assets/img/join.png',
      livetest: 'https://www.join.jennifer-thomas.de/index.html'
    },
    {
      name: 'Pollo Loco',
      usedProgramms: [
        'JavaScript | HTML | CSS'
      ],
      description: 'PROJECTS.POLLO.DESCRIPTION',
      gitLink: 'https://github.com/TerrorDackel/el-pollo-loco-2025',
      projectImg: 'assets/img/el-pollo-loco.png',
      livetest: 'https://www.el-pollo-loco.jennifer-thomas.de/index.html'
    },
    {
      name: 'Pokedex',
      usedProgramms: [
        'JavaScript | HTML | CSS | API'
      ],
      description: 'PROJECTS.POKEDEX.DESCRIPTION',
      gitLink: 'https://github.com/TerrorDackel/Pokedex',
      projectImg: 'assets/img/pokedex.png',
      livetest: 'https://www.pokedex.jennifer-thomas.de/index.html'
    }
  ];
}
