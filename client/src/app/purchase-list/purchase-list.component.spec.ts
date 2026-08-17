import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { PurchaseListSnapshot } from './purchase-list';
import { PurchaseListComponent } from './purchase-list.component';
import { PurchaseListService } from './purchase-list.service';
import {
  PurchaseListFulfillmentAllocationDialogComponent
} from './purchase-list-fulfillment-allocation-dialog.component';

describe('PurchaseListComponent', () => {
  let component: PurchaseListComponent;
  let fixture: ComponentFixture<PurchaseListComponent>;
  let purchaseListService: jasmine.SpyObj<PurchaseListService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const snapshot: PurchaseListSnapshot = {
    generatedAt: '2026-08-08T12:00:00.000Z',
    summary: {
      totalDemandedItems: 3,
      itemsNeedingPurchase: 2,
      totalUnitsNeeded: 20,
      totalUnitsOnHand: 7,
      totalUnitsToBuy: 13
    },
    items: [
      purchaseItem('Markers', 'Blue markers', 2, 80, ['ID-00010', 'ID-00011']),
      purchaseItem('Pencils', 'No. 2 pencils', 10, 20),
      purchaseItem('Folders', 'Pocket folders', 1, 100)
    ],
    resolvedItems: []
  };

  const calculatedSnapshot: PurchaseListSnapshot = {
    ...snapshot,
    generatedAt: '2026-08-09T12:00:00.000Z',
    summary: {
      ...snapshot.summary,
      totalUnitsToBuy: 4
    },
    items: [
      purchaseItem('Glue', 'Glue sticks', 4, 60)
    ],
    resolvedItems: []
  }

  beforeEach(async () => {
    purchaseListService = jasmine.createSpyObj<PurchaseListService>(
      'PurchaseListService',
      ['getPurchaseList', 'calculatePurchaseList', 'savePurchaseList']);
    purchaseListService.getPurchaseList.and.returnValue(of(snapshot));
    purchaseListService.calculatePurchaseList.and.returnValue(of(calculatedSnapshot));
    purchaseListService.savePurchaseList.and.callFake(purchaseList => of(purchaseList));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        PurchaseListComponent,
        NoopAnimationsModule
      ],
      providers: [
        {
          provide: PurchaseListService,
          useValue: purchaseListService
        },
        { provide: MatDialog, useValue: dialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseListComponent);
    component = fixture.componentInstance;
    (component as unknown as { dialog: jasmine.SpyObj<MatDialog> }).dialog = dialog;
  });

  it('loads purchase list items into the Material table data source', () => {
    fixture.detectChanges();

    expect(component.displayedColumns).toEqual([
      'description',
      'totalNeeded',
      'quantityOnHand',
      'quantityToBuy',
      'fulfillmentPercent'
    ]);
    expect(component.dataSource.data.map(item => item.item)).toEqual(['Markers', 'Pencils', 'Folders']);
  });

  it('connects the Material sort to the table data source', () => {
    fixture.detectChanges();

    expect(component.sort()).toBeTruthy();
    expect(component.dataSource.sort).toBe(component.sort());
  });

  it('uses native Material sort headers for quantity and status columns', () => {
    fixture.detectChanges();

    const sortHeaders = fixture.debugElement.queryAll(By.css('[mat-sort-header]'));

    expect(sortHeaders.length).toBe(4);
    expect(sortHeaders.map(header => header.nativeElement.textContent.trim()))
      .toEqual(['Total Needed', 'On Hand', 'To Buy', 'Status']);
  });

  it('filters purchase list rows by description text', () => {
    fixture.detectChanges();

    component.applySearch('no. 2');

    expect(component.searchQuery()).toBe('no. 2');
    expect(component.dataSource.filteredData.map(item => item.item)).toEqual(['Pencils']);
  });

  it('does not match non-description fields in the purchase list search', () => {
    fixture.detectChanges();

    component.applySearch('partial');

    expect(component.dataSource.filteredData).toEqual([]);
  });

  it('clears the purchase list search filter', () => {
    fixture.detectChanges();

    component.applySearch('blue');
    component.clearSearch();

    expect(component.searchQuery()).toBe('');
    expect(component.dataSource.filter).toBe('');
    expect(component.dataSource.filteredData.map(item => item.item))
      .toEqual(['Markers', 'Pencils', 'Folders']);
  });

  it('toggles expansion for rows with multiple linked inventory IDs', () => {
    fixture.detectChanges();

    const markerItem = component.dataSource.data[0];
    const pencilItem = component.dataSource.data[1];

    expect(component.hasMultipleFulfillmentOptions(markerItem)).toBeTrue();
    expect(component.hasMultipleFulfillmentOptions(pencilItem)).toBeFalse();

    component.toggleExpansion(markerItem);
    expect(component.expandedRow()).toBe(markerItem);

    component.toggleExpansion(markerItem);
    expect(component.expandedRow()).toBeNull();
  });

  it('does not expand rows with one or fewer linked inventory IDs', () => {
    fixture.detectChanges();

    const pencilItem = component.dataSource.data[1];

    component.toggleExpansion(pencilItem);

    expect(component.expandedRow()).toBeNull();
  });

  it('shows an expand cue only for rows with multiple linked inventory IDs', () => {
    fixture.detectChanges();

    const expandCues = fixture.debugElement.queryAll(By.css('.purchase-expand-cue'));

    expect(expandCues.length).toBe(1);
    expect(expandCues[0].nativeElement.textContent.trim()).toBe('expand_more');
  });

  it('shows fulfillment options when an expandable row is opened', () => {
    fixture.detectChanges();

    component.toggleExpansion(component.dataSource.data[0]);
    fixture.detectChanges();

    const optionDescriptions = fixture.debugElement.queryAll(By.css('.purchase-linked-option-description'));
    const optionStockCounts = fixture.debugElement.queryAll(By.css('.purchase-linked-option-stock'));

    expect(optionDescriptions.map(option => option.nativeElement.textContent.trim()))
      .toEqual(['8 Pack of Washable Markers', 'General Writing Tool']);
    expect(optionStockCounts.map(option => option.nativeElement.textContent.trim()))
      .toEqual(['3 on hand', '4 on hand']);
    expect(fixture.nativeElement.textContent).toContain('Internal ID');
    expect(fixture.nativeElement.textContent).toContain('ID-00010');
  });

  it('saves a selected fulfillment option and moves the original row to resolved items', () => {
    fixture.detectChanges();

    const markerItem = component.dataSource.data[0];

    component.toggleExpansion(markerItem);
    component.toggleFulfillmentSelection(markerItem, 'ID-00010', true);
    component.saveFulfillmentSelection(markerItem);

    const savedSnapshot = purchaseListService.savePurchaseList.calls.mostRecent().args[0];
    const createdFulfillmentRow = savedSnapshot.items.find(item => item.internalId === 'ID-00010');

    expect(savedSnapshot.resolvedItems.length).toBe(1);
    expect(savedSnapshot.resolvedItems[0].description).toBe('Blue markers');
    expect(savedSnapshot.resolvedItems[0].selectedFulfillmentInventoryIds).toEqual(['ID-00010']);
    expect(savedSnapshot.items.map(item => item.item)).toEqual(['Pencils', 'Folders', 'Markers']);
    expect(createdFulfillmentRow?.description).toBe('8 Pack of Washable Markers');
    expect(createdFulfillmentRow?.totalNeeded).toBe(10);
    expect(createdFulfillmentRow?.quantityOnHand).toBe(3);
    expect(createdFulfillmentRow?.quantityToBuy).toBe(7);
    expect(component.purchaseList()).toEqual(savedSnapshot);
    expect(component.expandedRow()).toBeNull();
  });

  it('opens an allocation dialog when multiple fulfillment options are selected', () => {
    dialog.open.and.returnValue({
      afterClosed: () => of([
        { internalId: 'ID-00010', quantity: 6 },
        { internalId: 'ID-00011', quantity: 4 }
      ])
    } as MatDialogRef<PurchaseListFulfillmentAllocationDialogComponent>);
    fixture.detectChanges();

    const markerItem = component.dataSource.data[0];

    component.toggleExpansion(markerItem);
    component.toggleFulfillmentSelection(markerItem, 'ID-00010', true);
    component.toggleFulfillmentSelection(markerItem, 'ID-00011', true);
    component.saveFulfillmentSelection(markerItem);

    const savedSnapshot = purchaseListService.savePurchaseList.calls.mostRecent().args[0];
    const markerFulfillmentRow = savedSnapshot.items.find(item => item.internalId === 'ID-00010');
    const writingToolFulfillmentRow = savedSnapshot.items.find(item => item.internalId === 'ID-00011');

    expect(dialog.open).toHaveBeenCalledWith(
      PurchaseListFulfillmentAllocationDialogComponent,
      jasmine.objectContaining({
        width: '620px',
        data: jasmine.objectContaining({
          totalNeeded: 10,
          options: markerItem.fulfillmentOptions
        })
      }));
    expect(savedSnapshot.resolvedItems[0].selectedFulfillmentInventoryIds)
      .toEqual(['ID-00010', 'ID-00011']);
    expect(savedSnapshot.resolvedItems[0].selectedFulfillmentAllocations)
      .toEqual([
        { internalId: 'ID-00010', quantity: 6 },
        { internalId: 'ID-00011', quantity: 4 }
      ]);
    expect(markerFulfillmentRow?.totalNeeded).toBe(6);
    expect(markerFulfillmentRow?.quantityToBuy).toBe(3);
    expect(writingToolFulfillmentRow?.totalNeeded).toBe(4);
    expect(writingToolFulfillmentRow?.quantityToBuy).toBe(0);
  });

  it('shows resolved rows in the resolved view', () => {
    fixture.detectChanges();

    const markerItem = component.dataSource.data[0];

    component.toggleExpansion(markerItem);
    component.toggleFulfillmentSelection(markerItem, 'ID-00010', true);
    component.saveFulfillmentSelection(markerItem);
    component.setActiveView('resolved');
    fixture.detectChanges();

    expect(component.dataSource.data.map(item => item.description)).toEqual(['Blue markers']);
  });

  it('updates active fulfillment rows when a resolved selection changes', () => {
    fixture.detectChanges();

    const markerItem = component.dataSource.data[0];

    component.toggleExpansion(markerItem);
    component.toggleFulfillmentSelection(markerItem, 'ID-00010', true);
    component.saveFulfillmentSelection(markerItem);
    component.setActiveView('resolved');
    fixture.detectChanges();

    const resolvedItem = component.dataSource.data[0];

    component.toggleExpansion(resolvedItem);
    component.toggleFulfillmentSelection(resolvedItem, 'ID-00010', false);
    component.toggleFulfillmentSelection(resolvedItem, 'ID-00011', true);
    component.saveFulfillmentSelection(resolvedItem);

    const savedSnapshot = purchaseListService.savePurchaseList.calls.mostRecent().args[0];

    expect(savedSnapshot.items.some(item => item.internalId === 'ID-00010')).toBeFalse();
    expect(savedSnapshot.items.some(item => item.internalId === 'ID-00011')).toBeTrue();
    expect(savedSnapshot.resolvedItems[0].selectedFulfillmentInventoryIds).toEqual(['ID-00011']);
  });

  it('moves a resolved row back to to-buy when its selection is cleared', () => {
    fixture.detectChanges();

    const markerItem = component.dataSource.data[0];

    component.toggleExpansion(markerItem);
    component.toggleFulfillmentSelection(markerItem, 'ID-00010', true);
    component.saveFulfillmentSelection(markerItem);
    component.setActiveView('resolved');
    fixture.detectChanges();

    const resolvedItem = component.dataSource.data[0];

    component.toggleExpansion(resolvedItem);
    component.toggleFulfillmentSelection(resolvedItem, 'ID-00010', false);
    component.saveFulfillmentSelection(resolvedItem);
    fixture.detectChanges();

    const savedSnapshot = purchaseListService.savePurchaseList.calls.mostRecent().args[0];

    expect(component.activeView()).toBe('active');
    expect(savedSnapshot.resolvedItems).toEqual([]);
    expect(savedSnapshot.items.map(item => item.description)).toEqual([
      'No. 2 pencils',
      'Pocket folders',
      'Blue markers'
    ]);
    expect(component.dataSource.data.map(item => item.description)).toEqual([
      'No. 2 pencils',
      'Pocket folders',
      'Blue markers'
    ]);
    expect(savedSnapshot.items.some(item => item.internalId === 'ID-00010')).toBeFalse();
    expect(savedSnapshot.items.at(-1)?.selectedFulfillmentInventoryIds).toEqual([]);
  });

  it('warns when moving away from a row with an unsaved fulfillment edit', () => {
    fixture.detectChanges();

    const snackBar = TestBed.inject(MatSnackBar);
    const snackBarSpy = spyOn(snackBar, 'open');
    const markerItem = component.dataSource.data[0];
    const otherExpandableItem = purchaseItem('Crayons', 'Crayons', 5, 50, ['ID-00020', 'ID-00021']);

    component.toggleExpansion(markerItem);
    component.toggleFulfillmentSelection(markerItem, 'ID-00010', true);
    component.toggleExpansion(otherExpandableItem);

    expect(component.expandedRow()).toBe(markerItem);
    expect(snackBarSpy).toHaveBeenCalledWith(
      'Save or cancel row edit before selecting another row.',
      'OK',
      { duration: 4000 });
  });

  it('Successful calculate response updates purchase list snapshot', () => {
    fixture.detectChanges()
    component.calculateCurrentPurchaseList();
    fixture.detectChanges()

    expect(component.purchaseList()).toEqual(calculatedSnapshot);
    expect(component.dataSource.data.map(item => item.item)).toEqual(['Glue']);

  });
});

function purchaseItem(
  item: string,
  description: string,
  quantityToBuy: number,
  fulfillmentPercent: number,
  linkedInventoryIds: string[] = []
) {
  return {
    inventoryId: item,
    internalId: item,
    item,
    description,
    totalNeeded: 10,
    quantityOnHand: 5,
    quantityToBuy,
    fulfillmentPercent,
    fulfillmentStatus: quantityToBuy === 0 ? 'fulfilled' as const : 'partial' as const,
    linkedInventoryIds,
    selectedFulfillmentInventoryIds: [],
    selectedFulfillmentAllocations: [],
    fulfillmentOptions: linkedInventoryIds.map((internalId, index) => ({
      internalId,
      inventoryId: `inventory-${internalId}`,
      item: index === 0 ? 'Markers' : 'Writing Tool',
      description: index === 0 ? '8 Pack of Washable Markers' : 'General Writing Tool',
      quantityOnHand: index === 0 ? 3 : 4
    })),
    sources: []
  };
}
