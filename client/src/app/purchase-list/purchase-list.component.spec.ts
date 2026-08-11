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
      purchaseItem('Markers', 'Blue markers', 2, 80),
      purchaseItem('Pencils', 'No. 2 pencils', 10, 20),
      purchaseItem('Folders', 'Pocket folders', 1, 100)
    ]
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
    ]
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

  it('Successful calculate response updates purchase list snapshot', () => {
    fixture.detectChanges()
    component.calculateCurrentPurchaseList();
    fixture.detectChanges()

    expect(component.purchaseList()).toEqual(calculatedSnapshot);
    expect(component.dataSource.data.map(item => item.item)).toEqual(['Glue']);

  });
});

function purchaseItem(item: string, description: string, quantityToBuy: number, fulfillmentPercent: number) {
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
    linkedInventoryIds: [],
    sources: []
  };
}
