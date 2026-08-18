import { Component, inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { PurchaseListSource } from "./purchase-list";
import { CommonModule } from "@angular/common";

interface PurchaseListSourceDialogData {
  itemDescription: string;
  sources: PurchaseListSource[];
}

@Component({
  selector: 'app-purchase-list-source-info-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    CommonModule
  ],
  template: `
  <h2 mat-dialog-title>Sources On: {{ data.itemDescription }}</h2>

  <mat-dialog-content class="purchase-list-source-dialog">
    <div class="purchase-list-table-scroll">
      <table class="purchase-list-source-table">
        <thead>
          <tr class="table-header-row">
            <th class="table-column-school">School</th>
            <th class="table-column-grade">Grade</th>
            <th class="table-column-teacher">Teacher</th>
            <th class="table-column-stdcount">Students</th>
            <th class="table-column-quantity">Qty/Student</th>
            <th class="table-column-needed">Total</th>
          </tr>
        </thead>

        <tbody>
          @for (source of data.sources; track source.supplyListId) {
            <tr class="table-row">
              <td class="table-column-school">{{ source.school }}</td>
              <td class="table-column-grade">{{ source.grade }}</td>
              <td class="table-column-teacher">{{ source.teacher || 'N/A' }}</td>
              <td class="table-column-stdcount table-number">{{ source.studentCount }}</td>
              <td class="table-column-quantity table-number">{{ source.quantityPerStudent }}</td>
              <td class="table-column-needed table-number">{{ source.totalNeeded }}</td>
            </tr>
          } @empty {
            <tr>
              <td class="purchase-list-source-empty" colspan="6">No Sources Found</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  </mat-dialog-content>

  `,
  styles: [`
    :host {
      display: block;
      color: var(--app-text);
    }

    h2[mat-dialog-title] {
      margin-bottom: 0;
    }

    .purchase-list-source-dialog {
      display: grid;
      gap: 0.75rem;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .purchase-list-table-scroll {
      max-height: min(24rem, 60vh);
      overflow: auto;
      width: 100%;
      border: 1px solid color-mix(in srgb, var(--app-primary) 35%, var(--app-border));
      border-radius: var(--app-radius-sm);
      background: var(--app-surface);
    }

    .purchase-list-source-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      table-layout: fixed;
      background: var(--app-surface);
    }

    .purchase-list-source-table th {
      position: sticky;
      top: 0;
      z-index: 2;
      padding: 0.7rem 0.75rem;
      color: var(--app-text);
      font-size: 0.78rem;
      font-weight: 800;
      line-height: 1.35;
      text-align: left;
      text-transform: uppercase;
      overflow-wrap: anywhere;
      background: color-mix(in srgb, var(--app-primary) 16%, var(--app-surface));
      box-shadow: inset 0 -2px 0 color-mix(in srgb, var(--app-primary) 60%, var(--app-divider-color));
    }

    .purchase-list-source-table td {
      padding: 0.65rem 0.75rem;
      color: var(--app-text);
      font-weight: 650;
      line-height: 1.45;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 30%, var(--app-divider-color));
      vertical-align: top;
      overflow-wrap: anywhere;
    }

    .purchase-list-source-table tbody tr:nth-child(even) {
      background: color-mix(in srgb, var(--app-bg) 42%, var(--app-surface));
    }

    .purchase-list-source-table tbody tr:hover {
      background: color-mix(in srgb, var(--app-primary) 10%, var(--app-surface));
    }

    .table-column-school {
      width: 28%;
    }

    .table-column-grade {
      width: 16%;
    }

    .table-column-teacher {
      width: 16%;
    }

    .table-column-stdcount,
    .table-column-quantity,
    .table-column-needed {
      width: 13.33%;
    }

    .table-number {
      font-weight: 800;
      text-align: right;
    }

    .purchase-list-source-empty {
      color: var(--app-text-muted);
      font-weight: 800;
      text-align: center;
    }
  `]
})
export class PurchaseListSourceInfoDialogComponent {

  readonly data = inject<PurchaseListSourceDialogData>(MAT_DIALOG_DATA);
}
