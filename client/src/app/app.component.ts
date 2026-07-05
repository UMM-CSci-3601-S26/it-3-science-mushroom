// Angular Imports
import { Component, DestroyRef, HostListener, inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRouteSnapshot, Route, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth-service';
import { Family } from './family/family';
// import { MatDivider } from "@angular/material/divider";
import { DeleteRequestNotificationService } from './family/family-management/delete-family/delete-request-notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type ResolvedTheme = 'light' | 'dark' | 'r4l-poster' | 'r4l-poster-dark';
type AppMode = 'light' | 'dark';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    RouterOutlet,
    MatSnackBarModule,
    MatDividerModule,
    MatButtonModule,
    MatBadgeModule,
    MatDividerModule,
    MatMenuModule,
    MatSlideToggleModule,
    RouterOutlet,
    MatSnackBarModule
  ]
})

/**
 * AppComponent is the root component of the application. It manages the main layout,
 * handles user authentication state, and controls access to different routes based on
 * user roles and permissions. It also listens for changes in delete request notifications
 * and updates the UI accordingly.
 */

export class AppComponent implements OnInit {
  title = 'Ready 4 Learning Interface';
  authService = inject(AuthService);
  router = inject(Router);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  private clipboard = inject(Clipboard);
  private snackBar = inject(MatSnackBar);

  // Color mode and visual style are stored separately so users can keep
  // their preferred contrast mode while choosing between Calm and Retro.
  currentMode: AppMode = 'light';
  posterStyleEnabled = true;
  private document = inject(DOCUMENT);
  private readonly modeStorageKey = 'r4l-color-mode';
  private readonly posterStyleStorageKey = 'r4l-poster-style';

  // Method to copy the volunteer sign-up link to the clipboard and show a confirmation message
  copyVolunteerSignUpLink() {
    const link = window.location.origin + '/sign-up';
    this.clipboard.copy(link);
    this.snackBar.open('Volunteer sign-up link copied!', 'Close', { duration: 2500 });
  }
  private deleteRequestNotifications = inject(DeleteRequestNotificationService);
  pendingDeleteRequestCount = 0;

