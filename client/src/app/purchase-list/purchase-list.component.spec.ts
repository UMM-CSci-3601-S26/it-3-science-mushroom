import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { PurchaseListSnapshot } from './purchase-list';
import { PurchaseListComponent } from './purchase-list.component';
import { PurchaseListService } from './purchase-list.service';

describe('PurchaseListComponent', () => {
  let component: PurchaseListComponent;
  let fixture: ComponentFixture<PurchaseListComponent>;

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
    await TestBed.configureTestingModule({
      imports: [
        PurchaseListComponent,
        NoopAnimationsModule
      ],
      providers: [
        {
          provide: PurchaseListService,
          useValue: {
            getPurchaseList: () => of(snapshot),
            calculatePurchaseList: () => of(calculatedSnapshot)
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseListComponent);
    component = fixture.componentInstance;
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
    sources: []
  };
}
