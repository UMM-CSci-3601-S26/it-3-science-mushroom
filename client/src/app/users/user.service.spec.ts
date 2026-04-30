import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from 'src/environments/environment';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UserService,
      ],
    });

    service = TestBed.inject(UserService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should fetch users from the users endpoint', () => {
    service.getUsers().subscribe();

    const req = httpTestingController.expectOne(`${environment.apiUrl}users`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should POST new users', () => {
    const payload = {
      username: 'newuser',
      fullName: 'New User',
      email: 'new@example.com',
      systemRole: 'VOLUNTEER' as const,
      jobRole: 'volunteer_base',
      password: 'password123'
    };

    service.addUser(payload).subscribe();

    const req = httpTestingController.expectOne(`${environment.apiUrl}users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(payload);
  });

  it('should PUT updates for an existing user', () => {
    const payload = {
      username: 'existing',
      fullName: 'Existing User',
      systemRole: 'ADMIN' as const,
      jobRole: null
    };

    service.updateUser('u1', payload).subscribe();

    const req = httpTestingController.expectOne(`${environment.apiUrl}users/u1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ _id: 'u1', ...payload });
  });

  it('should DELETE users by id', () => {
    service.deleteUser('u1').subscribe();

    const req = httpTestingController.expectOne(`${environment.apiUrl}users/u1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should GET the role overview from auth permissions/all', () => {
    service.getRoleOverview().subscribe();

    const req = httpTestingController.expectOne(`${environment.apiUrl}auth/permissions/all`);
    expect(req.request.method).toBe('GET');
    req.flush({
      systemRoles: ['ADMIN', 'VOLUNTEER', 'GUARDIAN'],
      jobRoles: {},
      permissionCatalog: []
    });
  });

  it('should GET volunteer job roles', () => {
    service.getJobRoles().subscribe();

    const req = httpTestingController.expectOne(`${environment.apiUrl}auth/job-roles`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should PUT a job role configuration', () => {
    const config = {
      permissions: ['families.view'],
      inherits: ['volunteer_base']
    };

    service.saveJobRole('pickup_helper', config).subscribe();

    const req = httpTestingController.expectOne(`${environment.apiUrl}auth/job-roles/pickup_helper`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(config);
    req.flush(null);
  });

  it('should DELETE a job role by name', () => {
    service.deleteJobRole('pickup_helper').subscribe();

    const req = httpTestingController.expectOne(`${environment.apiUrl}auth/job-roles/pickup_helper`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
