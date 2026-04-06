import { Component, computed, Injectable, signal, inject } from '@angular/core';
import {CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { SupplyList } from '../supplylist/supplylist';
import { SupplyListService } from '../supplylist/supplylist.service';
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

@Injectable({
  providedIn: SupplyListService
})

export class StationOrderComponent {
  private SupplyListService = inject(SupplyListService);

  constructor() {
    this.loadStationOrder();
    this.loadSupplyList();
  }

  loadSupplyList(filters?: SupplyList): void {
    this.SupplyListService.getSupplyList(filters).subscribe(data => {
      this.supplyList.set(data);
    })
  }

  supplyList = signal<SupplyList[]>([]);

  bank = computed(() =>
    this.optionBuilder(this.supplyList(), 'item')
  );

  stationOrder: string[] = [];

  loadStationOrder(): void {
    const saved = localStorage.getItem('stationOrder');
    if (saved) {
      this.stationOrder = JSON.parse(saved);
    }
  }

  saveStationOrder(): void {
    localStorage.setItem('stationOrder', JSON.stringify(this.stationOrder));
  }

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
    this.saveStationOrder();
  }

  optionBuilder(data: SupplyList[], key: keyof SupplyList): string[] {
    return [...new Set(
      data.map(item => item[key]).filter((v): v is string => typeof v === 'string' && v.trim() !== '' && v.trim() !== 'N/A' && !this.stationOrder.includes(v))
    )]
  }
}

