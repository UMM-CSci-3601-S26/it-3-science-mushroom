import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { AuthService } from '../auth/auth-service';
import { UserManagementComponent } from './user-management.component';
import {
  AllRolePermissionsResponse,
  JobRoleConfig,
  PermissionCatalogEntry,
  User,
  UserUpsertRequest,
  UserService,
} from './user.service';

type UserManagementInternals = {
  buildUserPayload: () => UserUpsertRequest;
  mapJobRoles: (jobRoles: Record<string, JobRoleConfig>) => Array<{
    name: string;
    permissions: string[];
    inherits: string[];
  }>;
  buildPermissionGroups: (permissionCatalog: PermissionCatalogEntry[]) => Array<{
    group: string;
    permissions: PermissionCatalogEntry[];
  }>;
};

type UserManagementInjectedServices = {
  snackBar: jasmine.SpyObj<MatSnackBar>;
};

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let authService: jasmine.SpyObj<AuthService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let componentInternals: UserManagementInternals;

  const users: User[] = [
    {
      _id: 'u1',
      username: 'volunteer1',
      fullName: 'Volunteer One',
      email: 'volunteer1@example.com',
      systemRole: 'VOLUNTEER',
      jobRole: 'pickup_helper'
    },
    {
      _id: 'u2',
      username: 'admin1',
      fullName: 'Admin One',
      email: 'admin1@example.com',
      systemRole: 'ADMIN',
      jobRole: null
    }
  ];

  const overview: AllRolePermissionsResponse = {
    systemRoles: ['ADMIN', 'VOLUNTEER', 'GUARDIAN'],
    jobRoles: {
      pickup_helper: {
        permissions: ['families.view', 'inventory.view'],
        inherits: ['volunteer_base']
      },
      volunteer_base: {
        permissions: ['families.view', 'settings.read'],
        inherits: []
      }
    },
    permissionCatalog: [
      { permission: 'edit_family', group: 'Family', label: 'Family Editing', volunteerAssignable: true },
      { permission: 'view_families', group: 'Family', label: 'Family List Viewing', volunteerAssignable: true },
      { permission: 'view_dashboard_stats', group: 'Family', label: 'Dashboard Statistics', volunteerAssignable: true },
      { permission: 'schedule_families', group: 'Family', label: 'Family Scheduling', volunteerAssignable: true },
      { permission: 'manage_checklist', group: 'Checklist', label: 'Checklist Management', volunteerAssignable: true },
      { permission: 'edit_available_spots', group: 'Settings', label: 'Available Spot Editing', volunteerAssignable: true },
      { permission: 'view_inventory', group: 'Inventory', label: 'Inventory Viewing', volunteerAssignable: true },
      { permission: 'secret.admin', group: 'Settings', label: 'Secret admin', volunteerAssignable: false }
    ]
  };

  beforeEach(async () => {
    userService = jasmine.createSpyObj<UserService>('UserService', [
      'getUsers',
      'getRoleOverview',
      'updateUser',
      'deleteUser',
      'saveJobRole',
      'deleteJobRole'
    ]);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isAdmin']);
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    userService.getUsers.and.returnValue(of(users));
    userService.getRoleOverview.and.returnValue(of(overview));
    userService.updateUser.and.returnValue(of(users[0]));
    userService.deleteUser.and.returnValue(of(void 0));
    userService.saveJobRole.and.returnValue(of(void 0));
    userService.deleteJobRole.and.returnValue(of(void 0));
    authService.isAdmin.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [UserManagementComponent, NoopAnimationsModule],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: AuthService, useValue: authService },
        { provide: MatSnackBar, useValue: snackBar }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);

    component = fixture.componentInstance;
    componentInternals = component as unknown as UserManagementInternals;
    (component as unknown as UserManagementInjectedServices).snackBar = snackBar;
    fixture.detectChanges();
  });

  it('loads admin data on init and maps roles and permissions', () => {
    expect(userService.getUsers).toHaveBeenCalled();
    expect(userService.getRoleOverview).toHaveBeenCalled();
    expect(component.users).toEqual(users);
    expect(component.jobRoles.map(role => role.name)).toEqual(['pickup_helper', 'volunteer_base']);
    expect(component.groupedPermissions.map(group => group.group)).toEqual(['Family', 'Point of Sale', 'Inventory', 'Settings']);
    expect(component.groupedPermissions.flatMap(group => group.permissions.map(permission => permission.permission)))
      .not.toContain('manage_checklist');
    expect(component.groupedPermissions.flatMap(group => group.permissions.map(permission => permission.permission)))
      .not.toContain('view_dashboard_stats');
    expect(component.groupedPermissions.flatMap(group => group.permissions.map(permission => permission.permission)))
      .not.toContain('schedule_families');
    expect(component.groupedPermissions.flatMap(group => group.permissions.map(permission => permission.permission)))
      .not.toContain('edit_available_spots');
    expect(component.isLoading).toBeFalse();
  });

  it('refreshes the selected user when reloading admin data', () => {
    component.startEdit(users[0]);
    userService.getUsers.and.returnValue(of([
      { ...users[0], fullName: 'Volunteer One Updated' },
      users[1]
    ]));

    component.loadAdminData();

    expect(component.editingUser?.fullName).toBe('Volunteer One Updated');
    expect(component.userForm.getRawValue()).toEqual({
      systemRole: 'VOLUNTEER',
      jobRole: 'pickup_helper'
    });
  });

  it('clears the selected user when refresh no longer finds it', () => {
    component.startEdit(users[0]);
    userService.getUsers.and.returnValue(of([users[1]]));

    component.loadAdminData();

    expect(component.editingUser).toBeNull();
    expect(component.userForm.getRawValue()).toEqual({
      systemRole: 'VOLUNTEER',
      jobRole: 'volunteer_base'
    });
  });

  it('shows an error when admin data fails to load', () => {
    userService.getUsers.and.returnValue(throwError(() => new Error('load failed')));

    component.loadAdminData();

    expect(component.isLoading).toBeFalse();
    expect(snackBar.open).toHaveBeenCalledWith('Unable to load user management data.', 'Close', { duration: 3000 });
  });

  it('switches the job role field based on system role changes', () => {
    component.userForm.patchValue({ jobRole: 'pickup_helper' });
    component.userForm.get('systemRole')?.setValue('ADMIN');
    expect(component.userForm.get('jobRole')?.value).toBe('');

    component.userForm.get('jobRole')?.setValue('');
    component.userForm.get('systemRole')?.setValue('VOLUNTEER');
    expect(component.userForm.get('jobRole')?.value).toBe('volunteer_base');
  });

  it('starts and cancels editing with the expected defaults', () => {
    component.startEdit(users[1]);
    expect(component.editingUser?._id).toBe('u2');
    expect(component.userForm.getRawValue()).toEqual({
      systemRole: 'ADMIN',
      jobRole: 'volunteer_base'
    });

    component.cancelEdit();
    expect(component.editingUser).toBeNull();
    expect(component.userForm.getRawValue()).toEqual({
      systemRole: 'VOLUNTEER',
      jobRole: 'volunteer_base'
    });
  });

  it('reports the only admin and limits editable roles to admin', () => {
    component.users = [users[1]];
    component.startEdit(users[1]);

    expect(component.adminCount).toBe(1);
    expect(component.isOnlyAdmin(users[1])).toBeTrue();
    expect(component.isEditingOnlyAdmin).toBeTrue();
    expect(component.availableSystemRoles).toEqual(['ADMIN']);
  });

  it('marks the form touched and does not submit without a selected user', () => {
    spyOn(component.userForm, 'markAllAsTouched');
    component.editingUser = null;

    component.submit();

    expect(component.userForm.markAllAsTouched).toHaveBeenCalled();
    expect(userService.updateUser).not.toHaveBeenCalled();
  });

  it('submits role updates and reloads the data on success', () => {
    const reloadSpy = spyOn(component, 'loadAdminData');
    component.startEdit(users[0]);
    component.userForm.patchValue({ systemRole: 'ADMIN' });

    component.submit();

    expect(userService.updateUser).toHaveBeenCalledWith('u1', {
      username: 'volunteer1',
      fullName: 'Volunteer One',
      email: 'volunteer1@example.com',
      systemRole: 'ADMIN',
      jobRole: null
    });
    expect(snackBar.open).toHaveBeenCalledWith('User role updated.', 'Close', { duration: 2500 });
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('shows the backend message when saving a user fails', () => {
    userService.updateUser.and.returnValue(throwError(() => ({ error: { message: 'Nope' } })));
    component.startEdit(users[0]);

    component.submit();

    expect(snackBar.open).toHaveBeenCalledWith('Nope', 'Close', { duration: 3500 });
  });

  it('blocks demoting the last admin before submitting to the API', () => {
    component.users = [users[1]];
    component.startEdit(users[1]);
    component.userForm.patchValue({ systemRole: 'VOLUNTEER', jobRole: 'volunteer_base' });

    component.submit();

    expect(userService.updateUser).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('At least one admin account must remain in the system.', 'Close', { duration: 3500 });
  });

  it('clones a selected job role and manages permission toggles', () => {
    component.selectJobRole(component.jobRoles[0]);
    const originalPermissions = component.jobRoles[0].permissions;

    component.togglePermission('inventory.edit', true);
    component.togglePermission('families.view', true);
    component.togglePermission('families.view', false);

    expect(component.selectedJobRole).not.toBe(component.jobRoles[0]);
    expect(originalPermissions).toEqual(['families.view', 'inventory.view']);
    expect(component.selectedJobRole?.permissions).toEqual(['inventory.view', 'inventory.edit']);
    expect(component.isSelectedPermission('inventory.edit')).toBeTrue();
    expect(component.isInheritedPermission('settings.read')).toBeTrue();
    expect(component.basePermissions.has('settings.read')).toBeTrue();
  });

  it('adds point of sale as a bundled frontend permission after confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.selectJobRole(component.jobRoles[0]);

    component.togglePermission('access_point_of_sale', true);

    expect(window.confirm).toHaveBeenCalledWith(
      'Point of Sale Access will also add these required permissions: Family List Viewing, Family Help Sessions, Inventory Viewing, Inventory Item Viewing. Enable it?'
    );
    expect(component.selectedJobRole?.permissions).toContain('access_point_of_sale');
    expect(component.selectedJobRole?.permissions).toContain('view_families');
    expect(component.selectedJobRole?.permissions).toContain('manage_family_help_sessions');
    expect(component.selectedJobRole?.permissions).toContain('view_inventory');
    expect(component.selectedJobRole?.permissions).toContain('view_inventory_item');
    expect(component.isPointOfSaleBundledPermission('view_inventory_item')).toBeTrue();
    expect(component.isPermissionLocked('view_inventory_item')).toBeTrue();
    expect(component.permissionSourceLabel('view_inventory_item')).toBe('Included by Point of Sale');
  });

  it('adds family page access as a bundled frontend permission after confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.selectJobRole(component.jobRoles[0]);

    component.togglePermission('access_families', true);

    expect(window.confirm).toHaveBeenCalledWith(
      'Family Page Access will also add these required permissions: Family List Viewing, Family Detail Viewing, Dashboard Statistics. Enable it?'
    );
    expect(component.selectedJobRole?.permissions).toContain('access_families');
    expect(component.selectedJobRole?.permissions).toContain('view_families');
    expect(component.selectedJobRole?.permissions).toContain('view_family');
    expect(component.selectedJobRole?.permissions).toContain('view_dashboard_stats');
    expect(component.permissionSourceLabel('view_family')).toBe('Included by Family Page Access');
  });

  it('does not add point of sale bundle permissions when confirmation is cancelled', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    component.selectJobRole(component.jobRoles[0]);
    const event = { source: { checked: true } } as never;

    component.togglePermission('access_point_of_sale', true, event);

    expect(component.selectedJobRole?.permissions).not.toContain('access_point_of_sale');
    expect(component.selectedJobRole?.permissions).not.toContain('manage_family_help_sessions');
    expect((event as { source: { checked: boolean } }).source.checked).toBeFalse();
  });

  it('adds drive scheduling management as a bundled frontend permission after confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.selectJobRole(component.jobRoles[0]);

    component.togglePermission('manage_drive_scheduling', true);

    expect(window.confirm).toHaveBeenCalledWith(
      'Drive Scheduling Management will also add these required permissions: Family Scheduling, Available Spot Editing. Enable it?'
    );
    expect(component.selectedJobRole?.permissions).toContain('manage_drive_scheduling');
    expect(component.selectedJobRole?.permissions).toContain('schedule_families');
    expect(component.selectedJobRole?.permissions).toContain('edit_available_spots');
    expect(component.permissionSourceLabel('edit_available_spots')).toBe('Included by Drive Scheduling Management');
  });

  it('treats volunteer base permissions as not inherited on the base role', () => {
    component.selectJobRole(component.jobRoles.find(role => role.name === 'volunteer_base')!);

    expect(component.isInheritedPermission('families.view')).toBeFalse();
  });

  it('does nothing when toggling permissions without a selected job role', () => {
    component.selectedJobRole = null;

    component.togglePermission('families.view', true);

    expect(component.selectedJobRole).toBeNull();
  });

  it('saves the selected job role with sorted permissions and default inheritance', () => {
    const reloadSpy = spyOn(component, 'loadAdminData');
    component.selectedJobRole = {
      name: 'delivery_helper',
      permissions: ['inventory.view', 'families.edit'],
      inherits: []
    };

    component.saveSelectedJobRole();

    expect(userService.saveJobRole).toHaveBeenCalledWith('delivery_helper', {
      permissions: ['families.edit', 'inventory.view'],
      inherits: ['volunteer_base']
    });
    expect(component.selectedJobRole).toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith('Job role saved.', 'Close', { duration: 2500 });
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('saves volunteer base without adding self-inheritance', () => {
    component.selectedJobRole = {
      name: 'volunteer_base',
      permissions: ['view_family', 'view_inventory'],
      inherits: []
    };

    component.saveSelectedJobRole();

    expect(userService.saveJobRole).toHaveBeenCalledWith('volunteer_base', {
      permissions: ['view_family', 'view_inventory'],
      inherits: []
    });
  });

  it('shows the backend message when saving a selected role fails', () => {
    userService.saveJobRole.and.returnValue(throwError(() => ({ error: { message: 'Role save failed' } })));
    component.selectedJobRole = {
      name: 'delivery_helper',
      permissions: [],
      inherits: ['volunteer_base']
    };

    component.saveSelectedJobRole();

    expect(snackBar.open).toHaveBeenCalledWith('Role save failed', 'Close', { duration: 3500 });
  });

  it('does nothing when there is no selected job role to save', () => {
    component.selectedJobRole = null;

    component.saveSelectedJobRole();

    expect(userService.saveJobRole).not.toHaveBeenCalled();
  });

  it('creates a new job role and reloads the list', () => {
    const reloadSpy = spyOn(component, 'loadAdminData');
    component.newJobRoleName = '  Delivery Helper  ';

    component.createJobRole();

    expect(userService.saveJobRole).toHaveBeenCalledWith('delivery_helper', {
      permissions: [],
      inherits: ['volunteer_base']
    });
    expect(component.newJobRoleName).toBe('');
    expect(snackBar.open).toHaveBeenCalledWith('Job role created.', 'Close', { duration: 2500 });
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('stops job role creation for blank or duplicate names', () => {
    component.newJobRoleName = '   ';
    component.createJobRole();

    component.newJobRoleName = 'Pickup Helper';
    component.createJobRole();

    expect(userService.saveJobRole).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('That job role already exists.', 'Close', { duration: 2500 });
  });

  it('shows the backend message when creating a job role fails', () => {
    userService.saveJobRole.and.returnValue(throwError(() => ({ error: { message: 'Create failed' } })));
    component.newJobRoleName = 'delivery_helper';

    component.createJobRole();

    expect(snackBar.open).toHaveBeenCalledWith('Create failed', 'Close', { duration: 3500 });
  });

  it('guards job role deletion for base roles and cancelled confirmation', () => {
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);

    component.deleteJobRole('volunteer_base');
    component.deleteJobRole('pickup_helper');

    expect(confirmSpy).toHaveBeenCalledWith('Delete job role Pickup Helper?');
    expect(userService.deleteJobRole).not.toHaveBeenCalled();
  });

  it('deletes the selected job role and clears selection on success', () => {
    const reloadSpy = spyOn(component, 'loadAdminData');
    spyOn(window, 'confirm').and.returnValue(true);
    component.selectedJobRole = {
      name: 'pickup_helper',
      permissions: [],
      inherits: ['volunteer_base']
    };

    component.deleteJobRole('pickup_helper');

    expect(userService.deleteJobRole).toHaveBeenCalledWith('pickup_helper');
    expect(component.selectedJobRole).toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith('Job role deleted.', 'Close', { duration: 2500 });
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('shows the backend message when deleting a role fails', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    userService.deleteJobRole.and.returnValue(throwError(() => ({ error: { message: 'Delete failed' } })));

    component.deleteJobRole('pickup_helper');

    expect(snackBar.open).toHaveBeenCalledWith('Delete failed', 'Close', { duration: 3500 });
  });

  it('exposes admin and volunteer form state through getters and trackBy helpers', () => {
    expect(component.isAdmin).toBeTrue();
    expect(component.isVolunteerForm).toBeTrue();
    expect(component.trackByUserId(0, users[0])).toBe('u1');
    expect(component.trackByRoleName(0, component.jobRoles[0])).toBe('pickup_helper');
  });

  it('formats role names for display and converts display names back to stored keys', () => {
    expect(component.formatRoleName('pickup_helper')).toBe('Pickup Helper');
    expect(component.formatSystemRole('VOLUNTEER')).toBe('Volunteer');
    expect(component.formatRoleList(['volunteer_base', 'delivery_helper'])).toBe('Volunteer Base, Delivery Helper');
    expect(component.formatRoleList([])).toBe('No inherited roles');
    expect(component.toRoleKey(' Delivery Helper! ')).toBe('delivery_helper');
  });

  it('builds a volunteer payload with a fallback base role', () => {
    component.startEdit(users[0]);
    component.userForm.patchValue({ systemRole: 'VOLUNTEER', jobRole: '   ' });

    expect(componentInternals.buildUserPayload()).toEqual({
      username: 'volunteer1',
      fullName: 'Volunteer One',
      email: 'volunteer1@example.com',
      systemRole: 'VOLUNTEER',
      jobRole: 'volunteer_base'
    });
  });

  it('throws when building a payload without an editing user', () => {
    component.editingUser = null;

    expect(() => componentInternals.buildUserPayload()).toThrowError(
      'Cannot build a user payload without a selected user'
    );
  });

  it('maps and sorts job roles and permission groups through helpers', () => {
    const mappedRoles = componentInternals.mapJobRoles({
      zebra: { permissions: ['b', 'a'], inherits: [] },
      alpha: { permissions: ['c'], inherits: ['volunteer_base'] }
    } as Record<string, JobRoleConfig>);
    const grouped = componentInternals.buildPermissionGroups([
      { permission: 'view_inventory', group: 'Inventory', label: 'Inventory Viewing', volunteerAssignable: true },
      { permission: 'edit_family', group: 'Family', label: 'Family Editing', volunteerAssignable: true },
      { permission: 'view_families', group: 'Family', label: 'Family List Viewing', volunteerAssignable: true },
      { permission: 'view_checklist', group: 'Checklist', label: 'Checklist Viewing', volunteerAssignable: true },
      { permission: 'edit_available_spots', group: 'Settings', label: 'Available Spot Editing', volunteerAssignable: true }
    ] as PermissionCatalogEntry[]);

    expect(mappedRoles).toEqual([
      { name: 'alpha', permissions: ['c'], inherits: ['volunteer_base'] },
      { name: 'zebra', permissions: ['a', 'b'], inherits: [] }
    ]);
    expect(grouped).toEqual([
      {
        group: 'Family',
        permissions: [
          { permission: 'edit_family', group: 'Family', label: 'Family Editing', volunteerAssignable: true },
          {
            permission: 'access_families',
            group: 'Family',
            label: 'Family Page Access',
            volunteerAssignable: true
          }
        ]
      },
      {
        group: 'Point of Sale',
        permissions: [
          {
            permission: 'access_point_of_sale',
            group: 'Point of Sale',
            label: 'Point of Sale Access',
            volunteerAssignable: true
          }
        ]
      },
      {
        group: 'Inventory',
        permissions: [
          { permission: 'view_inventory', group: 'Inventory', label: 'Inventory Viewing', volunteerAssignable: true }
        ]
      },
      {
        group: 'Settings',
        permissions: [
          {
            permission: 'manage_drive_scheduling',
            group: 'Settings',
            label: 'Drive Scheduling Management',
            volunteerAssignable: true
          }
        ]
      }
    ]);
  });
});
