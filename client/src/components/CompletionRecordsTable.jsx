import React, { useState, useEffect } from 'react';
import { Award, Filter, Search, Trophy, Medal, Target, Edit, Trash2, Calendar, Clock, Users, Edit2 } from 'lucide-react';
import EventAutocompleteInput from './EventAutocompleteInput';

const CompletionRecordsTable = ({ records = [], onEdit, onDelete, events = [] }) => {
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [filters, setFilters] = useState({
    eventName: '',
    startDate: '',
    endDate: '',
    sortBy: 'eventDate',
    sortOrder: 'desc'
  });

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return '未设置';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Helper function to get validity badge
  const getValidityBadge = (validity) => {
    if (validity === true || validity === '有效') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
          有效
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
          无效
        </span>
      );
    }
  };

  // Apply filters function
  const applyFilters = () => {
    let filtered = [...records];

    // Filter by event name
    if (filters.eventName) {
      filtered = filtered.filter(record => 
        record.eventName?.toLowerCase().includes(filters.eventName.toLowerCase())
      );
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.eventDate);
        const startDate = new Date(filters.startDate);
        return recordDate >= startDate;
      });
    }

    if (filters.endDate) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.eventDate);
        const endDate = new Date(filters.endDate);
        return recordDate <= endDate;
      });
    }

    // Sort records
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      if (filters.sortBy === 'eventDate') {
        aValue = new Date(a.eventDate);
        bValue = new Date(b.eventDate);
      } else if (filters.sortBy === 'result') {
        // Convert time strings to seconds for comparison
        aValue = timeToSeconds(a.result);
        bValue = timeToSeconds(b.result);
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredRecords(filtered);
  };

  // Helper function to format result with milliseconds
  const formatResult = (result) => {
    if (!result) return '00:00:00.000';
    
    // If result already has milliseconds, return as is
    if (result.includes('.')) {
      return result;
    }
    
    // If result doesn't have milliseconds, append .000
    return result + '.000';
  };

  // Helper function to convert time string to seconds (including milliseconds)
  const timeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    
    // Handle format with milliseconds (HH:MM:SS.SSS)
    const parts = timeStr.split('.');
    const timePart = parts[0];
    const millisPart = parts[1] || '000';
    
    const timeParts = timePart.split(':');
    if (timeParts.length === 3) {
      const totalSeconds = parseInt(timeParts[0]) * 3600 + parseInt(timeParts[1]) * 60 + parseInt(timeParts[2]);
      const milliseconds = parseInt(millisPart) / 1000;
      return totalSeconds + milliseconds;
    } else if (timeParts.length === 2) {
      const totalSeconds = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
      const milliseconds = parseInt(millisPart) / 1000;
      return totalSeconds + milliseconds;
    }
    return 0;
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      eventName: '',
      startDate: '',
      endDate: '',
      sortBy: 'eventDate',
      sortOrder: 'desc'
    });
  };

  // Apply filters when records or filters change
  useEffect(() => {
    applyFilters();
  }, [records, filters]);

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            筛选条件
          </h3>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            清除筛选
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              比赛名称
            </label>
            <EventAutocompleteInput
              value={filters.eventName}
              onChange={(value) => handleFilterChange('eventName', value)}
              placeholder="搜索比赛名称"
              events={events}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              开始日期
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              结束日期
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              排序字段
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="eventDate">比赛日期</option>
              <option value="result">成绩</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              排序方式
            </label>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Cards */}
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((record, index) => (
            <div key={record._id || index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-4 relative">
              {/* Card Header */}
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{record.eventName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{record.eventType} | {formatDate(record.eventDate)}</p>
              </div>
              
              {/* Card Content */}
              <div className="space-y-3 mb-12">
                
                {/* First Row: Game Type, Result, Position */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">比赛项目</span>
                      <span>{typeof record.gameType === 'string' ? record.gameType : record.gameType?.name || '未指定'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">成绩</span>
                      <span className="font-medium">{formatResult(record.result)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">排名</span>
                      <span className="font-medium">{record.position ? `第${record.position}名` : '未排名'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Second Row: Validity, Group Name, Score (conditional) */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center">
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">有效性</span>
                      {getValidityBadge(record.validity)}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">组别</span>
                      <span>{record.groupName}</span>
                    </div>
                  </div>
                  
                  {record.gameType === '积分赛' ? (
                    <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 block">积分</span>
                        <span className="font-medium">{record.score || '0'}</span>
                      </div>
                    </div>
                  ) : (
                    <div></div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons - Bottom Right */}
              <div className="absolute bottom-4 right-4 flex space-x-2">
                <button
                  onClick={() => onEdit && onEdit(record)}
                  className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-full transition-colors duration-200"
                  title="编辑"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete && onDelete(record)}
                  className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-full transition-colors duration-200"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Award className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无参赛记录</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {records.length > 0 ? '没有符合筛选条件的记录' : '还没有参赛记录'}
          </p>
        </div>
      )}
    </div>
  );
};

export default CompletionRecordsTable;