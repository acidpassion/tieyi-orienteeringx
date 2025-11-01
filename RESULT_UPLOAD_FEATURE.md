# Result Upload Feature Implementation

## Overview
This document describes the implementation of the result upload feature for the OrienteeringX Quiz Platform. This feature allows coaches to upload competition results from CSV or Excel files with flexible column mapping.

## Features Implemented

### 1. Database Schema Updates
**File**: `backend/models/CompletionRecord.js`

Added two new optional fields to the CompletionRecord schema:
- `startTime`: Date field for competition start time (ISO datetime)
- `finishTime`: Date field for competition finish time (ISO datetime)

### 2. Backend API Endpoints
**File**: `backend/routes/completionRecords.js`

#### New Endpoints:

1. **POST `/api/completion-records/parse-file`**
   - Parses uploaded CSV or Excel files
   - Returns column names and row data
   - Supports CSV, XLSX, and XLS formats
   - Maximum file size: 10MB
   - Requires coach authentication

2. **POST `/api/completion-records/bulk-upsert`**
   - Bulk insert or update completion records
   - Updates existing records based on unique combination: `eventName + name + gameType + groupName`
   - Returns statistics: inserted count, updated count, errors
   - Requires coach authentication

### 3. File Upload Middleware
**File**: `backend/middleware/fileUpload.js`

- Configured multer for file uploads
- Memory storage for processing
- File type validation (CSV, Excel only)
- File size limit: 10MB
- Comprehensive error handling

### 4. Frontend Components

#### ResultUploadModal Component
**File**: `client/src/components/ResultUploadModal.jsx`

A comprehensive 3-step modal for uploading and mapping result data:

**Step 1: File Upload**
- Drag-and-drop file upload
- File type validation (CSV, XLSX, XLS)
- File size validation (10MB max)
- Visual feedback for selected file

**Step 2: Column Mapping**
- Game type selection from event's available game types
- Automatic column mapping based on common column names
- Manual mapping adjustment
- Required fields validation:
  - 姓名 (name) *
  - 组别 (groupName) *
  - 成绩 (result) *
- Optional fields:
  - 开始时间 (startTime)
  - 结束时间 (finishTime)
  - 名次 (position)
  - 分数 (score)
  - 有效性 (validity)
  - 原因 (reason)

**Step 3: Preview and Save**
- Preview first 10 records
- Shows total record count
- Bulk upsert with update/insert logic
- Success feedback with statistics

#### EventResults Page
**File**: `client/src/pages/coach/EventResults.jsx`

A dedicated page for viewing and managing event results:

**Features:**
- Event-specific results display
- Statistics cards:
  - Total results count
  - Valid results count
  - Number of game types
  - Number of groups
- Filtering:
  - Search by name
  - Filter by game type
  - Filter by group
- Export to Excel
- Import results button (opens ResultUploadModal)
- Results table with columns:
  - Name
  - Game Type
  - Group
  - Result
  - Position
  - Score
  - Validity

### 5. Routing
**File**: `client/src/App.jsx`

Added new route:
- `/coach/events/:id/results` - Event results page

### 6. Navigation
**File**: `client/src/pages/coach/Events.jsx`

Added "赛事成绩" button in the events list:
- Icon: BarChart3
- Color: Purple
- Navigates to event results page

## Data Flow

### Upload Process:
1. Coach selects event from events list
2. Clicks "赛事成绩" button to view results page
3. Clicks "导入成绩" button
4. Uploads CSV/Excel file
5. System parses file and extracts columns
6. Coach selects game type
7. System auto-maps columns (can be adjusted)
8. Coach reviews preview
9. Coach confirms and saves
10. System performs bulk upsert:
    - Finds existing records by: eventName + name + gameType + groupName
    - Updates if exists, inserts if new
11. Shows success message with statistics
12. Refreshes results table

### Update Logic:
Records are identified as duplicates based on the combination of:
- `eventName`
- `name` (student name)
- `gameType`
- `groupName`

If a match is found, the record is updated. Otherwise, a new record is inserted.

## File Format Requirements

### Required Columns (must be mapped):
- 姓名 (Name)
- 组别 (Group Name)
- 成绩 (Result)

### Optional Columns:
- 开始时间 (Start Time) - ISO 8601 format
- 结束时间 (Finish Time) - ISO 8601 format
- 名次 (Position) - Number
- 分数 (Score) - Number
- 有效性 (Validity) - Boolean or text ("有效"/"无效")
- 原因 (Reason) - Text

### Auto-detected Column Names:
The system automatically maps columns based on common naming patterns:
- Name: 姓名, name
- Group: 组别, group
- Result: 成绩, result, 时间 (excluding start/finish)
- Start Time: 开始, start
- Finish Time: 结束, finish, end
- Position: 名次, position, 排名
- Score: 分数, score, 积分
- Validity: 有效, validity
- Reason: 原因, reason

## Technical Details

### Dependencies Added:
- `multer`: File upload handling
- `xlsx`: Excel file parsing
- `csv-parser`: CSV file parsing

### Security:
- File type validation (whitelist)
- File size limits
- Authentication required (coach only)
- Input validation on all fields

### Error Handling:
- File upload errors
- Parse errors
- Validation errors
- Database errors
- User-friendly error messages

## Usage Example

### Sample CSV Format:
```csv
姓名,组别,项目,成绩,名次,分数,有效性
张三,青少年男子组,短距离,00:15:30,1,100,有效
李四,青少年男子组,短距离,00:16:45,2,95,有效
王五,青少年女子组,短距离,DNF,,,无效
```

### Sample Excel Format:
Same structure as CSV, but in Excel format (.xlsx or .xls)

## Future Enhancements

Potential improvements:
1. Batch delete results
2. Edit individual results inline
3. Import validation rules (e.g., time format validation)
4. Support for more file formats
5. Template download for result files
6. Import history and rollback
7. Duplicate detection warnings before save
8. Advanced filtering and sorting options
9. Result statistics and analytics

## Testing

To test the feature:
1. Start the backend server: `cd backend && npm start`
2. Start the frontend: `cd client && npm run dev`
3. Login as a coach
4. Navigate to Events page
5. Click the purple BarChart3 icon for any event
6. Click "导入成绩" button
7. Upload a test CSV/Excel file
8. Map columns and preview
9. Save and verify results appear in the table

## Notes

- The feature uses memory storage for file processing (no files saved to disk)
- All timestamps are stored in UTC
- The system automatically handles timezone conversions
- Bulk operations are atomic (all or nothing)
- The UI is fully responsive and supports dark mode
