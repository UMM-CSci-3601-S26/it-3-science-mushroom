import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FamilyChecklist } from '../../checklist/checklist';
import { Family, StudentInfo } from '../family';
import { SchoolInfo, TimeAvailabilityLabels } from '../../settings/settings';

export interface FamilyPortalFormPayload {
  guardianName: string;
  email: string;
  address: string;
  accommodations: string;
  timeSlot: string;
  students: StudentInfo[];
  timeAvailability: Family['timeAvailability'];
}

export interface FamilyPortalFamily extends FamilyPortalFormPayload {
  _id?: string;
  ownerUserId?: string;
  profileComplete?: boolean;
}

export interface FamilyPortalSummary {
  profileComplete: boolean;
  family: FamilyPortalFamily | null;
  driveDay?: {
    date: string;
    message?: string;
  };
  timeSlot?: string;
  timeSlotStatus?: 'pending' | 'assigned';
  schools?: SchoolInfo[];
  timeAvailability?: TimeAvailabilityLabels;
}

export interface FamilyPortalDriveDay {
  driveDay?: {
    date: string;
    message?: string;
  };
  timeSlot?: string;
  timeSlotStatus?: 'pending' | 'assigned';
}

/**
 * Client API for the guardian family portal.
 *
 * Every call goes through the normal auth interceptor, so the server identifies
 * the guardian by the HttpOnly auth cookie and returns only that user's family.
 */
@Injectable({
  providedIn: 'root'
})
export class FamilyPortalService {
  private httpClient = inject(HttpClient);

  private readonly familyPortalUrl = `${environment.apiUrl}family-portal`;

  // Summary contains both the saved family profile and settings-driven display
  // data so the portal can decide whether to show the home page or form.
  getSummary(): Observable<FamilyPortalSummary> {
    return this.httpClient.get<FamilyPortalSummary>(this.familyPortalUrl);
  }

  upsertForm(family: FamilyPortalFormPayload): Observable<{ profileComplete: boolean }> {
    return this.httpClient.put<{ profileComplete: boolean }>(`${this.familyPortalUrl}/form`, family);
  }

  getChecklist(): Observable<FamilyChecklist | null> {
    return this.httpClient.get<FamilyChecklist | null>(`${this.familyPortalUrl}/checklist`);
  }

  getDriveDay(): Observable<FamilyPortalDriveDay> {
    return this.httpClient.get<FamilyPortalDriveDay>(`${this.familyPortalUrl}/drive-day`);
  }
}
