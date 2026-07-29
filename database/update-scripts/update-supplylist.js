const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'seed', 'supplylist.json');

const raw = fs.readFileSync(filePath, 'utf8');
const supplyList = JSON.parse(raw);

const updated = supplyList.map((entry) => ({
  academicYear: entry.academicYear,
  district: entry.district,
  school: entry.school,
  grade: entry.grade,
  teacher: entry.teacher,
  item: entry.item,
  brand: entry.brand,
  color: entry.color,
  size: entry.size,
  type: entry.type,
  material: entry.material,
  packageSize: entry.packageSize,
  quantity: entry.quantity,
  notes: entry.notes,
  supplyID: entry.supplyID,
  invIDs: entry.invIDs,
  percentageFilled: entry.percentageFilled,
}));

fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');
console.log(`Updated ${updated.length} supply list entries.`);
