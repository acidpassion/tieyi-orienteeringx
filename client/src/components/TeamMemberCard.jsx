import React from 'react';
import { Crown, UserMinus } from 'lucide-react';
import Avatar from './Avatar';
import { useTheme } from '../context/ThemeContext';

const TeamMemberCard = ({ 
  member, 
  isCaptain, 
  isCurrentUserCaptain, 
  canRemove, 
  onRemove, 
  className = '' 
}) => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      isDarkMode 
        ? 'bg-gray-700 border-gray-600' 
        : 'bg-white border-gray-200'
    } ${className}`}>
      <div className="flex items-center space-x-3">
        <Avatar 
          src={member.avatar} 
          alt={member.name || member.username}
          size="sm"
          fallbackText={member.name || member.username}
        />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className={`font-medium ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {member.name || member.username}
            </span>
            {isCaptain && (
              <div className="flex items-center space-x-1">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span className={`text-xs px-2 py-1 rounded ${
                  isDarkMode 
                    ? 'bg-yellow-800 text-yellow-200' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  队长
                </span>
              </div>
            )}
          </div>
          {member.runOrder && (
            <span className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              第{member.runOrder}棒
            </span>
          )}
        </div>
      </div>
      
      {/* Remove button - only show for non-captains when current user is captain */}
      {canRemove && !isCaptain && isCurrentUserCaptain && (
        <button
          type="button"
          onClick={() => onRemove(member)}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode
              ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300'
              : 'text-red-600 hover:bg-red-50 hover:text-red-700'
          }`}
          title="移除成员"
        >
          <UserMinus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default TeamMemberCard;