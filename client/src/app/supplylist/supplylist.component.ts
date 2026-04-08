// Angular Imports
import { Component, computed, effect, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTreeModule } from '@angular/material/tree';
import { CommonModule } from '@angular/common';

// RxJS Imports
import { catchError, combineLatest, debounceTime, of, switchMap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

// Supply List Imports
import { SupplyList } from './supplylist';
import { SupplyListService } from './supplylist.service';
import { SupplyListNode, SupplyListTreeComponent } from './supply-list-tree.component';

@Component({
  selector: 'app-supplylist-component',
  standalone: true,
  templateUrl: './supplylist.component.html',
  styleUrls: ['./supplylist.component.scss'],
  imports: [
    MatTableModule,
    MatSortModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatSelectModule,
    MatOptionModule,
    MatRadioModule,
    MatListModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule,
    CommonModule,
    SupplyListTreeComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplyListComponent {
  // Columns to display in the Material table
  dataSource = new MatTableDataSource<SupplyList>([]);
  readonly sort = viewChild<MatSort>(MatSort);

  private snackBar = inject(MatSnackBar);
  private supplylistService = inject(SupplyListService);

  constructor() {
    effect(() => {
      this.dataSource.data = this.serverFilteredSupplyList();
    });
  }

  // Signals for each filter
  school = signal<string | undefined>(undefined);
  grade = signal<string | undefined>(undefined);
  item = signal<string | undefined>(undefined);
  brand = signal<string | undefined>(undefined);
  color = signal<string | undefined>(undefined);
  size = signal<string | undefined>(undefined);
  type = signal<string | undefined>(undefined);
  material = signal<string | undefined>(undefined);
  description = signal<string | undefined>(undefined);
  quantity = signal<number | undefined>(undefined);

  errMsg = signal<string | undefined>(undefined);

  // Observables for each filter signal
  private school$ = toObservable(this.school);
  private grade$ = toObservable(this.grade);
  private item$ = toObservable(this.item);
  private brand$ = toObservable(this.brand);
  private color$ = toObservable(this.color);
  private size$ = toObservable(this.size);
  private type$ = toObservable(this.type);
  private material$ = toObservable(this.material);
  private description$ = toObservable(this.description);
  private quantity$ = toObservable(this.quantity);

  /**
   * Combines all filter signals into one stream that then triggers a new server request when a filter changes
   * Includes a debound of 300ms to prevent excessive requests when filters are changed rapdily
  */
  serverFilteredSupplyList = toSignal(
    combineLatest([this.school$, this.grade$, this.item$, this.brand$, this.color$, this.size$, this.type$, this.material$, this.description$, this.quantity$]).pipe(
      debounceTime(300),
      switchMap(([ school, grade, item, brand, color, size, type, material]) =>
        this.supplylistService.getSupplyList({ school, grade, item, brand, color, size, type, material})
      ),
      catchError((err) => {
        const msg = `Problem contacting the server - Error Code: ${err.status}\nMessage: ${err.message}`;
        this.errMsg.set(msg);
        this.snackBar.open(msg, 'OK', { duration: 6000 });
        return of<SupplyList[]>([]);
      })
    ),
    { initialValue: [] }
  );

  supplyList = toSignal <SupplyList[]>(
    this.supplylistService.getSupplyList().pipe(
      catchError(() => of([]))
    )
  );

  // Compute a grouped version of the Supply List with the filters applied
  groupedSupplyList = computed(() => {
    return this.groupSupplyList(this.serverFilteredSupplyList());
  });

  /**
   * Groups a list of SupplyList entries into a nested structure of SupplyListNodes (similar to StockNodes in StockReport) for easier display
   * @param supplyListEntries A list SupplyList entries to group
   * @returns A nested array of SupplyListNodes with the proper grouping: School > Grade > Teacher > Item Description
   */
  private groupSupplyList(supplyListEntries: SupplyList[]): SupplyListNode[] {
    // Highest level map for the supply list grouping. Goes School > Grade > Teacher > SupplyList[] (only displaying Item Description)
    const schoolMap = new Map<string, Map<string, Map<string, SupplyList[]>>>();

    // Helper function to get or create a map
    // If it exists, get it. If it doesn't, make it
    const getOrCreateMap = <T>(map: Map<string, T>, key: string, init: () => T) => {
      if (!map.has(key)) map.set(key, init());
      return map.get(key)!;
    };

    // Loop through each Supply List entry and put each in the right group
    for(const supply of supplyListEntries) {
      // Keys to use for grouping, using "Unknown x" if the data is missing for some reason
      const school = supply.school || 'Unknown School';
      const grade = supply.grade || 'Unknown Grade';
      // Teacher is special because "N/A" means that the item goes to all students in the grade
      // But like the others, if it has no data it should be "Unknown" and if its not "N/A" it should be what the teacher field is
      const teacher = supply.teacher === 'N/A' ? 'All Teachers' : (supply.teacher || 'Unknown Teacher');

      // Get or create the maps for each level of grouping
      const gradeMap = getOrCreateMap(schoolMap, school, () => new Map<string, Map<string, SupplyList[]>>()); // Put grades in school
      const teacherMap = getOrCreateMap(gradeMap, grade, () => new Map<string, SupplyList[]>()); // Put teachers in grade
      const supplies = getOrCreateMap(teacherMap, teacher, () => []); // Put supplies in teacher

      // Add the supply to the proper group
      supplies.push(supply);
    }

    // Convert the final group into a SupplyListNode array and return it
    return Array.from(schoolMap.entries()).map(([schoolName, gradeMap]) => ({
      school: schoolName,
      children: Array.from(gradeMap.entries()).map(([gradeName, teacherMap]) => ({
        grade: gradeName,
        children: Array.from(teacherMap.entries()).map(([teacherName, supplies]) => ({
          teacher: teacherName,
          children: supplies.map(supply => ({
            description: supply.description,
            supplyData: supply
          }))
        }))
      }))
    }));
  }
}
export { SupplyListService };
