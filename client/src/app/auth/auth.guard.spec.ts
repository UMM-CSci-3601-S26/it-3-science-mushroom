// Angular Imports
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

// Guards Under Test
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth-service';

/**
 * Tests for AuthGuard — verifies that the guard allows authenticated users
 * through and redirects unauthenticated users to /login.
 */
describe('AuthGuard', () => {
  let guard: AuthGuard;
  let routerSpy: jasmine.SpyObj<Router>;
  let authServiceStub: {
    loggedIn: boolean;
    syncAccessProfile: jasmine.Spy;
  };

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    authServiceStub = {
      loggedIn: false,
      syncAccessProfile: jasmine.createSpy('syncAccessProfile').and.returnValue(of('VOLUNTEER'))
    };

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    guard = TestBed.inject(AuthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should return true and not navigate when the user is logged in', () => {
    authServiceStub.loggedIn = true;

    const result = guard.canActivate();

    expect(result).toBeTrue();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should restore the access profile when local auth state is missing', (done) => {
    authServiceStub.loggedIn = false;

    const result = guard.canActivate() as Observable<boolean>;

    result.subscribe(allowed => {
      expect(allowed).toBeTrue();
      expect(authServiceStub.syncAccessProfile).toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
      done();
    });
  });

  it('should return false and redirect to /login when session restore fails', (done) => {
    authServiceStub.loggedIn = false;
    authServiceStub.syncAccessProfile.and.returnValue(throwError(() => new Error('not authenticated')));

    const result = guard.canActivate() as Observable<boolean>;

    result.subscribe(allowed => {
      expect(allowed).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
      done();
    });
  });
});
