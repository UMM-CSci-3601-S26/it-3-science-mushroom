// Angular Imports
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { Input } from '@angular/core';

// Dialog Imports
import { DialogService } from '../dialog/dialog.service';

// Supply List Imports
import { SupplyList } from './supplylist';

/**
 * Supply list node data with nested structure.
 * All fields are optional.
 * In the event some data is missing, the tree will still display what it can.
 */
export interface SupplyListNode {
  school?: string;
  grade?: string;
  teacher?: string;
  description?: string;
  supplyData?: SupplyList; // Only used for leaf nodes, contains the full data for the supply list item
  children?: SupplyListNode[];
}

/**
 * Component for the Supply List Tree. Displays inventory items in a flat tree structure, grouped by School, then Grade, then Teacher.
 * Item descriptions are the last level.
 */
@Component({
  selector: 'app-supply-list-tree',
  templateUrl: 'supply-list-tree.component.html',
  imports: [MatTreeModule, MatButtonModule, MatIconModule, MatButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplyListTreeComponent {
  @Input() supplyListNodes: SupplyListNode[] = [];
  private dialogService = inject(DialogService);

  childrenAccessor = (node: SupplyListNode) => node.children ?? [];

  hasChild = (_: number, node: SupplyListNode) => !!node.children && node.children.length > 0;

  // Get the display text for a node based on which property it has
  getNodeDisplay(node: SupplyListNode): string {
    if (node.school) return node.school;
    if (node.grade) return node.grade;
    if (node.teacher) return node.teacher;
    if (node.description) return `- ${node.description}`;
    return '';
  }

  formatItemDetails(supply: SupplyList): string {
    return `
    - Description: ${supply.description}
    - Brand: ${supply.brand}
    - Color: ${supply.color}
    - Size: ${supply.size}
    - Type: ${supply.type}
    - Material: ${supply.material}
    - Quantity: ${supply.quantity}
    - Notes: ${supply.notes}`;
  }

  openItemDialog(supply: SupplyList) {
    if (!supply) return;
    this.dialogService.openDialog({
      title: `Item View - ${supply.item}`,
      message: this.formatItemDetails(supply),
      buttonOne: 'Exit',
    }, '600px', '400px');
  }
}
