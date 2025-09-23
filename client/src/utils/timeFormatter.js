/**
 * Time formatting utilities for handling time input and display
 */

/**
 * Helper function to format time input as HH:MM:SS.S
 * Converts sequential digit input (e.g., "0030205") to formatted time ("00:30:20.5")
 * @param {string} value - The input value to format
 * @returns {string} - Formatted time string in HH:MM:SS.S format
 */
export const formatTimeInput = (value) => {
  // If already in correct format, return as is
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.[0-9]$/;
  if (timeRegex.test(value)) {
    return value;
  }
  
  // Remove all non-digit characters to get pure digits
  const digits = value.replace(/\D/g, '');
  
  // Handle sequential digit input (e.g., "0030205" -> "00:30:20.5")
  if (digits.length > 0) {
    // Limit to 7 digits maximum (HHMMSSS)
    const limitedDigits = digits.slice(0, 7);
    
    let formatted = '';
    
    // Add hours (first 2 digits)
    if (limitedDigits.length >= 1) {
      formatted += limitedDigits[0];
    }
    if (limitedDigits.length >= 2) {
      formatted += limitedDigits[1];
    }
    
    // Add colon and minutes (next 2 digits)
    if (limitedDigits.length >= 3) {
      formatted += ':' + limitedDigits[2];
    }
    if (limitedDigits.length >= 4) {
      formatted += limitedDigits[3];
    }
    
    // Add colon and seconds (next 2 digits)
    if (limitedDigits.length >= 5) {
      formatted += ':' + limitedDigits[4];
    }
    if (limitedDigits.length >= 6) {
      formatted += limitedDigits[5];
    }
    
    // Add dot and tenths of second (last digit)
    if (limitedDigits.length >= 7) {
      formatted += '.' + limitedDigits[6];
    }
    
    return formatted;
  }
  
  // If no digits, return empty string
  return '';
};