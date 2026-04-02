import { ReactiveFormsModule, Validators } from "@angular/forms";
import { FormBuilder, FormGroup } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { Inject, Component } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-manual-entry',
  templateUrl: './manual-entry.html',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    CommonModule
  ]
})
export class ManualEntry {
  form: FormGroup;
  // eslint-disable-next-line
  constructor(private fb: FormBuilder, private dialogRef: MatDialogRef<ManualEntry>, @Inject(MAT_DIALOG_DATA) public data: { barcode: string }) {
    this.form = this.fb.group({
      item: ['', Validators.required],
      description: [''],
      brand: [''],
      color: [''],
      count: [0],
      size: [''],
      type: [''],
      material: [''],
      quantity: [0, Validators.required, Validators.min(1)],
      notes: ['']
    });
  }
  submit() {
    if (this.form.valid) {
      const newItem = {
        ...this.form.value,
        internalBarcode: this.data.barcode
      };
      this.dialogRef.close(newItem);
    }
  }
  cancel() {
    this.dialogRef.close();
  }
  save() {
    this.dialogRef.close(this.form.value)
  }
}


