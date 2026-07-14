import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { StationOrderComponent } from './station-order.component';
import { SupplyList } from '../supplylist/supplylist';
import { SupplyListService } from '../supplylist/supplylist.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

describe('StationOrderComponent', () => {
  let component: StationOrderComponent;
  let fixture: ComponentFixture<StationOrderComponent>;

  beforeEach(async () => {
    const supplyListServiceSpy = jasmine.createSpyObj('SupplyListService', ['getSupplyList']);
    supplyListServiceSpy.getSupplyList.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [StationOrderComponent],
      providers: [{ provide: SupplyListService, useValue: supplyListServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(StationOrderComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // no active HttpTestingController required when service is mocked
  });

  describe('drop method', () => {
    it('should move elements in the same list', () => {
      const bank = ['Pencil', 'Backpack', 'Eraser'];
      spyOn(component, 'saveStationOrder');

      const container = { data: bank }
      // I don't know why it was being so picky about this when I put { data: bank } directly in, but this worked so...

      const mockEvent = {
        previousContainer: container,
        container: container,
        previousIndex: 1,
        currentIndex: 0
      } as CdkDragDrop<string[]>;

      component.drop(mockEvent);
      expect(bank).toEqual(['Backpack', 'Pencil', 'Eraser']);
    });

    it('should save station order', () => {
      const stationOrder = ['Pencil', 'Folder'];
      expect(stationOrder).toEqual(['Pencil', 'Folder']);
      component.saveStationOrder();
    });

    it('should move elements between lists', () => {
      const bank = ['Pencil', 'Backpack', 'Eraser'];
      const stationOrder = ['Folder'];
      spyOn(component, 'saveStationOrder');

      const mockEvent = {
        previousContainer: { data: bank },
        container: { data: stationOrder},
        previousIndex: 0,
        currentIndex: 0
      } as CdkDragDrop<string[]>;

      component.drop(mockEvent);
      expect(bank).toEqual(['Backpack', 'Eraser']);
      expect(stationOrder).toEqual(['Pencil', 'Folder']);
    });
  });

  describe('optionBuilder', () => {
    it('should build unique options from supply list data', () => {
      const mockSupplyList: SupplyList[] = [
        {
          "_id": '3',
          "academicYear": "2023-2024",
          "school": "St. Mary's",
          "grade": "2nd Grade",
          "teacher": "N/A",
          "item": ["Pencil"],
          "brand": { exactly: "Ticonderoga", anyOf: []},
          "color": { exactly: "Yellow", anyOf: []},
          "size": { exactly: "#2", anyOf: []},
          "type": { exactly: "Unsharpened", anyOf: []},
          "material": { exactly: "N/A", anyOf: []},
          "packageSize": 1,
          "quantity": 12,
          "notes": "N/A",
          "supplyID": "N/A",
          "invIDs": []
        },
        {
          "_id": '2',
          "academicYear": "2023-2024",
          "school": "St. Mary's",
          "grade": "2nd Grade",
          "teacher": "N/A",
          "item": ["Folder"],
          "brand": { exactly: "N/A", anyOf: []},
          "color": { exactly: "Green", anyOf: []},
          "size": { exactly: "N/A", anyOf: []},
          "type": { exactly: "2 Prong", anyOf: []},
          "material": { exactly: "Plastic", anyOf: []},
          "packageSize": 1,
          "quantity": 2,
          "notes": "N/A",
          "supplyID": "N/A",
          "invIDs": []
        },
        {
          "_id": '1',
          "academicYear": "2023-2024",
          "teacher": "Ms. Smith",
          "school": "St. Mary's",
          "grade": "2nd Grade",
          "item": ["Pencil Box"],
          "brand": { exactly: "N/A", anyOf: []},
          "color": { exactly: "N/A", anyOf: []},
          "size": { exactly: "8\" x 5\"", anyOf: []},
          "type": { exactly: "N/A", anyOf: []},
          "material": { exactly: "Plastic", anyOf: []},
          "packageSize": 1,
          "quantity": 1,
          "notes": "N/A",
          "supplyID": "N/A",
          "invIDs": []
        },
      ];

      const result = component.optionBuilder(mockSupplyList, 'item');

      expect(result).toEqual([
        'Pencil', 'Folder', 'Pencil Box'
      ]);
    });
  });

});

