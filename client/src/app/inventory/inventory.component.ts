import { Component, effect, inject, signal, viewChild } from '@angular/core';
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
import { RouterLink } from '@angular/router';
import { catchError, combineLatest, of, switchMap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Inventory } from './inventory';
import { InventoryService } from './inventory.service';

@Component({
  selector: 'app-inventory-component',
  standalone: true,
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss'],
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
    RouterLink,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
  ],
})
export class InventoryComponent {
  displayedColumns: string[] = ['school', 'grade', 'item', 'description', 'quantity'];
  dataSource = new MatTableDataSource<Inventory>([]);
  readonly sort = viewChild<MatSort>(MatSort);

  private snackBar = inject(MatSnackBar);
  private inventoryService = inject(InventoryService);

  constructor() {
    effect(() => {
      this.dataSource.data = this.serverFilteredInventory();
      this.dataSource.sort = this.sort();
    });
  }

  // filters (optional)
  school = signal<string | undefined>(undefined);
  grade = signal<string | undefined>(undefined);
  item = signal<string | undefined>(undefined);
  description = signal<string | undefined>(undefined);
  quantity = signal<number | undefined>(undefined);

  errMsg = signal<string | undefined>(undefined);

  private school$ = toObservable(this.school);
  private grade$ = toObservable(this.grade);
  private item$ = toObservable(this.item);
  private description$ = toObservable(this.description);
  private quantity$ = toObservable(this.quantity);

  serverFilteredInventory = toSignal(
    combineLatest([this.school$, this.grade$, this.item$, this.description$, this.quantity$]).pipe(
      switchMap(([school, grade, item, description, quantity]) =>
        this.inventoryService.getInventory({ school, grade, item, description, quantity })
      ),
      catchError((err) => {
        const msg = `Problem contacting the server - Error Code: ${err.status}\nMessage: ${err.message}`;
        this.errMsg.set(msg);
        this.snackBar.open(msg, 'OK', { duration: 6000 });
        return of<Inventory[]>([]);
      })
    ),
    { initialValue: [] }
  );
}
