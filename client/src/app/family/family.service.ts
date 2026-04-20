// Angular Imports
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, computed, signal  } from '@angular/core';

// RxJS Imports
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Family Imports
import { environment } from '../../environments/environment';
import { Family, DashboardStats, SelectOption } from './family';

@Injectable({
  providedIn: 'root'
})

export class FamilyService {
  private httpClient = inject(HttpClient);

  readonly familyUrl: string = `${environment.apiUrl}family`;
  readonly dashboardUrl: string = `${environment.apiUrl}dashboard`;

  private readonly familyKey = 'guardianName';

  constructor() {
    this.loadFamilies();
  }

  family = signal<Family[]>([]);

  loadFamilies(filters?: Family): void {
    this.getFamilies(filters).subscribe(data => {
      this.family.set(data);
    })
  }

  familyOptions = computed(() =>
    this.optionBuilder(this.family(), 'guardianName')
  );

  getFamilies(filters?: { guardianName?: string }): Observable<Family[]> {
    let httpParams: HttpParams = new HttpParams();

    if (filters) {
      if (filters.guardianName) {
        httpParams = httpParams.set(this.familyKey, filters.guardianName);
      }
    }

    return this.httpClient.get<Family[]>(this.familyUrl, {
      params: httpParams,
    });
  }

  getFamilyById(id: string): Observable<Family> {
    return this.httpClient.get<Family>(`${this.familyUrl}/${id}`);
  }

  addFamily(newFamily: Partial<Family>): Observable<string> {
    return new Observable(observer => {
      this.httpClient.post<{id: string}>(this.familyUrl, newFamily).pipe(map(response => response.id)).subscribe({
        next: (result) => {
          this.loadFamilies();
          observer.next(result);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  updateFamily(id: string, updatedFamily: Partial<Family>): Observable<string> {
    return new Observable(observer => {
      this.httpClient.put<{id: string}>(`${this.familyUrl}/${id}`, updatedFamily).pipe(map(response => response.id)).subscribe({
        next: (result) => {
          this.loadFamilies();
          observer.next(result);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  deleteFamily(id: string): Observable<void> {
    return new Observable(observer => {
      this.httpClient.delete<void>(`${this.familyUrl}/${id}`).subscribe({
        next: (result) => {
          this.loadFamilies();
          observer.next(result);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  getDashboardStats(): Observable<DashboardStats> {
    const httpParams: HttpParams = new HttpParams();
    return this.httpClient.get<DashboardStats>(this.dashboardUrl, {
      params: httpParams,
    });
  }

  exportFamilies(): Observable<string> {
    return this.httpClient.get(`${this.familyUrl}/export`, {
      responseType: 'text'
    });
  }

  optionBuilder(data: Family[], key: keyof Family): SelectOption[] {
    return [...new Set(
      data.map(item => item[key]).filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    )].map(value => ({
      label: value,
      value: value
    }));
  }
}
