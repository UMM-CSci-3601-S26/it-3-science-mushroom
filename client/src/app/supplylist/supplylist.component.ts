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
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatTreeModule } from '@angular/material/tree';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DialogService } from '../shared/dialog/dialog.service';

// RxJS Imports
import { catchError, combineLatest, debounceTime, of, switchMap } from 'rxjs';

// Supply List Imports
import { SupplyList, AttributeOptions, ColorAttributeOptions } from './supplylist';
import { SupplyListService } from './supplylist.service';

// Auth
import { AuthService } from '../auth/auth-service';

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
    MatExpansionModule,
    CommonModule,
    RouterLink
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class SupplyListComponent {
  // Table columns mirror the fields users scan when comparing supply needs.
  displayedColumns: string[] = [
    'school',
    'grade',
    'item',
    'brand',
    'color',
    'size',
    'type',
    'material',
    'packageSize',
    'quantity',
    'notes'
  ];

  dataSource = new MatTableDataSource<SupplyList>([]);
  readonly sort = viewChild<MatSort>(MatSort);

  private snackBar = inject(MatSnackBar);
  private dialogService = inject(DialogService);
  private supplylistService = inject(SupplyListService);
  private authService = inject(AuthService);

  get canAddSupplyList(): boolean {
    return this.authService.hasPermission('add_supply_list');
  }

  get canEditSupplyList(): boolean {
    return this.authService.hasPermission('edit_supply_list');
  }

  get canDeleteSupplyList(): boolean {
    return this.authService.hasPermission('delete_supply_list');
  }

  constructor() {
    // Keep the Material data source in sync with the signal-backed server data.
    effect(() => {
      this.dataSource.data = this.serverFilteredSupplyList();
    });
    // Reset grade when school changes so the grade dropdown stays valid.
    effect(() => {
      this.school();
      this.grade.set(undefined);
    });
  }

  // Signals hold the current filter state; toObservable bridges them into the
  // debounced server request below.
  school = signal<string | undefined>(undefined);
  grade = signal<string | undefined>(undefined);
  item = signal<string | undefined>(undefined);
  brand = signal<string | undefined>(undefined);
  color = signal<string | undefined>(undefined);
  size = signal<string | undefined>(undefined);
  type = signal<string | undefined>(undefined);
  material = signal<string | undefined>(undefined);
  quantity = signal<number | undefined>(undefined);

  errMsg = signal<string | undefined>(undefined);

  // Unique sorted grades derived from the currently visible grouped list
  availableGrades = computed(() =>
    [...new Set(
      this.groupedSupplyList().flatMap(sg => sg.grades.map(g => g.grade))
    )].sort((a, b) => a.localeCompare(b))
  );

  // Incrementing this signal forces a re-fetch from the server (e.g. after a delete).
  private refreshTrigger = signal(0);

  // Observables for each filter signal
  private school$ = toObservable(this.school);
  private grade$ = toObservable(this.grade);
  private item$ = toObservable(this.item);
  private brand$ = toObservable(this.brand);
  private color$ = toObservable(this.color);
  private size$ = toObservable(this.size);
  private type$ = toObservable(this.type);
  private material$ = toObservable(this.material);
  private quantity$ = toObservable(this.quantity);
  private refresh$ = toObservable(this.refreshTrigger);

  /**
   * Combines filter signals into one debounced request stream. Filtering on the
   * server keeps the grouped view responsive even as the supply list grows.
   */
  serverFilteredSupplyList = toSignal(
    combineLatest([
      this.school$,
      this.grade$,
      this.item$,
      this.brand$,
      this.color$,
      this.size$,
      this.type$,
      this.material$,
      this.quantity$,
      this.refresh$
    ]).pipe(
      debounceTime(300),
      switchMap(([ school, grade, item, brand, color, size, type, material, quantity]) => {
        const filters = { school, grade, item, brand, color, size, type, material, ...(quantity === undefined ? {} : { quantity }) };
        return this.supplylistService.getSupplyList(filters);
      }),
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

  groupedSupplyList = computed(() => {
    // Group by school -> grade -> teacher to match how staff distribute supply lists.
    type TeacherGroup = { teacher: string; items: SupplyList[] };
    type GradeGroup = { grade: string; teachers: TeacherGroup[] };
    type SchoolGroup = { school: string; grades: GradeGroup[] };
    const byName = (a: string, b: string) => a.localeCompare(b);

    const schoolMap = new Map<string, Map<string, Map<string, SupplyList[]>>>();
    const getOrCreate = <T>(map: Map<string, T>, key: string, init: () => T) => {
      if (!map.has(key)) map.set(key, init());
      return map.get(key)!;
    };

    for (const supply of this.serverFilteredSupplyList()) {
      const school = supply.school || 'Unknown School';
      const grade = supply.grade || 'Unknown Grade';
      const teacher = supply.teacher || 'N/A';

      const gradeMap = getOrCreate(schoolMap, school, () => new Map<string, Map<string, SupplyList[]>>());
      const teacherMap = getOrCreate(gradeMap, grade, () => new Map<string, SupplyList[]>());
      const items = getOrCreate(teacherMap, teacher, () => []);

      items.push(supply);
    }

    const sortedSchools = Array.from(schoolMap.keys()).sort(byName);

    return sortedSchools.map((school): SchoolGroup => {
      const gradeMap = schoolMap.get(school)!;
      const sortedGrades = Array.from(gradeMap.keys()).sort(byName);

      return {
        school,
        grades: sortedGrades.map((grade): GradeGroup => {
          const teacherMap = gradeMap.get(grade)!;
          const sortedTeachers = Array.from(teacherMap.keys()).sort(byName);

          return {
            grade,
            teachers: sortedTeachers.map((teacher): TeacherGroup => ({
              teacher,
              items: teacherMap.get(teacher)!
            }))
          };
        })
      };
    });
  });

  parseStringArray(value: string): string[] {
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  /** Builds a compact human-readable label for an item, mirroring the server-side toString(). */
  toLabel(s: SupplyList): string {
    const attrStr = (a: AttributeOptions | ColorAttributeOptions | undefined) => {
      const allOf = a?.allOf;
      const allOfArr = Array.isArray(allOf) ? allOf : (allOf ? [allOf] : []);
      return [...allOfArr, ...(a?.anyOf ?? [])].filter(v => v && v !== 'N/A').join('/');
    };
    const parts: string[] = [];
    const qty = s.quantity > 0 ? s.quantity : null;
    if (qty) parts.push(`${qty}x`);
    if (s.packageSize > 1) parts.push(`${s.packageSize}ct.`);
    const sizeStr = attrStr(s.size);
    if (sizeStr) {
      parts.push(`${sizeStr}${(qty ?? 0) > 1 ? 's' : ''} of`);
    }
    const itemStr = s.item?.join(' or ') ?? '';
    if (itemStr) {
      const plural = (qty === null || (qty ?? 0) > 1) && !itemStr.endsWith('s');
      parts.push(plural ? `${itemStr}s` : itemStr);
    }
    const brandStr = attrStr(s.brand); if (brandStr) parts.push(brandStr);
    const colorStr = attrStr(s.color); if (colorStr) parts.push(colorStr);
    const typeStr = attrStr(s.type); if (typeStr) parts.push(typeStr);
    const matStr = attrStr(s.material); if (matStr) parts.push(matStr);
    if (s.notes && s.notes !== 'N/A') parts.push(`(${s.notes})`);
    return parts.join(' ');
  }

  /** Prompts confirmation then deletes an item, removing it from the local grouped data. */
  confirmDelete(id: string | undefined) {
    if (!id) return;
    const dialogRef = this.dialogService.openDialog({
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item?',
      buttonOne: 'Cancel',
      buttonTwo: 'Delete'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.supplylistService.deleteSupplyList(id).subscribe({
        next: () => {
          // Trigger a re-fetch so groupedSupplyList (which reads serverFilteredSupplyList) updates.
          this.refreshTrigger.update(n => n + 1);
        },
        error: (err) => {
          this.errMsg.set(`Problem deleting item – Error Code: ${err.status}\nMessage: ${err.message}`);
          this.snackBar.open(this.errMsg() ?? '', 'OK', { duration: 6000 });
        }
      });
    });
  }

  // Track which item is currently being edited
  editingItemId: string | null = null;
  private editingBackup: SupplyList | null = null;

  // Controls whether all grade panels are expanded
  allExpanded = signal(false);
  // Item-level filters stay collapsed by default because school and grade are
  // the most common way staff narrow this page.
  advancedFiltersExpanded = signal(false);

  toggleAll() {
    this.allExpanded.update(v => !v);
  }

  toggleAdvancedFilters() {
    this.advancedFiltersExpanded.update(expanded => !expanded);
  }

  startEdit(item: SupplyList) {
    this.editingItemId = item._id ?? null;
    this.editingBackup = JSON.parse(JSON.stringify(item));
  }

  cancelEdit() {
    if (this.editingBackup) {
      const idx = this.dataSource.data.findIndex(i => i._id === this.editingBackup!._id);
      if (idx !== -1) this.dataSource.data[idx] = this.editingBackup;
    }
    this.editingItemId = null;
    this.editingBackup = null;
  }

  saveEdit(item: SupplyList) {
    if (!item._id) return;
    this.supplylistService.editSupplyList(item._id, item).subscribe({
      next: () => {
        this.editingItemId = null;
        this.editingBackup = null;
        this.snackBar.open('Item updated', undefined, { duration: 2000 });
      },
      error: (err) => {
        this.errMsg.set(`Problem saving item – Error Code: ${err.status}\nMessage: ${err.message}`);
        this.snackBar.open(this.errMsg() ?? '', 'OK', { duration: 6000 });
      }
    });
  }

  resetFilters() {
    this.item.set(undefined);
    this.brand.set(undefined);
    this.color.set(undefined);
    this.size.set(undefined);
    this.type.set(undefined);
    this.material.set(undefined);
    this.school.set(undefined);
    this.grade.set(undefined);
    this.quantity.set(undefined);
    this.advancedFiltersExpanded.set(false);
  }
}
export { SupplyListService };
