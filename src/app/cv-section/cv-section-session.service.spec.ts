import { PLATFORM_ID } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { CvSectionSessionService } from './cv-section-session.service';

describe('CvSectionSessionService (browser)', () => {
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  const WARNING_MS = 5 * 60 * 1000 - 30 * 1000;
  const LOGOUT_MS = 5 * 60 * 1000;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CvSectionSessionService,
        { provide: Router, useValue: router },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    const service = TestBed.inject(CvSectionSessionService);
    expect(service).toBeTruthy();
  });

  it('stop() clears warning state', () => {
    const service = TestBed.inject(CvSectionSessionService);
    let lastWarning: boolean | undefined;
    service.warning$.subscribe((v) => (lastWarning = v));

    service.start();
    service.stop();

    expect(lastWarning).toBeFalse();
  });

  it('after warning delay, warning$ emits true', fakeAsync(() => {
    const service = TestBed.inject(CvSectionSessionService);
    const flags: boolean[] = [];
    service.warning$.subscribe((v) => flags.push(v));

    service.start();
    tick(WARNING_MS - 1);
    expect(flags[flags.length - 1]).toBeFalse();
    tick(1);
    expect(flags[flags.length - 1]).toBeTrue();
    service.stop();
  }));

  it('after logout delay, posts logout and navigates to login with timeout reason', fakeAsync(() => {
    const service = TestBed.inject(CvSectionSessionService);
    service.start();
    tick(LOGOUT_MS);

    const req = httpMock.expectOne('/api/cv-section/logout/');
    expect(req.request.method).toBe('POST');
    req.flush({});

    expect(router.navigate).toHaveBeenCalledWith(['/cv-section/login'], {
      queryParams: { reason: 'timeout' }
    });

    service.stop();
  }));
});

describe('CvSectionSessionService (server)', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CvSectionSessionService,
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        { provide: PLATFORM_ID, useValue: 'server' }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('start() does not schedule logout on the server', fakeAsync(() => {
    const service = TestBed.inject(CvSectionSessionService);
    let warned = false;
    service.warning$.subscribe((v) => (warned = v));

    service.start();
    tick(5 * 60 * 1000);

    expect(warned).toBeFalse();
    httpMock.expectNone('/api/cv-section/logout/');
  }));
});
