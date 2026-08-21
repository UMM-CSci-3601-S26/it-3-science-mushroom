import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { PurchaseListItem, PurchaseListSnapshot } from './purchase-list';
import { PurchaseListComponent } from './purchase-list.component';
import { PurchaseListService } from './purchase-list.service';
import { PurchaseListSourceInfoDialogComponent } from './purchase-list-source-info-dialog.component';

describe('PurchaseListComponent', () => {
  let component: PurchaseListComponent;
  let fixture: ComponentFixture<PurchaseListComponent>;
  let purchaseListService: jasmine.SpyObj<PurchaseListService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const markerItem = purchaseItem('Markers', 'Blue markers', 5, 3);
  const pencilItem = purchaseItem('Pencils', 'No. 2 pencils', 10, 10);
  const snapshot: PurchaseListSnapshot = {
    generatedAt: '2026-08-08T12:00:00.000Z',
    summary: {
      totalDemandedItems: 2,
      itemsNeedingPurchase: 1,
      totalUnitsNeeded: 15,
      totalUnitsOnHand: 13,
      totalUnitsToBuy: 2
    },
    items: [markerItem, pencilItem]
  };

  beforeEach(async () => {
    purchaseListService = jasmine.createSpyObj<PurchaseListService>(
      'PurchaseListService',
      ['getPurchaseList', 'calculatePurchaseList']);
    purchaseListService.getPurchaseList.and.returnValue(of(snapshot));
    purchaseListService.calculatePurchaseList.and.returnValue(of({
      ...snapshot,
      generatedAt: '2026-08-09T12:00:00.000Z',
      items: [pencilItem]
    }));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [PurchaseListComponent, NoopAnimationsModule],
      providers: [
        { provide: PurchaseListService, useValue: purchaseListService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseListComponent);
    component = fixture.componentInstance;
    (component as unknown as { dialog: jasmine.SpyObj<MatDialog> }).dialog = dialog;
  });

  it('loads sourced demand rows into the table', () => {
    fixture.detectChanges();

    expect(component.dataSource.data).toEqual([markerItem, pencilItem]);
    expect(component.displayedColumns).toEqual([
      'description',
      'totalNeeded',
      'quantityOnHand',
      'quantityToBuy',
      'fulfillmentPercent',
      'sources'
    ]);
    expect(component.sort()).toBeTruthy();
    expect(component.dataSource.sort).toBe(component.sort());
  });

  it('uses Material sort headers for quantity and status columns', () => {
    fixture.detectChanges();

    const headers = fixture.debugElement.queryAll(By.css('[mat-sort-header]'));
    expect(headers.map(header => header.nativeElement.textContent.trim()))
      .toEqual(['Total Needed', 'On Hand', 'To Buy', 'Status']);
  });

  it('filters and clears rows by description', () => {
    fixture.detectChanges();

    component.applySearch(' no. 2 ');
    expect(component.dataSource.filteredData).toEqual([pencilItem]);

    component.clearSearch();
    expect(component.searchQuery()).toBe('');
    expect(component.dataSource.filteredData).toEqual([markerItem, pencilItem]);
  });

  it('opens the source dialog for a row', () => {
    fixture.detectChanges();

    component.openSourceInfoDialog(markerItem);

    expect(dialog.open).toHaveBeenCalledWith(PurchaseListSourceInfoDialogComponent, jasmine.objectContaining({
      data: {
        itemDescription: markerItem.description,
        sources: markerItem.sources
      }
    }));
  });

  it('recalculates and replaces the displayed rows', () => {
    fixture.detectChanges();

    component.calculateCurrentPurchaseList();
    fixture.detectChanges();

    expect(component.purchaseList()?.items).toEqual([pencilItem]);
    expect(component.calculating()).toBeFalse();
    expect(snackBar.open).toHaveBeenCalledWith('Calculated purchase list', 'OK', { duration: 6000 });
  });

  it('sets the error state when the current snapshot cannot load', () => {
    purchaseListService.getPurchaseList.and.returnValue(throwError(() => new Error('load failed')));

    fixture.detectChanges();

    expect(component.purchaseList()).toBeNull();
    expect(component.loading()).toBeFalse();
    expect(component.error()).toBeTrue();
  });

  it('reports a failed recalculation and clears the busy state', () => {
    fixture.detectChanges();
    purchaseListService.calculatePurchaseList.and.returnValue(throwError(() => new Error('calculate failed')));

    component.calculateCurrentPurchaseList();

    expect(component.calculating()).toBeFalse();
    expect(snackBar.open).toHaveBeenCalledWith('Failed to calculate purchase list', 'OK', { duration: 8000 });
  });
});

function purchaseItem(
  item: string,
  description: string,
  totalNeeded: number,
  quantityOnHand: number
): PurchaseListItem {
  return {
    inventoryId: `${item}-inventory`,
    internalId: `${item}-internal`,
    item,
    description,
    totalNeeded,
    quantityOnHand,
    quantityToBuy: Math.max(0, totalNeeded - quantityOnHand),
    fulfillmentPercent: Math.min(100, Math.round(quantityOnHand / totalNeeded * 100)),
    fulfillmentStatus: quantityOnHand >= totalNeeded ? 'fulfilled' : 'partial',
    linkedInventoryIds: [],
    sources: [
      {
        supplyListId: `${item}-source`,
        school: 'Morris Elementary',
        grade: '5',
        teacher: 'Ms. Doe',
        requestedItems: [item],
        supplyListDescription: description,
        studentCount: 5,
        quantityPerStudent: 1,
        totalNeeded
      }
    ]
  };
}
