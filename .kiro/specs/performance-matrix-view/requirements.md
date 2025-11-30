# Requirements Document

## Introduction

This feature re-engineers the coach performance management page from a student-centric list view to a matrix/grid view that provides coaches with a comprehensive overview of all students' performance across all games. The matrix view displays students as rows and games as columns, allowing coaches to quickly scan and compare performance across the entire team.

## Glossary

- **Matrix View**: A grid-based layout where rows represent students and columns represent games
- **Game**: A competition event with a specific date and location
- **GameType**: A specific competition category within a game (e.g., 短距离, 长距离, 接力)
- **Performance Record**: A student's result for a specific gameType within a game
- **Grade**: The student's class/grade level used for sorting
- **Coach**: The user viewing the performance management page

## Requirements

### Requirement 1

**User Story:** As a coach, I want to view all students' performance in a matrix layout, so that I can quickly scan and compare results across all games and students.

#### Acceptance Criteria

1. WHEN the coach navigates to the performance management page THEN the system SHALL display a matrix with students as rows and games as columns
2. WHEN displaying the matrix THEN the system SHALL order student rows by grade in ascending order
3. WHEN displaying the matrix THEN the system SHALL order game columns by event date from earliest to latest
4. WHEN a game contains multiple gameTypes THEN the system SHALL display each gameType as a separate column span under that game
5. WHEN displaying a student's result for a gameType THEN the system SHALL show the result value in the corresponding cell

### Requirement 2

**User Story:** As a coach, I want to filter the matrix by gameType, so that I can focus on specific competition categories like 短距离.

#### Acceptance Criteria

1. WHEN the page loads THEN the system SHALL display a gameType checkbox selector with all available gameTypes
2. WHEN a coach selects or deselects a gameType checkbox THEN the system SHALL show or hide the corresponding gameType columns in the matrix
3. WHEN all gameTypes are deselected THEN the system SHALL display a message indicating no gameTypes are selected
4. WHEN the coach changes gameType selections THEN the system SHALL preserve the student row order and game column order
5. WHEN the page loads initially THEN the system SHALL have all gameTypes selected by default

### Requirement 3

**User Story:** As a coach, I want the statistics header removed, so that I can maximize screen space for the performance matrix.

#### Acceptance Criteria

1. WHEN the page loads THEN the system SHALL NOT display the statistics card showing total records, valid records, participating students, and competition events
2. WHEN the page loads THEN the system SHALL display the matrix view immediately below the page header and filters

### Requirement 4

**User Story:** As a coach, I want to see student information in each row, so that I can identify students while viewing their performance.

#### Acceptance Criteria

1. WHEN displaying a student row THEN the system SHALL show the student's name in the first column
2. WHEN displaying a student row THEN the system SHALL show the student's grade/class information
3. WHEN displaying a student row THEN the system SHALL show the student's avatar if available
4. WHEN a student has no avatar THEN the system SHALL display a default avatar placeholder

### Requirement 5

**User Story:** As a coach, I want to see game information in column headers, so that I can identify which game each column represents.

#### Acceptance Criteria

1. WHEN displaying game columns THEN the system SHALL show the event name in the column header
2. WHEN displaying game columns THEN the system SHALL show the event date in the column header
3. WHEN a game has multiple gameTypes THEN the system SHALL group gameType columns under a single game header
4. WHEN displaying gameType columns THEN the system SHALL show the gameType name in the sub-header
5. WHEN displaying column headers THEN the system SHALL use a hierarchical structure with game as parent and gameTypes as children

### Requirement 6

**User Story:** As a coach, I want to see performance results clearly in the matrix, so that I can quickly assess student performance.

#### Acceptance Criteria

1. WHEN a student has a result for a gameType THEN the system SHALL display the result value in the corresponding cell
2. WHEN a student has no result for a gameType THEN the system SHALL display an empty cell or placeholder
3. WHEN displaying a result THEN the system SHALL show the validity status (valid/invalid) through visual indicators
4. WHEN displaying a result THEN the system SHALL show the position/ranking if available
5. WHEN a result is invalid THEN the system SHALL display the reason code (DNF, DSQ, etc.)

### Requirement 7

**User Story:** As a coach, I want to maintain existing filtering capabilities, so that I can narrow down the data displayed in the matrix.

#### Acceptance Criteria

1. WHEN the coach applies date range filters THEN the system SHALL only display games within the selected date range
2. WHEN the coach applies student name filter THEN the system SHALL only display rows for matching students
3. WHEN the coach applies event name filter THEN the system SHALL only display columns for matching games
4. WHEN filters are applied THEN the system SHALL maintain the matrix layout structure
5. WHEN filters result in no data THEN the system SHALL display an appropriate empty state message
