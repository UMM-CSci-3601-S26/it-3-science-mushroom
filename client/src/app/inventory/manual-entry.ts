import { ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from "@angular/forms";
import { FormBuilder, FormGroup } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatInputModule } from '@angular/material/input';
import { Inject, Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatError, MatFormField, MatLabel } from "@angular/material/form-field";
import { Inventory } from "./inventory";
import { InventoryService } from "./inventory.service";
import { MatButtonModule } from "@angular/material/button";
import { ScrollingModule } from '@angular/cdk/scrolling';

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
  styleUrls: ['./manual-entry.component.scss'],
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    CommonModule,
    MatDialogModule,
    MatFormField,
    MatLabel,
    MatError,
    MatInputModule,
    MatButtonModule,
    ScrollingModule
  ]
})
export class ManualEntry implements OnInit {
  form: FormGroup;

  filteredItems: Inventory[] = [];
  selectedItem: Inventory | null = null;
  allInventory: Inventory[] = [];

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
      packageSize: [1, [Validators.min(1)]],
      size: [''],
      type: [''],
      material: [''],
      quantity: [data.quantity ?? 1, [Validators.required, Validators.min(1)]],
      notes: [''],
      maxQuantity: [null],
      minQuantity: [null],
      stockState: ['']
    });
  }

  ngOnInit(): void {
    this.loadInventory();
    this.form.valueChanges.subscribe(() => {
      this.filteredItems = this.getFilteredItems();
    })
  }

  validateInput(control: AbstractControl): ValidationErrors | null {
    return control.errors;
  }
  selectExistingItem(item: Inventory) {
    this.selectedItem = item;

    this.form.patchValue({
      item: item.item ?? '',
      description: item.description ?? '',
      brand: item.brand ?? '',
      color: item.color ?? '',
      packageSize: item.packageSize ?? 1,
      size: item.size ?? '',
      type: item.type ?? '',
      material: item.material ?? '',
      quantity: this.form.get('quantity')?.value ?? this.data.quantity ?? 1,
      notes: item.notes ?? '',
      maxQuantity: item.maxQuantity ?? 0,
      minQuantity: item.minQuantity ?? 0,
      stockState: item.stockState ?? ''
    });
  }

  clearSelectedItem(): void {
    this.selectedItem = null;

    this.form.patchValue({
      item: '',
      description: '',
      brand: '',
      color: '',
      packageSize: 1,
      size: '',
      type: '',
      material: '',
      notes: '',
      maxQuantity: 0,
      minQuantity: 0,
      stockState: ''
    });
  }

  loadInventory(): void {
    this.inventoryService.getInventory({}).subscribe({
      next: inventory => {
        this.allInventory = inventory;
        this.filteredItems = this.getFilteredItems();
      },
      error: err => {
        console.error('Failed to load inventory for manual entry', err);
        this.allInventory = [];
        this.filteredItems = [];
      }
    })
  }

  submit(): void {
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
      const scanned = (this.data.barcode ?? '').trim();
      const scannedIsInternal = this.isInternalBarcode(scanned);
      const newItem: Inventory = {
        internalID: '',
        internalBarcode: '',
        externalBarcode: (!scannedIsInternal && scanned) ? [scanned] : [],
        item: this.form.get('item')?.value || '',
        description: this.form.get('description')?.value || '',
        brand: this.form.get('brand')?.value || '',
        color: this.form.get('color')?.value || '',
        packageSize: Number(this.form.get('packageSize')?.value ?? 1),
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
    this.dialogRef.close(undefined);
  }

  getFilteredItems(): Inventory[] {
    const item = this.form.get('item')?.value ?? '';
    const brand = this.form.get('brand')?.value ?? '';
    const color = this.form.get('color')?.value ?? '';
    const size = this.form.get('size')?.value ?? '';
    const type = this.form.get('type')?.value ?? '';
    const material = this.form.get('material')?.value ?? '';

    return this.allInventory.filter(invItem => {
      return this.matches(invItem.item, item)
        && this.matches(invItem.brand, brand)
        && this.matches(invItem.color, color)
        && this.matches(invItem.size, size)
        && this.matches(invItem.type, type)
        && this.matches(invItem.material, material);
    });
  }

  private matches(value: string | undefined, filter: string): boolean {
    if (!filter?.trim()) return true;
    return (value ?? '').toLowerCase().includes(filter.trim().toLowerCase());
  }

  private matchesArray(values: string[] | string | undefined, filter: string): boolean {
    if (!filter?.trim()) return true;

    const normalizedFilter = filter.trim().toLowerCase();

    if (Array.isArray(values)) {
      return values.some(v => v.toLowerCase().includes(normalizedFilter));
    }

    return (values ?? '').toLowerCase().includes(normalizedFilter);
  }

  stringifyExternalBarcode(values: string[] | string | undefined): string {
    if (Array.isArray(values)) {
      return values.join(', ');
    }
    return values ?? ''
  }

  trackByInternalID(index: number, item: Inventory): string {
    return item.internalID || `${item.item}-${index}`;
  }

  isInternalBarcode(barcode: string | null | undefined): boolean {
    return !!barcode && /^ITEM-\d+$/i.test(barcode.trim());
  }

  getDisplayExternalBarcode(): string {
    const scanned = this.data.barcode?.trim();

    if(!scanned) {
      return 'None';
    }

    if (this.isInternalBarcode(scanned)) {
      return "Not saved from internal scan"
    }

    return scanned;
  }
}

