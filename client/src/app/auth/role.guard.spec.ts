// Angular Imports
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

// Guard Under Test
import { RoleGuard } from './role.guard';
import { AuthService } from './auth-service';

/**
 * Tests for RoleGuard — verifies that the guard:
 *  - allows access when the user's role matches a permitted role,
 *  - redirects to / when logged in but with an insufficient role,
 *  - redirects to /login when the user is not logged in at all.
 */
describe('RoleGuard', () => {
  let guard: RoleGuard;
  let routerSpy: jasmine.SpyObj<Router>;
  let authServiceStub: {
    loggedIn: boolean;
    systemRole: string | null;
    hasAllPermissions: jasmine.Spy;
    syncAccessProfile: jasmine.Spy;
  };

  /** Helper that builds a minimal ActivatedRouteSnapshot with a roles data array. */
  function buildRoute(roles: string[]): ActivatedRouteSnapshot {
    const snapshot = new ActivatedRouteSnapshot();
    Object.assign(snapshot, { data: { roles } });
    return snapshot;
  }

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    authServiceStub = {
      loggedIn: true,
      systemRole: 'VOLUNTEER',
      hasAllPermissions: jasmine.createSpy('hasAllPermissions').and.returnValue(true),
      syncAccessProfile: jasmine.createSpy('syncAccessProfile').and.returnValue(of('VOLUNTEER'))
    };

    TestBed.configureTestingModule({
      providers: [
        RoleGuard,
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    guard = TestBed.inject(RoleGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should return true when the user role is in the allowed list', (done) => {
    authServiceStub.systemRole = 'ADMIN';
    authServiceStub.loggedIn = true;

    guard.canActivate(buildRoute(['ADMIN'])).subscribe(result => {
      expect(result).toBeTrue();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
      done();
    });
  });

  it('should allow any role listed in the allowed roles array', (done) => {
    authServiceStub.systemRole = 'GUARDIAN';
    authServiceStub.loggedIn = true;

    guard.canActivate(buildRoute(['ADMIN', 'GUARDIAN'])).subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('should return false and navigate to / when role is not in allowed list', (done) => {
    authServiceStub.systemRole = 'VOLUNTEER';
    authServiceStub.loggedIn = true;

    guard.canActivate(buildRoute(['ADMIN'])).subscribe(result => {
      expect(result).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
      done();
    });
  });

  it('should return false and navigate to /login when syncing the session fails', (done) => {
    authServiceStub.loggedIn = false;
    authServiceStub.systemRole = null;
    authServiceStub.syncAccessProfile.and.returnValue(throwError(() => new Error('not authenticated')));

    guard.canActivate(buildRoute(['ADMIN'])).subscribe(result => {
      expect(result).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
      done();
    });
  });

  it('should deny access when permissions are required and missing', (done) => {
    authServiceStub.systemRole = 'ADMIN';
    authServiceStub.hasAllPermissions.and.returnValue(false);

    const snapshot = new ActivatedRouteSnapshot();
    Object.assign(snapshot, { data: { roles: ['ADMIN'], permissions: ['edit_inventory_item'] } });

    guard.canActivate(snapshot).subscribe(result => {
      expect(result).toBeFalse();
      expect(authServiceStub.hasAllPermissions).toHaveBeenCalledWith(['edit_inventory_item']);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
      done();
    });
  });

  it('should allow access when permissions are required and present', (done) => {
    authServiceStub.systemRole = 'ADMIN';
    authServiceStub.hasAllPermissions.and.returnValue(true);

    const snapshot = new ActivatedRouteSnapshot();
    Object.assign(snapshot, { data: { roles: ['ADMIN'], permissions: ['edit_inventory_item'] } });

    guard.canActivate(snapshot).subscribe(result => {
      expect(result).toBeTrue();
      expect(authServiceStub.hasAllPermissions).toHaveBeenCalledWith(['edit_inventory_item']);
      done();
    });
  });

  it('should allow access when route has no role or permission requirements', (done) => {
    authServiceStub.systemRole = 'VOLUNTEER';
    authServiceStub.hasAllPermissions.calls.reset();

    const snapshot = new ActivatedRouteSnapshot();
    Object.assign(snapshot, { data: {} });

    guard.canActivate(snapshot).subscribe(result => {
      expect(result).toBeTrue();
      expect(authServiceStub.hasAllPermissions).not.toHaveBeenCalled();
      done();
    });
  });
});
