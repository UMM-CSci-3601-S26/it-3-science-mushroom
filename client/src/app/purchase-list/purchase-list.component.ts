import { Component, effect, inject, OnInit, signal, viewChild } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";


// Services
import { PurchaseListService } from "./purchase-list.service";

// Types
import type {
  FulfillmentStatus,
  PurchaseListFulfillmentAllocation,
  PurchaseListFulfillmentOption,
  PurchaseListItem,
  PurchaseListSource,
  PurchaseListSnapshot
} from "./purchase-list";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatButtonModule } from "@angular/material/button";
import {
  PurchaseListFulfillmentAllocationDialogComponent
} from "./purchase-list-fulfillment-allocation-dialog.component";

type PurchaseListView = 'active' | 'resolved';

@Component({
  selector: 'app-purchase-component',
  standalone: true,
  templateUrl: './purchase-list.html',
  styleUrls: ['./purchase-list.scss'],
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSortModule,
    MatTableModule,
    MatButtonModule,
    MatCheckboxModule,
    MatButtonToggleModule,
    MatDialogModule
  ],
})
export class PurchaseListComponent implements OnInit {

  private purchaseListService = inject(PurchaseListService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  displayedColumns: string[] = [
    "description",
    "totalNeeded",
    "quantityOnHand",
    "quantityToBuy",
    "fulfillmentPercent"
  ];
  expandedDetailColumns: string[] = [
    "expandedDetail"
  ];
  dataSource = new MatTableDataSource<PurchaseListItem>([]);
  readonly sort = viewChild<MatSort>(MatSort);

  purchaseList = signal<PurchaseListSnapshot | null >(null);
  searchQuery = signal('');
  loading = signal(true);
  error = signal(false);
  calculating = signal(false);
  savingFulfillmentSelection = signal(false);
  activeView = signal<PurchaseListView>('active');
  expandedRow = signal<PurchaseListItem | null>(null);
  editingFulfillmentRow = signal<PurchaseListItem | null>(null);
  draftSelectedFulfillmentInventoryIds = signal<string[]>([]);

  constructor() {
    this.dataSource.filterPredicate = (item, filter) =>
      this.searchablePurchaseItemDescription(item).includes(filter);

    effect(() => {
      this.dataSource.data = this.currentViewItems();
      this.dataSource.sort = this.sort();
      this.dataSource.filter = this.normalizedSearchQuery(this.searchQuery());
    });
  }

  fetchPurchaseList() {
    this.purchaseListService.getPurchaseList().subscribe({
      next: purchaseList => {
        this.purchaseList.set(purchaseList);
        this.clearFulfillmentEdit();
        this.error.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.purchaseList.set(null);
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  calculateCurrentPurchaseList() {
    this.calculating.set(true);
    this.purchaseListService.calculatePurchaseList().subscribe({
      next: purchaseList => {
        this.purchaseList.set(purchaseList);
        this.clearFulfillmentEdit();
        this.calculating.set(false);
        this.loading.set(false);
        this.error.set(false);
        this.snackBar.open('Calculated purchase list', 'OK', { duration: 6000 });
      },
      error: () => {
        this.calculating.set(false);
        this.loading.set(false);
        this.snackBar.open('Failed to calculate purchase list', 'OK', { duration : 8000 });
      }
    });
  }

  applySearch(query: string): void {
    this.searchQuery.set(query);
    this.dataSource.filter = this.normalizedSearchQuery(query);
  }

  clearSearch(): void {
    this.applySearch('');
  }

  setActiveView(view: PurchaseListView): void {
    if (this.hasPendingFulfillmentEdit()) {
      this.snackBar.open('Save or cancel row edit before selecting another row.', 'OK', { duration: 4000 });
      return;
    }

    this.activeView.set(view);
    this.expandedRow.set(null);
    this.clearFulfillmentEdit();
  }

  currentViewItems(): PurchaseListItem[] {
    const snapshot = this.purchaseList();
    if (!snapshot) {
      return [];
    }

    return this.activeView() === 'resolved'
      ? snapshot.resolvedItems ?? []
      : snapshot.items ?? [];
  }

  activeItemCount(): number {
    return this.purchaseList()?.items?.length ?? 0;
  }

  resolvedItemCount(): number {
    return this.purchaseList()?.resolvedItems?.length ?? 0;
  }

  hasMultipleFulfillmentOptions(item: PurchaseListItem): boolean {
    return (item.linkedInventoryIds ?? []).length > 1;
  }

  toggleExpansion(row: PurchaseListItem): void {
    if (!this.isExpandable(row)) {
      return;
    }

    if (this.expandedRow() !== row && this.hasPendingFulfillmentEdit()) {
      this.snackBar.open('Save or cancel row edit before selecting another row.', 'OK', { duration: 4000 });
      return;
    }

    if (this.expandedRow() === row) {
      if (this.hasPendingFulfillmentEdit()) {
        this.snackBar.open('Save or cancel row edit before selecting another row.', 'OK', { duration: 4000 });
        return;
      }

      this.expandedRow.set(null);
      this.clearFulfillmentEdit();
      return;
    }

    this.expandedRow.set(row);
    this.startFulfillmentEdit(row);
  }

  isExpandable(item: PurchaseListItem): boolean {
    return this.hasMultipleFulfillmentOptions(item);
  }

  isResolved(item: PurchaseListItem): boolean {
    return (item.selectedFulfillmentInventoryIds ?? []).length > 0;
  }

  isUnresolved(item: PurchaseListItem): boolean {
    return !this.isResolved(item);
  }

  isFulfillmentSelected(item: PurchaseListItem, internalId: string): boolean {
    const selectedIds = this.editingFulfillmentRow() === item
      ? this.draftSelectedFulfillmentInventoryIds()
      : item.selectedFulfillmentInventoryIds ?? [];

    return selectedIds.includes(internalId);
  }

  toggleFulfillmentSelection(item: PurchaseListItem, internalId: string, checked: boolean): void {
    this.startFulfillmentEdit(item);
    const selectedIds = this.draftSelectedFulfillmentInventoryIds();

    this.draftSelectedFulfillmentInventoryIds.set(checked
      ? this.uniqueStrings([...selectedIds, internalId])
      : selectedIds.filter(selectedId => selectedId !== internalId));
  }

  canSaveFulfillmentSelection(item: PurchaseListItem): boolean {
    return this.editingFulfillmentRow() === item
      && (this.draftSelectedFulfillmentInventoryIds().length > 0 || this.activeView() === 'resolved')
      && (this.hasPendingFulfillmentEdit() || this.canEditExistingAllocation())
      && !this.savingFulfillmentSelection();
  }

  cancelFulfillmentEdit(item: PurchaseListItem, event?: Event): void {
    event?.stopPropagation();

    if (this.editingFulfillmentRow() !== item) {
      return;
    }

    this.resetFulfillmentDraft(item);
  }

  saveFulfillmentSelection(item: PurchaseListItem, event?: Event): void {
    event?.stopPropagation();

    if (!this.canSaveFulfillmentSelection(item)) {
      return;
    }

    const selectedFulfillmentInventoryIds = this.draftSelectedFulfillmentInventoryIds();
    if (selectedFulfillmentInventoryIds.length > 1) {
      this.openFulfillmentAllocationDialog(item, selectedFulfillmentInventoryIds);
      return;
    }

    this.saveFulfillmentSelectionWithAllocations(
      item,
      selectedFulfillmentInventoryIds,
      this.defaultFulfillmentAllocations(item, selectedFulfillmentInventoryIds));
  }

  ngOnInit(): void {
    this.fetchPurchaseList();
  }

  fulfillmentAllocationQuantity(item: PurchaseListItem, internalId: string): number {
    return this.fulfillmentAllocations(item)
      .find(allocation => allocation.internalId === internalId)
      ?.quantity ?? 0;
  }

  private openFulfillmentAllocationDialog(
    item: PurchaseListItem,
    selectedFulfillmentInventoryIds: string[]
  ): void {
    const options = this.fulfillmentOptionsForSelection(item, selectedFulfillmentInventoryIds);
    const dialogRef = this.dialog.open(PurchaseListFulfillmentAllocationDialogComponent, {
      width: '620px',
      maxWidth: '94vw',
      data: {
        itemDescription: item.description,
        totalNeeded: item.totalNeeded,
        options,
        existingAllocations: this.fulfillmentAllocations(item)
      }
    });

    dialogRef.afterClosed().subscribe((allocations: PurchaseListFulfillmentAllocation[] | undefined) => {
      if (!allocations) {
        return;
      }

      this.saveFulfillmentSelectionWithAllocations(
        item,
        selectedFulfillmentInventoryIds,
        allocations);
    });
  }

  private saveFulfillmentSelectionWithAllocations(
    item: PurchaseListItem,
    selectedFulfillmentInventoryIds: string[],
    selectedFulfillmentAllocations: PurchaseListFulfillmentAllocation[]
  ): void {
    const snapshot = this.snapshotWithFulfillmentSelection(
      item,
      selectedFulfillmentInventoryIds,
      selectedFulfillmentAllocations);
    const clearedResolvedSelection = this.activeView() === 'resolved'
      && selectedFulfillmentInventoryIds.length === 0;

    if (!snapshot) {
      this.snackBar.open('Unable to save fulfillment selection.', 'OK', { duration: 4000 });
      return;
    }

    this.savingFulfillmentSelection.set(true);
    this.purchaseListService.savePurchaseList(snapshot).subscribe({
      next: purchaseList => {
        this.purchaseList.set(purchaseList);
        if (clearedResolvedSelection) {
          this.activeView.set('active');
        }
        this.savingFulfillmentSelection.set(false);
        this.expandedRow.set(null);
        this.clearFulfillmentEdit();
        this.snackBar.open('Fulfillment selection saved.', 'OK', { duration: 3000 });
      },
      error: () => {
        this.savingFulfillmentSelection.set(false);
        this.snackBar.open('Unable to save fulfillment selection.', 'OK', { duration: 4000 });
      }
    });
  }

  private searchablePurchaseItemDescription(item: PurchaseListItem): string {
    return item.description.toLowerCase();
  }

  private normalizedSearchQuery(query: string): string {
    return query.trim().toLowerCase();
  }

  private startFulfillmentEdit(item: PurchaseListItem): void {
    if (this.editingFulfillmentRow() !== item) {
      this.editingFulfillmentRow.set(item);
      this.resetFulfillmentDraft(item);
    }
  }

  private resetFulfillmentDraft(item: PurchaseListItem): void {
    this.draftSelectedFulfillmentInventoryIds.set([...(item.selectedFulfillmentInventoryIds ?? [])]);
  }

  private clearFulfillmentEdit(): void {
    this.editingFulfillmentRow.set(null);
    this.draftSelectedFulfillmentInventoryIds.set([]);
  }

  private hasPendingFulfillmentEdit(): boolean {
    const item = this.editingFulfillmentRow();
    if (!item) {
      return false;
    }

    return !this.sameStringList(
      item.selectedFulfillmentInventoryIds ?? [],
      this.draftSelectedFulfillmentInventoryIds());
  }

  private canEditExistingAllocation(): boolean {
    return this.activeView() === 'resolved'
      && this.draftSelectedFulfillmentInventoryIds().length > 1;
  }

  private snapshotWithFulfillmentSelection(
    item: PurchaseListItem,
    selectedFulfillmentInventoryIds: string[],
    selectedFulfillmentAllocations: PurchaseListFulfillmentAllocation[]
  ): PurchaseListSnapshot | null {
    const snapshot = this.purchaseList();
    if (!snapshot) {
      return null;
    }

    const resolvedItem: PurchaseListItem = {
      ...item,
      linkedInventoryIds: [...(item.linkedInventoryIds ?? [])],
      selectedFulfillmentInventoryIds: [...selectedFulfillmentInventoryIds],
      selectedFulfillmentAllocations: [...selectedFulfillmentAllocations],
      fulfillmentOptions: [...(item.fulfillmentOptions ?? [])],
      sources: [...(item.sources ?? [])]
    };

    if (this.activeView() === 'resolved') {
      const activeItems = this.itemsWithoutResolvedFulfillment(snapshot.items ?? [], item);
      const remainingResolvedItems = (snapshot.resolvedItems ?? []).filter(resolved => resolved !== item);

      if (selectedFulfillmentInventoryIds.length === 0) {
        return {
          ...snapshot,
          items: [
            ...activeItems,
            resolvedItem
          ],
          resolvedItems: remainingResolvedItems
        };
      }

      return {
        ...snapshot,
        items: this.itemsWithResolvedFulfillment(activeItems, resolvedItem),
        resolvedItems: [
          ...remainingResolvedItems,
          resolvedItem
        ]
      };
    }

    const activeItems = (snapshot.items ?? []).filter(activeItem => activeItem !== item);

    return {
      ...snapshot,
      items: this.itemsWithResolvedFulfillment(activeItems, resolvedItem),
      resolvedItems: [
        ...(snapshot.resolvedItems ?? []),
        resolvedItem
      ]
    };
  }

  private itemsWithResolvedFulfillment(
    items: PurchaseListItem[],
    resolvedItem: PurchaseListItem
  ): PurchaseListItem[] {
    let updatedItems = [...items];
    for (const allocation of this.fulfillmentAllocations(resolvedItem)) {
      const selectedOption = this.fulfillmentOptionForSelection(resolvedItem, allocation.internalId);

      if (!selectedOption || allocation.quantity <= 0) {
        continue;
      }

      const targetIndex = this.targetItemIndex(updatedItems, allocation.internalId);
      if (targetIndex === -1) {
        updatedItems = [
          ...updatedItems,
          this.purchaseItemFromFulfillmentOption(resolvedItem, selectedOption, allocation.quantity)
        ];
        continue;
      }

      updatedItems[targetIndex] = this.itemWithResolvedDemand(
        updatedItems[targetIndex],
        resolvedItem,
        allocation.quantity);
    }

    return updatedItems;
  }

  private itemsWithoutResolvedFulfillment(
    items: PurchaseListItem[],
    resolvedItem: PurchaseListItem
  ): PurchaseListItem[] {
    let updatedItems = [...items];
    for (const allocation of this.fulfillmentAllocations(resolvedItem)) {
      const targetIndex = this.targetItemIndex(updatedItems, allocation.internalId);
      if (targetIndex === -1) {
        continue;
      }

      const targetItem = updatedItems[targetIndex];
      const totalNeeded = Math.max(0, targetItem.totalNeeded - allocation.quantity);
      const sources = this.sourcesWithoutResolvedDemand(
        targetItem.sources ?? [],
        resolvedItem.sources ?? []);

      if (totalNeeded === 0 || sources.length === 0) {
        updatedItems = updatedItems.filter((_, index) => index !== targetIndex);
        continue;
      }

      updatedItems[targetIndex] = {
        ...targetItem,
        totalNeeded,
        quantityToBuy: this.quantityToBuy(targetItem.quantityOnHand, totalNeeded),
        fulfillmentPercent: this.fulfillmentPercent(targetItem.quantityOnHand, totalNeeded),
        fulfillmentStatus: this.fulfillmentStatus(targetItem.quantityOnHand, totalNeeded),
        sources
      };
    }

    return updatedItems;
  }

  private targetItemIndex(items: PurchaseListItem[], selectedId: string): number {
    return items.findIndex(item =>
      (item.linkedInventoryIds ?? []).length === 1
      && item.linkedInventoryIds[0] === selectedId);
  }

  private fulfillmentOptionForSelection(
    item: PurchaseListItem,
    selectedId: string
  ): PurchaseListFulfillmentOption | undefined {
    return (item.fulfillmentOptions ?? []).find(option => option.internalId === selectedId);
  }

  private fulfillmentOptionsForSelection(
    item: PurchaseListItem,
    selectedFulfillmentInventoryIds: string[]
  ): PurchaseListFulfillmentOption[] {
    return selectedFulfillmentInventoryIds
      .map(selectedId => this.fulfillmentOptionForSelection(item, selectedId))
      .filter((option): option is PurchaseListFulfillmentOption => !!option);
  }

  private defaultFulfillmentAllocations(
    item: PurchaseListItem,
    selectedFulfillmentInventoryIds: string[]
  ): PurchaseListFulfillmentAllocation[] {
    if (selectedFulfillmentInventoryIds.length !== 1) {
      return [];
    }

    return [
      {
        internalId: selectedFulfillmentInventoryIds[0],
        quantity: item.totalNeeded
      }
    ];
  }

  private fulfillmentAllocations(item: PurchaseListItem): PurchaseListFulfillmentAllocation[] {
    const savedAllocations = item.selectedFulfillmentAllocations ?? [];
    if (savedAllocations.length > 0) {
      return savedAllocations.filter(allocation => allocation.quantity > 0);
    }

    return this.defaultFulfillmentAllocations(
      item,
      item.selectedFulfillmentInventoryIds ?? []);
  }

  private itemWithResolvedDemand(
    targetItem: PurchaseListItem,
    resolvedItem: PurchaseListItem,
    allocatedQuantity: number
  ): PurchaseListItem {
    const totalNeeded = targetItem.totalNeeded + allocatedQuantity;

    return {
      ...targetItem,
      totalNeeded,
      quantityToBuy: this.quantityToBuy(targetItem.quantityOnHand, totalNeeded),
      fulfillmentPercent: this.fulfillmentPercent(targetItem.quantityOnHand, totalNeeded),
      fulfillmentStatus: this.fulfillmentStatus(targetItem.quantityOnHand, totalNeeded),
      sources: [
        ...(targetItem.sources ?? []),
        ...(resolvedItem.sources ?? [])
      ]
    };
  }

  private purchaseItemFromFulfillmentOption(
    resolvedItem: PurchaseListItem,
    option: PurchaseListFulfillmentOption,
    allocatedQuantity: number
  ): PurchaseListItem {
    const totalNeeded = allocatedQuantity;

    return {
      inventoryId: option.inventoryId,
      internalId: option.internalId,
      item: option.item,
      description: option.description,
      totalNeeded,
      quantityOnHand: option.quantityOnHand,
      quantityToBuy: this.quantityToBuy(option.quantityOnHand, totalNeeded),
      fulfillmentPercent: this.fulfillmentPercent(option.quantityOnHand, totalNeeded),
      fulfillmentStatus: this.fulfillmentStatus(option.quantityOnHand, totalNeeded),
      linkedInventoryIds: [option.internalId],
      selectedFulfillmentInventoryIds: [],
      selectedFulfillmentAllocations: [],
      fulfillmentOptions: [option],
      sources: [...(resolvedItem.sources ?? [])]
    };
  }

  private quantityToBuy(quantityOnHand: number, totalNeeded: number): number {
    return Math.max(0, totalNeeded - quantityOnHand);
  }

  private fulfillmentPercent(quantityOnHand: number, totalNeeded: number): number {
    if (totalNeeded <= 0) {
      return 100;
    }

    return Math.min(100, Math.round(quantityOnHand / totalNeeded * 100));
  }

  private fulfillmentStatus(quantityOnHand: number, totalNeeded: number): FulfillmentStatus {
    if (totalNeeded <= 0 || quantityOnHand >= totalNeeded) {
      return 'fulfilled';
    }

    return quantityOnHand <= 0 ? 'unfulfilled' : 'partial';
  }

  private sameStringList(left: string[], right: string[]): boolean {
    return left.length === right.length
      && left.every((value, index) => value === right[index]);
  }

  private uniqueStrings(values: string[]): string[] {
    return values.filter((value, index) => value && values.indexOf(value) === index);
  }

  private sourcesWithoutResolvedDemand(
    targetSources: PurchaseListSource[],
    resolvedSources: PurchaseListSource[]
  ): PurchaseListSource[] {
    const resolvedSourceIds = new Set(
      resolvedSources
        .map(source => source.supplyListId)
        .filter(sourceId => sourceId));

    if (resolvedSourceIds.size === 0) {
      return targetSources;
    }

    return targetSources.filter(source => !resolvedSourceIds.has(source.supplyListId));
  }
}
