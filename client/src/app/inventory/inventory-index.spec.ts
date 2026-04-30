import { InventoryIndex } from "./inventory-index";
import { Inventory } from "./inventory";

describe('InventoryIndex', () => {
  let index: InventoryIndex;

  const pencil: Inventory = {
    internalID: 'ID-0001',
    internalBarcode: 'ITEM-00001',
    externalBarcode: ['TEST-1', 'TEST-2'],
    item: 'Pencil',
    brand: 'Ticonderoga',
    color: 'Yellow',
    packageSize: 12,
    size: 'Standard',
    type: 'HB',
    material: 'Wood',
    quantity: 25,
    maxQuantity: 100,
    minQuantity: 5,
    stockState: 'under stock',
    notes: 'A sharpened pencil',
    description: 'Wood pencil'
  };

  const marker: Inventory = {
    internalID: 'inv-2',
    internalBarcode: 'ITEM-00002',
    externalBarcode: ['TEST-3'],
    item: 'Marker',
    description: 'Dry erase marker',
    brand: 'Expo',
    color: 'Black',
    packageSize: 1,
    size: 'Medium',
    type: 'Dry erase',
    material: 'Plastic',
    quantity: 10,
    maxQuantity: 50,
    minQuantity: 2,
    stockState: 'in stock',
    notes: 'Black marker',
  };

  beforeEach(() => {
    index = new InventoryIndex();
  });

  it('returns null when barcode is unknown', () => {
    expect(index.getByBarcode('missing')).toBeNull();
  });

  it('registers and finds an item by internal barcode', () => {
    index.registerItem(pencil);
    expect(index.getByBarcode("ITEM-00001")).toEqual(pencil);
  });

  it('registers and finds an item by external barcode', () => {
    index.registerItem(pencil);
    expect(index.getByBarcode('TEST-2')).toEqual(pencil);
  });

  it('unregisters an item and removes all barcode mappings', () => {
    index.registerItem(pencil);
    index.unregisterItem('ID-0001');

    expect(index.getByBarcode('ITEM-00001')).toBeNull();
    expect(index.getByBarcode('TEST-1')).toBeNull();
    expect(index.getByBarcode('TEST-2')).toBeNull();
  });

  it('ignores unregister requests for unknown ids', () => {
    index.registerItem(pencil);
    index.unregisterItem('does-not-exist');

    expect(index.getByBarcode('ITEM-00001')).toEqual(pencil);
  });

  it('clear all registered items and barcode maps', () => {
    index.registerItem(pencil);
    index.unregisterItem(marker.internalID);

    index.clear();

    expect(index.getByBarcode('ITEM-00001')).toBeNull();
    expect(index.getByBarcode('TEST-3')).toBeNull();
  });

  it('replaces an item with the same internal id and keeps the latest mapping', () => {
    const updated: Inventory = {
      internalID: 'inv-1',
      internalBarcode: 'ITEM-99999',
      externalBarcode: ['EXT-9'],
      item: 'Updated Pencil',
      description: 'Updated wood pencil',
      brand: 'Ticonderoga',
      color: 'Yellow',
      packageSize: 12,
      size: 'Standard',
      type: 'HB',
      material: 'Wood',
      quantity: 30,
      maxQuantity: 100,
      minQuantity: 5,
      stockState: 'in stock',
      notes: 'Updated item'
    };

    index.registerItem(pencil);
    index.registerItem(updated);

    expect(index.getByBarcode('ITEM-99999')).toEqual(updated);
    expect(index.getByBarcode('EXT-9')).toEqual(updated);
  });

  it('unregisters old item when registering item with same id but different internalBarcode', () => {
    spyOn(console, 'warn');

    const updated: Inventory = {
      ...pencil,
      internalBarcode: 'ITEM-NEW'
    };

    index.registerItem(pencil);
    expect(index.getByBarcode('ITEM-00001')).toEqual(pencil);

    index.registerItem(updated);

    expect(console.warn).toHaveBeenCalled();
    expect(index.getByBarcode('ITEM-00001')).toBeNull();
    expect(index.getByBarcode('ITEM-NEW')).toEqual(updated);
    expect(index.getByBarcode('TEST-1')).toEqual(updated);
  });

  it('unregisters old item when registering item with same id but different item name', () => {
    spyOn(console, 'warn');

    const updated: Inventory = {
      ...pencil,
      item: 'Different Name'
    };

    index.registerItem(pencil);
    expect(index.getByBarcode('ITEM-00001')).toEqual(pencil);

    index.registerItem(updated);

    expect(console.warn).toHaveBeenCalled();
    expect(index.getByBarcode('ITEM-00001')).toEqual(updated);
    expect(index.getByBarcode('TEST-1')).toEqual(updated);
  });

  it('unregisters and re-registers when updating existing item with same id', () => {
    const updated: Inventory = {
      ...pencil,
      externalBarcode: ['NEW-EXT']
    };

    index.registerItem(pencil);
    expect(index.getByBarcode('TEST-1')).toEqual(pencil);

    index.registerItem(updated);

    expect(index.getByBarcode('TEST-1')).toBeNull();
    expect(index.getByBarcode('NEW-EXT')).toEqual(updated);
  });

  it('returns null when barcode maps to an internalID with no item in itemMap', () => {
    index.registerItem(pencil);

    // Manually break the mapping
    const indexPrivate = index as unknown as { internalBarcodeMap: Map<string, string>, itemMap: Map<string, Inventory> };

    // Delete the item from itemMap but leave the barcode mapping
    indexPrivate.itemMap.delete('ID-0001');

    // Now getByBarcode should return null due to ?? null fallback
    expect(index.getByBarcode('ITEM-00001')).toBeNull();
  });
})
