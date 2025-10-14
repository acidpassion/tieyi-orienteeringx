# Match Data Loading Feature Implementation

## Overview
Added functionality to load match information and results from external API (verymuchsport.cn) and store them in existing `match_ref` and `match_result` collections.

## Changes Made

### 1. Database Models

#### File: `backend/models/MatchRef.js`
- **Created model for existing `match_ref` collection**
- **Schema**:
  ```javascript
  {
    gameId: String (required, indexed),
    name: String (required, indexed),
    data: Mixed (complete API response data),
    timestamps: true
  }
  ```
- **Indexes**: Compound unique index on `gameId + name` for duplication checking

#### File: `backend/models/MatchResult.js`
- **Created model for existing `match_result` collection**
- **Schema**:
  ```javascript
  {
    gameId: String (required, indexed),
    id: String (required, indexed),
    data: Mixed (complete API response data),
    timestamps: true
  }
  ```
- **Indexes**: Compound unique index on `gameId + id` for duplication checking

### 2. Backend API Endpoint

#### File: `backend/routes/matchData.js`
- **New endpoint**: `POST /api/match-data/load/{externalGameId}`
- **Authentication**: Requires coach token
- **Functionality**:

**Step 1: Load Match Info**
- Calls: `https://api.verymuchsport.cn/app-api/match/game/info/{externalGameId}`
- Validates response status (200) and code (0)
- Extracts `gameId` and `name` from response data
- Upserts record in `match_ref` collection

**Step 2: Load Match Results**
- Calls: `https://api.verymuchsport.cn/app-api/match/game/runner/list?gameId={externalGameId}`
- Validates response status (200) and code (0)
- Processes array or single object results
- Upserts records in `match_result` collection using `gameId + id`

**Error Handling**:
- Network timeouts (10s for info, 15s for results)
- API errors (404, invalid responses)
- Partial success (info loaded but results failed)
- Individual result processing errors

**Response Format**:
```json
{
  "success": true,
  "message": "比赛信息加载成功，共处理 X 条成绩记录",
  "data": {
    "matchRef": {...},
    "resultsCount": 123
  }
}
```

#### File: `backend/server.js`
- **Added route registration**: `app.use('/api/match-data', matchDataRoutes)`

### 3. Frontend UI Enhancement

#### File: `client/src/pages/coach/EventEdit.jsx`

**New Features**:
1. **Load Button**: Added "加载比赛信息" button next to external game ID input
2. **Loading States**: Individual loading state for each game type
3. **Handler Function**: `handleLoadMatchData()` to call the API

**UI Changes**:
- **Button Placement**: Right side of external game ID input field
- **Button States**:
  - Disabled when no external game ID entered
  - Loading spinner during API call
  - Success/error toast notifications

**Button Features**:
- **Icon**: Download icon from lucide-react
- **Loading State**: Spinner animation with "加载中..." text
- **Disabled State**: When external game ID is empty or loading
- **Responsive**: Maintains layout on different screen sizes

## How to Use

### For Coaches:

1. **Navigate to Event Edit Page**
   - Go to `/coach/events/{eventId}` for existing events
   - Go to "赛事设置" (Settings) tab

2. **Configure Game Types**
   - Select the game types for your event
   - Enter the external game ID provided by the organizer

3. **Load Match Data**
   - Click the "加载比赛信息" button next to the external game ID field
   - System will fetch match info and results from external API
   - Success/error messages will be displayed via toast notifications

4. **Data Storage**
   - Match information is stored in `match_ref` collection
   - Results data is stored in `match_result` collection
   - Duplicate records are automatically updated

## API Integration Details

### External API Endpoints

**Match Info API**:
- **URL**: `https://api.verymuchsport.cn/app-api/match/game/info/{externalGameId}`
- **Method**: GET
- **Response**: `{"code": 0, "data": {...}}`

**Results API**:
- **URL**: `https://api.verymuchsport.cn/app-api/match/game/runner/list?gameId={externalGameId}`
- **Method**: GET
- **Response**: `{"code": 0, "data": [...]}`

### Data Processing

**Match Reference Data**:
- Uses `gameId` and `name` from API response for duplication checking
- Stores all API response fields directly in the document (flattened structure)
- Updates existing records if found

**Results Data**:
- Processes array of results or single result object
- Uses `gameId` (from URL parameter) and `id` (from result) for duplication checking
- Stores all result fields directly in the document (flattened structure)
- Skips results without `id` field

## Error Handling

### Frontend
- **Validation**: Checks if external game ID is entered before API call
- **Loading States**: Visual feedback during API calls
- **Toast Notifications**: Success and error messages
- **Network Errors**: Graceful handling of connection issues

### Backend
- **API Timeouts**: 10s for match info, 15s for results
- **Response Validation**: Checks status codes and response structure
- **Partial Success**: Continues processing even if results API fails
- **Database Errors**: Logs errors but continues processing other records
- **Comprehensive Logging**: All operations logged for debugging

## Database Schema

### match_ref Collection
```javascript
{
  _id: ObjectId,
  gameId: "external-game-id",
  name: "比赛名称",
  // All fields from external API response are stored directly
  // (no nested 'data' field)
  // ... other fields from external API like:
  // eventName: "...",
  // startTime: "...",
  // location: "...",
  createdAt: Date,
  updatedAt: Date
}
```

### match_result Collection
```javascript
{
  _id: ObjectId,
  gameId: "external-game-id",
  id: "result-id-from-api",
  // All fields from external API result are stored directly
  // (no nested 'data' field)
  // ... other fields from external API like:
  // name: "...",
  // time: "...",
  // rank: "...",
  createdAt: Date,
  updatedAt: Date
}
```

## Testing Recommendations

1. **Valid External Game ID**: Test with a known valid external game ID
2. **Invalid Game ID**: Test error handling with invalid/non-existent ID
3. **Network Issues**: Test timeout and connection error scenarios
4. **Duplicate Data**: Verify that duplicate records are updated, not duplicated
5. **Partial Failures**: Test scenarios where match info loads but results fail
6. **UI States**: Verify loading states, button disabled states, and toast messages
7. **Multiple Game Types**: Test loading data for multiple game types in same event

## Future Enhancements

1. **Data Synchronization**: Periodic updates of match results
2. **Result Mapping**: Map external results to internal completion records
3. **Bulk Operations**: Load data for multiple game types at once
4. **Data Validation**: Validate external data structure before storing
5. **Caching**: Cache frequently accessed match data
6. **Analytics**: Track API usage and success rates