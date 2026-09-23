import { NgFor } from '@angular/common';
import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { FilterField } from 'src/app/app.type';

@Component({
  selector: 'app-schema-table',
  standalone: true,
  templateUrl: './schema-table.component.html',
  styleUrls: ['./schema-table.component.scss'],
  imports: [NgFor, MatTableModule, MatPaginatorModule]
})
export class SchemaTableComponent<T extends object = Record<string, unknown>> implements AfterViewInit {
  @Input() public set columns(columns: FilterField[] | null | undefined) {
    this.tableColumns = columns ?? [];
    this.displayedColumns = this.tableColumns.map(column => column.key);
  }

  @Input() public set items(items: T[] | null | undefined) {
    const tableItems = items ?? [];
    this.dataSource.data = tableItems;
    this.itemCount = tableItems.length;
    this.dataSource.paginator?.firstPage();
  }

  @Input() public pageSize = 25;
  @Input() public pageSizeOptions: number[] = [10, 25, 50, 100];

  @ViewChild(MatPaginator) public paginator?: MatPaginator;

  public readonly dataSource = new MatTableDataSource<T>([]);
  public displayedColumns: string[] = [];
  public itemCount = 0;
  public tableColumns: FilterField[] = [];

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator ?? null;
  }

  public trackByColumn(_index: number, column: FilterField): string {
    return column.key;
  }

  public cellValue(item: T, key: string): string {
    const value = (item as Record<string, unknown>)[key];

    return value === null || value === undefined ? '' : String(value);
  }
}
