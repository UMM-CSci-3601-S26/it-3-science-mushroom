import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Family } from '../family/family';
import { FamilyCardComponent } from '../family/family-card.component';
import { FamilyService } from '../family/family.service';
import { UserManagementComponent } from './user-management.component';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTabsModule,
    FamilyCardComponent,
    UserManagementComponent
  ]
})
export class UsersComponent implements OnInit {
  private familyService = inject(FamilyService);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  pendingDeleteRequests: Family[] = [];
  isLoading = true;
  selectedTabIndex = 0;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab');
      this.selectedTabIndex = tab === 'users' ? 1 : tab === 'permissions' ? 2 : 0;
    });
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading = true;
    this.familyService.getDeleteRequests().subscribe({
      next: requests => {
        this.pendingDeleteRequests = requests;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Unable to load delete requests.', 'Close', { duration: 3000 });
      }
    });
  }

  approveDelete(family: Family): void {
    if (!family._id) {
      return;
    }
    const hasLinkedGuardianAccount = !!family.ownerUserId?.trim();
    const warning = hasLinkedGuardianAccount
      ? `Delete ${family.guardianName}'s family profile permanently? This will also delete their linked guardian login account.`
      : `Delete ${family.guardianName}'s family profile permanently?`;
    const confirmed = window.confirm(warning);
    if (!confirmed) {
      return;
    }

    this.familyService.deleteFamily(family._id).subscribe({
      next: () => {
        this.pendingDeleteRequests = this.pendingDeleteRequests.filter(item => item._id !== family._id);
        this.snackBar.open('Family deleted.', 'Close', { duration: 2500 });
      },
      error: () => {
        this.snackBar.open('Unable to delete family.', 'Close', { duration: 3000 });
      }
    });
  }

  restoreFamily(family: Family): void {
    if (!family._id) {
      return;
    }

    this.familyService.restoreDeleteRequest(family._id).subscribe({
      next: () => {
        this.pendingDeleteRequests = this.pendingDeleteRequests.filter(item => item._id !== family._id);
        this.snackBar.open('Delete request restored.', 'Close', { duration: 2500 });
      },
      error: () => {
        this.snackBar.open('Unable to restore request.', 'Close', { duration: 3000 });
      }
    });
  }

  trackByFamilyId(index: number, family: Family) {
    return family._id;
  }

  getRequesterLabel(family: Family): string {
    const request = family.deleteRequest;
    const name = request?.requestedByUserName?.trim() || 'Unknown user';
    const role = request?.requestedBySystemRole?.trim();

    if (!role) {
      return `Requested by: ${name}`;
    }

    return `Requested by ${this.formatRole(role)}: ${name}`;
  }

  private formatRole(role: string): string {
    return role
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }
}
