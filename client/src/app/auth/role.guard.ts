/**
 * RoleGuard — prevents users with insufficient role from accessing a route.
 *
 * How it works
 * ------------
 * Routes that require a specific role use the following config pattern:
 *
 *   { path: 'dashboard', canActivate: [AuthGuard, RoleGuard],
 *     data: { roles: ['admin'] }, component: DashboardComponent }
 *
 * RoleGuard reads the allowed roles from route.data['roles'] and compares
 * them against AuthService.role (stored in sessionStorage after login).
 *
 *  - If the user is not logged in at all, AuthGuard (which runs first) will
 *    have already redirected them to /login — RoleGuard is not reached.
 *  - If the user IS logged in but has the wrong role, RoleGuard redirects
 *    to '/' (the home page) so they see a graceful denial instead of a
 *    blank screen.
 *
 * IMPORTANT: Like AuthGuard, this is UI-only.  The server enforces role
 * requirements independently via AuthMiddleware.requireRole().
 */
import { inject, Injectable } from "@angular/core";
import { CanActivate, Router, ActivatedRouteSnapshot } from "@angular/router";
import { catchError, map, of } from "rxjs";
import { AuthService } from "./auth-service";

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  authService = inject(AuthService);
  router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot) {
    return this.authService.syncAccessProfile().pipe(
      map(() => {
        const allowed = (route.data['roles'] as string[] | undefined) ?? [];
        if (!this.authService.loggedIn) {
          this.router.navigate(['/login']);
          return false;
        }
        if (allowed.length > 0 && !allowed.includes(this.authService.systemRole!)) {
          this.router.navigate(['/']);
          return false;
        }

        const requiredPermissions = (route.data['permissions'] as string[] | undefined) ?? [];
        if (requiredPermissions.length > 0 && !this.authService.hasAllPermissions(requiredPermissions)) {
          this.router.navigate(['/']);
          return false;
        }

        return true;
      }),
      catchError(() => {
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
