const Event = require('../models/Event');
const Student = require('../models/Student');

/**
 * Find event by eventName with case-insensitive matching
 * @param {string} eventName - The event name to search for
 * @returns {Promise<Object>} Event object or null if not found
 */
async function findEventByName(eventName) {
  try {
    if (!eventName || typeof eventName !== 'string') {
      throw new Error('Event name is required and must be a string');
    }

    const trimmedEventName = eventName.trim();
    if (trimmedEventName.length === 0) {
      throw new Error('Event name cannot be empty');
    }

    // Case-insensitive search using regex
    const event = await Event.findOne({
      eventName: { $regex: new RegExp(`^${trimmedEventName}$`, 'i') }
    });

    return event;
  } catch (error) {
    throw new Error(`Error finding event: ${error.message}`);
  }
}

/**
 * Find student by name with exact matching
 * @param {string} studentName - The student name to search for
 * @returns {Promise<Object>} Student object or null if not found
 */
async function findStudentByName(studentName) {
  try {
    if (!studentName || typeof studentName !== 'string') {
      throw new Error('Student name is required and must be a string');
    }

    // Trim whitespace and handle name variations
    const trimmedName = studentName.trim();
    if (trimmedName.length === 0) {
      throw new Error('Student name cannot be empty');
    }

    // Exact matching with trimmed whitespace
    const student = await Student.findOne({
      name: trimmedName
    });

    return student;
  } catch (error) {
    throw new Error(`Error finding student: ${error.message}`);
  }
}

/**
 * Parse comma-separated gameTypes string and validate against event gameTypes
 * @param {string} gameTypesStr - Comma-separated game types string
 * @param {Array} eventGameTypes - Array of valid gameTypes from the event
 * @returns {Object} Parsed and validated gameTypes with success status
 */
function parseAndValidateGameTypes(gameTypesStr, eventGameTypes = []) {
  try {
    if (!gameTypesStr || typeof gameTypesStr !== 'string') {
      return {
        success: false,
        gameTypes: [],
        errors: ['Game types string is required and must be a string']
      };
    }

    // Parse comma-separated gameTypes string
    const parsedGameTypes = parseGameTypesString(gameTypesStr);
    
    if (parsedGameTypes.length === 0) {
      return {
        success: false,
        gameTypes: [],
        errors: ['No valid game types found in the provided string']
      };
    }

    // Validate gameType names against event standards
    const validationResult = validateGameTypeNames(parsedGameTypes, eventGameTypes);
    
    return validationResult;
  } catch (error) {
    return {
      success: false,
      gameTypes: [],
      errors: [`Error parsing game types: ${error.message}`]
    };
  }
}

/**
 * Parse comma-separated gameTypes string
 * @param {string} gameTypesStr - Comma-separated game types
 * @returns {Array<string>} Array of cleaned game type names
 */
function parseGameTypesString(gameTypesStr) {
  if (!gameTypesStr) return [];
  
  // Convert to string and handle quoted values
  const str = gameTypesStr.toString().trim();
  
  // Remove outer quotes if present (both single and double quotes)
  const cleanStr = str.replace(/^["']|["']$/g, '');
  
  // Split by comma and clean each item
  return cleanStr
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(item => {
      // Remove any remaining quotes around individual items
      return item.replace(/^["']|["']$/g, '');
    });
}

/**
 * Validate gameType names against system standards
 * @param {Array<string>} gameTypeNames - Array of game type names to validate
 * @param {Array} eventGameTypes - Array of valid gameTypes from the event
 * @returns {Object} Validation result with success status and errors
 */
function validateGameTypeNames(gameTypeNames, eventGameTypes = []) {
  const errors = [];
  const validGameTypes = [];
  
  // Create a list of valid gameType names from the event
  const validEventGameTypeNames = eventGameTypes.map(gt => {
    if (typeof gt === 'string') {
      return gt;
    } else if (gt && gt.name) {
      return gt.name;
    }
    return null;
  }).filter(name => name !== null);

  // Validate each gameType name
  gameTypeNames.forEach(gameTypeName => {
    // Basic validation - check if name is not empty
    if (!gameTypeName || gameTypeName.trim().length === 0) {
      errors.push('Game type name cannot be empty');
      return;
    }

    const trimmedName = gameTypeName.trim();
    
    // Validate against event gameTypes if provided
    if (validEventGameTypeNames.length > 0) {
      const isValidGameType = validEventGameTypeNames.some(validName => 
        validName.toLowerCase() === trimmedName.toLowerCase()
      );
      
      if (!isValidGameType) {
        errors.push(`Invalid game type: "${trimmedName}". Valid options: ${validEventGameTypeNames.join(', ')}`);
        return;
      }
    }
    
    // Additional validation for common gameType patterns
    if (!isValidGameTypePattern(trimmedName)) {
      errors.push(`Game type "${trimmedName}" does not match expected patterns`);
      return;
    }
    
    validGameTypes.push(trimmedName);
  });

  return {
    success: errors.length === 0,
    gameTypes: validGameTypes,
    errors: errors
  };
}

/**
 * Check if gameType name matches expected patterns
 * @param {string} gameTypeName - Game type name to validate
 * @returns {boolean} True if valid pattern
 */
function isValidGameTypePattern(gameTypeName) {
  if (!gameTypeName || typeof gameTypeName !== 'string') {
    return false;
  }

  const name = gameTypeName.trim();
  
  // Allow common Chinese characters and patterns for orienteering game types
  const validPatterns = [
    /^[a-zA-Z\u4e00-\u9fff\d\s\-_]+$/, // Chinese characters, letters, numbers, spaces, hyphens, underscores
  ];
  
  // Check if name matches any valid pattern
  const matchesPattern = validPatterns.some(pattern => pattern.test(name));
  
  // Additional length validation
  const isValidLength = name.length >= 1 && name.length <= 50;
  
  return matchesPattern && isValidLength;
}

module.exports = {
  findEventByName,
  findStudentByName,
  parseAndValidateGameTypes,
  parseGameTypesString,
  validateGameTypeNames,
  isValidGameTypePattern
};