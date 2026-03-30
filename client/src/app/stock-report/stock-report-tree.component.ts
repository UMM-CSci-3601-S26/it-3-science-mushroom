import {ChangeDetectionStrategy, Component} from '@angular/core';
import {MatTreeModule} from '@angular/material/tree';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';

/**
 * Food data with nested structure.
 * Each node has a name and an optional list of children.
 */
interface StockNode {
  description?: string;
  label?: string;
  quantity?: number;
  maxQuantity?: number;
  minQuantity?: number;
  stockState?: string;
  children?: StockNode[];
}

/**
 * @title Tree with flat nodes
 */
@Component({
  selector: 'app-stock-report-tree',
  templateUrl: 'stock-report-tree.component.html',
  imports: [MatTreeModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockReportTreeComponent {
  dataSource = EXAMPLE_DATA;

  childrenAccessor = (node: StockNode) => node.children ?? [];

  hasChild = (_: number, node: StockNode) => !!node.children && node.children.length > 0;

  // Add the labels to the node for displaying
  getChildDisplay(node: StockNode): string {
    const value = node.quantity ?? node.maxQuantity ?? node.minQuantity ?? node.stockState;
    return value !== undefined ? `${node.label}: ${value}` : (node.description ?? '');
  }
}

const EXAMPLE_DATA: StockNode[] = [
  {
    description: '#2 Ticonderoga Yellow Pencil',
    children:
    [
      {quantity: 10, label: 'Current Quantity'},
      {maxQuantity: 20, label: 'Max Quantity'},
      {minQuantity: 5, label: 'Min Quantity'},
      {stockState: 'Stocked', label: 'Current State'}
    ],
  },
  {
    description: 'Yellow Folder',
    children:
    [
      {quantity: 10, label: 'Current Quantity'},
      {maxQuantity: 20, label: 'Max Quantity'},
      {minQuantity: 5, label: 'Min Quantity'},
      {stockState: 'Stocked', label: 'Current State'}
    ],
  },
  {
    description: 'Yellow Notebook',
    children:
    [
      {quantity: 10, label: 'Current Quantity'},
      {maxQuantity: 20, label: 'Max Quantity'},
      {minQuantity: 5, label: 'Min Quantity'},
      {stockState: 'Stocked', label: 'Current State'}
    ],
  },
];
