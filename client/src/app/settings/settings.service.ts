// Angular Imports
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

// RxJS Imports
import { Observable } from 'rxjs';

// Environment and Settings Interface Imports
import { environment } from '../../environments/environment';
import { AppSettings, SchoolInfo, SupplyItemOrder, TimeAvailabilityLabels } from './settings';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private httpClient = inject(HttpClient);

  readonly settingsUrl: string = `${environment.apiUrl}settings`;

  // Returns the full settings document (schools + time availability labels)
  getSettings(): Observable<AppSettings> {
    return this.httpClient.get<AppSettings>(this.settingsUrl);
  }

  // Replaces the schools list. Only touches the schools field on the server.
  updateSchools(schools: SchoolInfo[]): Observable<void> {
    return this.httpClient.patch<void>(`${this.settingsUrl}/schools`, { schools });
  }

  // Replaces the time availability labels. Only touches the timeAvailability field.
  updateTimeAvailability(labels: TimeAvailabilityLabels): Observable<void> {
    return this.httpClient.patch<void>(`${this.settingsUrl}/timeAvailability`, labels);
  }

  // Replaces the full supply order list. Only touches the supplyOrder field.
  updateSupplyOrder(order: SupplyItemOrder[]): Observable<void> {
    return this.httpClient.patch<void>(`${this.settingsUrl}/supplyOrder`, { supplyOrder: order });
  }
}
