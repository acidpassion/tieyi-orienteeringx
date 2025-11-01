# Requirements Document

## Introduction

This feature adds bulk registration upload functionality to the coach event management system. Coaches can upload registration data in CSV or Excel format to quickly register multiple students for events, eliminating the need for manual individual registrations.

## Requirements

### Requirement 1

**User Story:** As a coach, I want to upload a registration file (CSV or Excel) containing student registration data, so that I can quickly register multiple students for an event without manual entry.

#### Acceptance Criteria

1. WHEN I am on the coach/events/{id} page THEN I SHALL see an "Upload Registrations (上传报名表)" button
2. WHEN I click the upload button THEN the system SHALL open a file selection dialog
3. WHEN I select a CSV or Excel file THEN the system SHALL validate the file format
4. IF the file format is invalid THEN the system SHALL display an error message
5. WHEN the file is valid THEN the system SHALL process the registration data
6. WHEN processing is complete THEN the system SHALL redirect me to coach/events/{id}/registrations page

### Requirement 2

**User Story:** As a coach, I want the system to process registration data with the correct format, so that student registrations are created accurately in the system.

#### Acceptance Criteria

1. WHEN the system processes the upload file THEN it SHALL expect columns: 赛事, 姓名, 组别, 项目
2. WHEN processing each row THEN the system SHALL find the event by eventName (赛事)
3. WHEN processing each row THEN the system SHALL find the student by name (姓名)
4. WHEN processing gameTypes (项目) THEN the system SHALL handle comma-separated values like "短距离,百米赛"
5. WHEN creating EventRegistration records THEN the system SHALL use the groupName (组别) for each gameType
6. WHEN creating EventRegistration records THEN the system SHALL NOT assign difficultyGrade
7. IF a student name is not found THEN the system SHALL log an error and skip that record
8. IF an event name is not found THEN the system SHALL return an error response

### Requirement 3

**User Story:** As a coach, I want the system to create proper EventRegistration records, so that the registration data is stored correctly in the database.

#### Acceptance Criteria

1. WHEN creating EventRegistration records THEN the system SHALL use the existing EventRegistration schema
2. WHEN creating gameTypes THEN each gameType SHALL have name, group, and empty difficultyGrade
3. WHEN creating gameTypes THEN the team field SHALL have empty members array
4. WHEN creating EventRegistration THEN status SHALL be set to "confirmed"
5. WHEN creating EventRegistration THEN registeredAt SHALL be set to current timestamp
6. IF a registration already exists for a student-event combination THEN the system SHALL update the existing record
7. WHEN processing is complete THEN the system SHALL return success count and error details

### Requirement 4

**User Story:** As a coach, I want to see clear feedback about the upload process, so that I know which registrations were successful and which failed.

#### Acceptance Criteria

1. WHEN upload processing completes THEN the system SHALL return total processed count
2. WHEN upload processing completes THEN the system SHALL return successful registration count
3. WHEN upload processing completes THEN the system SHALL return error count and details
4. WHEN there are errors THEN the system SHALL provide specific error messages for each failed record
5. WHEN upload is successful THEN the system SHALL display a success message
6. WHEN upload has errors THEN the system SHALL display error details while still showing successful registrations