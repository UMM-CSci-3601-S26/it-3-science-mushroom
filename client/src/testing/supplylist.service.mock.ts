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
      brand: { exactly: "Crayola", anyOf: []},
      color: { exactly: "", anyOf: []},
      packageSize: 8,
      size: { exactly: "Wide", anyOf: []},
      type: { exactly: "Washable", anyOf: []},
      material: { exactly: "N/A", anyOf: []},
      quantity: 0,
      notes: "N/A",
      supplyID: "N/A",
      invIDs: []
    },
    {
      _id: '2',
      academicYear: '2023-2024',
      teacher: 'Mr. Johnson',
      school: "Herman",
      grade: "preK",
      item: ["Folder"],
      brand: { exactly: "N/A", anyOf: []},
      color: { exactly: "Red", anyOf: []},
      packageSize: 1,
      size: { exactly: "N/A", anyOf: []},
      type: { exactly: "2 Prong", anyOf: []},
      material: { exactly: "Plastic", anyOf: []},
      quantity: 0,
      notes: "N/A",
      supplyID: "N/A",
      invIDs: []
    },
    {
      _id: '3',
      academicYear: '2023-2024',
      teacher: 'Ms. Lee',
      school: "MHS",
      grade: "6th grade",
      item: ["Notebook"],
      brand: { exactly: "Five Star", anyOf: []},
      color: { exactly: "Yellow", anyOf: []},
      packageSize: 1,
      size: { exactly: "Wide Ruled", anyOf: []},
      type: { exactly: "Spiral", anyOf: []},
      material: { exactly: "N/A", anyOf: []},
      quantity: 0,
      notes: "N/A",
      supplyID: "N/A",
      invIDs: []
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
