/**
 * Matrix transformation utilities for Performance Management
 * Transforms flat completion records into a matrix structure for display
 */

/**
 * Grade order for sorting students
 */
const GRADE_ORDER = {
  '初一': 1,
  '初二': 2,
  '初三': 3,
  '高一': 4,
  '高二': 5,
  '高三': 6,
  '已毕业队员': 7
};

/**
 * Compare two students by grade and class for sorting
 * @param {Object} a - First student
 * @param {Object} b - Second student
 * @returns {number} - Comparison result
 */
export function compareByGrade(a, b) {
  const gradeA = GRADE_ORDER[a.grade] || 999;
  const gradeB = GRADE_ORDER[b.grade] || 999;
  
  if (gradeA !== gradeB) {
    return gradeA - gradeB;
  }
  
  // If same grade, sort by class number
  return (a.class || 0) - (b.class || 0);
}

/**
 * Extract unique games from records and sort by date
 * @param {Array} records - Completion records
 * @returns {Array} - Sorted array of unique games
 */
export function extractUniqueGames(records) {
  const gamesMap = new Map();
  
  records.forEach(record => {
    const key = record.eventName;
    if (!gamesMap.has(key)) {
      gamesMap.set(key, {
        eventName: record.eventName,
        eventDate: record.eventDate,
        eventType: record.eventType
      });
    } else {
      // If we already have this event, use the earliest date
      const existing = gamesMap.get(key);
      if (new Date(record.eventDate) < new Date(existing.eventDate)) {
        existing.eventDate = record.eventDate;
      }
    }
  });
  
  return Array.from(gamesMap.values())
    .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
}

/**
 * Extract gameTypes for a specific game
 * @param {Array} records - Completion records
 * @param {string} eventName - Event name to filter by
 * @returns {Array} - Array of unique gameTypes for the event
 */
export function extractGameTypes(records, eventName) {
  const gameTypesSet = new Set();
  
  records.forEach(record => {
    if (record.eventName === eventName) {
      gameTypesSet.add(record.gameType);
    }
  });
  
  return Array.from(gameTypesSet);
}

/**
 * Create a results map for a student
 * @param {Array} studentRecords - Records for a specific student
 * @param {Array} games - Array of game objects with gameTypes
 * @returns {Map} - Map of results keyed by `${eventName}_${gameType}`
 */
export function createResultsMap(studentRecords = [], games = []) {
  const resultsMap = new Map();
  
  if (!studentRecords || studentRecords.length === 0) {
    return resultsMap;
  }
  
  studentRecords.forEach(record => {
    const key = `${record.eventName}_${record.gameType}`;
    resultsMap.set(key, {
      result: record.result,
      position: record.position,
      validity: record.validity,
      reason: record.reason,
      score: record.score,
      recordId: record._id,
      groupName: record.groupName
    });
  });
  
  return resultsMap;
}

/**
 * Group records by student name
 * @param {Array} records - Completion records
 * @returns {Object} - Object with student names as keys and arrays of records as values
 */
export function groupByStudent(records) {
  const grouped = {};
  
  records.forEach(record => {
    if (!grouped[record.name]) {
      grouped[record.name] = [];
    }
    grouped[record.name].push(record);
  });
  
  return grouped;
}

/**
 * Transform flat records into matrix structure
 * @param {Array} records - Completion records
 * @param {Array} students - Student objects
 * @param {Array} selectedGameTypes - Array of selected gameType strings
 * @returns {Object} - Matrix data with students and games
 */
export function transformToMatrix(records, students, selectedGameTypes) {
  // 1. Group records by student
  const recordsByStudent = groupByStudent(records);
  
  // 2. Extract unique games and sort by date
  const games = extractUniqueGames(records);
  
  // 3. For each game, extract gameTypes and filter by selection
  games.forEach(game => {
    const allGameTypes = extractGameTypes(records, game.eventName);
    game.gameTypes = allGameTypes.filter(gt => selectedGameTypes.includes(gt));
  });
  
  // 4. Create student rows sorted by grade
  const studentRows = students
    .sort(compareByGrade)
    .map(student => ({
      studentId: student._id,
      name: student.name,
      grade: student.grade,
      class: student.class,
      avatar: student.avatar,
      gender: student.gender,
      results: createResultsMap(recordsByStudent[student.name], games)
    }));
  
  return { students: studentRows, games };
}

/**
 * Get all unique gameTypes from records
 * @param {Array} records - Completion records
 * @returns {Array} - Array of unique gameType strings
 */
export function getAllGameTypes(records) {
  const gameTypesSet = new Set();
  
  records.forEach(record => {
    if (record.gameType) {
      gameTypesSet.add(record.gameType);
    }
  });
  
  return Array.from(gameTypesSet).sort();
}
