const Configuration = require('../models/Configuration');

/**
 * Middleware to validate event data against configuration
 */
const validateEventData = async (req, res, next) => {
  try {
    const config = await Configuration.getSingleton();
    
    // Validate organization
    if (req.body.organization && !config.orgs.includes(req.body.organization)) {
      return res.status(400).json({ 
        message: `无效的主办方: ${req.body.organization}。请从配置的主办方列表中选择。` 
      });
    }
    
    // Validate event type
    if (req.body.eventType && !config.eventTypes.includes(req.body.eventType)) {
      return res.status(400).json({ 
        message: `无效的赛事类型: ${req.body.eventType}。请从配置的赛事类型列表中选择。` 
      });
    }
    
    // Validate game types if provided
    if (req.body.gameTypes && Array.isArray(req.body.gameTypes)) {
      for (const gameType of req.body.gameTypes) {
        const gameTypeName = typeof gameType === 'string' ? gameType : gameType.name;
        if (gameTypeName && !config.gameTypes.includes(gameTypeName)) {
          return res.status(400).json({ 
            message: `无效的比赛项目: ${gameTypeName}。请从配置的比赛项目列表中选择。` 
          });
        }
      }
    }
    
    // Validate groups if provided
    if (req.body.groups && Array.isArray(req.body.groups)) {
      for (const group of req.body.groups) {
        const groupName = typeof group === 'string' ? group : group.name || group.code;
        if (groupName && !config.classes.includes(groupName)) {
          return res.status(400).json({ 
            message: `无效的参赛组别: ${groupName}。请从配置的组别列表中选择。` 
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Configuration validation error:', error);
    // Don't block the request if configuration validation fails
    next();
  }
};

/**
 * Middleware to validate registration data against configuration
 */
const validateRegistrationData = async (req, res, next) => {
  try {
    const config = await Configuration.getSingleton();
    
    // Validate game types in registration
    if (req.body.gameTypes && Array.isArray(req.body.gameTypes)) {
      for (const gameType of req.body.gameTypes) {
        const gameTypeName = typeof gameType === 'string' ? gameType : gameType.name;
        if (gameTypeName && !config.gameTypes.includes(gameTypeName)) {
          return res.status(400).json({ 
            message: `无效的比赛项目: ${gameTypeName}。请从配置的比赛项目列表中选择。` 
          });
        }
        
        // Validate group if provided
        const groupName = typeof gameType === 'object' ? gameType.group : null;
        if (groupName && !config.classes.includes(groupName)) {
          return res.status(400).json({ 
            message: `无效的参赛组别: ${groupName}。请从配置的组别列表中选择。` 
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Registration validation error:', error);
    // Don't block the request if validation fails
    next();
  }
};

module.exports = {
  validateEventData,
  validateRegistrationData
};