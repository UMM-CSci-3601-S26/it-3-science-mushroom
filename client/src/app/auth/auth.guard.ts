/**
 * AuthGuard — prevents unauthenticated users from reaching protected routes.
 *
 * How it works
 * ------------
 * CanActivate is called by the Angular router before activating any route that
 * has "canActivate: [AuthGuard]" in its route config.
 *
 * The guard checks AuthService.loggedIn, which returns true when a role value
 * exists in sessionStorage.  If no role is present (user has never logged in,
 * or the tab was reopened after closing), the guard redirects to /login.
 *
 * IMPORTANT: This is a UI-only guard.  It controls which components the user
 * can navigate to, but it does NOT replace server-side enforcement.  Every
 * API call is independently validated by AuthMiddleware on the server.
 */
import { inject, Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { catchError, map, of } from "rxjs";
import { AuthService } from "./auth-service";

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  authService = inject(AuthService);
  router = inject(Router);

  canActivate() {
    if (this.authService.loggedIn) {
      return true;
    }

    return this.authService.syncAccessProfile().pipe(
      map(() => true),
      catchError(() => {
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
