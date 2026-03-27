// Angular Imports
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

// RxJS Imports
import { Observable } from 'rxjs';

// Inventory Imports
import { Inventory } from './inventory';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private httpClient = inject(HttpClient);

  readonly inventoryUrl: string = `${environment.apiUrl}inventory`;

  private readonly itemKey = 'item';
  private readonly descriptionKey = 'description';
  private readonly brandKey = 'brand';
  private readonly colorKey = 'color';
  private readonly countKey = 'count';
  private readonly sizeKey = 'size';
  private readonly typeKey = 'type';
  private readonly materialKey = 'material';
  private readonly quantityKey = 'quantity';
  private readonly notesKey = 'notes';

  itemOptions = [
    { value: 'pencil', label: 'Pencil' },
    { value: 'colored pencils', label: 'Colored Pencils' },
    { value: 'pencil sharpener', label: 'Pencil Sharpener' },
    { value: 'markers', label: 'Markers' },
    { value: 'highlighter', label: 'Highlighter' },
    { value: 'dry erase markers', label: 'Dry Erase Markers' },
    { value: 'crayons', label: 'Crayons' },
    { value: 'pen', label: 'Pen' },
    { value: 'eraser', label: 'Eraser' },
    { value: 'folder', label: 'Folder' },
    { value: 'binder', label: 'Binder' },
    { value: 'notebook', label: 'Notebook' },
    { value: 'glue', label: 'Glue' },
    { value: 'ruler', label: 'Ruler' },
    { value: 'scissors', label: 'Scissors' },
    { value: 'headphones', label: 'Headphones' },
    { value: 'backpack', label: 'Backpack' },
    { value: 'blanket', label: 'Blanket' },
    { value: 'other', label: 'Other' }
  ];

  typeOptions = [
    {value: 'Wide', label: "Wide"},
    {value: 'Fine', label: "Fine"}
  ];

  brandOptions = [
    {value: 'placeholder1', label: 'Placeholder1'},
    {value: 'placeholder2', label: 'Placeholder2'}
  ];

  colorOptions = [
    {value: 'placeholder1', label: 'Placeholder1'},
    {value: 'placeholder2', label: 'Placeholder2'}
  ];

  sizeOptions = [
    {value: 'placeholder1', label: 'Placeholder1'},
    {value: 'placeholder2', label: 'Placeholder2'}
  ];

  materialOptions = [
    {value: 'placeholder1', label: 'Placeholder1'},
    {value: 'placeholder2', label: 'Placeholder2'}
  ];

  getInventory(filters?: {item?: string; description?: string; brand?: string; color?: string;
    count?: number; size?: string; type?: string; material?: string; quantity?: number; notes?: string}): Observable<Inventory[]> {

    let httpParams: HttpParams = new HttpParams();
    if (filters) {
      if (filters.item) {
        httpParams = httpParams.set(this.itemKey, filters.item);
      }
      if (filters.brand) {
        httpParams = httpParams.set(this.brandKey, filters.brand);
      }
      if (filters.color) {
        httpParams = httpParams.set(this.colorKey, filters.color);
      }
      if (filters.size) {
        httpParams = httpParams.set(this.sizeKey, filters.size);
      }
      if (filters.type) {
        httpParams = httpParams.set(this.typeKey, filters.type);
      }
      if (filters.material) {
        httpParams = httpParams.set(this.materialKey, filters.material);
      }

    }
    return this.httpClient.get<Inventory[]>(this.inventoryUrl, { params: httpParams });
  }
}
