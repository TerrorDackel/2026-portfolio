import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './header.component.html',
    styleUrl: './header.component.sass'
})
export class HeaderComponent {
    private readonly translate = inject(TranslateService);
    private readonly router = inject(Router);
    private readonly availableAccents = ['blue', 'emerald', 'purple', 'pink', 'black', 'white'] as const;

    menuValue = false;
    menuIcon = 'bi bi-list';
    currentLanguage: 'en' | 'de';
    currentAccent = 'blue';

    constructor() {
        const lang = this.translate.currentLang as 'en' | 'de' | undefined;
        this.currentLanguage = lang === 'de' ? 'de' : 'en';
        this.setAccent(this.readStoredAccent());
    }

    openMenu(): void {
        this.menuValue = !this.menuValue;
        this.menuIcon = this.menuValue ? 'bi bi-x' : 'bi bi-list';
    }

    closeMenu(): void {
        this.menuValue = false;
        this.menuIcon = 'bi bi-list';
    }

    switchToGerman(): void {
        this.setLanguage('de');
        this.closeMenu();
    }

    switchToEnglish(): void {
        this.setLanguage('en');
        this.closeMenu();
    }

    private setLanguage(lang: 'en' | 'de'): void {
        this.currentLanguage = lang;
        this.translate.use(lang);
        localStorage.setItem('lang', lang);
    }

    onAccentChange(event: Event): void {
        const target = event.target as HTMLSelectElement | null;
        if (!target) {
            return;
        }
        this.setAccent(target.value);
    }

    private setAccent(accent: string): void {
        const normalizedAccent = this.availableAccents.includes(accent as typeof this.availableAccents[number])
            ? accent
            : 'blue';
        this.currentAccent = normalizedAccent;
        document.documentElement.dataset['accent'] = normalizedAccent;
        localStorage.setItem('accent', normalizedAccent);
    }

    private readStoredAccent(): string {
        const storedAccent = localStorage.getItem('accent');
        return storedAccent ?? 'blue';
    }

    scrollUp(): void {
        if (this.router.url !== '/' && this.router.url !== '') {
            this.router.navigateByUrl('/').then(() => {
                requestAnimationFrame(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    onLogoClick(event: MouseEvent): void {
        event.preventDefault();
        this.scrollUp();
    }

    onLogoKeydown(event: KeyboardEvent | Event): void {
        const keyEvent = event as KeyboardEvent;
        const key = keyEvent.key;
        if (key === 'Enter' || key === ' ') {
            event.preventDefault();
            this.scrollUp();
        }
    }

    onBurgerKeydown(event: KeyboardEvent | Event): void {
        const keyEvent = event as KeyboardEvent;
        const key = keyEvent.key;
        if (key === 'Enter' || key === ' ') {
            event.preventDefault();
            this.openMenu();
        }
    }

    onLanguageKeydown(event: KeyboardEvent | Event, lang: 'en' | 'de'): void {
        const keyEvent = event as KeyboardEvent;
        const key = keyEvent.key;
        if (key === 'Enter' || key === ' ') {
            event.preventDefault();
            if (lang === 'de') {
                this.switchToGerman();
            } else {
                this.switchToEnglish();
            }
        }
    }
}
