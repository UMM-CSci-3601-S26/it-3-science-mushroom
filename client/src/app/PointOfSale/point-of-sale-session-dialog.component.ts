import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { switchMap } from 'rxjs';

import { ChecklistItem, Family, FamilyChecklist, StudentInfo } from '../family/family';
import { FamilyService } from '../family/family.service';
import { Inventory } from '../inventory/inventory';
import { InventoryService } from '../inventory/inventory.service';
import { ScannerComponent } from '../scanner/scanner.component';
import { DialogService } from '../shared/dialog/dialog.service';

type SubstitutionSuggestion = {
  substituteItem?: string;
  substituteBarcode?: string;
  substituteDescription?: string;
  substituteInventoryId?: string;
};

@Component({
  selector: 'app-point-of-sale-session-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTabsModule,
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
  private readonly dialogService = inject(DialogService);

  sessionFamily: Family | undefined;
  loading = true;
  errorMessage = '';
  substituteErrorMessage = '';
  activeSubstitutionItemId = '';
  saving = false;
  private readonly originalSubstitutionSuggestions = new Map<string, SubstitutionSuggestion>();

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

  hasSubstitutionSuggestion(item: ChecklistItem): boolean {
    return this.originalSubstitutionSuggestions.has(item.id);
  }

  canSubstitute(item: ChecklistItem): boolean {
    return this.hasSubstitute(item) || this.hasSubstitutionSuggestion(item) || !!item.matchedInventoryId;
  }

  needsReason(item: ChecklistItem): boolean {
    return item.available && !item.selected && !this.hasSubstitute(item);
  }

  setItemSelected(item: ChecklistItem, selected: boolean): void {
    item.selected = selected;
    this.errorMessage = '';
    if (selected) {
      item.notPickedUpReason = undefined;
      this.clearSubstitution(item);
    }
  }

  setNotPickedUpReason(item: ChecklistItem, reason: string): void {
    item.notPickedUpReason = reason || undefined;
    this.errorMessage = '';
  }

  toggleSubstitutionScanner(item: ChecklistItem): void {
    this.toggleSubstitutionPanel(item);
  }

  toggleSubstitutionPanel(item: ChecklistItem): void {
    if (!this.canSubstitute(item)) {
      return;
    }
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

  substitutionOptionsFor(item: ChecklistItem): Inventory[] {
    const requestedQuantity = Math.max(1, item.requestedQuantity ?? 1);
    return this.inventoryService.inventory()
      .filter(inventory => this.unreservedQuantity(inventory) >= requestedQuantity)
      .filter(inventory => this.substitutionOptionScore(item, inventory) > 0)
      .sort((left, right) => this.substitutionOptionScore(item, right) - this.substitutionOptionScore(item, left));
  }

  unreservedQuantity(inventory: Inventory): number {
    return Math.max(0, inventory.quantity - (inventory.reservedQuantity ?? 0));
  }

  inventoryDescription(inventory: Inventory): string {
    return inventory.description || inventory.item || inventory.internalBarcode || 'Unknown inventory item';
  }

  applySubstituteOption(item: ChecklistItem, inventory: Inventory): void {
    const barcode = this.substitutionBarcodeForInventory(inventory);
    if (!barcode) {
      this.substituteErrorMessage = 'The selected inventory item does not have a barcode.';
      return;
    }

    this.substituteErrorMessage = '';
    this.applySubstituteInventory(item, barcode, inventory);
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
    const dialogRef = this.dialogService.openDialog({
      title: 'Clear Session',
      message: 'Clear this help session and discard the current checklist snapshot?',
      buttonOne: 'Cancel',
      buttonTwo: 'Clear Session'
    }, '520px', '230px');

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) {
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
    const dialogRef = this.dialogService.openDialog({
      title: 'Complete Family Session',
      message: 'Are you sure you are done helping this family? This will remove selected item quantities from inventory.',
      buttonOne: 'Cancel',
      buttonTwo: 'Complete'
    }, '560px', '230px');

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) {
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

  private captureSubstitutionSuggestions(checklist: FamilyChecklist | null | undefined): void {
    this.originalSubstitutionSuggestions.clear();
    for (const section of checklist?.sections ?? []) {
      for (const item of section.items) {
        if (this.hasSubstitute(item)) {
          this.originalSubstitutionSuggestions.set(item.id, {
            substituteBarcode: item.substituteBarcode,
            substituteDescription: item.substituteDescription,
            substituteInventoryId: item.substituteInventoryId,
            substituteItem: item.substituteItem
          });
        }
      }
    }
  }

  private substitutionOptionScore(item: ChecklistItem, inventory: Inventory): number {
    const originalSuggestion = this.originalSubstitutionSuggestions.get(item.id);
    if (inventory.internalID && inventory.internalID === originalSuggestion?.substituteInventoryId) {
      return 1000;
    }

    const inventoryBarcodes = [
      inventory.internalBarcode,
      ...(inventory.externalBarcode ?? [])
    ].filter((barcode): barcode is string => !!barcode);
    if (originalSuggestion?.substituteBarcode
        && inventoryBarcodes.some(barcode => this.normalizeDisplayText(barcode) === this.normalizeDisplayText(originalSuggestion.substituteBarcode ?? ''))) {
      return 1000;
    }

    const itemTokens = this.searchableTokens(
      item.label,
      item.itemDescription,
      originalSuggestion?.substituteItem,
      originalSuggestion?.substituteDescription
    );
    const inventoryTokens = this.searchableTokens(
      inventory.item,
      inventory.description,
      inventory.brand,
      inventory.color,
      inventory.size,
      inventory.type,
      inventory.material
    );

    return itemTokens.filter(token => inventoryTokens.includes(token)).length;
  }

  private substitutionBarcodeForInventory(inventory: Inventory): string {
    return inventory.internalBarcode || inventory.externalBarcode?.[0] || '';
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

  private searchableTokens(...values: Array<string | undefined>): string[] {
    return values
      .flatMap(value => (value ?? '').toLowerCase().split(/[^a-z0-9]+/g))
      .map(value => value.endsWith('s') && value.length > 1 ? value.slice(0, -1) : value)
      .filter(value => value.length > 0)
      .filter((value, index, valuesArray) => valuesArray.indexOf(value) === index);
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
        this.captureSubstitutionSuggestions(family.checklist);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = `Failed to ${regenerateSnapshot ? 'regenerate' : 'start'} help session: ${err.message}`;
      }
    });
  }
}
