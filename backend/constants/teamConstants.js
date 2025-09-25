// Team size constants for different game types
const TEAM_SIZE_LIMITS = {
  // Default team sizes
  DEFAULT_RELAY_TEAM_SIZE: 4,
  DEFAULT_TEAM_GAME_SIZE: 6,
  
  // Maximum allowed team sizes
  MAX_RELAY_TEAM_SIZE: 8,
  MAX_TEAM_GAME_SIZE: 10,
  
  // Minimum team sizes
  MIN_TEAM_SIZE: 2
};

// Helper function to get team size for a specific game type
const getTeamSizeForGameType = (gameTypeName, eventGameTypeConfig, eventGameTypeSettings) => {
  // Priority order:
  // 1. Event-specific gameType configuration
  // 2. Event gameTypeSettings
  // 3. Default based on game type name
  
  if (typeof eventGameTypeConfig === 'object' && eventGameTypeConfig.teamSize) {
    return eventGameTypeConfig.teamSize;
  }
  
  if (eventGameTypeSettings && eventGameTypeSettings[gameTypeName] && eventGameTypeSettings[gameTypeName].teamSize) {
    return eventGameTypeSettings[gameTypeName].teamSize;
  }
  
  // Default based on game type name
  if (gameTypeName.includes('接力')) {
    return TEAM_SIZE_LIMITS.DEFAULT_RELAY_TEAM_SIZE;
  } else if (gameTypeName.includes('团队')) {
    return TEAM_SIZE_LIMITS.DEFAULT_TEAM_GAME_SIZE;
  }
  
  return TEAM_SIZE_LIMITS.MIN_TEAM_SIZE;
};

// Validation function for team size
const validateTeamSize = (gameTypeName, teamSize) => {
  const maxSize = gameTypeName.includes('接力') 
    ? TEAM_SIZE_LIMITS.MAX_RELAY_TEAM_SIZE 
    : TEAM_SIZE_LIMITS.MAX_TEAM_GAME_SIZE;
    
  return teamSize >= TEAM_SIZE_LIMITS.MIN_TEAM_SIZE && teamSize <= maxSize;
};

module.exports = {
  TEAM_SIZE_LIMITS,
  getTeamSizeForGameType,
  validateTeamSize
};