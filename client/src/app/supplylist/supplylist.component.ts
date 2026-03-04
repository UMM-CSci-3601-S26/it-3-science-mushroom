import { Component, effect, inject, signal, /*viewChild,*/ ChangeDetectionStrategy } from '@angular/core';
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
//import { MatSort, MatSortModule } from '@angular/material/sort';
import { catchError, combineLatest, debounceTime, of, switchMap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { SupplyList } from './supplylist';
import { SupplyListService } from './supplylist.service';
import { MatTreeModule } from '@angular/material/tree';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-supplylist-component',
  standalone: true,
  templateUrl: './supplylist.component.html',
  styleUrls: ['./supplylist.component.scss'],
  imports: [
    MatTableModule,
    //MatSortModule,
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
    CommonModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplyListComponent {
  //displayedColumns: string[] = ['school', 'grade', 'item', 'description', 'brand', 'color', 'size', 'type', 'material', 'count', 'quantity', 'notes'];
  dataSource = new MatTableDataSource<SupplyList>([]);
  //readonly sort = viewChild<MatSort>(MatSort);


  private snackBar = inject(MatSnackBar);
  private supplylistService = inject(SupplyListService);

  constructor() {
    effect(() => {
      this.dataSource.data = this.serverFilteredSupplyList();
    });
  }

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
}
export { SupplyListService };

