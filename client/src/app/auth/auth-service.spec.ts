import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth-service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
      ],
    });

    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
    sessionStorage.clear();
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loggedIn should be false when sessionStorage is empty', () => {
    expect(service.loggedIn).toBeFalse();
  });

  it('systemRole should be null when sessionStorage is empty', () => {
    expect(service.systemRole).toBeNull();
  });

  describe('login()', () => {
    it('should POST to /api/auth/login with credentials', () => {
      service.login('alice', 'password123').subscribe();

      const req = httpTestingController.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'alice', password: 'password123' });
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ systemRole: 'VOLUNTEER', permissions: ['view_inventory'] });
    });

    it('should store the returned access profile on success', () => {
      service.login('alice', 'password123').subscribe(role => {
        expect(role).toBe('VOLUNTEER');
      });

      httpTestingController.expectOne('/api/auth/login').flush({
        systemRole: 'VOLUNTEER',
        permissions: ['view_inventory'],
        jobRole: 'volunteer_base',
        username: 'alice',
        fullName: 'Alice Smith',
        email: 'alice@example.com'
      });

      expect(service.systemRole).toBe('VOLUNTEER');
      expect(service.permissions).toEqual(['view_inventory']);
      expect(service.jobRole).toBe('volunteer_base');
      expect(service.username).toBe('alice');
      expect(service.fullName).toBe('Alice Smith');
      expect(service.email).toBe('alice@example.com');
      expect(service.displayName).toBe('Alice');
      expect(service.loggedIn).toBeTrue();
    });

    it('should refresh permissions when login response does not include them', () => {
      service.login('alice', 'password123').subscribe(role => {
        expect(role).toBe('ADMIN');
      });

      httpTestingController.expectOne('/api/auth/login').flush({});

      const permissionsRequest = httpTestingController.expectOne('/api/auth/permissions');
      expect(permissionsRequest.request.withCredentials).toBeTrue();
      permissionsRequest.flush({ systemRole: 'ADMIN', permissions: ['*'] });

      expect(service.systemRole).toBe('ADMIN');
      expect(service.permissions).toEqual(['*']);
    });

    it('should surface an error message on failed login', (done) => {
      service.login('alice', 'wrongpass').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Invalid username or password');
          expect(service.loggedIn).toBeFalse();
          done();
        },
      });

      httpTestingController.expectOne('/api/auth/login').flush(
        { message: 'Invalid username or password' },
        { status: 401, statusText: 'Unauthorized' }
      );
    });

    it('should fall back to "Login failed" when error has no message', (done) => {
      service.login('alice', 'wrongpass').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Login failed');
          done();
        },
      });

      httpTestingController.expectOne('/api/auth/login').flush(
        {},
        { status: 500, statusText: 'Server Error' }
      );
    });
  });

  describe('signup()', () => {
    it('should POST to /api/auth/signup with volunteer role by default', () => {
      service.signup('bob', 'password123', 'Bob Smith').subscribe();

      const req = httpTestingController.expectOne('/api/auth/signup');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        username: 'bob',
        password: 'password123',
        fullName: 'Bob Smith',
        systemRole: 'VOLUNTEER',
        email: undefined,
      });
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ systemRole: 'VOLUNTEER', permissions: ['view_inventory'] });
    });

    it('should POST guardian role when explicitly passed', () => {
      service.signup('carol', 'password123', 'Carol Jones', 'GUARDIAN', 'carol@example.com').subscribe();

      const req = httpTestingController.expectOne('/api/auth/signup');
      expect(req.request.body).toEqual({
        username: 'carol',
        password: 'password123',
        fullName: 'Carol Jones',
        systemRole: 'GUARDIAN',
        email: 'carol@example.com',
      });
      req.flush({ systemRole: 'GUARDIAN', permissions: ['family_portal_access'] });
    });

    it('should store the returned role in sessionStorage on success', () => {
      service.signup('bob', 'password123', 'Bob Smith', 'VOLUNTEER').subscribe();

      httpTestingController.expectOne('/api/auth/signup').flush({
        systemRole: 'VOLUNTEER',
        permissions: ['view_inventory']
      });

      expect(service.systemRole).toBe('VOLUNTEER');
      expect(service.loggedIn).toBeTrue();
    });

    it('should surface an error message on failed signup', (done) => {
      service.signup('taken', 'password123', 'Taken User').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Username already exists');
          done();
        },
      });

      httpTestingController.expectOne('/api/auth/signup').flush(
        { message: 'Username already exists' },
        { status: 400, statusText: 'Bad Request' }
      );
    });
  });

  describe('logout()', () => {
    it('should POST to /api/auth/logout', () => {
      sessionStorage.setItem('auth_system_role', 'VOLUNTEER');
      service.logout().subscribe();

      const req = httpTestingController.expectOne('/api/auth/logout');
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBeTrue();
      req.flush({});
    });

    it('should remove the role from sessionStorage on success', () => {
      sessionStorage.setItem('auth_system_role', 'VOLUNTEER');
      sessionStorage.setItem('auth_permissions', JSON.stringify(['view_inventory']));

      service.logout().subscribe();
      httpTestingController.expectOne('/api/auth/logout').flush({});

      expect(service.systemRole).toBeNull();
      expect(service.permissions).toEqual([]);
      expect(service.loggedIn).toBeFalse();
    });

    it('should still clear sessionStorage even if the server call fails', () => {
      sessionStorage.setItem('auth_system_role', 'VOLUNTEER');
      service.logout().subscribe({ error: () => {} });

      httpTestingController.expectOne('/api/auth/logout').flush(
        {},
        { status: 500, statusText: 'Server Error' }
      );

      expect(service.systemRole).toBeNull();
      expect(service.username).toBeNull();
      expect(service.fullName).toBeNull();
      expect(service.email).toBeNull();
    });
  });

  describe('restoreSession()', () => {
    it('should GET /api/auth/me and store the returned role', () => {
      service.restoreSession().subscribe(role => {
        expect(role).toBe('ADMIN');
      });

      const req = httpTestingController.expectOne('/api/auth/me');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ systemRole: 'ADMIN', permissions: ['*'] });

      expect(service.systemRole).toBe('ADMIN');
    });

    it('should clear sessionStorage and error when cookie is missing', (done) => {
      sessionStorage.setItem('auth_system_role', 'VOLUNTEER');

      service.restoreSession().subscribe({
        error: () => {
          expect(service.systemRole).toBeNull();
          done();
        },
      });

      httpTestingController.expectOne('/api/auth/me').flush(
        {},
        { status: 401, statusText: 'Unauthorized' }
      );
    });
  });

  describe('syncAccessProfile()', () => {
    it('should refresh permissions when already logged in', () => {
      sessionStorage.setItem('auth_system_role', 'VOLUNTEER');

      service.syncAccessProfile().subscribe(role => {
        expect(role).toBe('ADMIN');
      });

      const req = httpTestingController.expectOne('/api/auth/permissions');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ systemRole: 'ADMIN', permissions: ['*'] });

      expect(service.systemRole).toBe('ADMIN');
      expect(service.permissions).toEqual(['*']);
    });

    it('should restore the session when not already logged in', () => {
      service.syncAccessProfile().subscribe(role => {
        expect(role).toBe('GUARDIAN');
      });

      const req = httpTestingController.expectOne('/api/auth/me');
      expect(req.request.method).toBe('GET');
      req.flush({ systemRole: 'GUARDIAN', permissions: ['family_portal_access'] });
    });
  });

  describe('permission helpers', () => {
    it('should return an empty list when permissions are missing or invalid', () => {
      expect(service.permissions).toEqual([]);

      sessionStorage.setItem('auth_permissions', '{bad json');
      expect(service.permissions).toEqual([]);
    });

    it('hasPermission should grant all permissions to admins', () => {
      sessionStorage.setItem('auth_system_role', 'ADMIN');
      expect(service.hasPermission('anything')).toBeTrue();
    });

    it('hasAllPermissions should require each permission', () => {
      sessionStorage.setItem('auth_permissions', JSON.stringify(['read', 'write']));
      expect(service.hasAllPermissions(['read', 'write'])).toBeTrue();
      expect(service.hasAllPermissions(['read', 'delete'])).toBeFalse();
    });
  });

  describe('role helpers', () => {
    it('isAdmin() should return true when role is admin', () => {
      sessionStorage.setItem('auth_system_role', 'ADMIN');
      expect(service.isAdmin()).toBeTrue();
    });

    it('isAdmin() should return false for volunteer', () => {
      sessionStorage.setItem('auth_system_role', 'VOLUNTEER');
      expect(service.isAdmin()).toBeFalse();
    });

    it('isVolunteer() should return true when role is volunteer', () => {
      sessionStorage.setItem('auth_system_role', 'VOLUNTEER');
      expect(service.isVolunteer()).toBeTrue();
    });

    it('isGuardian() should return true when role is guardian', () => {
      sessionStorage.setItem('auth_system_role', 'GUARDIAN');
      expect(service.isGuardian()).toBeTrue();
    });
  });
});
