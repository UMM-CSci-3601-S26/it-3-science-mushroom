import { ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from "@angular/forms";
import { FormBuilder, FormGroup } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatInputModule } from '@angular/material/input';
import { Inject, Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatError, MatFormField, MatLabel } from "@angular/material/form-field";
import { Inventory } from "./inventory";
import { InventoryService } from "./inventory.service";

export type ManualEntryResult =
{
  mode: 'match';
  selectedItem: Inventory;
} |
{
  mode: 'new';
  newItem: Inventory;
}

@Component({
  selector: 'app-manual-entry',
  templateUrl: './manual-entry.html',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    CommonModule,
    MatDialogModule,
    MatFormField,
    MatLabel,
    MatError,
    MatInputModule
  ]
})
export class ManualEntry {
  form: FormGroup;

  constructor(
    // eslint-disable-next-line
    private inventoryService: InventoryService,
    // eslint-disable-next-line
    private fb: FormBuilder,
    // eslint-disable-next-line
    private dialogRef: MatDialogRef<ManualEntry, ManualEntryResult>,
    // eslint-disable-next-line
    @Inject(MAT_DIALOG_DATA) public data: { barcode: string }) {
    this.form = this.fb.group({
      item: ['', Validators.required],
      description: [''],
      brand: [''],
      color: [''],
      count: [0],
      size: [''],
      type: [''],
      material: [''],
      quantity: [0, [Validators.required, Validators.min(1)]],
      notes: [''],
    });
  }

  filteredItems: Inventory[] = [];
  selectedItem: Inventory | null = null;
  allInventory: Inventory[] = [];

  validateInput(control: AbstractControl): ValidationErrors | null {
    return control.errors;
  }
  selectExistingItem(item: Inventory) {
    this.selectedItem = item
  }
  submit() {
    if (this.selectedItem) {
      this.dialogRef.close({
        mode: 'match',
        selectedItem: this.selectedItem
      });
      return;
    }

    if (this.form.valid) {
      const newItem: Inventory = {
        internalID: '',
        item: this.form.value.item,
        description: this.form.value.description || '',
        brand: this.form.value.brand || '',
        color: this.form.value.color || '',
        size: this.form.value.size || '',
        type: this.form.value.type || '',
        material: this.form.value.material || '',
        count: this.form.value.count || 0,
        quantity: this.form.value.quantity || 1,
        notes: this.form.value.notes || '',
        externalBarcode: [this.data.barcode],
        maxQuantity: this.form.value.maxQuantity || 0,
        minQuantity: this.form.value.minQuantity || 0,
        stockState: this.form.value.stockState || ''
      };

      this.dialogRef.close({
        mode: 'new',
        newItem: newItem
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
  cancel() {
    this.dialogRef.close(null);
  }
}

