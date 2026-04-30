// Angular Imports
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

// Component and Dependencies
import { LoginComponent } from './login.component';
import { AuthService } from '../auth-service';
import { FamilyPortalService } from '../../family/family-portal.service';

/**
 * Tests for LoginComponent — covers component creation, form validation,
 * successful login navigation, and error display.
 */
describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: jasmine.SpyObj<Pick<AuthService, 'login' | 'isGuardian'>>;
  let familyPortalServiceMock: jasmine.SpyObj<Pick<FamilyPortalService, 'getSummary'>>;

  beforeEach(waitForAsync(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['login', 'isGuardian']);
    familyPortalServiceMock = jasmine.createSpyObj('FamilyPortalService', ['getSummary']);
    authServiceMock.isGuardian.and.returnValue(false);
    familyPortalServiceMock.getSummary.and.returnValue(of({ profileComplete: false, family: null }));

    TestBed.configureTestingModule({
      imports: [LoginComponent],
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
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ---- Basic creation ----

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---- Form validation ----

  it('form should be invalid when both fields are empty', () => {
    expect(component.loginForm.valid).toBeFalse();
  });

  it('username control should be invalid when empty', () => {
    component.loginForm.controls['username'].setValue('');
    expect(component.loginForm.controls['username'].valid).toBeFalse();
  });

  it('password control should be invalid when empty', () => {
    component.loginForm.controls['password'].setValue('');
    expect(component.loginForm.controls['password'].valid).toBeFalse();
  });

  it('form should be valid when both fields are filled', () => {
    component.loginForm.setValue({ username: 'alice', password: 'password123' });
    expect(component.loginForm.valid).toBeTrue();
  });

  // ---- Submit behaviour ----

  it('should not call login when the form is invalid', () => {
    component.onSubmit();
    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('should call authService.login with username and password on valid submit', () => {
    authServiceMock.login.and.returnValue(of('volunteer'));
    component.loginForm.setValue({ username: 'alice', password: 'password123' });

    component.onSubmit();

    expect(authServiceMock.login).toHaveBeenCalledWith('alice', 'password123');
  });

  it('should navigate to / after a successful login', () => {
    authServiceMock.login.and.returnValue(of('volunteer'));
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    (component as { router: typeof routerSpy }).router = routerSpy;

    component.loginForm.setValue({ username: 'alice', password: 'password123' });
    component.onSubmit();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should navigate guardian user to /family-portal when profile is complete', () => {
    authServiceMock.login.and.returnValue(of('guardian'));
    authServiceMock.isGuardian.and.returnValue(true);
    familyPortalServiceMock.getSummary.and.returnValue(of({ profileComplete: true, family: null }));
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    (component as { router: typeof routerSpy }).router = routerSpy;

    component.loginForm.setValue({ username: 'guardian', password: 'password123' });
    component.onSubmit();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/family-portal']);
  });

  it('should navigate guardian user to /family-portal/form when profile is incomplete', () => {
    authServiceMock.login.and.returnValue(of('guardian'));
    authServiceMock.isGuardian.and.returnValue(true);
    familyPortalServiceMock.getSummary.and.returnValue(of({ profileComplete: false, family: null }));
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    (component as { router: typeof routerSpy }).router = routerSpy;

    component.loginForm.setValue({ username: 'guardian', password: 'password123' });
    component.onSubmit();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/family-portal/form']);
  });

  it('should display the error message when login fails', () => {
    authServiceMock.login.and.returnValue(
      throwError(() => new Error('Invalid username or password'))
    );
    component.loginForm.setValue({ username: 'alice', password: 'wrongpass' });

    component.onSubmit();

    expect(component.error).toBe('Invalid username or password');
    expect(component.isLoading).toBeFalse();
  });

  it('should clear the error and set isLoading on a new submit attempt', () => {
    // Prime existing error state
    component.error = 'Old error';

    authServiceMock.login.and.returnValue(new Observable(() => {}));
    component.loginForm.setValue({ username: 'alice', password: 'password123' });

    component.onSubmit();

    expect(component.error).toBeNull();
    expect(component.isLoading).toBeTrue();
  });
});
