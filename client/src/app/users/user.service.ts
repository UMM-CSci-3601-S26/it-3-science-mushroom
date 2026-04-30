import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface User {
  _id: string;
  username: string;
  fullName: string;
  email?: string | null;
  systemRole: "ADMIN" | "VOLUNTEER" | "GUARDIAN";
  jobRole?: string | null;
}

export interface UserUpsertRequest {
  username: string;
  fullName: string;
  email?: string | null;
  systemRole: "ADMIN" | "VOLUNTEER" | "GUARDIAN";
  jobRole?: string | null;
  password?: string;
}

export interface JobRoleConfig {
  permissions: string[];
  inherits: string[];
}

export interface PermissionCatalogEntry {
  permission: string;
  group: string;
  label: string;
  volunteerAssignable: boolean;
}

export interface AllRolePermissionsResponse {
  systemRoles: Array<"ADMIN" | "VOLUNTEER" | "GUARDIAN">;
  jobRoles: Record<string, JobRoleConfig>;
  permissionCatalog: PermissionCatalogEntry[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private httpClient = inject(HttpClient);
  private readonly usersUrl = `${environment.apiUrl}users`;
  private readonly authUrl = `${environment.apiUrl}auth`;

  getUsers(): Observable<User[]> {
    return this.httpClient.get<User[]>(this.usersUrl, {
      headers: new HttpHeaders({
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      }),
      params: new HttpParams().set('_refresh', Date.now().toString())
    });
  }

  addUser(user: UserUpsertRequest): Observable<User> {
    return this.httpClient.post<User>(this.usersUrl, user);
  }

  updateUser(id: string, user: UserUpsertRequest): Observable<User> {
    return this.httpClient.put<User>(`${this.usersUrl}/${id}`, user);
  }

  deleteUser(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.usersUrl}/${id}`);
  }

  getJobRoles(): Observable<Record<string, JobRoleConfig>> {
    return this.httpClient.get<Record<string, JobRoleConfig>>(`${this.authUrl}/job-roles`);
  }

  getRoleOverview(): Observable<AllRolePermissionsResponse> {
    return this.httpClient.get<AllRolePermissionsResponse>(`${this.authUrl}/permissions/all`);
  }

  saveJobRole(name: string, config: JobRoleConfig): Observable<void> {
    return this.httpClient.put<void>(`${this.authUrl}/job-roles/${name}`, config);
  }

  deleteJobRole(name: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.authUrl}/job-roles/${name}`);
  }
}
