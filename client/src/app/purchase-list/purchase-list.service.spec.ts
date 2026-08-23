import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PurchaseListSnapshot } from './purchase-list';
import { PurchaseListService } from './purchase-list.service';

describe('PurchaseListService', () => {
  let service: PurchaseListService;
  let httpMock: HttpTestingController;

  const snapshot: PurchaseListSnapshot = {
    generatedAt: '2026-08-07T12:00:00.000Z',
    summary: {
      totalDemandedItems: 1,
      itemsNeedingPurchase: 1,
      totalUnitsNeeded: 5,
      totalUnitsOnHand: 3,
      totalUnitsToBuy: 2
    },
    items: [
      {
        inventoryId: '507f1f77bcf86cd799439011',
        internalId: 'ID-00042',
        item: 'Markers',
        description: 'Crayola markers',
        totalNeeded: 5,
        quantityOnHand: 3,
        quantityToBuy: 2,
        quantityToBuyUnit: 'packs',
        fulfillmentPercent: 60,
        fulfillmentStatus: 'partial',
        linkedInventoryIds: ['ID-00042'],
        sources: [
          {
            supplyListId: 'SL-1',
            school: 'MHS',
            grade: 'PreK',
            teacher: 'Ms Doe',
            requestedItems: ['Markers'],
            supplyListDescription: '2x Markers',
            studentCount: 2,
            quantityPerStudent: 2,
            totalNeeded: 4
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PurchaseListService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(PurchaseListService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('gets the currently saved purchase list snapshot', () => {
    let response: PurchaseListSnapshot | undefined;

    service.getPurchaseList().subscribe(data => {
      response = data;
    });

    const req = httpMock.expectOne(service.purchaseListUrl);
    expect(req.request.method).toBe('GET');
    req.flush(snapshot);

    expect(response).toEqual(snapshot);
  });

  it('calculates a new purchase list snapshot', () => {
    let response: PurchaseListSnapshot | undefined;

    service.calculatePurchaseList().subscribe(data => {
      response = data;
    });

    const req = httpMock.expectOne(service.calculatePurchaseListUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(snapshot);

    expect(response).toEqual(snapshot);
  });
});
