/**
 * AuthService — the single source of truth for authentication state in the
 * Angular app.
 *
 * How authentication works end-to-end
 * ------------------------------------
 * 1. The user submits a login or signup form.
 * 2. This service POSTs the credentials to the server over HTTPS.
 * 3. The server validates the credentials, creates a signed JWT, and writes it
 *    into an HttpOnly cookie called "auth_token".  Because the cookie is
 *    HttpOnly, JavaScript in this app can NEVER read or steal the token —
 *    that is the key XSS protection.
 * 4. The server returns an access profile ({ systemRole, jobRole, permissions })
 *    in the JSON body. We store that in sessionStorage so we know what UI
 *    to show. sessionStorage is cleared automatically when the browser tab is
 *    closed.
 * 5. On every subsequent API request the browser automatically includes the
 *    cookie (AuthInterceptor adds withCredentials:true to ensure this).
 * 6. The server's AuthMiddleware reads the cookie, validates the JWT signature
 *    and expiry, and rejects requests with 401/403 if the token is invalid.
 * 7. logout() calls POST /api/auth/logout, which tells the server to overwrite
 *    the cookie with an empty value and maxAge=0, causing the browser to delete
 *    it.  Then sessionStorage is cleared.
 * 8. restoreSession() calls GET /api/auth/me to check whether a valid server-
 *    side cookie still exists (e.g. after a page reload). If it does, the
 *    access profile is written back into sessionStorage so the UI is restored
 *    correctly.
 */
import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { tap, catchError, map, switchMap, Observable, of } from "rxjs";
import { throwError } from "rxjs";

@Injectable({ providedIn: 'root' })
export class AuthService {
  private roleKey = 'auth_system_role';
  private permissionsKey = 'auth_permissions';
  private jobRoleKey = 'auth_job_role';
  private usernameKey = 'auth_username';
  private fullNameKey = 'auth_full_name';
  private emailKey = 'auth_email';
  private apiUrl = '/api/auth';

  http = inject(HttpClient);

  private saveAccessProfile(profile: AuthPermissionsResponse) {
    sessionStorage.setItem(this.roleKey, profile.systemRole);
    sessionStorage.setItem(this.permissionsKey, JSON.stringify(profile.permissions ?? []));
    if (profile.jobRole) {
      sessionStorage.setItem(this.jobRoleKey, profile.jobRole);
    } else {
      sessionStorage.removeItem(this.jobRoleKey);
    }
    if (profile.username) {
      sessionStorage.setItem(this.usernameKey, profile.username);
    } else {
      sessionStorage.removeItem(this.usernameKey);
    }
    if (profile.fullName) {
      sessionStorage.setItem(this.fullNameKey, profile.fullName);
    } else {
      sessionStorage.removeItem(this.fullNameKey);
    }
    if (profile.email) {
      sessionStorage.setItem(this.emailKey, profile.email);
    } else {
      sessionStorage.removeItem(this.emailKey);
    }
  }

  private clearAuthState() {
    sessionStorage.removeItem(this.roleKey);
    sessionStorage.removeItem(this.permissionsKey);
    sessionStorage.removeItem(this.jobRoleKey);
    sessionStorage.removeItem(this.usernameKey);
    sessionStorage.removeItem(this.fullNameKey);
    sessionStorage.removeItem(this.emailKey);
  }

  private refreshAccessProfile() {
    return this.http.get<AuthPermissionsResponse>(`${this.apiUrl}/permissions`, { withCredentials: true }).pipe(
      tap(profile => this.saveAccessProfile(profile))
    );
  }

  private consumeAccessProfile(response: AuthAccessResponse): Observable<AuthPermissionsResponse> {
    if (response.systemRole && Array.isArray(response.permissions)) {
      const profile: AuthPermissionsResponse = {
        systemRole: response.systemRole,
        permissions: response.permissions,
        jobRole: response.jobRole,
        username: response.username,
        fullName: response.fullName,
        email: response.email
      };
      this.saveAccessProfile(profile);
      return of(profile);
    }

    return this.refreshAccessProfile();
  }

