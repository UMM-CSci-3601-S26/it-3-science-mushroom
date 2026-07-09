import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { AuthService } from "../auth/auth-service";
import { FamilyService } from '../family/family.service';
import { NeededItemLog } from "../family/family";

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

  ngOnInit(): void {
    this.familyService.getNeededItemLogs().subscribe(logs => {
      this.neededItemLogs.set(logs);
    });
  }
}
