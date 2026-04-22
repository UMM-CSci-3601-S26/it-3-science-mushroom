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
import { Inventory } from '../inventory/inventory';
import { InventoryService } from '../inventory/inventory.service';
import { ScannerComponent } from '../scanner/scanner.component';

@Component({
  selector: 'app-point-of-sale-session-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDialogModule,
    MatIconModule,
    ScannerComponent
  ],
  templateUrl: './point-of-sale-session-dialog.component.html',
  styleUrls: ['./point-of-sale-session-dialog.component.scss']
})
export class PointOfSaleSessionDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<PointOfSaleSessionDialogComponent>);
  readonly data = inject<{ family: Family }>(MAT_DIALOG_DATA);
  private readonly familyService = inject(FamilyService);
  private readonly inventoryService = inject(InventoryService);

  sessionFamily: Family | undefined;
  loading = true;
  errorMessage = '';
  substituteErrorMessage = '';
  activeSubstitutionItemId = '';
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

  substituteDisplay(item: ChecklistItem): string {
    return item.substituteDescription || item.substituteItem || item.substituteBarcode || 'Unknown substitute item';
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

  hasSubstitute(item: ChecklistItem): boolean {
    return !!(item.substituteBarcode || item.substituteInventoryId || item.substituteItem || item.substituteDescription);
  }

  needsReason(item: ChecklistItem): boolean {
    return item.available && !item.selected && !this.hasSubstitute(item);
  }

  setItemSelected(item: ChecklistItem, selected: boolean): void {
    item.selected = selected;
    if (selected) {
      item.notPickedUpReason = undefined;
      this.clearSubstitution(item);
    }
  }

  setNotPickedUpReason(item: ChecklistItem, reason: string): void {
    item.notPickedUpReason = reason || undefined;
  }

  toggleSubstitutionScanner(item: ChecklistItem): void {
    this.activeSubstitutionItemId = this.activeSubstitutionItemId === item.id ? '' : item.id;
    this.substituteErrorMessage = '';
  }

  applySubstituteBarcode(item: ChecklistItem, barcode: string): void {
    const normalizedBarcode = barcode.trim();
    if (!normalizedBarcode) {
      return;
    }

    this.substituteErrorMessage = '';
    this.inventoryService.lookUpByBarcode(normalizedBarcode).subscribe({
      next: (inventory) => this.applySubstituteInventory(item, normalizedBarcode, inventory),
      error: (err) => {
        this.substituteErrorMessage = `No inventory item was found for barcode ${normalizedBarcode}: ${err.message}`;
      }
    });
  }

  clearSubstitution(item: ChecklistItem): void {
    item.substituteBarcode = undefined;
    item.substituteInventoryId = undefined;
    item.substituteItem = undefined;
    item.substituteDescription = undefined;
    if (item.notPickedUpReason === 'substituted') {
      item.notPickedUpReason = undefined;
    }
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
    const validationMessage = this.validateReadyToFinalize(checklist);
    if (validationMessage) {
      this.errorMessage = validationMessage;
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
          ...item
        }))
      }))
    };
  }

  private applySubstituteInventory(item: ChecklistItem, barcode: string, inventory: Inventory): void {
    item.selected = false;
    item.substituteBarcode = barcode;
    item.substituteInventoryId = inventory.internalID;
    item.substituteItem = inventory.item;
    item.substituteDescription = inventory.description;
    item.notPickedUpReason = 'substituted';
    this.activeSubstitutionItemId = '';
  }

  private validateReadyToFinalize(checklist: FamilyChecklist): string {
    for (const section of checklist.sections) {
      for (const item of section.items) {
        if (this.needsReason(item) && !item.notPickedUpReason) {
          return `Choose why "${item.label || item.itemDescription}" was not given before finalizing.`;
        }
      }
    }

    return '';
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
