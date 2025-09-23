/**
 * Converts a relative image path to the correct asset path
 * @param {string} imagePath - The relative image path from the database
 * @returns {string} - The correct path to the image in the assets folder
 */
export const getImagePath = (imagePath) => {
  if (!imagePath) return '';
  
  // If the path already starts with /src/assets or is an absolute URL, return as is
  if (imagePath.startsWith('/assets') || imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Remove leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  
  // Add the assets prefix
  return `/assets/${cleanPath}`;
};

/**
 * Handles image loading errors by providing a fallback
 * @param {Event} event - The error event
 */
export const handleImageError = (event) => {
  console.warn('Failed to load image:', event.target.src);
  // You can set a fallback image here if needed
  // event.target.src = '/src/assets/images/placeholder.png';
};