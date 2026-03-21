import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { CvResumePageComponent } from './cv-resume-page.component';

describe('CvResumePageComponent', () => {
  let fixture: ComponentFixture<CvResumePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CvResumePageComponent,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateFakeLoader
          }
        })
      ],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CvResumePageComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose 14 Werdegang segments', () => {
    expect(fixture.componentInstance.werdegangSegments.length).toBe(14);
  });

  it('cvSection() should prefix CV_SECTION keys (flat UPPER_SNAKE like CONTACT.TITLE)', () => {
    expect(fixture.componentInstance.cvSection('RESUME_ABOUT_TITLE')).toBe('CV_SECTION.RESUME_ABOUT_TITLE');
    expect(fixture.componentInstance.cvSection('DOC_BUTTON_BACK')).toBe('CV_SECTION.DOC_BUTTON_BACK');
  });
});
