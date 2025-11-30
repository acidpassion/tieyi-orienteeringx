# Implementation Plan

- [x] 1. Create matrix data transformation utilities
  - Create utility functions to transform flat completion records into matrix structure
  - Implement student sorting by grade and class
  - Implement game sorting by date
  - Implement gameType extraction and filtering logic
  - Create result cell mapping function
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [ ]* 1.1 Write property test for student sorting
  - **Property 1: Student row ordering consistency**
  - **Validates: Requirements 1.2**

- [ ]* 1.2 Write property test for game sorting
  - **Property 2: Game column ordering consistency**
  - **Validates: Requirements 1.3**

- [ ]* 1.3 Write property test for result cell mapping
  - **Property 4: Result cell mapping accuracy**
  - **Validates: Requirements 1.5, 6.1**

- [ ]* 1.4 Write property test for empty cell handling
  - **Property 5: Empty cell handling**
  - **Validates: Requirements 6.2**

- [x] 2. Create GameType filter component
  - Create GameTypeFilter component with checkbox group
  - Implement "Select All" / "Deselect All" functionality
  - Add visual count of selected gameTypes
  - Implement selection state management
  - Style with Tailwind CSS consistent with existing design
  - _Requirements: 2.1, 2.2, 2.5_

- [ ]* 2.1 Write property test for gameType filtering
  - **Property 3: GameType column visibility**
  - **Validates: Requirements 2.2**

- [ ]* 2.2 Write property test for default selection
  - **Property 8: Default gameType selection**
  - **Validates: Requirements 2.5**

- [ ]* 2.3 Write property test for filter preservation
  - **Property 6: Filter preservation**
  - **Validates: Requirements 2.4**

- [x] 3. Create PerformanceMatrix component structure
  - Create PerformanceMatrix component with props interface
  - Create MatrixHeader subcomponent for column headers
  - Create StudentRow subcomponent for each student row
  - Create ResultCell subcomponent for individual cells
  - Implement empty state handling
  - _Requirements: 1.1, 6.2_

- [x] 4. Implement matrix header rendering
  - Render student info column header
  - Render game column headers with event name and date
  - Implement gameType sub-headers under each game
  - Apply sticky positioning for header row
  - Style headers with appropriate hierarchy
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Implement student row rendering
  - Render student avatar with fallback placeholder
  - Render student name
  - Render student grade and class information
  - Apply sticky positioning for student info column
  - Implement zebra striping for rows
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Implement result cell rendering
  - Display result value in cells
  - Display position/ranking with trophy icons for top 3
  - Display validity status with visual indicators (borders/backgrounds)
  - Display reason codes for invalid results
  - Handle empty cells with placeholder
  - Add hover effects for interactivity
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Integrate matrix view into PerformanceManagement page
  - Remove statistics card from page layout
  - Add GameTypeFilter component above matrix
  - Replace existing table with PerformanceMatrix component
  - Wire up filter state management
  - Connect edit and delete handlers to matrix cells
  - Preserve existing filter functionality (date, student, event)
  - _Requirements: 3.1, 3.2, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 7.1 Write property test for statistics card removal
  - **Property 7: Statistics card removal**
  - **Validates: Requirements 3.1**

- [ ]* 7.2 Write unit tests for matrix component
  - Test matrix rendering with various data sizes
  - Test empty states
  - Test filter interactions
  - Test edit/delete actions

- [x] 8. Implement responsive behavior
  - Add horizontal scrolling for matrix
  - Ensure sticky columns work on all screen sizes
  - Test and adjust layout for tablet and mobile
  - Add touch-friendly interactions for mobile
  - _Requirements: 1.1_

- [x] 9. Add performance optimizations
  - Memoize matrix transformation with useMemo
  - Memoize student rows with React.memo
  - Add debouncing to filter changes (500ms)
  - Test performance with large datasets
  - _Requirements: 1.1_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
