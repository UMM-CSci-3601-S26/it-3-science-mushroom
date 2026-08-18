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
import { MatTooltipModule } from "@angular/material/tooltip";
import { PurchaseListSourceInfoDialogComponent } from "./purchase-list-source-info-dialog.component";

// Services
import { PurchaseListService } from "./purchase-list.service";

// Types
import type {
  PurchaseListFulfillmentAllocation,
  PurchaseListFulfillmentOption,
  PurchaseListItem,
  PurchaseListSnapshot,
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
    MatDialogModule,
    MatTooltipModule
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
    "fulfillmentPercent",
    "sources"
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

  openSourceInfoDialog(item: PurchaseListItem): void {
    this.dialog.open(PurchaseListSourceInfoDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      data: {
        itemDescription: item.description,
        sources: item.sources ?? []
      }
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
    return (item.linkedInventoryIds ?? []).length > 1;
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
    if (selectedFulfillmentInventoryIds.length > 0) {
      this.openFulfillmentAllocationDialog(item, selectedFulfillmentInventoryIds);
      return;
    }

    this.saveFulfillmentSelectionWithAllocations(
      item,
      selectedFulfillmentInventoryIds,
      []);
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
    const normalizedAllocations = this.normalizedAllocations(selectedFulfillmentAllocations);
    const snapshot = this.snapshotWithFulfillmentSelection(
      item,
      selectedFulfillmentInventoryIds,
      normalizedAllocations);
    const shouldSwitchToActiveView = this.activeView() === 'resolved'
      && (
        selectedFulfillmentInventoryIds.length === 0
        || this.allocationTotal(normalizedAllocations) < item.totalNeeded
      );

    if (!snapshot) {
      this.snackBar.open('Unable to save fulfillment selection.', 'OK', { duration: 4000 });
      return;
    }

    this.savingFulfillmentSelection.set(true);
    this.purchaseListService.savePurchaseList(snapshot).subscribe({
      next: purchaseList => {
        this.purchaseList.set(purchaseList);
        if (shouldSwitchToActiveView) {
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
      && this.draftSelectedFulfillmentInventoryIds().length > 0;
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

    const updatedItem: PurchaseListItem = {
      ...item,
      linkedInventoryIds: [...(item.linkedInventoryIds ?? [])],
      selectedFulfillmentInventoryIds: [...selectedFulfillmentInventoryIds],
      selectedFulfillmentAllocations: [...selectedFulfillmentAllocations],
      fulfillmentOptions: [...(item.fulfillmentOptions ?? [])],
      sources: [...(item.sources ?? [])]
    };
    const allocationTotal = this.allocationTotal(selectedFulfillmentAllocations);
    const shouldStayActive = selectedFulfillmentInventoryIds.length === 0
      || allocationTotal < item.totalNeeded;

    if (this.activeView() === 'resolved') {
      const remainingResolvedItems = (snapshot.resolvedItems ?? []).filter(resolved => resolved !== item);

      if (shouldStayActive) {
        return {
          ...snapshot,
          items: [
            ...(snapshot.items ?? []),
            updatedItem
          ],
          resolvedItems: remainingResolvedItems
        };
      }

      return {
        ...snapshot,
        items: snapshot.items ?? [],
        resolvedItems: [
          ...remainingResolvedItems,
          updatedItem
        ]
      };
    }

    if (!shouldStayActive) {
      return {
        ...snapshot,
        items: (snapshot.items ?? []).filter(activeItem => activeItem !== item),
        resolvedItems: [
          ...(snapshot.resolvedItems ?? []),
          updatedItem
        ]
      };
    }

    return {
      ...snapshot,
      items: (snapshot.items ?? []).map(activeItem => activeItem === item ? updatedItem : activeItem),
      resolvedItems: snapshot.resolvedItems ?? []
    };
  }

  private normalizedAllocations(
    allocations: PurchaseListFulfillmentAllocation[]
  ): PurchaseListFulfillmentAllocation[] {
    return allocations
      .map(allocation => {
        const sourceIds = this.uniqueStrings(allocation.sourceIds ?? []);
        const normalizedAllocation: PurchaseListFulfillmentAllocation = {
          internalId: allocation.internalId,
          quantity: Math.floor(allocation.quantity)
        };
        if (sourceIds.length > 0) {
          normalizedAllocation.sourceIds = sourceIds;
        }
        return normalizedAllocation;
      })
      .filter(allocation => allocation.internalId && allocation.quantity > 0);
  }

  private allocationTotal(allocations: PurchaseListFulfillmentAllocation[]): number {
    return allocations.reduce((total, allocation) => total + allocation.quantity, 0);
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

  private sameStringList(left: string[], right: string[]): boolean {
    return left.length === right.length
      && left.every((value, index) => value === right[index]);
  }

  private uniqueStrings(values: string[]): string[] {
    return values.filter((value, index) => value && values.indexOf(value) === index);
  }
}
