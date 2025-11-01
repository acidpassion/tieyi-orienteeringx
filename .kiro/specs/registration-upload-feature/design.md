# Design Document

## Overview

The registration upload feature allows coaches to bulk upload student registrations via CSV or Excel files. The system will parse the uploaded file, validate the data, and create EventRegistration records in the database. The feature integrates with the existing coach event management interface.

## Architecture

### Frontend Components
- **Upload Button**: Added to the coach/events/{id} page
- **File Upload Handler**: Processes file selection and upload
- **Progress Feedback**: Shows upload status and results

### Backend Components
- **File Upload Endpoint**: `/api/events/:eventId/upload-registrations`
- **File Parser**: Handles CSV and Excel file parsing
- **Data Validator**: Validates student names and event data
- **Registration Creator**: Creates EventRegistration records

### Data Flow
1. User selects file on frontend
2. File is uploaded to backend endpoint
3. Backend parses file content
4. System validates each registration record
5. Valid records create/update EventRegistration entries
6. Results are returned to frontend
7. Frontend redirects to registrations page

## Components and Interfaces

### API Endpoint
```
POST /api/events/:eventId/upload-registrations
Content-Type: multipart/form-data

Request:
- eventId (path parameter)
- file (form data - CSV or Excel)

Response:
{
  success: boolean,
  message: string,
  data: {
    totalProcessed: number,
    successCount: number,
    errorCount: number,
    errors: [
      {
        row: number,
        studentName: string,
        error: string
      }
    ]
  }
}
```

### File Format Support
- **CSV**: Standard comma-separated values with UTF-8 encoding
- **Excel**: .xlsx format using xlsx library

### Expected File Structure
```
赛事,姓名,组别,项目
华农国防体育定向赛,余弘博,青少年男子组,"短距离,百米赛"
华农国防体育定向赛,赵子轩,青少年男子组,"百米赛,短距离"
```

## Data Models

### Input Data Structure
```javascript
{
  eventName: string,    // 赛事
  studentName: string,  // 姓名
  groupName: string,    // 组别
  gameTypes: string     // 项目 (comma-separated)
}
```

### EventRegistration Creation
```javascript
{
  eventId: ObjectId,
  studentId: ObjectId,
  gameTypes: [
    {
      name: string,        // from parsed gameTypes
      group: string,       // from groupName
      difficultyGrade: "", // empty as specified
      team: {
        members: []        // empty array
      }
    }
  ],
  status: "confirmed",
  registeredAt: Date
}
```

## Error Handling

### File Validation Errors
- Invalid file format (not CSV or Excel)
- Missing required columns
- Empty file
- File size too large

### Data Validation Errors
- Event not found by eventName
- Student not found by studentName
- Invalid gameType format
- Missing required fields

### Database Errors
- Duplicate registration handling (update existing)
- Database connection issues
- Validation schema errors

### Error Response Format
```javascript
{
  success: false,
  message: "Upload completed with errors",
  data: {
    totalProcessed: 10,
    successCount: 8,
    errorCount: 2,
    errors: [
      {
        row: 3,
        studentName: "张三",
        error: "Student not found in system"
      },
      {
        row: 7,
        studentName: "李四",
        error: "Invalid gameType format"
      }
    ]
  }
}
```

## Testing Strategy

### Unit Tests
- File parser functions (CSV and Excel)
- Data validation logic
- EventRegistration creation logic
- Error handling scenarios

### Integration Tests
- Complete upload workflow
- Database operations
- File upload endpoint
- Frontend-backend integration

### Test Data
- Valid CSV files with various gameType combinations
- Invalid files (wrong format, missing columns)
- Edge cases (empty rows, special characters)
- Large files for performance testing

## Implementation Notes

### Libraries Required
- **multer**: File upload handling
- **xlsx**: Excel file parsing
- **csv-parser**: CSV file parsing

### Security Considerations
- File size limits (e.g., 10MB max)
- File type validation
- Input sanitization
- Authentication/authorization checks

### Performance Considerations
- Batch processing for large files
- Memory management for file parsing
- Database bulk operations where possible
- Progress feedback for long operations

### Frontend Integration
- File drag-and-drop support
- Progress indicators
- Error display with row-specific details
- Success confirmation with redirect