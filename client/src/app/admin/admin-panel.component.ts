import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../auth/auth-service';
import { FamilyService } from '../family/family.service';
import { NeededItemLog } from '../family/family';

type NeededItemGroup = {
  key: string;
  sectionTitle: string;
  guardianName: string;
  items: NeededItemLog[];
};

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule
  ],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss']
})

export class AdminPanelComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly familyService = inject(FamilyService);

  readonly neededItemLogs = signal<NeededItemLog[]>([]);
  readonly neededItemGroups = computed(() => {
    const groups = new Map<string, NeededItemGroup>();

    for (const log of this.neededItemLogs()) {
      const key = `${log.familyId}-${log.sectionId}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          sectionTitle: log.sectionTitle,
          guardianName: log.guardianName,
          items: []
        });
      }

      groups.get(key)!.items.push(log);
    }

    return Array.from(groups.values())
      .map(group => ({
        ...group,
        items: [...group.items].sort((first, second) => first.label.localeCompare(second.label))
      }))
      .sort((first, second) =>
        first.guardianName.localeCompare(second.guardianName)
        || first.sectionTitle.localeCompare(second.sectionTitle));
  });

  ngOnInit(): void {
    this.familyService.getNeededItemLogs().subscribe(logs => {
      this.neededItemLogs.set(logs);
    });
  }

  reasonLabel(reason: string): string {
    switch (reason) {
    case 'item_not_avaliable':
    case 'item_not_available':
      return 'Item not available';
    case 'not_available_didnt_receive':
      return 'Not received';
    default:
      return reason;
    }
  }
}
