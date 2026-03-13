import { Component } from '@angular/core';

/**
 * Skill/program box component.
 *
 * Responsibilities:
 * - Provides a static list of skills (icon + label) to be rendered by the template.
 *
 * Notes:
 * - This component currently has no inputs/outputs and acts as a simple data provider
 *   for the UI.
 */
@Component({
  selector: 'app-programm-box',
  standalone: true,
  imports: [],
  templateUrl: './programm-box.component.html',
  styleUrl: './programm-box.component.sass'
})
export class ProgrammBoxComponent {
  /**
   * List of skills displayed in the UI.
   *
   * Each entry contains:
   * - iconSrc: path to the icon asset
   * - name: display label
   */
  skills = [
    {
      iconSrc: 'assets/img/icon/1.png',
      name: 'Angular'
    },
    {
      iconSrc: 'assets/img/icon/2.png',
      name: 'TypeScript'
    },
    {
      iconSrc: 'assets/img/icon/3.png',
      name: 'JavaScript'
    },
    {
      iconSrc: 'assets/img/icon/4.png',
      name: 'HTML'
    },
    {
      iconSrc: 'assets/img/icon/5.png',
      name: 'Scrum'
    },
    {
      iconSrc: 'assets/img/icon/6.png',
      name: 'Firebase'
    },
    {
      iconSrc: 'assets/img/icon/7.png',
      name: 'Git'
    },
    {
      iconSrc: 'assets/img/icon/8.png',
      name: 'CSS'
    },
    {
      iconSrc: 'assets/img/icon/9.png',
      name: 'Rest Api'
    },
    {
      iconSrc: 'assets/img/icon/10.png',
      name: 'Material Design'
    },
    {
      iconSrc: 'assets/img/icon/11.png',
      name: 'Growth mindset'
    },
    {
      iconSrc: 'assets/img/icon/12.png',
      name: 'Architectural thinking'
    },
    {
      iconSrc: 'assets/img/icon/13.png',
      name: 'Clarity before code'
    },
    {
      iconSrc: 'assets/img/icon/14.png',
      name: 'Modern tooling'
    },
    {
      iconSrc: 'assets/img/icon/15.png',
      name: 'Debugging focus'
    },
    {
      iconSrc: 'assets/img/icon/16.png',
      name: 'Testing basics'
    },
    {
      iconSrc: 'assets/img/icon/17.png',
      name: 'UX focus'
    },
    {
      iconSrc: 'assets/img/icon/18.png',
      name: 'Responsive design'
    },
    {
      iconSrc: 'assets/img/icon/19.png',
      name: 'Accessibility focus'
    },
    {
      iconSrc: 'assets/img/icon/20.png',
      name: 'Domain understanding'
    }
  ];
}
