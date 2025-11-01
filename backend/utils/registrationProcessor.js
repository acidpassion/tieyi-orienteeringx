const EventRegistration = require('../models/EventRegistration');
const { findEventByName, findStudentByName } = require('./registrationValidator');

/**
 * Create EventRegistration record with proper schema
 * @param {Object} registrationData - Registration data from parsed file
 * @param {string} registrationData.eventName - Event name
 * @param {string} registrationData.studentName - Student name
 * @param {string} registrationData.groupName - Group name
 * @param {Array<string>} registrationData.gameTypes - Array of game type names
 * @returns {Promise<Object>} Result with success status and created registration or error
 */
async function createRegistrationRecord(registrationData) {
  try {
    const { eventName, studentName, groupName, gameTypes } = registrationData;

    // Validate input data
    if (!eventName || !studentName || !groupName || !gameTypes || !Array.isArray(gameTypes)) {
      throw new Error('Missing required registration data fields');
    }

    // Find event by name
    const event = await findEventByName(eventName);
    if (!event) {
      throw new Error(`Event not found: ${eventName}`);
    }

    // Find student by name
    const student = await findStudentByName(studentName);
    if (!student) {
      throw new Error(`Student not found: ${studentName}`);
    }

    // Create gameTypes array with proper schema
    const formattedGameTypes = gameTypes.map(gameTypeName => ({
      name: gameTypeName.trim(),
      group: groupName.trim(),
      difficultyGrade: '', // Empty as specified in requirements
      team: {
        members: [] // Empty array as specified in requirements
      }
    }));

    // Create EventRegistration object
    const registrationRecord = {
      eventId: event._id,
      studentId: student._id,
      gameTypes: formattedGameTypes,
      status: 'confirmed', // Set status to "confirmed" as specified
      registeredAt: new Date() // Set to current time as specified
    };

    return {
      success: true,
      registration: registrationRecord,
      eventId: event._id,
      studentId: student._id,
      studentName: student.name
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      studentName: registrationData.studentName || 'Unknown'
    };
  }
}

/**
 * Check for existing EventRegistration record and handle duplicates
 * @param {string} eventId - Event ID
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Existing registration or null
 */
async function findExistingRegistration(eventId, studentId) {
  try {
    const existingRegistration = await EventRegistration.findOne({
      eventId: eventId,
      studentId: studentId
    });

    return existingRegistration;
  } catch (error) {
    throw new Error(`Error finding existing registration: ${error.message}`);
  }
}

/**
 * Merge gameTypes arrays when updating existing registration
 * @param {Array} existingGameTypes - Current gameTypes in the registration
 * @param {Array} newGameTypes - New gameTypes to merge
 * @returns {Array} Merged gameTypes array without duplicates
 */
function mergeGameTypes(existingGameTypes, newGameTypes) {
  const merged = [...existingGameTypes];
  
  newGameTypes.forEach(newGameType => {
    // Check if gameType with same name and group already exists
    const existingIndex = merged.findIndex(existing => 
      existing.name === newGameType.name && existing.group === newGameType.group
    );
    
    if (existingIndex === -1) {
      // Add new gameType if it doesn't exist
      merged.push(newGameType);
    } else {
      // Update existing gameType (preserve existing data but update with new info)
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...newGameType,
        // Preserve existing team data if it has members
        team: merged[existingIndex].team && merged[existingIndex].team.members && merged[existingIndex].team.members.length > 0
          ? merged[existingIndex].team
          : newGameType.team
      };
    }
  });
  
  return merged;
}

/**
 * Update existing EventRegistration record instead of creating duplicate
 * @param {Object} existingRegistration - Existing registration document
 * @param {Array} newGameTypes - New gameTypes to merge
 * @returns {Promise<Object>} Updated registration record
 */
async function updateExistingRegistration(existingRegistration, newGameTypes) {
  try {
    // Merge gameTypes arrays
    const mergedGameTypes = mergeGameTypes(existingRegistration.gameTypes, newGameTypes);
    
    // Update the registration
    existingRegistration.gameTypes = mergedGameTypes;
    existingRegistration.registeredAt = new Date(); // Update timestamp
    
    const updatedRegistration = await existingRegistration.save();
    
    return {
      success: true,
      registration: updatedRegistration,
      isUpdate: true
    };
  } catch (error) {
    throw new Error(`Error updating existing registration: ${error.message}`);
  }
}

/**
 * Process multiple registrations in batches for performance
 * @param {Array} registrationDataArray - Array of registration data from parsed file
 * @param {number} batchSize - Number of registrations to process per batch (default: 10)
 * @returns {Promise<Object>} Processing result with success/error counts and details
 */
