import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { SignUpComponent } from './sign-up.component';
import { AuthService } from '../auth-service';
import { FamilyPortalService } from '../../family/family-portal/family-portal.service';

describe('SignUpComponent', () => {
  let component: SignUpComponent;
  let fixture: ComponentFixture<SignUpComponent>;
  let authServiceMock: jasmine.SpyObj<Pick<AuthService, 'signup' | 'isGuardian'>>;
  let familyPortalServiceMock: jasmine.SpyObj<Pick<FamilyPortalService, 'getSummary'>>;

  beforeEach(waitForAsync(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['signup', 'isGuardian']);
    familyPortalServiceMock = jasmine.createSpyObj('FamilyPortalService', ['getSummary']);
    authServiceMock.isGuardian.and.returnValue(false);
    familyPortalServiceMock.getSummary.and.returnValue(of({ profileComplete: false, family: null }));

    TestBed.configureTestingModule({
      imports: [SignUpComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: FamilyPortalService, useValue: familyPortalServiceMock },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SignUpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function setVolunteerFormValues() {
    component.signupForm.setValue({
      fullName: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });
  }

  function setGuardianFormValues() {
    component.signupForm.setValue({
      fullName: 'Guardian User',
      username: 'guardian1',
      email: '',
      password: 'password123',
    });
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isGuardianRoute should be false when not on /guardian-sign-up', () => {
    expect(component.isGuardianRoute).toBeFalse();
  });

  it('pageTitle should be "Volunteer Sign Up" on the volunteer route', () => {
    expect(component.pageTitle).toBe('Volunteer Sign Up');
  });

  it('pageSubtitle should mention "volunteer account" on the volunteer route', () => {
    expect(component.pageSubtitle).toContain('volunteer');
  });

  it('requiresEmail should be true on the volunteer route', () => {
    expect(component.requiresEmail).toBeTrue();
  });

  it('form should be invalid when all fields are empty', () => {
    expect(component.signupForm.valid).toBeFalse();
  });

  it('password control should be invalid when fewer than 8 characters', () => {
    component.signupForm.controls.password.setValue('short');
    expect(component.signupForm.controls.password.valid).toBeFalse();
  });

  it('form should be valid when all volunteer fields satisfy constraints', () => {
    setVolunteerFormValues();
    authServiceMock.signup.and.returnValue(of('VOLUNTEER'));
    component.onSubmit();
    expect(component.signupForm.valid).toBeTrue();
  });

  it('should not call signup when form is invalid', () => {
    component.onSubmit();
    expect(authServiceMock.signup).not.toHaveBeenCalled();
  });

  it('should require an email for volunteer signup', () => {
    component.signupForm.setValue({
      fullName: 'Test User',
      username: 'testuser',
      email: '',
      password: 'password123',
    });

    component.onSubmit();

    expect(component.signupForm.controls.email.hasError('required')).toBeTrue();
    expect(authServiceMock.signup).not.toHaveBeenCalled();
  });

  it('should call authService.signup with the volunteer role and email on valid submit', () => {
    authServiceMock.signup.and.returnValue(of('VOLUNTEER'));
    setVolunteerFormValues();

    component.onSubmit();

    expect(authServiceMock.signup).toHaveBeenCalledWith(
      'testuser', 'password123', 'Test User', 'VOLUNTEER', 'test@example.com'
    );
  });

  it('should navigate volunteers to the home page after signup', () => {
    const routerSpy = spyOn(component.router, 'navigate');
    authServiceMock.signup.and.returnValue(of('VOLUNTEER'));
    setVolunteerFormValues();

    component.onSubmit();

    expect(routerSpy).toHaveBeenCalledWith(['/']);
  });

  it('should display the error message when signup fails', () => {
    authServiceMock.signup.and.returnValue(
      throwError(() => new Error('Username already exists'))
    );
    setVolunteerFormValues();

    component.onSubmit();

    expect(component.error).toBe('Username already exists');
    expect(component.isLoading).toBeFalse();
  });

  it('should set isLoading to true while the signup request is in flight', () => {
    authServiceMock.signup.and.returnValue(new Observable(() => {}));
    setVolunteerFormValues();

    component.onSubmit();

    expect(component.isLoading).toBeTrue();
  });

  describe('on /guardian-sign-up', () => {
    beforeEach(() => {
      (component as { router: Router }).router = jasmine.createSpyObj(
        'Router', ['navigate'], { url: '/guardian-sign-up' }
      );
      authServiceMock.isGuardian.and.returnValue(true);
    });

    it('isGuardianRoute should be true', () => {
      expect(component.isGuardianRoute).toBeTrue();
      expect(component.requiresEmail).toBeFalse();
    });

    it('pageTitle should be "Guardian Sign Up"', () => {
      expect(component.pageTitle).toBe('Guardian Sign Up');
    });

    it('pageSubtitle should mention "family"', () => {
      expect(component.pageSubtitle).toContain('family');
    });

    it('should call authService.signup with the guardian role and no email when blank', () => {
      authServiceMock.signup.and.returnValue(of('GUARDIAN'));
      setGuardianFormValues();

      component.onSubmit();

      expect(authServiceMock.signup).toHaveBeenCalledWith(
        'guardian1', 'password123', 'Guardian User', 'GUARDIAN', undefined
      );
    });

    it('should navigate guardian user to /family-portal when profile is complete', () => {
      authServiceMock.signup.and.returnValue(of('GUARDIAN'));
      familyPortalServiceMock.getSummary.and.returnValue(of({ profileComplete: true, family: null }));
      setGuardianFormValues();

      component.onSubmit();

      const routerSpy = component.router as unknown as jasmine.SpyObj<Router>;
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/family-portal']);
    });

    it('should navigate guardian user to /family-portal/form when profile is incomplete', () => {
      authServiceMock.signup.and.returnValue(of('GUARDIAN'));
      familyPortalServiceMock.getSummary.and.returnValue(of({ profileComplete: false, family: null }));
      setGuardianFormValues();

      component.onSubmit();

      const routerSpy = component.router as unknown as jasmine.SpyObj<Router>;
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/family-portal/form']);
    });

    it('should fall back to /family-portal/form when the summary request fails', () => {
      authServiceMock.signup.and.returnValue(of('GUARDIAN'));
      familyPortalServiceMock.getSummary.and.returnValue(throwError(() => new Error('summary failed')));
      setGuardianFormValues();

      component.onSubmit();

      const routerSpy = component.router as unknown as jasmine.SpyObj<Router>;
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/family-portal/form']);
    });
  });
});
