// Angular Imports
import { Component, DestroyRef, HostListener, inject, OnInit } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRouteSnapshot, Route, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth-service';
import { Family } from './family/family';
import { DeleteRequestNotificationService } from './family/delete-request-notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    RouterOutlet,
    MatSnackBarModule
  ]
})

export class AppComponent implements OnInit {
  title = 'Ready 4 Learning Interface';
  authService = inject(AuthService);
  router = inject(Router);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  private clipboard = inject(Clipboard);
  private snackBar = inject(MatSnackBar);

  copyVolunteerSignUpLink() {
    const link = window.location.origin + '/sign-up';
    this.clipboard.copy(link);
    this.snackBar.open('Volunteer sign-up link copied!', 'Close', { duration: 2500 });
  }
  private deleteRequestNotifications = inject(DeleteRequestNotificationService);
  pendingDeleteRequestCount = 0;

  ngOnInit(): void {
    this.deleteRequestNotifications.changes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshDeleteRequestCount());
    this.syncAccessProfileSilently();
  }

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

  @HostListener('window:focus')
  onWindowFocus() {
    this.syncAccessProfileSilently();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      this.syncAccessProfileSilently();
    }
  }

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

  get isAdmin() {
    return this.authService.systemRole === 'ADMIN';
  }

  canAccessPath(path: string): boolean {
    const normalizedPath = path.replace(/^\//, '');
    const route = this.router.config.find(candidate => candidate.path === normalizedPath);
    return this.evaluateAccess(route?.data) === 'allow';
  }

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

  private deepestRoute(snapshot: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    let current = snapshot;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
  }
}
