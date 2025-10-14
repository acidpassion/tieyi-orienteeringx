# External Game ID Feature Implementation

## Overview
Added `externalGameId` field to the gameTypes structure in events to store external game identifiers from organizers. This field will be used later to pull results from external systems.

## Changes Made

### 1. Backend Model Changes

#### File: `backend/models/Event.js`
- **Added `externalGameId` field to gameTypeSchema**:
  ```javascript
  externalGameId: {
    type: String,
    trim: true,
    default: ''
  }
  ```

### 2. API Documentation Updates

#### File: `backend/routes/events.js`
- **Updated Swagger documentation** to include the new `externalGameId` field in gameTypes schema
- The field is documented as a string type in the API specification

### 3. Frontend UI Changes

#### File: `client/src/pages/coach/EventEdit.jsx`

**New Features Added:**
1. **External Game ID Input Field**
   - Added input field for each selected game type
   - Appears below team size input (for relay games) or directly under the game type checkbox
   - Includes helpful placeholder text and description

2. **Handler Functions**
   - `handleExternalGameIdChange()`: Updates the externalGameId for a specific game type
   - Updated `handleGameTypeToggle()`: Initializes externalGameId as empty string for new game types
   - Updated data fetching logic to handle backward compatibility

3. **UI Improvements**
   - Clean, consistent styling with existing form elements
   - Helpful description text explaining the purpose of the field
   - Proper spacing and layout integration

### 4. Database Migration

#### File: `backend/migrations/add-external-game-id.js`
- **Created migration script** to update existing events
- Handles both old string format and new object format game types
- Adds empty `externalGameId` field to all existing game types
- Added npm script: `npm run migrate:externalGameId`

**Migration Results:**
- ✅ Successfully processed 17 events
- ✅ Updated 14 events that needed the new field
- ✅ 3 events were already up-to-date

### 5. Package.json Updates

#### File: `backend/package.json`
- Added new migration script: `"migrate:externalGameId": "node migrations/add-external-game-id.js"`

## How to Use

### For Coaches/Administrators:

1. **Navigate to Event Edit Page**
   - Go to `/coach/events/{eventId}` for existing events
   - Or create a new event at `/coach/events/new`

2. **Configure Game Types**
   - Go to the "赛事设置" (Settings) tab
   - Select the game types for your event
   - For each selected game type, you'll see an "外部项目ID" field

3. **Enter External Game IDs**
   - Input the game ID provided by the event organizer
   - This is typically a GUID or unique string identifier
   - Leave blank if not provided by organizer

4. **Save Event**
   - The external game IDs will be saved with the event
   - Can be updated later as needed

### For Developers:

**Accessing External Game IDs:**
```javascript
// In event object
event.gameTypes.forEach(gameType => {
  console.log(`Game Type: ${gameType.name}`);
  console.log(`External ID: ${gameType.externalGameId}`);
  if (gameType.teamSize) {
    console.log(`Team Size: ${gameType.teamSize}`);
  }
});
```

**API Response Structure:**
```json
{
  "gameTypes": [
    {
      "name": "短距离",
      "externalGameId": "abc123-def456-ghi789",
      "teamSize": null
    },
    {
      "name": "接力",
      "externalGameId": "xyz789-uvw456-rst123",
      "teamSize": 3
    }
  ]
}
```

## Technical Details

### Data Structure
- **Field Type**: String
- **Default Value**: Empty string ('')
- **Validation**: Trimmed whitespace
- **Required**: No (optional field)

### Backward Compatibility
- ✅ Existing events continue to work
- ✅ Old string-format game types are automatically converted
- ✅ Migration handles all edge cases

### Future Integration Points
This field is designed to be used for:
1. **Result Import**: Pull results from organizer systems using the external game ID
2. **Data Synchronization**: Match local game types with external systems
3. **API Integration**: Connect with third-party result management systems

## Testing Recommendations

1. **Create New Event**: Verify external game ID fields appear and save correctly
2. **Edit Existing Event**: Confirm existing events load properly with new field
3. **Game Type Toggle**: Test adding/removing game types preserves external IDs
4. **Data Persistence**: Verify external IDs are saved and retrieved correctly
5. **Migration Verification**: Check that migrated events have the new field structure

## Notes

- The field is optional and can be left blank
- Designed to accommodate various external ID formats (GUIDs, strings, etc.)
- UI provides clear context about the field's purpose
- Migration script can be run multiple times safely (idempotent)