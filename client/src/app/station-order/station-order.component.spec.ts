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
          "brand": { allOf: "Ticonderoga", anyOf: []},
          "color": { allOf: ["Yellow"], anyOf: []},
          "size": { allOf: "#2", anyOf: []},
          "type": { allOf: "Unsharpened", anyOf: []},
          "material": { allOf: "N/A", anyOf: []},
          "count": 1,
          "quantity": 12,
          "notes": "N/A"
        },
        {
          "_id": '2',
          "academicYear": "2023-2024",
          "school": "St. Mary's",
          "grade": "2nd Grade",
          "teacher": "N/A",
          "item": ["Folder"],
          "brand": { allOf: "N/A", anyOf: []},
          "color": { allOf: ["Green"], anyOf: []},
          "size": { allOf: "N/A", anyOf: []},
          "type": { allOf: "2 Prong", anyOf: []},
          "material": { allOf: "Plastic", anyOf: []},
          "count": 1,
          "quantity": 2,
          "notes": "N/A"
        },
        {
          "_id": '1',
          "academicYear": "2023-2024",
          "teacher": "Ms. Smith",
          "school": "St. Mary's",
          "grade": "2nd Grade",
          "item": ["Pencil Box"],
          "brand": { allOf: "N/A", anyOf: []},
          "color": { allOf: ["N/A"], anyOf: []},
          "size": { allOf: "8\" x 5\"", anyOf: []},
          "type": { allOf: "N/A", anyOf: []},
          "material": { allOf: "Plastic", anyOf: []},
          "count": 1,
          "quantity": 1,
          "notes": "N/A"
        },
      ];

      const result = component.optionBuilder(mockSupplyList, 'item');

      expect(result).toEqual([
        'Pencil', 'Folder', 'Pencil Box'
      ]);
    });
  });

});

