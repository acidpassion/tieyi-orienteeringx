const mongoose = require('mongoose');
const CompletionRecord = require('../models/CompletionRecord');

/**
 * Migration: Add teamId field to CompletionRecord collection
 * 
 * This migration adds a new optional teamId field to store relay team IDs
 * for completion records that are part of relay/team games.
 */

async function up() {
  console.log('🔄 Starting migration: Add teamId field to CompletionRecord collection');

  try {
    // Add teamId field to all existing documents (set to null by default)
    const result = await CompletionRecord.updateMany(
      { teamId: { $exists: false } }, // Only update documents that don't have teamId field
      { $set: { teamId: null } }
    );

    console.log(`✅ Migration completed successfully`);
    console.log(`📊 Updated ${result.modifiedCount} completion records with teamId field`);

    return {
      success: true,
      message: `Added teamId field to ${result.modifiedCount} completion records`
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log('🔄 Starting rollback: Remove teamId field from CompletionRecord collection');

  try {
    // Remove teamId field from all documents
    const result = await CompletionRecord.updateMany(
      { teamId: { $exists: true } }, // Only update documents that have teamId field
      { $unset: { teamId: "" } }
    );

    console.log(`✅ Rollback completed successfully`);
    console.log(`📊 Removed teamId field from ${result.modifiedCount} completion records`);

    return {
      success: true,
      message: `Removed teamId field from ${result.modifiedCount} completion records`
    };

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

module.exports = {
  up,
  down,
  description: 'Add teamId field to CompletionRecord collection for relay games'
};