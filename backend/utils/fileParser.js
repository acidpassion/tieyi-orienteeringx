const csv = require('csv-parser');
const xlsx = require('xlsx');
const { Readable } = require('stream');

/**
 * Parse CSV file and extract registration data
 * @param {Buffer} fileBuffer - The CSV file buffer
 * @returns {Promise<Array>} Array of parsed registration records
 */
async function parseCSV(fileBuffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];
    let rowIndex = 0;

    try {
      // Create a readable stream from buffer
      const stream = Readable.from(fileBuffer.toString('utf8'));
      
      stream
        .pipe(csv({
          // Handle Chinese headers and ensure proper encoding
          skipEmptyLines: true,
          skipLinesWithError: false,
          separator: ','
        }))
        .on('data', (data) => {
          rowIndex++;
          
          try {
            // Clean column names by trimming and removing BOM
            const cleanedData = {};
            Object.keys(data).forEach(key => {
              const cleanKey = key.replace(/^\uFEFF/, '').trim(); // Remove BOM and trim
              cleanedData[cleanKey] = data[key];
            });
            
            // Validate required columns exist
            const requiredColumns = ['赛事', '姓名', '组别', '项目'];
            const missingColumns = requiredColumns.filter(col => !(col in cleanedData));
            
            if (missingColumns.length > 0) {
              errors.push({
                row: rowIndex,
                error: `Missing required columns: ${missingColumns.join(', ')}. Available: ${Object.keys(cleanedData).join(', ')}`
              });
              return;
            }

            // Parse and clean the data
            const record = {
              eventName: (cleanedData['赛事'] || '').toString().trim(),
              studentName: (cleanedData['姓名'] || '').toString().trim(),
              groupName: (cleanedData['组别'] || '').toString().trim(),
              gameTypes: parseGameTypes(cleanedData['项目'])
            };

            // Validate required fields are not empty
            if (!record.eventName) {
              errors.push({
                row: rowIndex,
                studentName: record.studentName,
                error: 'Event name (赛事) is required'
              });
              return;
            }

            if (!record.studentName) {
              errors.push({
                row: rowIndex,
                error: 'Student name (姓名) is required'
              });
              return;
            }

            if (!record.groupName) {
              errors.push({
                row: rowIndex,
                studentName: record.studentName,
                error: 'Group name (组别) is required'
              });
              return;
            }

            if (!record.gameTypes || record.gameTypes.length === 0) {
              errors.push({
                row: rowIndex,
                studentName: record.studentName,
                error: 'Game types (项目) is required'
              });
              return;
            }

            results.push(record);
          } catch (error) {
            errors.push({
              row: rowIndex,
              error: `Error parsing row: ${error.message}`
            });
          }
        })
        .on('end', () => {
          resolve({
            success: true,
            data: results,
            errors: errors,
            totalRows: rowIndex
          });
        })
        .on('error', (error) => {
          reject({
            success: false,
            error: `CSV parsing error: ${error.message}`,
            errors: errors
          });
        });
    } catch (error) {
      reject({
        success: false,
        error: `Failed to process CSV file: ${error.message}`,
        errors: errors
      });
    }
  });
}

/**
 * Parse comma-separated gameTypes string
 * @param {string} gameTypesStr - Comma-separated game types
 * @returns {Array<string>} Array of cleaned game type names
 */
function parseGameTypes(gameTypesStr) {
  if (!gameTypesStr) return [];
  
  // Convert to string and handle quoted values
  const str = gameTypesStr.toString().trim();
  
  // Remove outer quotes if present
  const cleanStr = str.replace(/^["']|["']$/g, '');
  
  // Split by comma and clean each item
  return cleanStr
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

/**
 * Parse Excel file and extract registration data
 * @param {Buffer} fileBuffer - The Excel file buffer
 * @returns {Promise<Object>} Parsed registration records with success/error info
 */
async function parseExcel(fileBuffer) {
  return new Promise((resolve, reject) => {
    try {
      // Read the workbook from buffer
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      
      // Get the first worksheet
      const sheetNames = workbook.SheetNames;
      if (sheetNames.length === 0) {
        return reject({
          success: false,
          error: 'Excel file contains no worksheets',
          errors: []
        });
      }

      const worksheet = workbook.Sheets[sheetNames[0]];
      
      // Convert worksheet to JSON with header row
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        header: 1, // Use first row as headers
        defval: '', // Default value for empty cells
        blankrows: false // Skip blank rows
      });

      if (jsonData.length === 0) {
        return reject({
          success: false,
          error: 'Excel file is empty',
          errors: []
        });
      }

      // Extract headers and validate
      const headers = jsonData[0];
      const requiredColumns = ['赛事', '姓名', '组别', '项目'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        return reject({
          success: false,
          error: `Missing required columns: ${missingColumns.join(', ')}`,
          errors: []
        });
      }

      // Find column indices
      const columnIndices = {};
      requiredColumns.forEach(col => {
        columnIndices[col] = headers.indexOf(col);
      });

      const results = [];
      const errors = [];

      // Process data rows (skip header row)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowIndex = i + 1; // Excel row number (1-based)

        try {
          // Handle different cell formats and empty cells
          const record = {
            eventName: getCellValue(row[columnIndices['赛事']]),
            studentName: getCellValue(row[columnIndices['姓名']]),
            groupName: getCellValue(row[columnIndices['组别']]),
            gameTypes: parseGameTypes(getCellValue(row[columnIndices['项目']]))
          };

          // Validate required fields are not empty
          if (!record.eventName) {
            errors.push({
              row: rowIndex,
              studentName: record.studentName,
              error: 'Event name (赛事) is required'
            });
            continue;
          }

          if (!record.studentName) {
            errors.push({
              row: rowIndex,
              error: 'Student name (姓名) is required'
            });
            continue;
          }

          if (!record.groupName) {
            errors.push({
              row: rowIndex,
              studentName: record.studentName,
              error: 'Group name (组别) is required'
            });
            continue;
          }

          if (!record.gameTypes || record.gameTypes.length === 0) {
            errors.push({
              row: rowIndex,
              studentName: record.studentName,
              error: 'Game types (项目) is required'
            });
            continue;
          }

          results.push(record);
        } catch (error) {
          errors.push({
            row: rowIndex,
            error: `Error parsing row: ${error.message}`
          });
        }
      }

      resolve({
        success: true,
        data: results,
        errors: errors,
        totalRows: jsonData.length - 1 // Exclude header row
      });

    } catch (error) {
      reject({
        success: false,
        error: `Failed to process Excel file: ${error.message}`,
        errors: []
      });
    }
  });
}

