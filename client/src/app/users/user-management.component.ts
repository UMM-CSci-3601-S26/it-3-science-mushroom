import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, input } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { Subject, forkJoin, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../auth/auth-service';
import { JobRoleConfig, PermissionCatalogEntry, User, UserService, UserUpsertRequest } from './user.service';

type SystemRole = 'ADMIN' | 'VOLUNTEER' | 'GUARDIAN';

interface JobRoleView {
  name: string;
  permissions: string[];
  inherits: string[];
}

interface PermissionGroupView {
  group: string;
  permissions: PermissionCatalogEntry[];
}

interface PermissionBundle {
  permission: string;
  group: string;
  label: string;
  sourceLabel: string;
  permissions: string[];
  description: string;
}

// Permission bundles are higher-level permissions that implicitly grant several lower-level permissions together.
// They are not stored in the database but are a UI convenience to make it easier for admins to assign common
// sets of permissions without needing to know every individual permission required for a feature.
const PERMISSION_BUNDLES: PermissionBundle[] = [
  {
    permission: 'access_families',
    group: 'Family',
    label: 'Family Page Access',
    sourceLabel: 'Included by Family Page Access',
    permissions: ['view_families', 'view_family', 'view_dashboard_stats'],
    description: 'This opens the family page and includes the family list, family details, and family dashboard statistics.'
  },
  {
    permission: 'access_point_of_sale',
    group: 'Point of Sale',
    label: 'Point of Sale Access',
    sourceLabel: 'Included by Point of Sale',
    permissions: ['view_families', 'manage_family_help_sessions', 'view_inventory', 'view_inventory_item'],
    description: 'This opens Point of Sale and includes family lookup, family help sessions, and inventory barcode lookup.'
  },
  {
    permission: 'manage_drive_scheduling',
    group: 'Settings',
    label: 'Drive Scheduling Management',
    sourceLabel: 'Included by Drive Scheduling Management',
    permissions: ['schedule_families', 'edit_available_spots'],
    description: 'This allows volunteers to set available drive spots and run family scheduling.'
  }
];

// Hide lower-level implementation permissions from the checkbox list when a
// friendlier bundle permission grants the same access.
const HIDDEN_IMPLEMENTATION_PERMISSIONS = new Set([
  'edit_available_spots',
  'view_families',
  'view_family',
  'view_dashboard_stats',
  'view_family_checklist',
  'manage_family_help_sessions',
  'schedule_families',
  'view_checklist',
  'manage_checklist'
]);

// Fallback labels for permissions that are not in the catalog. This ensures that all permissions have a readable label
// in the UI, even if the catalog is missing entries for some permissions.
const PERMISSION_LABEL_FALLBACKS = new Map<string, string>([
  ['edit_available_spots', 'Available Spot Editing'],
  ['manage_family_help_sessions', 'Family Help Sessions'],
  ['schedule_families', 'Family Scheduling'],
  ['view_dashboard_stats', 'Dashboard Statistics'],
  ['view_families', 'Family List Viewing'],
  ['view_family', 'Family Detail Viewing'],
  ['view_inventory', 'Inventory Viewing'],
  ['view_inventory_item', 'Inventory Item Viewing']
]);

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatSelectModule,
    MatTabsModule,
  ]
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private readonly autoRefreshMs = 5000;
  private readonly destroy$ = new Subject<void>();

  section = input<'users' | 'permissions' | 'all'>('all');
  users: User[] = [];
  systemRoles: SystemRole[] = ['ADMIN', 'VOLUNTEER', 'GUARDIAN'];
  jobRoles: JobRoleView[] = [];
  groupedPermissions: PermissionGroupView[] = [];

  editingUser: User | null = null;
  selectedJobRole: JobRoleView | null = null;
  newJobRoleName = '';
  isLoading = true;
  isRefreshing = false;
  lastRefreshedAt: Date | null = null;

  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private permissionLabelByName = new Map<string, string>(PERMISSION_LABEL_FALLBACKS);

  readonly userForm = this.fb.group({
    systemRole: ['VOLUNTEER' as SystemRole, Validators.required],
    jobRole: ['volunteer_base']
  });

  ngOnInit() {
    this.loadAdminData();
    // Refresh quietly so admins see role changes made elsewhere without losing
    // their current tab or edit context.
    interval(this.autoRefreshMs)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadAdminData({ quiet: true }));

    document.addEventListener('visibilitychange', this.refreshWhenVisible);

    this.userForm.get('systemRole')?.valueChanges.subscribe(role => {
      // Only volunteers should carry a jobRole. Switching to admin/guardian
      // clears the field so the server receives the same normalized shape.
      if (role === 'VOLUNTEER') {
        const currentValue = this.userForm.get('jobRole')?.value;
        if (!currentValue) {
          this.userForm.patchValue({ jobRole: 'volunteer_base' });
        }
      } else {
        this.userForm.patchValue({ jobRole: '' });
      }
    });
  }

  // Method to build a mapping of job role names to their configurations, which is used to display job roles in the UI
  // and manage their permissions.
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('visibilitychange', this.refreshWhenVisible);
  }

  // Method to load the administrative data for the user management page, including the list of users, system roles,
  // job roles, and permission groups. It handles loading state and error notifications, and it also preserves the
  // current edit context across refreshes when possible.
  loadAdminData(options: { quiet?: boolean } = {}) {
    const quiet = options.quiet || this.users.length > 0;
    this.isLoading = !quiet;
    this.isRefreshing = quiet;
    forkJoin({
      users: this.userService.getUsers(),
      overview: this.userService.getRoleOverview()
    }).subscribe({
      next: ({ users, overview }) => {
        this.users = users;
        this.systemRoles = overview.systemRoles;
        this.jobRoles = this.mapJobRoles(overview.jobRoles);
        this.groupedPermissions = this.buildPermissionGroups(overview.permissionCatalog);
        if (this.editingUser) {
          // Preserve the edit panel across refreshes, but drop it if the user was
          // deleted by another admin.
          const refreshedUser = users.find(user => user._id === this.editingUser?._id) ?? null;
          if (refreshedUser) {
            this.startEdit(refreshedUser);
          } else {
            this.cancelEdit();
          }
        }
        this.isLoading = false;
        this.isRefreshing = false;
        this.lastRefreshedAt = new Date();
      },
      error: () => {
        this.isLoading = false;
        this.isRefreshing = false;
        this.snackBar.open('Unable to load user management data.', 'Close', { duration: 3000 });
      }
    });
  }

  // Method to refresh the administrative data when the document becomes visible again, ensuring that
  // admins see the most up-to-date information after switching back to the tab.
  private refreshWhenVisible = () => {
    if (document.visibilityState === 'visible') {
      this.loadAdminData({ quiet: true });
    }
  };

  // Method to map the job roles received from the server into a format suitable for display and interaction in the UI.
  startEdit(user: User) {
    this.editingUser = user;
    this.userForm.reset({
      systemRole: user.systemRole,
      jobRole: user.jobRole ?? 'volunteer_base'
    });
  }

  // Method to cancel the editing of a user, resetting the form and clearing the editing state.
  cancelEdit() {
    this.editingUser = null;
    this.userForm.reset({
      systemRole: 'VOLUNTEER',
      jobRole: 'volunteer_base'
    });
  }

  // Method to submit the changes made to a user's roles, handling validation, error notifications,
  // and updating the administrative data. It also includes a client-side check to prevent removing
  // the last admin role from the system, which mirrors a server-side protection.
  submit() {
    if (this.userForm.invalid || !this.editingUser) {
      this.userForm.markAllAsTouched();
      return;
    }

    if (this.isEditingOnlyAdmin && this.userForm.get('systemRole')?.value !== 'ADMIN') {
      this.snackBar.open('At least one admin account must remain in the system.', 'Close', { duration: 3500 });
      return;
    }

    const payload = this.buildUserPayload();
    const request$ = this.userService.updateUser(this.editingUser._id, payload);

    request$.subscribe({
      next: () => {
        this.snackBar.open('User role updated.', 'Close', { duration: 2500 });
        this.loadAdminData();
      },
      error: error => {
        this.snackBar.open(error.error?.message || 'Unable to save user.', 'Close', { duration: 3500 });
      }
    });
  }

  // Method to determine if the user being edited is the only admin in the system, which is used to prevent removing
  // the last admin account.
  canDeleteUser(user: User): boolean {
    return !this.isOnlyAdmin(user);
  }

  // Method to check if the specified user is the only admin in the system by counting the number of users with the admin role.
  deleteUser(user: User) {
    if (!this.canDeleteUser(user)) {
      this.snackBar.open('At least one admin account must remain in the system.', 'Close', { duration: 3500 });
      return;
    }
    if (!confirm(`Delete user ${user.username}?`)) {
      return;
    }

    this.userService.deleteUser(user._id).subscribe({
      next: () => {
        this.snackBar.open('User deleted.', 'Close', { duration: 2500 });
        if (this.editingUser?._id === user._id) {
          this.cancelEdit();
        }
        this.loadAdminData();
      },
      error: error => {
        this.snackBar.open(error.error?.message || 'Unable to delete user.', 'Close', { duration: 3500 });
      }
    });
  }

  // Method to build the payload for updating a user's roles based on the form values, ensuring that the payload
  // is correctly structured for the server.
  selectJobRole(role: JobRoleView) {
    // Work on a copy so unsaved checkbox changes do not mutate the list view.
    this.selectedJobRole = {
      name: role.name,
      permissions: [...role.permissions],
      inherits: [...role.inherits]
    };
  }

  saveSelectedJobRole() {
    if (!this.selectedJobRole) {
      return;
    }

    const inherits = this.selectedJobRole.name === 'volunteer_base'
      ? []
      : (this.selectedJobRole.inherits.length ? this.selectedJobRole.inherits : ['volunteer_base']);

    // Sort permissions before saving to keep the Mongo document stable and easy
    // to diff in seed/export workflows.
    const config: JobRoleConfig = {
      permissions: [...this.selectedJobRole.permissions].sort(),
      inherits
    };

    this.userService.saveJobRole(this.selectedJobRole.name, config).subscribe({
      next: () => {
        this.snackBar.open('Job role saved.', 'Close', { duration: 2500 });
        this.selectedJobRole = null;
        this.loadAdminData();
      },
      error: error => {
        this.snackBar.open(error.error?.message || 'Unable to save job role.', 'Close', { duration: 3500 });
      }
    });
  }

  createJobRole() {
    const name = this.toRoleKey(this.newJobRoleName);
    if (!name) {
      return;
    }
    if (this.jobRoles.some(role => role.name === name)) {
      this.snackBar.open('That job role already exists.', 'Close', { duration: 2500 });
      return;
    }

    // New job roles inherit volunteer_base by default so they keep the baseline
    // access needed by ordinary volunteer workflows.
    this.userService.saveJobRole(name, { permissions: [], inherits: ['volunteer_base'] }).subscribe({
      next: () => {
        this.newJobRoleName = '';
        this.snackBar.open('Job role created.', 'Close', { duration: 2500 });
        this.loadAdminData();
      },
      error: error => {
        this.snackBar.open(error.error?.message || 'Unable to create job role.', 'Close', { duration: 3500 });
      }
    });
  }

  deleteJobRole(name: string) {
    if (name === 'volunteer_base') {
      // volunteer_base is the fallback role for volunteers and must always exist.
      return;
    }
    if (!confirm(`Delete job role ${this.formatRoleName(name)}?`)) {
      return;
    }

    this.userService.deleteJobRole(name).subscribe({
      next: () => {
        this.snackBar.open('Job role deleted.', 'Close', { duration: 2500 });
        if (this.selectedJobRole?.name === name) {
          this.selectedJobRole = null;
        }
        this.loadAdminData();
      },
      error: error => {
        this.snackBar.open(error.error?.message || 'Unable to delete job role.', 'Close', { duration: 3500 });
      }
    });
  }

  // Method to toggle a permission for the selected job role, handling both enabling and disabling permissions,
  // as well as managing permission bundles and ensuring that the UI reflects the current state of permissions accurately.
  togglePermission(permission: string, enabled: boolean, event?: MatCheckboxChange) {
    if (!this.selectedJobRole) {
      return;
    }

    if (enabled) {
      if (this.isBundlePermission(permission)) {
        // Bundle permissions add several implementation permissions together so
        // admins do not have to know every low-level route permission.
        const enabledBundle = this.enablePermissionBundle(permission);
        if (!enabledBundle && event) {
          event.source.checked = false;
        }
        return;
      }
      if (!this.selectedJobRole.permissions.includes(permission)) {
        this.selectedJobRole.permissions.push(permission);
      }
      return;
    }

    this.selectedJobRole.permissions = this.selectedJobRole.permissions.filter(item => item !== permission);
  }

  // Method to check if a permission is a bundle permission, which grants multiple underlying permissions together.
  isSelectedPermission(permission: string): boolean {
    return this.selectedJobRole?.permissions.includes(permission) ?? false;
  }

  // Method to check if a permission is a bundle permission, which grants multiple underlying permissions together.
  isInheritedPermission(permission: string): boolean {
    if (!this.selectedJobRole || this.selectedJobRole.name === 'volunteer_base') {
      return false;
    }
    return this.basePermissions.has(permission);
  }

  // Method to check if a permission is a bundle permission, which grants multiple underlying permissions together.
  isPointOfSaleBundledPermission(permission: string): boolean {
    return this.bundleSourceLabel(permission) === 'Included by Point of Sale';
  }

  // Method to check if a permission is a bundle permission, which grants multiple underlying permissions together.
  isPermissionLocked(permission: string): boolean {
    return this.isInheritedPermission(permission) || !!this.bundleSourceLabel(permission);
  }

  // Method to enable a permission bundle, which adds all underlying permissions to the selected job role. It returns
  // true if the bundle was successfully enabled, or false if the permission is not a recognized bundle.
  permissionSourceLabel(permission: string): string {
    if (this.isInheritedPermission(permission)) {
      return 'Included by volunteer base';
    }
    return this.bundleSourceLabel(permission);
  }

  get isVolunteerForm(): boolean {
    return this.userForm.get('systemRole')?.value === 'VOLUNTEER';
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get showUsersSection(): boolean {
    return this.section() === 'users' || this.section() === 'all';
  }

  get showPermissionsSection(): boolean {
    return this.section() === 'permissions' || this.section() === 'all';
  }

  get adminCount(): number {
    return this.users.filter(user => user.systemRole === 'ADMIN').length;
  }

  isOnlyAdmin(user: User | null): boolean {
    return !!user && user.systemRole === 'ADMIN' && this.adminCount === 1;
  }

  get availableSystemRoles(): SystemRole[] {
    if (this.isOnlyAdmin(this.editingUser)) {
      // Client-side guard mirrors the server's last-admin protection and gives
      // immediate feedback before a save attempt.
      return ['ADMIN'];
    }
    return this.systemRoles;
  }

  get isEditingOnlyAdmin(): boolean {
    return this.isOnlyAdmin(this.editingUser);
  }

  get basePermissions(): Set<string> {
    const volunteerBase = this.jobRoles.find(role => role.name === 'volunteer_base');
    return new Set(volunteerBase?.permissions ?? []);
  }

  formatRoleName(role: string | null | undefined): string {
    if (!role) {
      return '';
    }

    return role
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  formatSystemRole(role: string | null | undefined): string {
    return this.formatRoleName(role);
  }

  formatRoleList(roles: string[]): string {
    if (roles.length === 0) {
      return 'No inherited roles';
    }
    return roles.map(role => this.formatRoleName(role)).join(', ');
  }

  toRoleKey(roleName: string): string {
    return roleName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  trackByUserId(index: number, user: User) {
    return user._id;
  }

  trackByRoleName(index: number, role: JobRoleView) {
    return role.name;
  }

  private buildUserPayload(): UserUpsertRequest {
    const raw = this.userForm.getRawValue();
    if (!this.editingUser) {
      throw new Error('Cannot build a user payload without a selected user');
    }
    return {
      // The current form edits only roles, so preserve identity fields from the
      // selected user record.
      username: this.editingUser.username,
      fullName: this.editingUser.fullName,
      email: this.editingUser.email ?? null,
      systemRole: (raw.systemRole || 'VOLUNTEER') as SystemRole,
      jobRole: raw.systemRole === 'VOLUNTEER' ? (this.toRoleKey(raw.jobRole ?? '') || 'volunteer_base') : null
    };
  }

  private mapJobRoles(jobRoles: Record<string, JobRoleConfig>): JobRoleView[] {
    return Object.entries(jobRoles)
      .map(([name, config]) => ({
        name,
        permissions: [...(config.permissions ?? [])].sort(),
        inherits: [...(config.inherits ?? [])]
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private buildPermissionGroups(permissionCatalog: PermissionCatalogEntry[]) {
    const groupOrder = ['Family', 'Point of Sale', 'Inventory', 'Supply List', 'Checklist', 'Reports', 'Settings'];
    const grouped = new Map<string, PermissionCatalogEntry[]>();
    this.permissionLabelByName = new Map<string, string>(PERMISSION_LABEL_FALLBACKS);
    for (const permission of permissionCatalog) {
      this.permissionLabelByName.set(permission.permission, permission.label);
    }
    const assignablePermissions = permissionCatalog.filter(entry =>
      entry.volunteerAssignable && !HIDDEN_IMPLEMENTATION_PERMISSIONS.has(entry.permission)
    );

    // Add friendly bundle permissions even though the server ultimately enforces
    // the lower-level permissions they expand to.
    for (const bundle of PERMISSION_BUNDLES) {
      if (!assignablePermissions.some(entry => entry.permission === bundle.permission)) {
        assignablePermissions.push({
          permission: bundle.permission,
          group: bundle.group,
          label: bundle.label,
          volunteerAssignable: true
        });
      }
    }

    for (const permission of assignablePermissions) {
      const group = grouped.get(permission.group) ?? [];
      group.push(permission);
      grouped.set(permission.group, group);
    }

    return Array.from(grouped.entries())
      .map(([group, permissions]) => ({
        group,
        permissions: permissions.sort((a, b) => a.label.localeCompare(b.label))
      }))
      .sort((a, b) => {
        const aIndex = groupOrder.includes(a.group) ? groupOrder.indexOf(a.group) : groupOrder.length;
        const bIndex = groupOrder.includes(b.group) ? groupOrder.indexOf(b.group) : groupOrder.length;
        return aIndex - bIndex || a.group.localeCompare(b.group);
      });
  }

  private enablePermissionBundle(permission: string): boolean {
    if (!this.selectedJobRole) {
      return false;
    }

    const bundle = PERMISSION_BUNDLES.find(candidate => candidate.permission === permission);
    if (!bundle) {
      return false;
    }

    const missingPermissions = bundle.permissions
      .filter(permission => !this.selectedJobRole!.permissions.includes(permission));
    // Confirm before expanding a bundle because enabling one visible checkbox
    // may add several route-level permissions.
    const missingPermissionLabels = missingPermissions.map(permission => this.permissionLabel(permission));
    const message = missingPermissions.length === 0
      ? `${bundle.label} is a bundle permission. ${bundle.description} Enable it?`
      : `${bundle.label} will also add these required permissions: ${missingPermissionLabels.join(', ')}. Enable it?`;

    if (!confirm(message)) {
      return false;
    }

    this.addPermission(bundle.permission);
    for (const bundledPermission of bundle.permissions) {
      this.addPermission(bundledPermission);
    }
    return true;
  }

  private addPermission(permission: string) {
    if (!this.selectedJobRole?.permissions.includes(permission)) {
      this.selectedJobRole?.permissions.push(permission);
    }
  }

  private isBundlePermission(permission: string): boolean {
    return PERMISSION_BUNDLES.some(bundle => bundle.permission === permission);
  }

  private bundleSourceLabel(permission: string): string {
    if (!this.selectedJobRole) {
      return '';
    }

    const bundle = PERMISSION_BUNDLES.find(candidate =>
      this.selectedJobRole!.permissions.includes(candidate.permission)
        && candidate.permissions.includes(permission)
    );
    return bundle?.sourceLabel ?? '';
  }

  private permissionLabel(permission: string): string {
    return this.permissionLabelByName.get(permission) ?? permission;
  }
}
