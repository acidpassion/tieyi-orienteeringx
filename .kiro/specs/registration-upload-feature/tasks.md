# Implementation Plan

- [x] 1. Set up backend file upload infrastructure
  - Install required npm packages (multer, xlsx, csv-parser)
  - Create file upload middleware configuration
  - Set up file size and type validation
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 2. Create file parsing utilities
  - [x] 2.1 Implement CSV parser function
    - Create function to parse CSV files with proper encoding
    - Handle comma-separated gameTypes parsing
    - Add error handling for malformed CSV data
    - _Requirements: 2.1, 2.4_

  - [x] 2.2 Implement Excel parser function
    - Create function to parse .xlsx files using xlsx library
    - Extract data from first worksheet
    - Handle different cell formats and empty cells
    - _Requirements: 2.1, 2.4_

  - [x] 2.3 Create unified file parser interface
    - Implement file type detection logic
    - Create common data structure for parsed results
    - Add validation for required columns (赛事, 姓名, 组别, 项目)
    - _Requirements: 2.1, 2.2_

- [x] 3. Implement data validation and lookup logic
  - [x] 3.1 Create event lookup function
    - Find event by eventName with case-insensitive matching
    - Return appropriate error if event not found
    - _Requirements: 2.2, 2.8_

  - [x] 3.2 Create student lookup function
    - Find student by name with exact matching
    - Handle name variations and whitespace
    - _Requirements: 2.3, 2.7_

  - [x] 3.3 Implement gameTypes parsing and validation
    - Parse comma-separated gameTypes string
    - Trim whitespace and handle quoted values
    - Validate gameType names against system standards
    - _Requirements: 2.4, 2.5_

- [x] 4. Create EventRegistration processing logic
  - [x] 4.1 Implement registration record creation
    - Create EventRegistration objects with proper schema
    - Set status to "confirmed" and registeredAt to current time
    - Handle empty difficultyGrade and team.members array
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.2 Handle duplicate registration logic
    - Check for existing EventRegistration records
    - Update existing records instead of creating duplicates
    - Merge gameTypes arrays when updating
    - _Requirements: 3.6_

  - [x] 4.3 Implement batch processing for multiple registrations
    - Process registrations in batches for performance
    - Collect success and error counts
    - Generate detailed error reports with row numbers
    - _Requirements: 3.7, 4.1, 4.2, 4.3, 4.4_

- [x] 5. Create upload API endpoint
  - [x] 5.1 Implement POST /api/events/:eventId/upload-registrations route
    - Set up multer middleware for file upload
    - Add authentication and authorization checks
    - Validate eventId parameter exists
    - _Requirements: 1.1, 1.5_

  - [x] 5.2 Integrate file parsing and processing pipeline
    - Call file parser based on file type
    - Execute data validation and lookup functions
    - Process EventRegistration creation/updates
    - _Requirements: 1.5, 2.1-2.8, 3.1-3.7_

  - [x] 5.3 Implement response formatting and error handling
    - Format success response with counts and details
    - Handle and format various error scenarios
    - Return appropriate HTTP status codes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 6. Add frontend upload interface
  - [x] 6.1 Add upload button to coach event page
    - Create "Upload Registrations (上传报名表)" button component
    - Position button appropriately on coach/events/{id} page
    - Style button to match existing UI design
    - _Requirements: 1.1_

  - [x] 6.2 Implement file selection and upload functionality
    - Create file input with CSV and Excel file type restrictions
    - Add drag-and-drop support for better UX
    - Implement file validation on frontend
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 6.3 Create upload progress and feedback UI
    - Show upload progress indicator during processing
    - Display success message with registration counts
    - Show detailed error messages for failed records
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 6.4 Implement post-upload navigation
    - Redirect to coach/events/{id}/registrations on success
    - Handle error states without navigation
    - Preserve error details for user review
    - _Requirements: 1.6_

- [ ]* 7. Add comprehensive error handling and logging
  - Add detailed logging for upload operations
  - Implement proper error boundaries in React components
  - Add validation for edge cases and malformed data
  - _Requirements: All error handling requirements_

- [ ]* 8. Create unit tests for core functionality
  - Write tests for file parsing functions
  - Test data validation and lookup logic
  - Test EventRegistration creation and update logic
  - _Requirements: All core functionality_