/**
 * Get cell value and handle different formats
 * @param {*} cellValue - Raw cell value from Excel
 * @returns {string} Cleaned string value
 */
function getCellValue(cellValue) {
  if (cellValue === null || cellValue === undefined) {
    return '';
  }
  
  // Handle different cell formats
  if (typeof cellValue === 'number') {
    return cellValue.toString();
  }
  
  if (typeof cellValue === 'string') {
    return cellValue.trim();
  }
  
  // Handle other types (boolean, date, etc.)
  return cellValue.toString().trim();
}

/**
 * Unified file parser interface that handles both CSV and Excel files
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} filename - Original filename for type detection
 * @param {string} mimetype - File MIME type
 * @returns {Promise<Object>} Parsed registration records with success/error info
 */
async function parseRegistrationFile(fileBuffer, filename, mimetype) {
  try {
    // Validate file buffer
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File is empty or invalid');
    }

    // Detect file type
    const fileType = detectFileType(filename, mimetype);
    
    if (!fileType) {
      throw new Error('Unsupported file format. Please upload a CSV or Excel (.xlsx) file.');
    }

    let parseResult;

    // Parse based on file type
    if (fileType === 'csv') {
      parseResult = await parseCSV(fileBuffer);
    } else if (fileType === 'excel') {
      parseResult = await parseExcel(fileBuffer);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Validate that we have the required columns in the parsed data
    if (parseResult.success && parseResult.data.length > 0) {
      const sampleRecord = parseResult.data[0];
      const requiredFields = ['eventName', 'studentName', 'groupName', 'gameTypes'];
      const missingFields = requiredFields.filter(field => !(field in sampleRecord));
      
      if (missingFields.length > 0) {
        throw new Error(`Parsed data missing required fields: ${missingFields.join(', ')}`);
      }
    }

    return {
      success: parseResult.success,
      fileType: fileType,
      data: parseResult.data || [],
      errors: parseResult.errors || [],
      totalRows: parseResult.totalRows || 0,
      message: parseResult.success ? 
        `Successfully parsed ${parseResult.data?.length || 0} records from ${fileType.toUpperCase()} file` :
        parseResult.error
    };

  } catch (error) {
    return {
      success: false,
      fileType: null,
      data: [],
      errors: [],
      totalRows: 0,
      message: error.message
    };
  }
}

/**
 * Detect file type based on filename and MIME type
 * @param {string} filename - Original filename
 * @param {string} mimetype - File MIME type
 * @returns {string|null} File type ('csv' or 'excel') or null if unsupported
 */
function detectFileType(filename, mimetype) {
  if (!filename && !mimetype) {
    return null;
  }

  // Check by file extension
  if (filename) {
    const extension = filename.toLowerCase().split('.').pop();
    if (extension === 'csv') {
      return 'csv';
    }
    if (extension === 'xlsx' || extension === 'xls') {
      return 'excel';
    }
  }

  // Check by MIME type
  if (mimetype) {
    if (mimetype.includes('csv') || mimetype === 'text/csv') {
      return 'csv';
    }
    if (mimetype.includes('spreadsheet') || 
        mimetype.includes('excel') ||
        mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimetype === 'application/vnd.ms-excel') {
      return 'excel';
    }
  }

  return null;
}

/**
 * Validate registration data structure
 * @param {Array} data - Array of registration records
 * @returns {Object} Validation result with success status and errors
 */
function validateRegistrationData(data) {
  const errors = [];
  const requiredFields = ['eventName', 'studentName', 'groupName', 'gameTypes'];

  if (!Array.isArray(data)) {
    return {
      success: false,
      errors: [{ error: 'Data must be an array of registration records' }]
    };
  }

  data.forEach((record, index) => {
    const rowNumber = index + 1;
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!record[field] || (Array.isArray(record[field]) && record[field].length === 0)) {
        errors.push({
          row: rowNumber,
          studentName: record.studentName || 'Unknown',
          error: `Missing required field: ${field}`
        });
      }
    });

    // Validate gameTypes is array
    if (record.gameTypes && !Array.isArray(record.gameTypes)) {
      errors.push({
        row: rowNumber,
        studentName: record.studentName || 'Unknown',
        error: 'gameTypes must be an array'
      });
    }
  });

  return {
    success: errors.length === 0,
    errors: errors
  };
}

module.exports = {
  parseCSV,
  parseExcel,
  parseRegistrationFile,
  parseGameTypes,
  getCellValue,
  detectFileType,
  validateRegistrationData
};