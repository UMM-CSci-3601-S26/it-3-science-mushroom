import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { switchMap } from 'rxjs';

import { ChecklistItem, Family, FamilyChecklist, StudentInfo } from '../family/family';
import { FamilyService } from '../family/family.service';

@Component({
  selector: 'app-point-of-sale-session-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatCheckboxModule, MatDialogModule, MatIconModule],
  templateUrl: './point-of-sale-session-dialog.component.html',
  styleUrls: ['./point-of-sale-session-dialog.component.scss']
})
export class PointOfSaleSessionDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<PointOfSaleSessionDialogComponent>);
  readonly data = inject<{ family: Family }>(MAT_DIALOG_DATA);
  private readonly familyService = inject(FamilyService);

  sessionFamily: Family | undefined;
  loading = true;
  errorMessage = '';
  saving = false;

  ngOnInit(): void {
    this.startSession();
  }

  restartSession(): void {
    this.startSession(true);
  }

  sessionHasNoChecklistItems(family: Family): boolean {
    const sections = family.checklist?.sections ?? [];
    return sections.length > 0 && sections.every(section => section.items.length === 0);
  }

  studentForSection(sectionIndex: number): StudentInfo | undefined {
    return this.sessionFamily?.students?.[sectionIndex];
  }

  matchedInventoryDisplay(item: ChecklistItem): string {
    return item.matchedInventoryDescription || item.matchedInventoryItem || 'Unknown inventory item';
  }

  shouldShowMatchedInventory(item: ChecklistItem): boolean {
    if (!item.available || (!item.matchedInventoryDescription && !item.matchedInventoryItem)) {
      return false;
    }
    const requested = this.normalizeDisplayText(item.label || item.itemDescription || '');
    const matchedDescription = this.normalizeDisplayText(item.matchedInventoryDescription || '');
    const matchedItem = this.normalizeDisplayText(item.matchedInventoryItem || '');
    return requested !== matchedDescription && requested !== matchedItem;
  }

  closeAndSaveDraft(): void {
    const familyId = this.data.family._id;
    const checklist = this.sessionFamily?.checklist;
    if (!familyId || !checklist) {
      this.dialogRef.close();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.familyService.updateFamilyChecklist(familyId, this.prepareChecklistForSave(checklist)).subscribe({
      next: () => this.dialogRef.close({ draftSaved: true }),
      error: (err) => {
        this.saving = false;
        this.errorMessage = `Failed to save session draft: ${err.message}`;
      }
    });
  }

  clearSessionAndClose(): void {
    const familyId = this.data.family._id;
    if (!familyId) {
      this.dialogRef.close();
      return;
    }
    if (!window.confirm('Clear this help session and discard the current checklist snapshot?')) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.familyService.clearFamilyHelpSession(familyId).subscribe({
      next: () => this.dialogRef.close({ cleared: true }),
      error: (err) => {
        this.saving = false;
        this.errorMessage = `Failed to clear session: ${err.message}`;
      }
    });
  }

  saveCompletedSession(): void {
    const familyId = this.data.family._id;
    const checklist = this.sessionFamily?.checklist;
    if (!familyId || !checklist) {
      return;
    }
    if (!window.confirm('Are you sure you are done helping this family? This will remove selected item quantities from inventory.')) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.familyService.saveFamilyHelpSessionAll(familyId, this.prepareChecklistForSave(checklist)).subscribe({
      next: () => this.dialogRef.close({ completed: true }),
      error: (err) => {
        this.saving = false;
        this.errorMessage = `Failed to save completed session: ${err.message}`;
      }
    });
  }

  private prepareChecklistForSave(checklist: FamilyChecklist): FamilyChecklist {
    return {
      ...checklist,
      sections: checklist.sections.map(section => ({
        ...section,
        items: section.items.map(item => ({
          ...item,
          notPickedUpReason: !item.selected && item.available
            ? 'available_didnt_need'
            : item.notPickedUpReason
        }))
      }))
    };
  }

  private normalizeDisplayText(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  private startSession(regenerateSnapshot = false): void {
    const familyId = this.data.family._id;
    if (!familyId) {
      this.loading = false;
      this.errorMessage = 'This family is missing an ID, so the help session cannot be started.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const sessionRequest = regenerateSnapshot
      ? this.familyService.clearFamilyHelpSession(familyId).pipe(
        switchMap(() => this.familyService.startFamilyHelpSession(familyId))
      )
      : this.familyService.startFamilyHelpSession(familyId);

    sessionRequest.subscribe({
      next: (family) => {
        this.sessionFamily = family;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = `Failed to ${regenerateSnapshot ? 'regenerate' : 'start'} help session: ${err.message}`;
      }
    });
  }
}
