import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AppComponent } from 'src/app/app.component';
import { SupplyList } from '../app/supplylist/supplylist';
import { SupplyListService } from 'src/app/supplylist/supplylist.service';

@Injectable({
  providedIn: AppComponent
})

export class MockSupplyListService implements Pick<SupplyListService, 'getSupplyList'> {
  static testSupplyList: SupplyList[] = [
    {
      _id: '1',
      academicYear: '2023-2024',
      teacher: 'Ms. Smith',
      school: "MHS",
      grade: "PreK",
      item: ["Markers"],
      brand: { allOf: "Crayola", anyOf: []},
      color: { allOf: [], anyOf: []},
      count: 8,
      size: { allOf: "Wide", anyOf: []},
      type: { allOf: "Washable", anyOf: []},
      material: { allOf: "N/A", anyOf: []},
      quantity: 0,
      notes: "N/A"
    },
    {
      _id: '2',
      academicYear: '2023-2024',
      teacher: 'Mr. Johnson',
      school: "Herman",
      grade: "preK",
      item: ["Folder"],
      brand: { allOf: "N/A", anyOf: []},
      color: { allOf: ["Red"], anyOf: []},
      count: 1,
      size: { allOf: "N/A", anyOf: []},
      type: { allOf: "2 Prong", anyOf: []},
      material: { allOf: "Plastic", anyOf: []},
      quantity: 0,
      notes: "N/A"
    },
    {
      _id: '3',
      academicYear: '2023-2024',
      teacher: 'Ms. Lee',
      school: "MHS",
      grade: "6th grade",
      item: ["Notebook"],
      brand: { allOf: "Five Star", anyOf: []},
      color: { allOf: ["Yellow"], anyOf: []},
      count: 1,
      size: { allOf: "Wide Ruled", anyOf: []},
      type: { allOf: "Spiral", anyOf: []},
      material: { allOf: "N/A", anyOf: []},
      quantity: 0,
      notes: "N/A"
    }
  ];

  /* eslint-disable @typescript-eslint/no-unused-vars */
  getSupplyList(_filters: { school?: string, grade?: string, item?: string, brand?: string, color?: string, size?: string, type?: string, material?: string }): Observable<SupplyList[]> {
    return of(MockSupplyListService.testSupplyList);
  }

  addSupplyList(_newItem: Partial<SupplyList>): Observable<void> {
    return of(undefined);
  }

  deleteSupplyList(_id: string): Observable<unknown> {
    return of(undefined);
  }

  editSupplyList(_id: string, _updatedItem: Partial<SupplyList>): Observable<void> {
    return of(undefined);
  }
}
