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
  quantity: number;
} |
{
  mode: 'new';
  newItem: Inventory;
  quantity: number;
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
    @Inject(MAT_DIALOG_DATA) public data: { barcode: string; quantity: number }) {
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
      maxQuantity: [0],
      minQuantity: [0],
      stockState: ['']
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
    const chosenQuantity = Number(this.form.get('quantity')?.value ?? 1);
    const safeQuantity = chosenQuantity > 0 ? chosenQuantity : 1;
    if (this.selectedItem) {
      this.dialogRef.close({
        mode: 'match',
        selectedItem: this.selectedItem,
        quantity: safeQuantity
      });
      return;
    }

    if (this.form.valid) {
      const newItem: Inventory = {
        internalID: '',
        internalBarcode: '',
        externalBarcode: [this.data.barcode],
        item: this.form.get('item')?.value || '',
        description: this.form.get('description')?.value || '',
        brand: this.form.get('brand')?.value || '',
        color: this.form.get('color')?.value || '',
        count: this.form.get('count')?.value || 0,
        size: this.form.get('size')?.value || '',
        type: this.form.get('type')?.value || '',
        material: this.form.get('material')?.value || '',
        quantity: safeQuantity,
        notes: this.form.get('notes')?.value || '',
        maxQuantity: this.form.get('maxQuantity')?.value || 0,
        minQuantity: this.form.get('minQuantity')?.value || 0,
        stockState: this.form.get('stockState')?.value || ''
      };

      this.dialogRef.close({
        mode: 'new',
        newItem: newItem,
        quantity: safeQuantity
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
  cancel() {
    this.dialogRef.close(null);
  }
}

