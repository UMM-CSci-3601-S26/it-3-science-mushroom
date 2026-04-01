import { Component } from '@angular/core';
import {CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: 'app-station-order',
  imports: [
    CdkDrag,
    CdkDropList,
    CdkDragPlaceholder,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './station-order.component.html',
  styleUrl: './station-order.component.scss',
})
export class StationOrderComponent {

  bank = [
    'pencils',
    'markers',
    'crayons'
  ];

  stationOrder = [
  ];

  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }
}
