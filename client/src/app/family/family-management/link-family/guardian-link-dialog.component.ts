import { Component, inject, OnInit } from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogContent, MatDialogActions, MatDialogClose, MatDialogRef } from "@angular/material/dialog";
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
  private dialogData = inject<{ family?: Family } | null>(MAT_DIALOG_DATA, { optional: true });
  families: Family[] = [];
  guardianUsers: User[] = [];
  isSaving = false;

  ngOnInit() {
    this.familyService.getFamilies().subscribe(families => {
      this.families = families;
      this.prefillFamilySearch();
    });

    this.userService.getGuardianUsers().subscribe(users => {
      this.guardianUsers = users;
      this.prefillGuardianSearch();
    });
  }

  familySearch = '';
  guardianSearch = '';
  selectedFamilyValue?: Family;
  selectedGuardianValue?: User;

  private prefillFamilySearch() {
    const family = this.dialogData?.family;

    if (!family?.guardianName) {
      return;
    }

    this.familySearch = family.guardianName;
    this.selectedFamilyValue = this.families.find(loadedFamily =>
      loadedFamily._id === family._id
    ) ?? family;
    this.prefillGuardianSearch();
  }

  private prefillGuardianSearch() {
    const ownerUserId = this.selectedFamilyValue?.ownerUserId?.trim();

    if (!ownerUserId) {
      return;
    }

    const guardian = this.guardianUsers.find(user =>
      user._id === ownerUserId && user.systemRole === 'GUARDIAN'
    );

    if (!guardian) {
      return;
    }

    this.guardianSearch = guardian.username;
    this.selectedGuardianValue = guardian;
  }

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
    this.prefillGuardianSearch();
  }

  selectGuardian(username: string) {
    this.guardianSearch = username;
    this.selectedGuardianValue = this.guardianUsers.find(guardian =>
      guardian.username === username
    );
  }

  canLinkGuardianAccount(): boolean {
    return !!this.selectedFamily()?._id
      && !this.selectedFamily()?.ownerUserId?.trim()
      && !!this.selectedGuardian()?._id
      && !this.isSaving;
  }

  canUnlinkGuardianAccount(): boolean {
    return !!this.selectedFamily()?._id && !!this.selectedFamily()?.ownerUserId?.trim() && !this.isSaving;
  }

  linkGuardianAccount() {
    const family = this.selectedFamily();
    const guardian = this.selectedGuardian();

    if (!family?._id || !guardian?._id) {
      this.snackBar.open('Choose a family and guardian account first.', 'Close', { duration: 3000 });
      return;
    }
    if (family.ownerUserId?.trim()) {
      this.snackBar.open(
        `Can't link ${this.guardianAccountLabel(guardian)}: family already has a linked guardian.`,
        'Close',
        { duration: 4500 }
      );
      return;
    }

    this.isSaving = true;
    this.familyService.linkGuardianAccount(family._id, guardian._id).subscribe({
      next: () => {
        this.snackBar.open('Guardian account linked.', 'Close', { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: error => {
        this.isSaving = false;
        this.snackBar.open(this.failureMessage('link', error), 'Close', { duration: 5000 });
      }
    });
  }

  unlinkGuardianAccount() {
    const family = this.selectedFamily();

    if (!family?._id) {
      this.snackBar.open('Choose a family first.', 'Close', { duration: 3000 });
      return;
    }
    if (!family.ownerUserId?.trim()) {
      this.snackBar.open(
        `Can't unlink ${this.linkedGuardianAccountLabel(family)}: family is not linked.`,
        'Close',
        { duration: 4500 }
      );
      return;
    }

    this.isSaving = true;
    this.familyService.unlinkGuardianAccount(family._id).subscribe({
      next: () => {
        this.snackBar.open('Guardian account unlinked.', 'Close', { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: error => {
        this.isSaving = false;
        this.snackBar.open(this.failureMessage('unlink', error), 'Close', { duration: 5000 });
      }
    });
  }

  private failureMessage(action: 'link' | 'unlink', error: unknown): string {
    const reason = this.errorReason(error);
    const actionLabel = action === 'link' ? 'link' : 'unlink';
    const guardianLabel = action === 'link'
      ? this.guardianAccountLabel(this.selectedGuardian())
      : this.linkedGuardianAccountLabel(this.selectedFamily());

    return reason
      ? `Can't ${actionLabel} ${guardianLabel}: ${this.shortReason(reason)}`
      : `Can't ${actionLabel} ${guardianLabel}. Try again.`;
  }

  private guardianAccountLabel(guardian?: User): string {
    const name = guardian?.fullName?.trim() || guardian?.username?.trim();
    return name ? name : 'guardian account';
  }

  private linkedGuardianAccountLabel(family?: Family): string {
    const ownerUserId = family?.ownerUserId?.trim();
    const guardian = ownerUserId
      ? this.guardianUsers.find(user => user._id === ownerUserId)
      : this.selectedGuardian();

    return this.guardianAccountLabel(guardian);
  }

  private shortReason(reason: string): string {
    return reason
      .replace(/^guardian account is\s+/i, '')
      .replace(/^the requested family was not found$/i, 'family was not found')
      .replace(/\.$/, '');
  }

  private errorReason(error: unknown): string | undefined {
    if (error instanceof HttpErrorResponse) {
      const responseError = error.error;

      if (typeof responseError === 'string') {
        return this.reasonFromString(responseError);
      }

      return this.reasonFromErrorBody(responseError);
    }

    if (error instanceof Error) {
      return error.message.trim() || undefined;
    }

    return this.reasonFromErrorBody(error);
  }

  private reasonFromErrorBody(errorBody: unknown): string | undefined {
    if (typeof errorBody === 'string') {
      return this.reasonFromString(errorBody);
    }

    if (!errorBody || typeof errorBody !== 'object') {
      return undefined;
    }

    const body = errorBody as {
      error?: unknown;
      message?: string;
      title?: string;
      detail?: string;
    };

    if (body.error !== undefined) {
      return this.reasonFromErrorBody(body.error)
        || body.message?.trim()
        || body.title?.trim()
        || body.detail?.trim();
    }

    return body.message?.trim() || body.title?.trim() || body.detail?.trim();
  }

  private reasonFromString(value: string): string | undefined {
    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    try {
      return this.reasonFromErrorBody(JSON.parse(trimmed)) || trimmed;
    } catch {
      return trimmed;
    }
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
