// Script to summarize the Excel workbook "HIT - Sunglasses project tracker.xlsx"
// Outputs JSON with sheet names, headers, sample rows, and total row count per sheet.

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const fileName = 'HIT - Sunglasses project tracker.xlsx';
const filePath = path.join(__dirname, fileName);

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

try {
  const workbook = XLSX.readFile(filePath, { cellDates: true, dateNF: 'yyyy-mm-dd' });
  const summary = [];

  workbook.SheetNames.forEach(sheetName => {
    const ws = workbook.Sheets[sheetName];
    if (!ws) return;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    const headers = rows[0] || [];
    const sampleRows = rows.slice(1, 6); // first 5 data rows
    summary.push({
      sheetName,
      headers,
      sampleRows,
      totalRows: rows.length
    });
  });

  console.log(JSON.stringify(summary, null, 2));
} catch (err) {
  console.error('Error reading workbook:', err);
  process.exit(1);
}
