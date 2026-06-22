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
import { DialogService } from '../shared/dialog/dialog.service';
import { UserManagementComponent } from './user-management.component';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-users',
  standalone: true,
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
  private dialogService = inject(DialogService);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  pendingDeleteRequests: Family[] = [];
  isLoading = true;
  selectedTabIndex = 0;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      // Keep the public query keys stable while presenting the tabs in the
      // everyday workflow order: users, roles, then exceptional delete requests.
      const tab = params.get('tab');
      this.selectedTabIndex = tab === 'requests'
        ? 2
        : tab === 'permissions' || tab === 'roles'
          ? 1
          : 0;
    });
    this.loadRequests();
  }

  // Method to load the pending delete requests from the server and update the component state accordingly. It also handles loading state and error notifications.
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

  // Method to approve a delete request for a family. It prompts the admin for confirmation, checks for linked
  // guardian accounts, and then calls the family service to delete the family. It also updates the pending
  // delete requests list and shows notifications based on the outcome.
  approveDelete(family: Family): void {
    if (!family._id) {
      return;
    }
    const hasLinkedGuardianAccount = !!family.ownerUserId?.trim();
    // Linked guardian accounts are removed with the family profile, so call out
    // the extra consequence before the admin confirms.
    const warning = hasLinkedGuardianAccount
      ? `Delete ${family.guardianName}'s family profile permanently? This will also delete their linked guardian login account.`
      : `Delete ${family.guardianName}'s family profile permanently?`;
    const dialogRef = this.dialogService.openDialog({
      title: 'Confirm Family Deletion',
      message: warning,
      buttonOne: 'Cancel',
      buttonTwo: 'Delete'
    }, '520px', '240px');

    dialogRef.afterClosed().subscribe((confirmed) => {
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
    });
  }

  // Method to restore a pending delete request for a family. It calls the family service to restore the delete request,
  // updates the pending delete requests list, and shows notifications based on the outcome.
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

  // Method to track family items in the template by their unique ID, which helps Angular optimize rendering of
  // lists by identifying items that have changed.
  trackByFamilyId(index: number, family: Family) {
    return family._id;
  }

  // Method to generate a label for the requester of a delete request based on the requester's name and role.
  // It handles cases where requester information may be incomplete and formats the role for display.
  getRequesterLabel(family: Family): string {
    const request = family.deleteRequest;
    // Older requests may not have complete requester metadata; keep the admin
    // list readable instead of showing blank labels.
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
