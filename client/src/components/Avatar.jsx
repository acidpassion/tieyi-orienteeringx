import React from 'react';

const Avatar = ({ 
  src, 
  alt, 
  size = 'md', 
  className = '',
  fallbackText = '?' 
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  };

  const handleImageError = (e) => {
    e.target.style.display = 'none';
    e.target.nextSibling.style.display = 'flex';
  };

  const handleImageLoad = (e) => {
    e.target.style.display = 'block';
    e.target.nextSibling.style.display = 'none';
  };

  return (
    <div className={`relative inline-block ${sizeClasses[size]} ${className}`}>
      {/* 头像图片 */}
      {src && (
        <img
          src={src}
          alt={alt}
          className="w-full h-full rounded-full object-cover"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      )}
      
      {/* 备用显示 */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium ${
          src ? 'hidden' : 'flex'
        }`}
        style={{ display: src ? 'none' : 'flex' }}
      >
        {fallbackText.charAt(0).toUpperCase()}
      </div>
    </div>
  );
};

export default Avatar;