  login(username: string, password: string) {
    return this.http.post<AuthAccessResponse>(
      `${this.apiUrl}/login`,
      { username, password },
      { withCredentials: true }
    ).pipe(
      switchMap(response => this.consumeAccessProfile(response)),
      map(profile => profile.systemRole),
      catchError(error => {
        console.error('Login failed:', error);
        this.clearAuthState();
        return throwError(() => new Error(error.error?.message || 'Login failed'));
      })
    );
  }

  signup(username: string, password: string, fullName: string, systemRole: 'GUARDIAN' | 'VOLUNTEER' = 'VOLUNTEER', email?: string) {
    return this.http.post<AuthAccessResponse>(
      `${this.apiUrl}/signup`,
      { username, password, fullName, systemRole, email },
      { withCredentials: true }
    ).pipe(
      switchMap(response => this.consumeAccessProfile(response)),
      map(profile => profile.systemRole),
      catchError(error => {
        console.error('Signup failed:', error);
        this.clearAuthState();
        return throwError(() => new Error(error.error?.message || 'Signup failed'));
      })
    );
  }

  get systemRole() {
    return sessionStorage.getItem(this.roleKey);
  }

  get jobRole() {
    return sessionStorage.getItem(this.jobRoleKey);
  }

  get username() {
    return sessionStorage.getItem(this.usernameKey);
  }

  get fullName() {
    return sessionStorage.getItem(this.fullNameKey);
  }

  get email() {
    return sessionStorage.getItem(this.emailKey);
  }

  get displayName() {
    const fullName = this.fullName?.trim();
    if (fullName) {
      return fullName.split(/\s+/)[0];
    }
    return this.username || this.systemRole || 'Account';
  }

  get permissions(): string[] {
    const raw = sessionStorage.getItem(this.permissionsKey);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  get loggedIn() {
    return !!this.systemRole;
  }

  hasPermission(permission: string): boolean {
    if (this.isAdmin()) {
      return true;
    }
    return this.permissions.includes(permission);
  }

  hasAllPermissions(requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => this.hasPermission(permission));
  }

  logout() {
    // Ask the server to clear the HttpOnly cookie, then wipe client state.
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
      tap(() => this.clearAuthState()),
      catchError(() => {
        this.clearAuthState();
        return throwError(() => new Error('Logout failed'));
      })
    );
  }

  /**
   * Restore the session from a valid server-side cookie (e.g. after a tab is
   * reopened). Returns an Observable that emits the role on success or errors
   * if the cookie is missing/expired.
   */
  restoreSession() {
    return this.http.get<AuthAccessResponse>(`${this.apiUrl}/me`, { withCredentials: true }).pipe(
      switchMap(response => this.consumeAccessProfile(response)),
      map(profile => profile.systemRole),
      catchError(error => {
        this.clearAuthState();
        return throwError(() => error);
      })
    );
  }

  syncAccessProfile() {
    const request$ = this.loggedIn
      ? this.refreshAccessProfile().pipe(map(profile => profile.systemRole))
      : this.restoreSession();

    return request$.pipe(
      catchError(error => {
        this.clearAuthState();
        return throwError(() => error);
      })
    );
  }

  // Role checkers
  isAdmin(): boolean {
    return this.systemRole === 'ADMIN';
  }

  isVolunteer(): boolean {
    return this.systemRole === 'VOLUNTEER';
  }

  isGuardian(): boolean {
    return this.systemRole === 'GUARDIAN';
  }
}

interface AuthAccessResponse {
  systemRole?: string;
  permissions?: string[];
  jobRole?: string;
  username?: string;
  fullName?: string;
  email?: string;
}

interface AuthPermissionsResponse {
  systemRole: string;
  permissions: string[];
  jobRole?: string;
  username?: string;
  fullName?: string;
  email?: string;
}

