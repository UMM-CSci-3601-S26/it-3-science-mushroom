import { Component, effect, inject, OnInit, signal, viewChild } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatButtonToggleModule } from "@angular/material/button-toggle";


// Services
import { PurchaseListService } from "./purchase-list.service";

// Types
import type {
  FulfillmentStatus,
  PurchaseListFulfillmentOption,
  PurchaseListItem,
  PurchaseListSource,
  PurchaseListSnapshot
} from "./purchase-list";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatButtonModule } from "@angular/material/button";

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
    MatButtonToggleModule
  ],
})
export class PurchaseListComponent implements OnInit {

  private purchaseListService = inject(PurchaseListService);
  private snackBar = inject(MatSnackBar);
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
    this.draftSelectedFulfillmentInventoryIds.set(checked ? [internalId] : []);
  }

  canSaveFulfillmentSelection(item: PurchaseListItem): boolean {
    return this.editingFulfillmentRow() === item
      && (this.draftSelectedFulfillmentInventoryIds().length > 0 || this.activeView() === 'resolved')
      && this.hasPendingFulfillmentEdit()
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

    const snapshot = this.snapshotWithFulfillmentSelection(
      item,
      this.draftSelectedFulfillmentInventoryIds());
    const clearedResolvedSelection = this.activeView() === 'resolved'
      && this.draftSelectedFulfillmentInventoryIds().length === 0;

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

  ngOnInit(): void {
    this.fetchPurchaseList();
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

  private snapshotWithFulfillmentSelection(
    item: PurchaseListItem,
    selectedFulfillmentInventoryIds: string[]
  ): PurchaseListSnapshot | null {
    const snapshot = this.purchaseList();
    if (!snapshot) {
      return null;
    }

    const resolvedItem: PurchaseListItem = {
      ...item,
      linkedInventoryIds: [...(item.linkedInventoryIds ?? [])],
      selectedFulfillmentInventoryIds: [...selectedFulfillmentInventoryIds],
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
    const selectedId = resolvedItem.selectedFulfillmentInventoryIds[0];
    const selectedOption = this.fulfillmentOptionForSelection(resolvedItem, selectedId);

    if (!selectedOption) {
      return items;
    }

    const targetIndex = this.targetItemIndex(items, selectedId);

    if (targetIndex === -1) {
      return [
        ...items,
        this.purchaseItemFromFulfillmentOption(resolvedItem, selectedOption)
      ];
    }

    const updatedItems = [...items];
    updatedItems[targetIndex] = this.itemWithResolvedDemand(
      updatedItems[targetIndex],
      resolvedItem);
    return updatedItems;
  }

  private itemsWithoutResolvedFulfillment(
    items: PurchaseListItem[],
    resolvedItem: PurchaseListItem
  ): PurchaseListItem[] {
    const selectedId = resolvedItem.selectedFulfillmentInventoryIds[0];
    if (!selectedId) {
      return items;
    }

    const targetIndex = this.targetItemIndex(items, selectedId);
    if (targetIndex === -1) {
      return items;
    }

    const targetItem = items[targetIndex];
    const totalNeeded = Math.max(0, targetItem.totalNeeded - resolvedItem.totalNeeded);
    const sources = this.sourcesWithoutResolvedDemand(
      targetItem.sources ?? [],
      resolvedItem.sources ?? []);

    if (totalNeeded === 0 || sources.length === 0) {
      return items.filter((_, index) => index !== targetIndex);
    }

    const updatedItems = [...items];
    updatedItems[targetIndex] = {
      ...targetItem,
      totalNeeded,
      quantityToBuy: this.quantityToBuy(targetItem.quantityOnHand, totalNeeded),
      fulfillmentPercent: this.fulfillmentPercent(targetItem.quantityOnHand, totalNeeded),
      fulfillmentStatus: this.fulfillmentStatus(targetItem.quantityOnHand, totalNeeded),
      sources
    };
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

  private itemWithResolvedDemand(
    targetItem: PurchaseListItem,
    resolvedItem: PurchaseListItem
  ): PurchaseListItem {
    const totalNeeded = targetItem.totalNeeded + resolvedItem.totalNeeded;

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
    option: PurchaseListFulfillmentOption
  ): PurchaseListItem {
    const totalNeeded = resolvedItem.totalNeeded;

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
