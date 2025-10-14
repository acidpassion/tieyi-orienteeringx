# Team ID Field Update

## Overview
Added a new `teamId` field to the CompletionRecord collection to store relay team IDs for team-based games.

## Changes Made

### 1. CompletionRecord Model Update
- **File**: `backend/models/CompletionRecord.js`
- **Change**: Added `teamId` field as optional String type
- **Purpose**: Store team ID for relay/team games to enable team-based analysis

```javascript
teamId: {
  type: String,
  required: false // 可选字段，存储接力赛中的队伍ID
}
```

### 2. Match Data Conversion Logic Update
- **File**: `backend/routes/matchData.js`
- **Change**: Updated completion record creation to include teamId
- **Logic**: Only set teamId when `result.teamId > 0` (indicating a relay game)

```javascript
teamId: (result.teamId && result.teamId > 0) ? result.teamId.toString() : null
```

### 3. Database Migration
- **File**: `backend/migrations/add-team-id-field.js`
- **Purpose**: Add teamId field to existing completion records
- **Default Value**: `null` for all existing records

## Usage

### For Individual Games
- `teamId` will be `null`
- No change in existing functionality

### For Relay/Team Games
- `teamId` will contain the team ID as a string
- Enables grouping and analysis by team
- Maintains individual member records while preserving team association

## Database Impact

- **New Field**: `teamId` (String, optional)
- **Existing Data**: All existing records will have `teamId: null`
- **New Records**: Will have appropriate teamId for relay games, null for individual games

## Frontend Impact

- **Current**: No frontend changes required
- **Future**: Can use teamId for team-based filtering and analysis
- **Backward Compatibility**: Maintained (field is optional)

## Migration Instructions

1. Run the migration to add the field to existing records:
   ```bash
   node backend/migrations/add-team-id-field.js
   ```

2. The migration will:
   - Add `teamId: null` to all existing completion records
   - Provide rollback capability if needed

## Benefits

1. **Team Analysis**: Enable team-based performance analysis
2. **Data Integrity**: Maintain relationship between team members
3. **Future Features**: Support for team rankings and statistics
4. **Backward Compatibility**: No breaking changes to existing functionality