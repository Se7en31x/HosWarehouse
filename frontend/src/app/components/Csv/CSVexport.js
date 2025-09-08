// src/app/Csv/CSVexport.js
import { utils, writeFile } from "xlsx";

/**
 * Export CSV (Generic)
 * @param {Object} opts
 * @param {Array} opts.columns - หัวตาราง (array of string)
 * @param {Array} opts.rows - ข้อมูลแต่ละแถว (array of array)
 * @param {String} opts.filename - ชื่อไฟล์ CSV
 */
export default function exportCSV({ columns = [], rows = [], filename = "export.csv" }) {
  if (!columns.length || !rows.length) {
    console.warn("⚠️ No data to export");
    return;
  }

  const worksheet = utils.aoa_to_sheet([columns, ...rows]);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Report");

  writeFile(workbook, filename, { bookType: "csv" });
}
