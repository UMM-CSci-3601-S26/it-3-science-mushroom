import { ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from "@angular/forms";
import { FormBuilder, FormGroup } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatInputModule } from '@angular/material/input';
import { Inject, Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatError, MatFormField, MatLabel } from "@angular/material/form-field";
import { Inventory } from "./inventory";

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
    private fb: FormBuilder,
    // eslint-disable-next-line
    private dialogRef: MatDialogRef<ManualEntry>,
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
      notes: ['']
    });
  }

  filteredItems: Inventory[] = [];
  selectedItems: Inventory[] | null = null;
  allInventory: Inventory[] = [];

  validateInput(control: AbstractControl): ValidationErrors | null {
    return control.errors;
  }
  submit() {
    if (this.form.valid) {
      const newItem = {
        ...this.form.value,
        externalBarcode: [this.data.barcode]
      };
      this.dialogRef.close(newItem);
    } else {
      this.form.markAllAsTouched();
    }
  }
  cancel() {
    this.dialogRef.close();
  }
}


