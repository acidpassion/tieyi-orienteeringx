# Design Document

## Overview

The Performance Matrix View transforms the coach performance management page from a traditional list-based view to a comprehensive matrix/grid layout. This design enables coaches to view all students' performance across all games in a single, scannable view. The matrix uses students as rows and games as columns, with each game potentially spanning multiple columns for different gameTypes.

The key innovation is the pivot from a record-centric view to a student-game intersection view, allowing coaches to quickly identify patterns, gaps in participation, and comparative performance across the team.

## Architecture

### Component Structure

```
PerformanceManagement (Page)
├── Header (existing)
├── Filters (modified)
│   ├── Date Range Filter
│   ├── Student Name Filter
│   ├── Event Name Filter
│   └── GameType Checkbox Selector (new)
├── PerformanceMatrix (new component)
│   ├── MatrixHeader
│   │   ├── StudentColumnHeader
│   │   └── GameColumnHeaders
│   │       └── GameTypeSubHeaders
│   ├── MatrixBody
│   │   └── StudentRows
│   │       ├── StudentInfoCell
│   │       └── ResultCells
│   └── EmptyState
└── Action Modals (existing)
```

### Data Flow

1. **Data Fetching**: Existing API endpoint `/api/completion-records` with filters
2. **Data Transformation**: Transform flat records into matrix structure
3. **Matrix Rendering**: Render transformed data in grid layout
4. **Filter Updates**: Re-transform and re-render on filter changes

## Components and Interfaces

### PerformanceMatrix Component

```javascript
interface PerformanceMatrixProps {
  records: CompletionRecord[];
  students: Student[];
  selectedGameTypes: string[];
  onEditRecord: (record: CompletionRecord) => void;
  onDeleteRecord: (recordId: string) => void;
}
```

### Matrix Data Structure

```javascript
interface MatrixData {
  students: StudentRow[];
  games: GameColumn[];
}

interface StudentRow {
  studentId: string;
  name: string;
  grade: string;
  class: number;
  avatar: string;
  results: Map<string, ResultCell>; // key: `${eventName}_${gameType}`
}

interface GameColumn {
  eventName: string;
  eventDate: Date;
  gameTypes: string[];
}

interface ResultCell {
  result: string;
  position: number;
  validity: boolean;
  reason: string;
  score: number;
  recordId: string;
}
```

### GameType Filter Component

```javascript
interface GameTypeFilterProps {
  availableGameTypes: string[];
  selectedGameTypes: string[];
  onSelectionChange: (selectedTypes: string[]) => void;
}
```

## Data Models

### Existing Models (No Changes)

- **CompletionRecord**: Existing model with all fields
- **Student**: Existing model with grade, class, name, avatar

### Derived Data Structures

**Matrix Transformation Algorithm**:

