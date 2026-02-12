import { Component, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { RefComponent } from './ref/ref.component';
import { TranslatePipe } from '@ngx-translate/core';
import { DragScrollXDirective } from './drag-scroll-x.directive';
import { observeAnimationReveal } from '../../utils/scroll-animations';

@Component({
  selector: 'app-ref-section',
  standalone: true,
  imports: [
    RefComponent, 
    TranslatePipe, 
    DragScrollXDirective
  ],
  templateUrl: './ref-section.component.html',
  styleUrl: './ref-section.component.sass'
})
export class RefSectionComponent implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);

  ref = [
    { 
      name: 'Catalina Acosta', 
      project: 'Project Kochwelt', 
      commit: 'REF_SECTION.CATALINA.COMMIT' 
    },
    { 
      name: 'Caryen Song', 
      project: 'Project Kochwelt', 
      commit: 'REF_SECTION.CARYEN.COMMIT' 
    },
    { 
      name: 'Patrick Frey', 
      project: 'Project Join', 
      commit: 'REF_SECTION.PATRICK.COMMIT' 
    },
    { 
      name: 'Stephanie Englberger', 
      project: 'Project Join', 
      commit: 'REF_SECTION.STEPHIE.COMMIT' 
    },
    { 
      name: 'Jonathan Michutta', 
      project: 'Project Join', 
      commit: 'REF_SECTION.JON.COMMIT' 
    }
  ];

  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    observeAnimationReveal('reveal-zoom', 0, this.platformId);
    observeAnimationReveal('reveal-from-left', 150, this.platformId);
    observeAnimationReveal('reveal-from-right', 150, this.platformId);
  }
}
