import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, input } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { forkJoin } from 'rxjs';
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
export class UserManagementComponent implements OnInit {
  section = input<'users' | 'permissions' | 'all'>('all');
  users: User[] = [];
  systemRoles: SystemRole[] = ['ADMIN', 'VOLUNTEER', 'GUARDIAN'];
  jobRoles: JobRoleView[] = [];
  groupedPermissions: PermissionGroupView[] = [];

  editingUser: User | null = null;
  selectedJobRole: JobRoleView | null = null;
  newJobRoleName = '';
  isLoading = true;

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
    this.userForm.get('systemRole')?.valueChanges.subscribe(role => {
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

  loadAdminData() {
    this.isLoading = true;
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
          const refreshedUser = users.find(user => user._id === this.editingUser?._id) ?? null;
          if (refreshedUser) {
            this.startEdit(refreshedUser);
          } else {
            this.cancelEdit();
          }
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Unable to load user management data.', 'Close', { duration: 3000 });
      }
    });
  }

  startEdit(user: User) {
    this.editingUser = user;
    this.userForm.reset({
      systemRole: user.systemRole,
      jobRole: user.jobRole ?? 'volunteer_base'
    });
  }

  cancelEdit() {
    this.editingUser = null;
    this.userForm.reset({
      systemRole: 'VOLUNTEER',
      jobRole: 'volunteer_base'
    });
  }

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

  canDeleteUser(user: User): boolean {
    return !this.isOnlyAdmin(user);
  }

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

  selectJobRole(role: JobRoleView) {
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

  togglePermission(permission: string, enabled: boolean, event?: MatCheckboxChange) {
    if (!this.selectedJobRole) {
      return;
    }

    if (enabled) {
      if (this.isBundlePermission(permission)) {
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

  isSelectedPermission(permission: string): boolean {
    return this.selectedJobRole?.permissions.includes(permission) ?? false;
  }

  isInheritedPermission(permission: string): boolean {
    if (!this.selectedJobRole || this.selectedJobRole.name === 'volunteer_base') {
      return false;
    }
    return this.basePermissions.has(permission);
  }

  isPointOfSaleBundledPermission(permission: string): boolean {
    return this.bundleSourceLabel(permission) === 'Included by Point of Sale';
  }

  isPermissionLocked(permission: string): boolean {
    return this.isInheritedPermission(permission) || !!this.bundleSourceLabel(permission);
  }

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
