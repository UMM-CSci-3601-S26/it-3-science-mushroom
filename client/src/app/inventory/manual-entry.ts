import { Validators } from "@angular/forms";
import { FormBuilder, FormGroup } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Inject } from "@angular/core";
export class ManualEntry {
  form: FormGroup;

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
      quantity: [0, Validators.min(1), Validators.required],
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
}
