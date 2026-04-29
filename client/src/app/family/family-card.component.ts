// Angular Imports
import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterLink } from '@angular/router';
import { MatTooltip } from '@angular/material/tooltip';

// Family Imports
import { Family } from './family';
import { AuthService } from '../auth/auth-service';


@Component({
  selector: 'app-family-card',
  templateUrl: './family-card.component.html',
  styleUrls: ['./family-card.component.scss'],
  imports: [
    MatCardModule,
    MatButtonModule,
    MatListModule,
    MatDividerModule,
    CommonModule,
    MatIconModule,
    RouterLink,
    MatTooltip
  ]
})

export class FamilyCardComponent {
  family = input.required<Family>();
  canEditFamily = input(false);
  compact = input(false);
  showRequestDeleteAction = input(true);
  requestDelete = output<void>();
  authService = inject(AuthService);

  get canRequestDelete(): boolean {
    return this.authService.hasPermission('request_family_delete');
  }

  get hasLinkedGuardianAccount(): boolean {
    return !!this.family().ownerUserId?.trim();
  }

  get guardianLinkStatusLabel(): string {
    return this.hasLinkedGuardianAccount ? 'Linked Guardian Account' : 'Manually Added (No Guardian Login)';
  }

  get hasPendingDeleteRequest(): boolean {
    return !!this.family().deleteRequest?.requested;
  }

  get studentNames(): string {
    const students = this.family().students ?? [];
    if (students.length === 0) {
      return 'No students listed';
    }
    return students.map(student => student.name).join(', ');
  }

  onRequestDelete(): void {
    this.requestDelete.emit();
  }

  getAvailableTimes(): string {
    const a = this.family().timeAvailability;
    if (!a) {
      return 'None';
    }
    const times: string[] = [];
    if (a.earlyMorning) {
      times.push('Early Morning');
    }
    if (a.lateMorning) {
      times.push('Late Morning');
    }
    if (a.earlyAfternoon) {
      times.push('Early Afternoon');
    }
    if (a.lateAfternoon) {
      times.push('Late Afternoon');
    }
    return times.length ? times.join(', ') : 'None';
  }
}