```javascript
function transformToMatrix(records, students, selectedGameTypes) {
  // 1. Group records by student
  const recordsByStudent = groupBy(records, 'name');
  
  // 2. Extract unique games and sort by date
  const games = extractUniqueGames(records)
    .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
  
  // 3. For each game, extract gameTypes and filter by selection
  games.forEach(game => {
    game.gameTypes = extractGameTypes(records, game.eventName)
      .filter(gt => selectedGameTypes.includes(gt));
  });
  
  // 4. Create student rows sorted by grade
  const studentRows = students
    .sort(compareByGrade)
    .map(student => ({
      ...student,
      results: createResultsMap(recordsByStudent[student.name], games)
    }));
  
  return { students: studentRows, games };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Student row ordering consistency
*For any* set of students, when displayed in the matrix, students should be ordered by grade in ascending order (初一 < 初二 < 初三 < 高一 < 高二 < 高三 < 已毕业队员), and within the same grade, ordered by class number in ascending order.
**Validates: Requirements 1.2**

### Property 2: Game column ordering consistency
*For any* set of games, when displayed in the matrix, games should be ordered by eventDate from earliest to latest.
**Validates: Requirements 1.3**

### Property 3: GameType column visibility
*For any* gameType selection state, only gameTypes that are selected in the checkbox filter should appear as columns in the matrix.
**Validates: Requirements 2.2**

### Property 4: Result cell mapping accuracy
*For any* student and game combination, if a completion record exists for that student, event, and gameType, then the corresponding matrix cell should display that record's result data.
**Validates: Requirements 1.5, 6.1**

### Property 5: Empty cell handling
*For any* student and game combination, if no completion record exists for that student, event, and gameType, then the corresponding matrix cell should be empty or display a placeholder.
**Validates: Requirements 6.2**

### Property 6: Filter preservation
*For any* change to gameType selection, the student row order and game column order should remain unchanged.
**Validates: Requirements 2.4**

### Property 7: Statistics card removal
*For any* page load, the statistics card showing total records, valid records, participating students, and competition events should not be rendered.
**Validates: Requirements 3.1**

### Property 8: Default gameType selection
*For any* initial page load, all available gameTypes should be selected by default in the checkbox filter.
**Validates: Requirements 2.5**

## Error Handling

### Data Loading Errors
- Display error toast notification
- Show empty state with retry option
- Preserve existing data if refresh fails

### Empty States
- **No records**: Display message "暂无参赛记录" with add button
- **No students**: Display message "暂无学生数据"
- **No games after filtering**: Display message "没有符合筛选条件的比赛"
- **No gameTypes selected**: Display message "请至少选择一个比赛项目"

### Performance Considerations
- **Large datasets**: Implement virtual scrolling if matrix exceeds 100 rows
- **Many columns**: Enable horizontal scrolling with sticky student column
- **Debounce filters**: 500ms debounce on filter changes to prevent excessive re-renders

## Testing Strategy

### Unit Tests
- Test matrix transformation logic with various record combinations
- Test student sorting by grade and class
- Test game sorting by date
- Test result cell mapping
- Test gameType filtering logic
- Test empty state conditions

### Property-Based Tests
Property-based tests will use the `fast-check` library for JavaScript/React. Each test should run a minimum of 100 iterations.

Each property-based test must be tagged with a comment explicitly referencing the correctness property in this design document using the format: `**Feature: performance-matrix-view, Property {number}: {property_text}**`

**Test Configuration**:
- Library: `fast-check` (npm package)
- Minimum iterations: 100
- Test file location: `client/src/pages/coach/__tests__/PerformanceManagement.pbt.test.jsx`

**Property Test Specifications**:

1. **Property 1 Test**: Generate random student arrays with various grades and classes, verify sorting order
2. **Property 2 Test**: Generate random game arrays with various dates, verify chronological order
3. **Property 3 Test**: Generate random gameType selections, verify only selected types appear in matrix
4. **Property 4 Test**: Generate random records, verify each record appears in correct matrix cell
5. **Property 5 Test**: Generate random student-game combinations without records, verify empty cells
6. **Property 6 Test**: Generate random gameType selection changes, verify row/column order stability
7. **Property 7 Test**: Verify statistics card is not rendered in DOM
8. **Property 8 Test**: Verify all gameTypes selected on initial render

### Integration Tests
- Test full page render with real data
- Test filter interactions
- Test edit/delete actions from matrix cells
- Test responsive behavior

### Visual Regression Tests
- Capture matrix layout with various data sizes
- Test horizontal scrolling behavior
- Test sticky column behavior

## Implementation Notes

### Responsive Design
- **Desktop (>1024px)**: Full matrix with horizontal scroll
- **Tablet (768-1024px)**: Scrollable matrix with sticky student column
- **Mobile (<768px)**: Consider alternative view or horizontal scroll with pinch-zoom

### Accessibility
- Use semantic table elements (`<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`)
- Add ARIA labels for screen readers
- Ensure keyboard navigation works for scrolling
- Maintain sufficient color contrast for result indicators

### Performance Optimizations
- Memoize matrix transformation with `useMemo`
- Memoize student rows with `React.memo`
- Use CSS Grid or Table for efficient rendering
- Implement virtual scrolling for large datasets (>100 students)

### Styling Approach
- Use Tailwind CSS classes (consistent with existing codebase)
- Sticky positioning for student column and header row
- Zebra striping for better row readability
- Hover effects on cells for interactivity
- Visual indicators for validity status (green/red borders or backgrounds)
- Position badges (trophy icons) for top 3 positions

### GameType Filter UI
- Checkbox group above matrix
- Horizontal layout with wrap
- "Select All" / "Deselect All" buttons
- Visual count of selected types
- Smooth transition when columns appear/disappear
