const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'seed', 'inventory.json');

const raw = fs.readFileSync(filePath, 'utf8');
const inventory = JSON.parse(raw);

const updated = inventory.map((entry) => ({
  internalID: entry.internalID,
  internalBarcode: entry.internalBarcode,
  externalBarcode: entry.externalBarcode,
  item: entry.item,
  description: entry.description,
  brand: entry.brand,
  color: entry.color,
  size: entry.size,
  type: entry.type,
  material: entry.material,
  packageSize: entry.packageSize,
  quantity: entry.quantity,
  maxQuantity: entry.maxQuantity,
  minQuantity: entry.minQuantity,
  calculatedMinQuantity: entry.calculatedMinQuantity,
  stockState: entry.stockState,
  calculatedStockState: entry.calculatedStockState,
  notes: entry.notes,
}));

fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');
console.log(`Updated ${updated.length} inventory entries.`);
