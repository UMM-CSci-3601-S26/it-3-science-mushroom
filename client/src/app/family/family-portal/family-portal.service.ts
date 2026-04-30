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

@Injectable({
  providedIn: 'root'
})
export class FamilyPortalService {
  private httpClient = inject(HttpClient);

  private readonly familyPortalUrl = `${environment.apiUrl}family-portal`;

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
