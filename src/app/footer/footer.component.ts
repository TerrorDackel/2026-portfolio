import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { setReturnAnchor } from '../utils/scroll-memory';

/**
 * Application footer component.
 *
 * Responsibilities:
 * - Displays the current year.
 * - Provides "scroll to top" behavior.
 * - Navigates to internal routes (e.g. legal notice / privacy policy) while
 *   storing a return anchor to enable scrolling back to the footer section.
 *
 * Notes:
 * - Uses browser APIs (`window`, `requestAnimationFrame`) and therefore is intended
 *   to run in a browser context.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    RouterModule,
    TranslatePipe
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.sass'
})
export class FooterComponent {
  /**
   * Current year used for the copyright display.
   */
  readonly currentYear = new Date().getFullYear();

  constructor(private router: Router) {}

  /**
   * Scrolls to the top of the page.
   *
   * - If the user is not currently on the home route, it navigates to '/' first,
   *   then scrolls to the top after navigation.
   * - If the user is already on the home route, it scrolls immediately.
   */
  scrollUp(): void {
    if (this.isOnHomeRoute()) {
      this.scrollToTopSmooth();
      return;
    }

    this.navigateHomeThenScroll();
  }

  /**
   * Navigates to a route and stores a return anchor for later restoration.
   *
   * Intended usage:
   * - When navigating to pages like legal notice / privacy policy, the application
   *   can remember that the user came from the footer area and later scroll back
   *   to it when returning.
   *
   * @param path Router path to navigate to (e.g. '/privacy-policy').
   */
  navigateTo(path: string): void {
    setReturnAnchor('footer');
    this.router.navigate([path]);
  }

  /**
   * Determines whether the current router URL is the home route.
   */
  private isOnHomeRoute(): boolean {
    return this.router.url === '/' || this.router.url === '';
  }

  /**
   * Navigates to the home route and scrolls to the top on the next animation frame.
   */
  private navigateHomeThenScroll(): void {
    this.router.navigateByUrl('/').then(() => {
      requestAnimationFrame(() => {
        this.scrollToTopSmooth();
      });
    });
  }

  /**
   * Smoothly scrolls the window to the top.
   */
  private scrollToTopSmooth(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
