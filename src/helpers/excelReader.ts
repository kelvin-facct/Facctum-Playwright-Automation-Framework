import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";
import { logger } from "../utils/logger";

/**
 * Excel Reader utility for data-driven testing
 * Reads test data from Excel files (.xlsx, .xls)
 */
export class ExcelReader {
  private workbook: XLSX.WorkBook | null = null;
  private filePath: string;

  constructor(filePath: string) {
    // Resolve path relative to project root if not absolute
    this.filePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(this.filePath)) {
      throw new Error(`Excel file not found: ${this.filePath}`);
    }

    this.workbook = XLSX.readFile(this.filePath);
    logger.info(`Excel file loaded: ${this.filePath}`);
  }

  /**
   * Get cell value by row and column index
   * @param sheetName - Name of the sheet
   * @param rowIndex - Row index (0-based)
   * @param colIndex - Column index (0-based)
   * @returns Cell value as string
   */
  getCellValue(sheetName: string, rowIndex: number, colIndex: number): string {
    const sheet = this.getSheet(sheetName);
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    const cell = sheet[cellAddress];
    return cell ? String(cell.v ?? "") : "";
  }

  /**
   * Get cell value by cell reference (e.g., "A1", "B2")
   * @param sheetName - Name of the sheet
   * @param cellRef - Cell reference like "A1", "B2"
   * @returns Cell value as string
   */
  getCellByRef(sheetName: string, cellRef: string): string {
    const sheet = this.getSheet(sheetName);
    const cell = sheet[cellRef];
    return cell ? String(cell.v ?? "") : "";
  }

  /**
   * Get entire row as array of values
   * @param sheetName - Name of the sheet
   * @param rowIndex - Row index (0-based)
   * @returns Array of cell values
   */
  getRow(sheetName: string, rowIndex: number): string[] {
    const sheet = this.getSheet(sheetName);
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
    const row: string[] = [];

    for (let col = range.s.c; col <= range.e.c; col++) {
      row.push(this.getCellValue(sheetName, rowIndex, col));
    }
    return row;
  }

  /**
   * Get entire column as array of values
   * @param sheetName - Name of the sheet
   * @param colIndex - Column index (0-based)
   * @returns Array of cell values
   */
  getColumn(sheetName: string, colIndex: number): string[] {
    const sheet = this.getSheet(sheetName);
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
    const column: string[] = [];

    for (let row = range.s.r; row <= range.e.r; row++) {
      column.push(this.getCellValue(sheetName, row, colIndex));
    }
    return column;
  }

  /**
   * Get sheet data as array of objects (first row as headers)
   * @param sheetName - Name of the sheet
   * @returns Array of row objects with header keys
   */
  getSheetData<T = Record<string, string>>(sheetName: string): T[] {
    const sheet = this.getSheet(sheetName);
    return XLSX.utils.sheet_to_json<T>(sheet, { defval: "" });
  }

  /**
   * Get sheet data as 2D array
   * @param sheetName - Name of the sheet
   * @returns 2D array of cell values
   */
  getSheetAsArray(sheetName: string): string[][] {
    const sheet = this.getSheet(sheetName);
    return XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: "",
    });
  }

  /**
   * Get row data as object using header row
   * @param sheetName - Name of the sheet
   * @param rowIndex - Data row index (0-based, excluding header)
   * @param headerRowIndex - Header row index (default: 0)
   * @returns Object with header keys and row values
   */
  getRowAsObject(
    sheetName: string,
    rowIndex: number,
    headerRowIndex: number = 0
  ): Record<string, string> {
    const headers = this.getRow(sheetName, headerRowIndex);
    const values = this.getRow(sheetName, rowIndex + headerRowIndex + 1);
    const result: Record<string, string> = {};

    headers.forEach((header, index) => {
      if (header) {
        result[header] = values[index] || "";
      }
    });
    return result;
  }

  /**
   * Find row by column value
   * @param sheetName - Name of the sheet
   * @param colIndex - Column index to search
   * @param searchValue - Value to find
   * @returns Row index or -1 if not found
   */
  findRowByValue(
    sheetName: string,
    colIndex: number,
    searchValue: string
  ): number {
    const column = this.getColumn(sheetName, colIndex);
    return column.findIndex(
      (val) => val.toLowerCase() === searchValue.toLowerCase()
    );
  }

  /**
   * Get list of sheet names
   * @returns Array of sheet names
   */
  getSheetNames(): string[] {
    return this.workbook?.SheetNames || [];
  }

  /**
   * Get row count for a sheet
   * @param sheetName - Name of the sheet
   * @returns Number of rows
   */
  getRowCount(sheetName: string): number {
    const sheet = this.getSheet(sheetName);
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
    return range.e.r - range.s.r + 1;
  }

  /**
   * Get column count for a sheet
   * @param sheetName - Name of the sheet
   * @returns Number of columns
   */
  getColumnCount(sheetName: string): number {
    const sheet = this.getSheet(sheetName);
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
    return range.e.c - range.s.c + 1;
  }

  private getSheet(sheetName: string): XLSX.WorkSheet {
    if (!this.workbook) {
      throw new Error("Workbook not loaded");
    }
    const sheet = this.workbook.Sheets[sheetName];
    if (!sheet) {
      const available = this.workbook.SheetNames.join(", ");
      throw new Error(
        `Sheet "${sheetName}" not found. Available: ${available}`
      );
    }
    return sheet;
  }
}

/**
 * Static helper for quick Excel reads without instantiation
 */
export function readExcelCell(
  filePath: string,
  sheetName: string,
  rowIndex: number,
  colIndex: number
): string {
  const reader = new ExcelReader(filePath);
  return reader.getCellValue(sheetName, rowIndex, colIndex);
}

/**
 * Static helper to get sheet data as objects
 */
export function readExcelSheet<T = Record<string, string>>(
  filePath: string,
  sheetName: string
): T[] {
  const reader = new ExcelReader(filePath);
  return reader.getSheetData<T>(sheetName);
}
