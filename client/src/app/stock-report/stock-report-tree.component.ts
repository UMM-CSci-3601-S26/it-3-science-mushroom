// Angular Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Input } from '@angular/core';

/**
 * Stock data with nested structure.
 * All fields are optional.
 * In the event some data is missing, the tree will still display what it can.
 */
export interface StockNode {
  item?: string;
  description?: string;
  label?: string;
  quantity?: number;
  maxQuantity?: number;
  minQuantity?: number;
  notes?: string;
  children?: StockNode[];
}

/**
 * Component for the Stock Report Tree. Displays inventory items in a flat tree structure, grouped by Stock State.
 */
@Component({
  selector: 'app-stock-report-tree',
  templateUrl: 'stock-report-tree.component.html',
  imports: [MatTreeModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockReportTreeComponent {
  @Input() stockNodes: StockNode[] = [];

  childrenAccessor = (node: StockNode) => node.children ?? [];

  hasChild = (_: number, node: StockNode) => !!node.children && node.children.length > 0;

  // Add the labels to the node for displaying
  getChildDisplay(node: StockNode): string {
    const value = node.quantity ?? node.maxQuantity ?? node.minQuantity ?? node.notes;
    return value !== undefined ? `${node.label}: ${value}` : (node.description ?? '');
  }
}
