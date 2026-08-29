import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { map, switchMap } from 'rxjs';

import { ChecklistItem, Family, FamilyChecklist, FulfillmentItem, StudentInfo } from '../family/family';
import { FamilyService } from '../family/family.service';
import { Inventory } from '../inventory/inventory';
import { InventoryService } from '../inventory/inventory.service';
import { ScannerComponent } from '../scanner/scanner.component';
import { DialogService } from '../shared/dialog/dialog.service';
import { AppTabComponent } from '../shared/tabs/app-tab.component';
import { AppTabsComponent } from '../shared/tabs/app-tabs.component';

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
    AppTabComponent,
    AppTabsComponent,
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
  private readonly substitutionDescriptionSearchTerms = new Map<string, string>();
  private readonly originalSubstitutionSuggestions = new Map<string, SubstitutionSuggestion>();
  private readonly substitutionTokenStopWords = new Set([
    'a',
    'an',
    'and',
    'box',
    'count',
    'ct',
    'for',
    'of',
    'or',
    'pack',
    'the',
    'with'
  ]);

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
    const fulfillmentItems = this.fulfillmentItemsFor(item);
    if (fulfillmentItems.length > 1) {
      const fulfilledQuantity = this.fulfilledQuantity(item);
      const linkedItemCount = this.linkedFulfillmentItemCount(item);
      const requestedQuantity = this.requestedQuantity(item);
      return `Quantity: ${fulfilledQuantity}, linked: ${linkedItemCount}, requested: ${requestedQuantity}`;
    }
    if (fulfillmentItems.length === 1) {
      return this.fulfillmentItemDisplay(fulfillmentItems[0]);
    }

    return item.substituteDescription || item.substituteItem || item.substituteBarcode || 'Unknown substitute item';
  }

  substituteMatchLabel(item: ChecklistItem): string {
    return this.isSubstituted(item) ? 'Replacing with' : 'Suggested substitute';
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
    return this.hasFulfillmentItems(item)
      || this.hasLegacySubstituteFields(item);
  }

  isSubstituted(item: ChecklistItem): boolean {
    return this.hasFulfillmentItems(item) || (item.selected && this.hasSubstitute(item));
  }

  itemStatusLabel(item: ChecklistItem): string {
    if (this.isPartiallyFulfilled(item)) {
      return 'Partial substitute';
    }
    if (this.isSubstituted(item)) {
      return 'Substituted';
    }
    return item.available ? 'Available' : 'Needs review';
  }

  hasSubstitutionSuggestion(item: ChecklistItem): boolean {
    return this.originalSubstitutionSuggestions.has(item.id);
  }

  canSubstitute(item: ChecklistItem): boolean {
    return !item.selected || this.hasSubstitute(item);
  }

  needsReason(item: ChecklistItem): boolean {
    if (this.isPartiallyFulfilled(item)) {
      return true;
    }
    return item.available && !item.selected && !this.hasSubstitute(item);
  }

  setItemSelected(item: ChecklistItem, selected: boolean): void {
    item.selected = selected;
    this.errorMessage = '';
    if (selected) {
      item.notPickedUpReason = undefined;
      this.clearSubstitution(item);
      if (this.activeSubstitutionItemId === item.id) {
        this.activeSubstitutionItemId = '';
        this.substituteErrorMessage = '';
      }
    } else if (this.hasFulfillmentItems(item)) {
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
    item.fulfillmentItems = [];
    if (item.notPickedUpReason === 'substituted') {
      item.notPickedUpReason = undefined;
    }
    if (!item.matchedInventoryId || !item.available) {
      item.selected = false;
    }
  }

  substitutionOptionsFor(item: ChecklistItem): Inventory[] {
    const descriptionSearch = this.normalizedSubstitutionDescriptionSearchFor(item);
    return this.inventoryService.inventory()
      .filter(inventory => this.unreservedQuantity(inventory) > 0)
      .filter(inventory => this.substitutionOptionScore(item, inventory) > 0)
      .filter(inventory => this.inventoryMatchesDescriptionSearch(inventory, descriptionSearch))
      .sort((left, right) => this.substitutionOptionScore(item, right) - this.substitutionOptionScore(item, left));
  }

  substitutionDescriptionSearchFor(item: ChecklistItem): string {
    return this.substitutionDescriptionSearchTerms.get(item.id) ?? '';
  }

  setSubstitutionDescriptionSearch(item: ChecklistItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const searchTerm = input.value.trim();
    if (!searchTerm) {
      this.substitutionDescriptionSearchTerms.delete(item.id);
      return;
    }

    this.substitutionDescriptionSearchTerms.set(item.id, searchTerm);
  }

  unreservedQuantity(inventory: Inventory): number {
    return Math.max(0, inventory.quantity - (inventory.reservedQuantity ?? 0));
  }

  inventoryDescription(inventory: Inventory): string {
    return inventory.description || inventory.item || inventory.internalBarcode || 'Unknown inventory item';
  }

  fulfillmentItemsFor(item: ChecklistItem): FulfillmentItem[] {
    return (item.fulfillmentItems ?? []).filter(fulfillmentItem => this.hasFulfillmentItemTarget(fulfillmentItem));
  }

  hasFulfillmentItems(item: ChecklistItem): boolean {
    return this.fulfillmentItemsFor(item).length > 0;
  }

  linkedFulfillmentItemCount(item: ChecklistItem): number {
    return this.fulfillmentItemsFor(item).length;
  }

  maxFulfillmentItemQuantity(fulfillmentItem: FulfillmentItem): number | null {
    const inventory = this.inventoryForFulfillmentItem(fulfillmentItem);
    if (!inventory) {
      return null;
    }

    return this.unreservedQuantity(inventory);
  }

  fulfillmentInventoryAvailableDisplay(fulfillmentItem: FulfillmentItem): string {
    const quantity = this.maxFulfillmentItemQuantity(fulfillmentItem);
    return quantity === null ? 'Unknown' : `${quantity}`;
  }

  fulfillmentItemDisplay(fulfillmentItem: FulfillmentItem): string {
    return fulfillmentItem.description || fulfillmentItem.item || fulfillmentItem.barcode || 'Unknown substitute item';
  }

  requestedQuantity(item: ChecklistItem): number {
    return Math.max(1, item.requestedQuantity ?? 1);
  }

  fulfillmentItemQuantity(fulfillmentItem: FulfillmentItem): number {
    return Math.max(1, fulfillmentItem.quantity ?? 1);
  }

  fulfilledQuantity(item: ChecklistItem): number {
    return this.fulfillmentItemsFor(item)
      .reduce((quantity, fulfillmentItem) => quantity + this.fulfillmentItemQuantity(fulfillmentItem), 0);
  }

  setFulfillmentItemQuantity(
    item: ChecklistItem,
    fulfillmentItem: FulfillmentItem,
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    const parsedQuantity = Number.parseInt(input.value, 10);
    const quantity = Number.isFinite(parsedQuantity) ? parsedQuantity : 1;
    const normalizedQuantity = this.normalizeFulfillmentItemQuantity(fulfillmentItem, quantity);
    if (normalizedQuantity === null) {
      input.value = `${this.fulfillmentItemQuantity(fulfillmentItem)}`;
      this.errorMessage = 'No unreserved quantity is available for this linked substitute.';
      return;
    }

    fulfillmentItem.quantity = normalizedQuantity;
    input.value = `${normalizedQuantity}`;
    item.selected = true;
    this.syncPrimarySubstituteFields(item);
    this.errorMessage = '';
  }

  removeFulfillmentItem(item: ChecklistItem, fulfillmentItem: FulfillmentItem): void {
    item.fulfillmentItems = (item.fulfillmentItems ?? [])
      .filter(existingFulfillmentItem => existingFulfillmentItem !== fulfillmentItem);

    if (this.hasFulfillmentItems(item)) {
      this.syncPrimarySubstituteFields(item);
      return;
    }

    this.clearSubstitution(item);
  }

  applySubstituteOption(item: ChecklistItem, inventory: Inventory): void {
    const barcode = this.substitutionBarcodeForInventory(inventory);
    this.substituteErrorMessage = '';
    this.applySubstituteInventory(item, barcode, inventory);
  }

  closeSession(): void {
    this.dialogRef.close({ refresh: true });
  }

  closeAndSaveDraft(): void {
    const familyId = this.data.family._id;
    const checklist = this.sessionFamily?.checklist;
    if (!familyId || !checklist) {
      this.dialogRef.close();
      return;
    }
    const validationMessage = this.validateFulfillmentInventoryLimits(checklist);
    if (validationMessage) {
      this.errorMessage = validationMessage;
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
    const validationMessage = this.validateFulfillmentInventoryLimits(checklist)
      || this.validateReadyToFinalize(checklist);
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
        items: section.items.map(item => this.prepareChecklistItemForSave(item)),
        notGivenItems: section.notGivenItems?.map(item => this.prepareChecklistItemForSave(item))
      }))
    };
  }

  private applySubstituteInventory(item: ChecklistItem, barcode: string, inventory: Inventory): void {
    const quantityToLink = this.defaultFulfillmentQuantity(item, inventory);
    if (quantityToLink <= 0) {
      this.substituteErrorMessage = 'No unreserved quantity is available for that substitute item.';
      return;
    }

    const existingFulfillmentItem = this.findFulfillmentItem(item, inventory, barcode);
    if (existingFulfillmentItem) {
      const nextQuantity = this.normalizeFulfillmentItemQuantity(
        existingFulfillmentItem,
        this.fulfillmentItemQuantity(existingFulfillmentItem) + quantityToLink);
      if (nextQuantity === null) {
        this.substituteErrorMessage = 'No unreserved quantity is available for that substitute item.';
        return;
      }
      existingFulfillmentItem.quantity = nextQuantity;
    } else {
      item.fulfillmentItems = [
        ...(item.fulfillmentItems ?? []),
        {
          inventoryId: inventory.internalID,
          barcode,
          item: inventory.item,
          description: inventory.description,
          quantity: quantityToLink
        }
      ];
    }

    item.selected = true;
    this.syncPrimarySubstituteFields(item);
  }

  private captureSubstitutionSuggestions(checklist: FamilyChecklist | null | undefined): void {
    this.originalSubstitutionSuggestions.clear();
    for (const section of checklist?.sections ?? []) {
      for (const item of section.items) {
        this.ensureFulfillmentItemsForActiveSubstitution(item);
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

  private prepareChecklistItemForSave(item: ChecklistItem): ChecklistItem {
    const fulfillmentItems = this.normalizedFulfillmentItems(item);
    const itemForSave: ChecklistItem = {
      ...item,
      fulfillmentItems
    };

    if (fulfillmentItems.length > 0) {
      const primaryFulfillmentItem = fulfillmentItems[0];
      itemForSave.selected = true;
      itemForSave.substituteBarcode = primaryFulfillmentItem.barcode;
      itemForSave.substituteInventoryId = primaryFulfillmentItem.inventoryId;
      itemForSave.substituteItem = primaryFulfillmentItem.item;
      itemForSave.substituteDescription = primaryFulfillmentItem.description;
      itemForSave.notPickedUpReason = item.notPickedUpReason || 'substituted';
    }

    return itemForSave;
  }

  private normalizedFulfillmentItems(item: ChecklistItem): FulfillmentItem[] {
    return this.fulfillmentItemsFor(item).map(fulfillmentItem => ({
      inventoryId: fulfillmentItem.inventoryId,
      barcode: fulfillmentItem.barcode,
      item: fulfillmentItem.item,
      description: fulfillmentItem.description,
      quantity: this.fulfillmentItemQuantity(fulfillmentItem)
    }));
  }

  private ensureFulfillmentItemsForActiveSubstitution(item: ChecklistItem): void {
    if (!item.selected || this.hasFulfillmentItems(item) || !this.hasLegacySubstituteFields(item)) {
      return;
    }

    item.fulfillmentItems = [{
      inventoryId: item.substituteInventoryId ?? '',
      barcode: item.substituteBarcode,
      item: item.substituteItem,
      description: item.substituteDescription,
      quantity: this.requestedQuantity(item)
    }];
  }

  private findFulfillmentItem(
    item: ChecklistItem,
    inventory: Inventory,
    barcode: string
  ): FulfillmentItem | undefined {
    const inventoryBarcodes = this.barcodesForInventory(inventory);
    return this.fulfillmentItemsFor(item).find(fulfillmentItem =>
      fulfillmentItem.inventoryId === inventory.internalID
      || (!!fulfillmentItem.barcode && inventoryBarcodes.includes(fulfillmentItem.barcode))
      || (!!barcode && fulfillmentItem.barcode === barcode)
    );
  }

  private syncPrimarySubstituteFields(item: ChecklistItem): void {
    const primaryFulfillmentItem = this.fulfillmentItemsFor(item)[0];
    if (!primaryFulfillmentItem) {
      return;
    }

    item.substituteBarcode = primaryFulfillmentItem.barcode;
    item.substituteInventoryId = primaryFulfillmentItem.inventoryId;
    item.substituteItem = primaryFulfillmentItem.item;
    item.substituteDescription = primaryFulfillmentItem.description;
    item.notPickedUpReason = 'substituted';
  }

  private isPartiallyFulfilled(item: ChecklistItem): boolean {
    return this.hasFulfillmentItems(item)
      && this.fulfilledQuantity(item) < this.requestedQuantity(item);
  }

  private defaultFulfillmentQuantity(item: ChecklistItem, inventory: Inventory): number {
    const unreservedQuantity = this.unreservedQuantity(inventory);
    if (unreservedQuantity <= 0) {
      return 0;
    }

    const quantityNeededToMeetRequest = Math.max(1, this.requestedQuantity(item) - this.fulfilledQuantity(item));
    return Math.min(quantityNeededToMeetRequest, unreservedQuantity);
  }

  private normalizeFulfillmentItemQuantity(fulfillmentItem: FulfillmentItem, quantity: number): number | null {
    const maxQuantity = this.maxFulfillmentItemQuantity(fulfillmentItem);
    if (maxQuantity !== null && maxQuantity < 1) {
      return null;
    }

    const cappedQuantity = maxQuantity === null ? quantity : Math.min(quantity, maxQuantity);
    return Math.max(1, cappedQuantity);
  }

  private hasLegacySubstituteFields(item: ChecklistItem): boolean {
    return !!(item.substituteBarcode || item.substituteInventoryId || item.substituteItem || item.substituteDescription);
  }

  private hasFulfillmentItemTarget(fulfillmentItem: FulfillmentItem): boolean {
    return !!(fulfillmentItem.inventoryId || fulfillmentItem.barcode);
  }

  private inventoryForFulfillmentItem(fulfillmentItem: FulfillmentItem): Inventory | undefined {
    if (fulfillmentItem.inventoryId) {
      return this.inventoryService.inventory().find(inventory => inventory.internalID === fulfillmentItem.inventoryId);
    }
    if (fulfillmentItem.barcode) {
      return this.inventoryService.inventory()
        .find(inventory => this.barcodesForInventory(inventory).includes(fulfillmentItem.barcode ?? ''));
    }
    return undefined;
  }

  private substitutionOptionScore(item: ChecklistItem, inventory: Inventory): number {
    const originalSuggestion = this.originalSubstitutionSuggestions.get(item.id);
    if (inventory.internalID && inventory.internalID === originalSuggestion?.substituteInventoryId) {
      return 1000;
    }

    const inventoryBarcodes = this.barcodesForInventory(inventory);
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

    return this.relatedTokenScore(itemTokens, inventoryTokens);
  }

  private substitutionBarcodeForInventory(inventory: Inventory): string {
    return inventory.internalBarcode || inventory.externalBarcode?.[0] || '';
  }

  private barcodesForInventory(inventory: Inventory): string[] {
    return [
      inventory.internalBarcode,
      ...(inventory.externalBarcode ?? [])
    ].filter((barcode): barcode is string => !!barcode);
  }

  private normalizedSubstitutionDescriptionSearchFor(item: ChecklistItem): string {
    return this.substitutionDescriptionSearchFor(item).toLowerCase();
  }

  private inventoryMatchesDescriptionSearch(inventory: Inventory, searchTerm: string): boolean {
    if (!searchTerm) {
      return true;
    }

    return this.inventoryDescription(inventory).toLowerCase().includes(searchTerm);
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

  private validateFulfillmentInventoryLimits(checklist: FamilyChecklist): string {
    const quantityByInventoryId = new Map<string, { display: string; maxQuantity: number; quantity: number }>();
    for (const item of this.checklistItems(checklist)) {
      for (const fulfillmentItem of this.fulfillmentItemsFor(item)) {
        const inventory = this.inventoryForFulfillmentItem(fulfillmentItem);
        const display = this.fulfillmentItemDisplay(fulfillmentItem);
        if (!inventory) {
          return `Linked substitute "${display}" could not be matched to inventory.`;
        }

        const maxQuantity = this.unreservedQuantity(inventory);
        if (maxQuantity < 1) {
          return `No unreserved quantity is available for linked substitute "${display}".`;
        }

        const existingQuantity = quantityByInventoryId.get(inventory.internalID) ?? {
          display: this.inventoryDescription(inventory),
          maxQuantity,
          quantity: 0
        };
        existingQuantity.quantity += this.fulfillmentItemQuantity(fulfillmentItem);
        quantityByInventoryId.set(inventory.internalID, existingQuantity);
      }
    }

    for (const inventoryQuantity of quantityByInventoryId.values()) {
      if (inventoryQuantity.quantity > inventoryQuantity.maxQuantity) {
        return `Reduce linked substitute "${inventoryQuantity.display}" to ${inventoryQuantity.maxQuantity} or less across this session.`;
      }
    }

    return '';
  }

  private checklistItems(checklist: FamilyChecklist): ChecklistItem[] {
    return checklist.sections.flatMap(section => [
      ...section.items,
      ...(section.notGivenItems ?? [])
    ]);
  }

  private normalizeDisplayText(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  private searchableTokens(...values: Array<string | undefined>): string[] {
    return values
      .flatMap(value => (value ?? '').toLowerCase().split(/[^a-z0-9]+/g))
      .map(value => value.endsWith('s') && value.length > 1 ? value.slice(0, -1) : value)
      .filter(value => this.isMeaningfulSubstitutionToken(value))
      .filter((value, index, valuesArray) => valuesArray.indexOf(value) === index);
  }

  private isMeaningfulSubstitutionToken(value: string): boolean {
    return value.length > 1
      && !/^\d+$/.test(value)
      && !this.substitutionTokenStopWords.has(value);
  }

  private relatedTokenScore(itemTokens: string[], inventoryTokens: string[]): number {
    return itemTokens.reduce((score, itemToken) => {
      if (inventoryTokens.includes(itemToken)) {
        return score + 3;
      }

      const hasPartialMatch = itemToken.length >= 4 && inventoryTokens.some(inventoryToken =>
        inventoryToken.length >= 4
        && (inventoryToken.includes(itemToken) || itemToken.includes(inventoryToken))
      );

      return hasPartialMatch ? score + 1 : score;
    }, 0);
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

    sessionRequest.pipe(
      switchMap(family => this.inventoryService.refreshInventory().pipe(
        map(() => family)
      ))
    ).subscribe({
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