async function processBatchRegistrations(registrationDataArray, batchSize = 10) {
  const results = {
    totalProcessed: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
    createdRegistrations: [],
    updatedRegistrations: []
  };

  if (!Array.isArray(registrationDataArray) || registrationDataArray.length === 0) {
    return {
      ...results,
      success: false,
      message: 'No registration data provided'
    };
  }

  // Process registrations in batches
  for (let i = 0; i < registrationDataArray.length; i += batchSize) {
    const batch = registrationDataArray.slice(i, i + batchSize);
    
    // Process each registration in the current batch
    const batchPromises = batch.map(async (registrationData, batchIndex) => {
      const rowNumber = i + batchIndex + 1; // Calculate actual row number
      
      try {
        // Create registration record
        const createResult = await createRegistrationRecord(registrationData);
        
        if (!createResult.success) {
          return {
            success: false,
            row: rowNumber,
            studentName: createResult.studentName,
            error: createResult.error
          };
        }

        // Check for existing registration
        const existingRegistration = await findExistingRegistration(
          createResult.eventId,
          createResult.studentId
        );

        let finalResult;
        
        if (existingRegistration) {
          // Update existing registration
          const updateResult = await updateExistingRegistration(
            existingRegistration,
            createResult.registration.gameTypes
          );
          
          finalResult = {
            success: true,
            row: rowNumber,
            studentName: createResult.studentName,
            registration: updateResult.registration,
            isUpdate: true
          };
        } else {
          // Create new registration
          const newRegistration = new EventRegistration(createResult.registration);
          const savedRegistration = await newRegistration.save();
          
          finalResult = {
            success: true,
            row: rowNumber,
            studentName: createResult.studentName,
            registration: savedRegistration,
            isUpdate: false
          };
        }

        return finalResult;

      } catch (error) {
        return {
          success: false,
          row: rowNumber,
          studentName: registrationData.studentName || 'Unknown',
          error: error.message
        };
      }
    });

    // Wait for all registrations in the current batch to complete
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Collect results from the batch
    batchResults.forEach((result) => {
      results.totalProcessed++;
      
      if (result.status === 'fulfilled' && result.value.success) {
        results.successCount++;
        
        if (result.value.isUpdate) {
          results.updatedRegistrations.push({
            row: result.value.row,
            studentName: result.value.studentName,
            registrationId: result.value.registration._id
          });
        } else {
          results.createdRegistrations.push({
            row: result.value.row,
            studentName: result.value.studentName,
            registrationId: result.value.registration._id
          });
        }
      } else {
        results.errorCount++;
        
        const errorInfo = result.status === 'fulfilled' 
          ? result.value 
          : {
              row: 'Unknown',
              studentName: 'Unknown',
              error: result.reason?.message || 'Unknown error'
            };
            
        results.errors.push({
          row: errorInfo.row,
          studentName: errorInfo.studentName,
          error: errorInfo.error
        });
      }
    });
  }

  // Generate summary message
  const successMessage = results.successCount > 0 
    ? `Successfully processed ${results.successCount} registrations (${results.createdRegistrations.length} created, ${results.updatedRegistrations.length} updated)`
    : '';
    
  const errorMessage = results.errorCount > 0 
    ? `${results.errorCount} registrations failed`
    : '';
    
  const message = [successMessage, errorMessage].filter(msg => msg).join('. ');

  return {
    ...results,
    success: results.errorCount === 0,
    message: message || 'Processing completed'
  };
}

/**
 * Generate detailed error report with row numbers and specific error messages
 * @param {Array} errors - Array of error objects with row, studentName, and error
 * @returns {Object} Formatted error report
 */
function generateErrorReport(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return {
      hasErrors: false,
      errorCount: 0,
      summary: 'No errors found',
      details: []
    };
  }

  // Group errors by type for better reporting
  const errorsByType = {};
  errors.forEach(error => {
    const errorType = error.error.split(':')[0] || 'Unknown Error';
    if (!errorsByType[errorType]) {
      errorsByType[errorType] = [];
    }
    errorsByType[errorType].push(error);
  });

  const summary = Object.keys(errorsByType).map(errorType => 
    `${errorType}: ${errorsByType[errorType].length} occurrences`
  ).join('; ');

  return {
    hasErrors: true,
    errorCount: errors.length,
    summary: summary,
    details: errors,
    errorsByType: errorsByType
  };
}

module.exports = {
  createRegistrationRecord,
  findExistingRegistration,
  mergeGameTypes,
  updateExistingRegistration,
  processBatchRegistrations,
  generateErrorReport
};