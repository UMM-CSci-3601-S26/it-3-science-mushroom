const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'seed', 'family.json');

const raw = fs.readFileSync(filePath, 'utf8');
const family = JSON.parse(raw);

const updated = family.map((entry) => ({
  guardianName: entry.guardianName,
  email: entry.email,
  address: entry.address,
  profileComplete: entry.profileComplete,
  accommodations: entry.accommodations,
  timeSlot: entry.timeSlot,
  timeAvailability: entry.timeAvailability,
  students: entry.students.map((student) => ({
    name: student.name,
    grade: student.grade,
    school: student.school,
    schoolAbbreviation: student.schoolAbbreviation,
    teacher: student.teacher,
    backpack: student.backpack,
    headphones: student.headphones,
  })),
}));

fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');
console.log(`Updated ${updated.length} family entries.`);
