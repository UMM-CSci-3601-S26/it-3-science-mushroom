// Angular Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Input } from '@angular/core';

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
  label?: string;
  children?: SupplyListNode[];
}

/**
 * Component for the Supply List Tree. Displays inventory items in a flat tree structure, grouped by School, then Grade, then Teacher.
 * Item descriptions are the last level.
 */
@Component({
  selector: 'app-supply-list-tree',
  templateUrl: 'supply-list-tree.component.html',
  imports: [MatTreeModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplyListTreeComponent {
  @Input() supplyListNodes: SupplyListNode[] = [];

  childrenAccessor = (node: SupplyListNode) => node.children ?? [];

  hasChild = (_: number, node: SupplyListNode) => !!node.children && node.children.length > 0;

  // Get the display text for a node based on which property it has
  getNodeDisplay(node: SupplyListNode): string {
    if (node.school) return node.school;
    if (node.grade) return node.grade;
    if (node.teacher) return node.teacher;
    if (node.description) return `- ${node.description}`;
    if (node.label) return node.label;
    return '';
  }
}