  ngOnInit(): void {
    // Apply the theme class before the rest of the shell work so Material and
    // custom token styles agree as soon as the app renders.
    this.initializeTheme();
    this.deleteRequestNotifications.changes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshDeleteRequestCount());
    this.syncAccessProfileSilently();
  }

  setDarkMode(enabled: boolean) {
    this.currentMode = enabled ? 'dark' : 'light';
    this.applyThemeFromPreferences();
  }

  toggleDarkMode() {
    this.setDarkMode(this.currentMode !== 'dark');
  }

  get darkModeToggleIcon() {
    return this.currentMode === 'dark' ? 'light_mode' : 'dark_mode';
  }

  get darkModeToggleLabel() {
    return this.currentMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }

  setPosterStyle(enabled: boolean) {
    this.posterStyleEnabled = enabled;
    this.applyThemeFromPreferences();
  }

  // Method to log out the user, clear pending delete request count, and navigate to the login page
  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.pendingDeleteRequestCount = 0;
        this.router.navigate(['/login']);
      },
      error: () => {
        this.pendingDeleteRequestCount = 0;
        this.router.navigate(['/login']);
      }
    });
  }

  // Method to refresh the count of pending delete requests by fetching them from the server
  refreshDeleteRequestCount() {
    if (!this.authService.hasPermission('delete_family')) {
      this.pendingDeleteRequestCount = 0;
      return;
    }

    this.http.get<Family[]>('/api/family/delete-requests').subscribe({
      next: requests => {
        this.pendingDeleteRequestCount = requests.length;
      },
      error: () => {
        this.pendingDeleteRequestCount = 0;
      }
    });
  }

  // Host listener for window focus to synchronize the access profile and refresh delete request count
  @HostListener('window:focus')
  onWindowFocus() {
    this.syncAccessProfileSilently();
  }

  // Host listener for document visibility change to synchronize the access profile and refresh
  // delete request count when the user returns to the tab
  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      this.syncAccessProfileSilently();
    }
  }

  // Method to synchronize the user's access profile with the server without interrupting the user
  // experience, and then enforce route access and refresh delete request count
  private syncAccessProfileSilently() {
    this.authService.syncAccessProfile().subscribe({
      next: () => {
        this.enforceRouteAccess();
        this.refreshDeleteRequestCount();
      },
      error: () => {
        this.pendingDeleteRequestCount = 0;
        this.enforceRouteAccess();
      }
    });
  }

  // Initialize separate appearance preferences and apply the resolved root class
  // before the rest of the shell renders.
  private initializeTheme() {
    const savedMode = localStorage.getItem(this.modeStorageKey);
    const savedPosterStyle = localStorage.getItem(this.posterStyleStorageKey);

    if (savedMode === 'dark' || savedMode === 'light') {
      this.currentMode = savedMode;
    } else {
      this.currentMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Retro is the public default; a saved preference switches users back to
    // Calm only when they have explicitly chosen it.
    if (savedPosterStyle === 'true' || savedPosterStyle === 'false') {
      this.posterStyleEnabled = savedPosterStyle === 'true';
    }

    this.applyThemeFromPreferences();
  }

  private applyThemeFromPreferences() {
    const theme: ResolvedTheme = this.posterStyleEnabled
      ? this.currentMode === 'dark' ? 'r4l-poster-dark' : 'r4l-poster'
      : this.currentMode;

    this.applyTheme(theme);
  }

  // The root classes are used by styles.scss to scope both Material color
  // mixins and app CSS variables.
  private applyTheme(theme: ResolvedTheme) {
    const root = this.document.documentElement;

    root.classList.toggle('app-theme-dark', theme === 'dark');
    root.classList.toggle('app-theme-light', theme === 'light');
    root.classList.toggle('app-theme-r4l-poster', theme === 'r4l-poster');
    root.classList.toggle('app-theme-r4l-poster-dark', theme === 'r4l-poster-dark');

    localStorage.setItem(this.modeStorageKey, this.currentMode);
    localStorage.setItem(this.posterStyleStorageKey, String(this.posterStyleEnabled));
  }

  // Method to enforce route access based on the user's authentication status, roles, and permissions.
  // It evaluates the access requirements of the current route and redirects the user to the appropriate
  // page if they do not have access.
  private enforceRouteAccess() {
    const snapshot = this.deepestRoute(this.router.routerState.snapshot.root);
    const access = this.evaluateAccess(snapshot.data);

    if (access === 'login') {
      this.router.navigate(['/login']);
      return;
    }

    if (access === 'deny') {
      this.router.navigate(['/']);
    }
  }

  // Getter to determine if the current user has an admin role
  get isAdmin() {
    return this.authService.systemRole === 'ADMIN';
  }

  // Method to check if the user can access a specific path based on the route configuration and the
  // user's authentication status, roles, and permissions
  canAccessPath(path: string): boolean {
    const normalizedPath = path.replace(/^\//, '');
    const route = this.router.config.find(candidate => candidate.path === normalizedPath);
    return this.evaluateAccess(route?.data) === 'allow';
  }

  // Method to evaluate the access requirements of a route based on its data properties (roles and
  // permissions) and the user's authentication status, roles, and permissions. It returns 'allow'
  // if access is granted, 'login' if the user needs to log in, and 'deny' if access is denied.
  private evaluateAccess(data?: Route['data']): 'allow' | 'login' | 'deny' {
    const allowed = (data?.['roles'] as string[] | undefined) ?? [];
    const requiredPermissions = (data?.['permissions'] as string[] | undefined) ?? [];

    if (allowed.length === 0 && requiredPermissions.length === 0) {
      return 'allow';
    }

    if (!this.authService.loggedIn) {
      return 'login';
    }

    if (allowed.length > 0 && !allowed.includes(this.authService.systemRole!)) {
      return 'deny';
    }

    if (requiredPermissions.length > 0 && !this.authService.hasAllPermissions(requiredPermissions)) {
      return 'deny';
    }

    return 'allow';
  }

  // Method to find the deepest child route snapshot, which represents the currently active route,
  // by traversing the route snapshot tree
  private deepestRoute(snapshot: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    let current = snapshot;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
  }
}
