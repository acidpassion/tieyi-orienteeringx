import React, { useState } from 'react';
import { User, Shield, BookOpen } from 'lucide-react';

const UserAvatar = ({ user, size = 'w-8 h-8', className = '' }) => {
  const [imageError, setImageError] = useState(false);

  // Get role-based icon and color for fallback
  const getRoleIcon = () => {
    switch (user?.role) {
      case 'coach':
        return <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'student':
        return <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'admin':
        return <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getRoleColor = () => {
    switch (user?.role) {
      case 'coach':
        return 'bg-green-100 dark:bg-green-800';
      case 'student':
        return 'bg-blue-100 dark:bg-blue-800';
      case 'admin':
        return 'bg-purple-100 dark:bg-purple-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  // If user has an avatar and it hasn't failed to load, display it
  if (user?.avatar && !imageError) {
    return (
      <img
        src={user.avatar}
        alt={`${user.name || 'User'} avatar`}
        className={`${size} rounded-full object-cover ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  // Fallback to role-based colored background with icons
  return (
    <div
      className={`${size} rounded-full ${getRoleColor()} flex items-center justify-center ${className}`}
    >
      {getRoleIcon()}
    </div>
  );
};

export default UserAvatar;