import { Component, Input } from "@angular/core";
import { MatFormField, MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { FilterField } from "src/app/app.type";


@Component({
  selector: 'app-advanced-filter',
  standalone: true,
  templateUrl: './advanced-filter.component.html',
  imports: [
    MatFormField,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class AdvancedFilterComponent {
  @Input() filters: FilterField[] = [];
}
