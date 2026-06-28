import { Component, inject, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatDialogContent, MatDialogActions, MatDialogClose, MatDialogRef } from "@angular/material/dialog";
import { MatFormField, MatLabel } from "@angular/material/form-field";
import { MatInput } from "@angular/material/input";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { FamilyService } from "../../family.service";
import { Family } from "../../family";
import { User, UserService } from "src/app/users/user.service";

@Component({
  selector: 'app-guardian-link-dialog',
  templateUrl: './guardian-link-dialog.component.html',
  styleUrls: ['./guardian-link-dialog.component.scss'],
  imports: [MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatInput,
    MatLabel,
    MatFormField,
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatSnackBarModule]
})

export class GuardianLinkDialogComponent implements OnInit {

  private familyService = inject(FamilyService);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<GuardianLinkDialogComponent>);
  families: Family[] = [];
  guardianUsers: User[] = [];
  isSaving = false;

  ngOnInit() {
    this.familyService.getFamilies().subscribe(families => {
      this.families = families;
    });

    this.userService.getGuardianUsers().subscribe(users => {
      this.guardianUsers = users;
    });
  }

  familySearch = '';
  guardianSearch = '';
  selectedFamilyValue?: Family;
  selectedGuardianValue?: User;

  selectedFamily(): Family | undefined {
    if (this.selectedFamilyValue) {
      return this.selectedFamilyValue;
    }

    const search = this.familySearch.trim().toLowerCase();
    return this.families.find(family =>
      family.guardianName.toLowerCase() === search
    );
  }

  selectedGuardian(): User | undefined {
    if (this.selectedGuardianValue) {
      return this.selectedGuardianValue;
    }

    const search = this.guardianSearch.trim().toLowerCase();
    return this.guardianUsers.find(guardian =>
      guardian.username.toLowerCase() === search
    );
  }

  onFamilySearchChange(search: string) {
    this.familySearch = search;

    if (this.selectedFamilyValue?.guardianName !== search) {
      this.selectedFamilyValue = undefined;
    }
  }

  onGuardianSearchChange(search: string) {
    this.guardianSearch = search;

    if (this.selectedGuardianValue?.username !== search) {
      this.selectedGuardianValue = undefined;
    }
  }

  selectFamily(guardianName: string) {
    this.familySearch = guardianName;
    this.selectedFamilyValue = this.families.find(family =>
      family.guardianName === guardianName
    );
  }

  selectGuardian(username: string) {
    this.guardianSearch = username;
    this.selectedGuardianValue = this.guardianUsers.find(guardian =>
      guardian.username === username
    );
  }

  canLinkGuardianAccount(): boolean {
    return !!this.selectedFamily()?._id && !!this.selectedGuardian()?._id && !this.isSaving;
  }

  canUnlinkGuardianAccount(): boolean {
    return !!this.selectedFamily()?._id && !!this.selectedFamily()?.ownerUserId && !this.isSaving;
  }

  linkGuardianAccount() {
    const family = this.selectedFamily();
    const guardian = this.selectedGuardian();

    if (!family?._id || !guardian?._id) {
      this.snackBar.open('Choose a family and guardian account first.', 'Close', { duration: 3000 });
      return;
    }

    this.isSaving = true;
    this.familyService.linkGuardianAccount(family._id, guardian._id).subscribe({
      next: () => {
        this.snackBar.open('Guardian account linked.', 'Close', { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.isSaving = false;
        this.snackBar.open('Unable to link guardian account.', 'Close', { duration: 3500 });
      }
    });
  }

  unlinkGuardianAccount() {
    const family = this.selectedFamily();

    if (!family?._id) {
      this.snackBar.open('Choose a family first.', 'Close', { duration: 3000 });
      return;
    }

    this.isSaving = true;
    this.familyService.unlinkGuardianAccount(family._id).subscribe({
      next: () => {
        this.snackBar.open('Guardian account unlinked.', 'Close', { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.isSaving = false;
        this.snackBar.open('Unable to unlink guardian account.', 'Close', { duration: 3500 });
      }
    });
  }

  filteredFamilies() {
    const search = this.familySearch.toLowerCase();

    return this.families.filter(family =>
      family.guardianName.toLowerCase().includes(search)
    )
  }

  filteredGuardian() {
    const search = this.guardianSearch.toLowerCase();

    return this.guardianUsers.filter(guardian =>
      guardian.fullName.toLowerCase().includes(search) ||
      guardian.username.toLowerCase().includes(search) ||
      (guardian.email ?? '').toLowerCase().includes(search)
    );
  }
}
