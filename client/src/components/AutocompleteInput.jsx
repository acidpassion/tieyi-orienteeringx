import React, { useState, useEffect, useRef } from 'react';
import axios from '../config/axiosConfig';
import { createApiUrl } from '../config/api';
import { useTheme } from '../context/ThemeContext';
import Avatar from './Avatar';

const AutocompleteInput = ({ 
  value, 
  onChange, 
  placeholder, 
  className = '',
  required = false,
  disabled = false,
  onSelect = null // 当选择用户时的回调函数
}) => {
  const { isDarkMode } = useTheme();
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // 检查是否应该触发搜索（2个英文字符或1个中文字符）
  const shouldTriggerSearch = (text) => {
    if (!text || text.trim().length === 0) return false;
    
    // 检查中文字符
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
    if (chineseChars && chineseChars.length >= 1) return true;
    
    // 检查英文字符
    const englishChars = text.match(/[a-zA-Z]/g);
    if (englishChars && englishChars.length >= 2) return true;
    
    return false;
  };

  // 搜索学生
  const searchStudents = async (searchTerm) => {
    if (!shouldTriggerSearch(searchTerm)) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(createApiUrl('/api/students/search'), {
        params: {
          name: searchTerm,
          limit: 10
        }
      });
      // 确保响应数据是数组
      const responseData = response.data;
      setSuggestions(Array.isArray(responseData) ? responseData : []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('搜索学生失败:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    
    // 延迟搜索以避免过多请求
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      searchStudents(newValue);
    }, 300);
  };

  // 选择建议项
  const handleSuggestionClick = (student) => {
    setInputValue(student.name);
    onChange(student.name);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // 如果提供了选择回调，调用它
    if (onSelect) {
      onSelect(student);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // 点击外部关闭建议列表
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 同步外部value变化
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${className} ${loading ? 'pr-8' : ''}`}
        required={required}
        disabled={disabled}
      />
      
      {/* 加载指示器 */}
      {loading && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${isDarkMode ? 'border-blue-400' : 'border-blue-600'}`}></div>
        </div>
      )}
      
      {/* 建议列表 */}
      {showSuggestions && Array.isArray(suggestions) && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className={`absolute z-10 w-full mt-1 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} border rounded-md shadow-lg max-h-60 overflow-y-auto`}
        >
          {suggestions.map((student) => (
            <div
              key={student._id}
              onClick={() => handleSuggestionClick(student)}
              className={`px-4 py-2 ${isDarkMode ? 'hover:bg-gray-700 border-gray-600' : 'hover:bg-gray-100 border-gray-100'} cursor-pointer border-b last:border-b-0 flex items-center space-x-3`}
            >
              <Avatar 
                src={student.avatar} 
                alt={student.name}
                size="sm"
                fallbackText={student.name}
              />
              <div className="flex-1">
                <div className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{student.name}</div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {student.grade && student.class ? `${student.grade} - ${student.class}班` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 无结果提示 */}
      {showSuggestions && Array.isArray(suggestions) && suggestions.length === 0 && !loading && shouldTriggerSearch(inputValue) && (
        <div 
          ref={suggestionsRef}
          className={`absolute z-10 w-full mt-1 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} border rounded-md shadow-lg`}
        >
          <div className={`px-4 py-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            未找到匹配的学生
          </div>
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;