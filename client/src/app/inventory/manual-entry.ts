import { ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from "@angular/forms";
import { FormBuilder, FormGroup } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { Inject, Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatError, MatFormField, MatLabel } from "@angular/material/form-field";

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
    MatError
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
      quantity: [0, Validators.required, Validators.min(1)],
      notes: ['']
    });
  }

  validateInput(control: AbstractControl): ValidationErrors | null {
    return control.errors;
  }
  submit() {
    if (this.form.valid) {
      const newItem = {
        ...this.form.value,
        internalBarcode: this.data.barcode
      };
      this.dialogRef.close(newItem);
    } else {
      this.form.markAllAsTouched();
    }
  }
  cancel() {
    this.dialogRef.close();
  }
  save() {
    this.dialogRef.close(this.form.value)
  }
}


