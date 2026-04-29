import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, input } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
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

  togglePermission(permission: string, enabled: boolean) {
    if (!this.selectedJobRole) {
      return;
    }

    if (enabled) {
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
    const groupOrder = ['Family', 'Inventory', 'Supply List', 'Checklist', 'Reports', 'Settings'];
    const grouped = new Map<string, PermissionCatalogEntry[]>();

    for (const permission of permissionCatalog.filter(entry => entry.volunteerAssignable)) {
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
}
