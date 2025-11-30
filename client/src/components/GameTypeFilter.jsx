import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

/**
 * GameType Filter Component
 * Allows coaches to filter matrix columns by gameType
 */
const GameTypeFilter = ({ 
  availableGameTypes = [], 
  selectedGameTypes = [], 
  onSelectionChange,
  hideStudentsWithoutRecords = false,
  onHideStudentsChange
}) => {
  const handleToggle = (gameType) => {
    if (selectedGameTypes.includes(gameType)) {
      // Remove from selection
      onSelectionChange(selectedGameTypes.filter(gt => gt !== gameType));
    } else {
      // Add to selection
      onSelectionChange([...selectedGameTypes, gameType]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange([...availableGameTypes]);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  const allSelected = selectedGameTypes.length === availableGameTypes.length;
  const noneSelected = selectedGameTypes.length === 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          比赛项目筛选
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            ({selectedGameTypes.length}/{availableGameTypes.length} 已选择)
          </span>
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={handleSelectAll}
            disabled={allSelected}
            className="text-xs px-3 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            全选
          </button>
          <button
            onClick={handleDeselectAll}
            disabled={noneSelected}
            className="text-xs px-3 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            清空
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableGameTypes.map((gameType) => {
          const isSelected = selectedGameTypes.includes(gameType);
          return (
            <button
              key={gameType}
              onClick={() => handleToggle(gameType)}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all
                ${isSelected
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>{gameType}</span>
            </button>
          );
        })}
      </div>

      {noneSelected && (
        <div className="mt-3 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
          请至少选择一个比赛项目
        </div>
      )}

      {/* Hide students without records checkbox and validity indicator */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideStudentsWithoutRecords}
              onChange={(e) => onHideStudentsChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              仅显示有成绩记录的学生
            </span>
          </label>

          {/* Validity indicator legend */}
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 border border-green-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">有效成绩</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-100 dark:bg-red-900/30 border border-red-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">无效成绩</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameTypeFilter;
