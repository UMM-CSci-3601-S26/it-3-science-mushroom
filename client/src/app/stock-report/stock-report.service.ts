// // Angular Imports
// import { HttpClient, HttpParams } from '@angular/common/http';
// import { Injectable, inject } from '@angular/core';

// // RxJS Imports
// import { Observable } from 'rxjs';
// import { map } from 'rxjs/operators';

// // Family Imports
// import { environment } from '../../environments/environment';
// import { Family, DashboardStats } from './stock-report';

// @Injectable({
//   providedIn: 'root'
// })

// export class FamilyService {
//   private httpClient = inject(HttpClient);

//   readonly familyUrl: string = `${environment.apiUrl}family`;
//   readonly dashboardUrl: string = `${environment.apiUrl}dashboard`;

//   getFamilies(): Observable<Family[]> {
//     const httpParams: HttpParams = new HttpParams();
//     return this.httpClient.get<Family[]>(this.familyUrl, {
//       params: httpParams,
//     });
//   }

//   getFamilyById(id: string): Observable<Family> {
//     return this.httpClient.get<Family>(`${this.familyUrl}/${id}`);
//   }

//   addFamily(newFamily: Partial<Family>): Observable<string> {
//     return this.httpClient.post<{id: string}>(this.familyUrl, newFamily).pipe(map(response => response.id));
//   }

//   deleteFamily(id: string): Observable<void> {
//     return this.httpClient.delete<void>(`${this.familyUrl}/${id}`);
//   }

//   getDashboardStats(): Observable<DashboardStats> {
//     const httpParams: HttpParams = new HttpParams();
//     return this.httpClient.get<DashboardStats>(this.dashboardUrl, {
//       params: httpParams,
//     });
//   }

//   exportFamilies(): Observable<string> {
//     return this.httpClient.get(`${this.familyUrl}/export`, {
//       responseType: 'text'
//     });
//   }
// }
