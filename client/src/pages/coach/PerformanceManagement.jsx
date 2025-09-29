import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Filter, Search, Plus, Edit3, Trash2, Download, Upload, Calendar, Trophy, Medal, Target, User, Eye } from 'lucide-react';
import { toast } from "react-toastify";

import { useConfiguration } from '../../context/ConfigurationContext';
import CompetitionRecordForm from '../../components/CompetitionRecordForm';

const PerformanceManagement = () => {
  const navigate = useNavigate();
  const { gameTypes: configGameTypes } = useConfiguration();
  const safeConfigGameTypes = configGameTypes || [];
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [completionRecords, setCompletionRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [gameTypes, setGameTypes] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    eventName: '',
    eventDate: '',
    eventType: '',
    gameType: '',
    competitionType: '',
    groupName: '',
    points: '',
    position: '',
    result: '',
    score: '',
    validity: true
  });
  
  // Set default date filters: 6 months ago to today
  const getDefaultDates = () => {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    return {
      startDate: sixMonthsAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  };
  
  const [filters, setFilters] = useState({
    studentName: '',
    eventName: '',
    gameType: '',
    ...getDefaultDates(),
    validity: '',
    sortBy: 'eventDate',
    sortOrder: 'desc'
  });


  useEffect(() => {
    fetchData(true);
    fetchEvents();
  }, []);

  // Trigger new API call when filters change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData(false);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [filters.studentName, filters.eventName, filters.gameType, filters.startDate, filters.endDate, filters.validity]);

  useEffect(() => {
    applyFilters();
  }, [completionRecords, filters.sortBy, filters.sortOrder]);

  const fetchData = async (isInitialLoad = false) => {
    try {
      console.log('🔄 Starting fetchData...', { isInitialLoad, filters });
      
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setIsFiltering(true);
      }
      const token = localStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);
      
      // Build URL with default date parameters and any additional filters
      const urlParams = new URLSearchParams();
      
      // Use user-set dates if available, otherwise use default date range
      const startDate = filters.startDate || getDefaultDates().startDate;
      const endDate = filters.endDate || getDefaultDates().endDate;
      urlParams.append('startDate', startDate);
      urlParams.append('endDate', endDate);
      
      // Add other filter parameters if they have values
      if (filters.studentName) urlParams.append('studentName', filters.studentName);
      if (filters.eventName) urlParams.append('eventName', filters.eventName);
      if (filters.gameType) urlParams.append('gameType', filters.gameType);
      if (filters.validity) urlParams.append('validity', filters.validity);
      
      const recordsUrl = `/api/completion-records?${urlParams.toString()}`;
      console.log('📡 Fetching records from:', recordsUrl);
      
      // Fetch completion records with parameters
      const recordsResponse = await fetch(recordsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Records response status:', recordsResponse.status, recordsResponse.statusText);

      // Fetch students for additional info
      console.log('👥 Fetching students...');
      const studentsResponse = await fetch('/api/students', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('👥 Students response status:', studentsResponse.status, studentsResponse.statusText);

      // Use game types from configuration
      console.log('🏆 Using game types from configuration...');
      setGameTypes(safeConfigGameTypes);

      // No need to fetch game types separately, use eventTypes data

      if (!recordsResponse.ok) {
        const errorText = await recordsResponse.text();
        console.error('❌ Records response error:', errorText);
        throw new Error(`Failed to fetch completion records: ${recordsResponse.status} ${recordsResponse.statusText}`);
      }

      const recordsData = await recordsResponse.json();
      console.log('📊 Records data received:', recordsData);
      
      // Handle the API response structure: {success: true, data: {records: []}}
      if (recordsData.success && recordsData.data && Array.isArray(recordsData.data.records)) {
        console.log('✅ Setting records from recordsData.data.records:', recordsData.data.records.length, 'items');
        setCompletionRecords(recordsData.data.records);
      } else if (Array.isArray(recordsData)) {
        console.log('✅ Setting records from direct array:', recordsData.length, 'items');
        setCompletionRecords(recordsData);
      } else if (recordsData.success && Array.isArray(recordsData.data)) {
        console.log('✅ Setting records from recordsData.data:', recordsData.data.length, 'items');
        setCompletionRecords(recordsData.data);
      } else {
        console.log('⚠️ No valid records data found, setting empty array');
        setCompletionRecords([]);
      }
      
      // Handle students data
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        console.log('👥 Students data received:', studentsData);
        if (studentsData.success && Array.isArray(studentsData.data)) {
          console.log('✅ Setting students from studentsData.data:', studentsData.data.length, 'items');
          setStudents(studentsData.data);
        } else if (Array.isArray(studentsData)) {
          console.log('✅ Setting students from direct array:', studentsData.length, 'items');
          setStudents(studentsData);
        }
      } else {
        console.log('❌ Students response not ok:', studentsResponse.status);
      }
      
      // Event types and game types are already set from configuration above
      console.log('✅ Event types and game types set from configuration');
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('获取数据失败');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setIsFiltering(false);
      }
    }
  };

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/events', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setEvents(data.data);
        } else if (Array.isArray(data)) {
          setEvents(data);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const applyFilters = () => {
    if (!Array.isArray(completionRecords)) {
      setFilteredRecords([]);
      return;
    }

    // Since filtering is now done server-side, we only need to handle sorting here
    let filtered = [...completionRecords];

    // Sort the results
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'eventDate':
          aValue = new Date(a.eventDate);
          bValue = new Date(b.eventDate);
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'result':
          aValue = parseFloat(a.result) || 0;
          bValue = parseFloat(b.result) || 0;
          break;
        case 'position':
          aValue = a.position || 999;
          bValue = b.position || 999;
          break;
        default:
          aValue = a[filters.sortBy];
          bValue = b[filters.sortBy];
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredRecords(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    const defaultDates = getDefaultDates();
    setFilters({
      studentName: '',
      eventName: '',
      gameType: '',
      ...defaultDates,
      validity: '',
      sortBy: 'eventDate',
      sortOrder: 'desc'
    });
  };



  const handleDeleteRecord = (recordId) => {
    setRecordToDelete(recordId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRecord = async () => {
    if (!recordToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/completion-records/${recordToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete record');
      }

      const data = await response.json();
      if (data.success) {
        toast.success('参赛记录删除成功');
        fetchData();
      } else {
        throw new Error(data.message || 'Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('删除参赛记录失败');
    } finally {
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
    }
  };

  const cancelDeleteRecord = () => {
    setShowDeleteConfirm(false);
    setRecordToDelete(null);
  };

  const handleEditRecord = (record) => {
    // Keep result in time format for display
    let formattedResult = record.result;
    if (record.result && typeof record.result === 'string') {
      if (record.result.includes(':')) {
        // Already in time format, ensure it has milliseconds
        if (!record.result.includes('.')) {
          formattedResult = record.result + '.000';
        } else {
          formattedResult = record.result;
        }
      } else if (/^\d+$/.test(record.result)) {
        // Convert from milliseconds to time format
        const ms = parseInt(record.result);
        const totalSeconds = ms / 1000;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = (totalSeconds % 60).toFixed(3);
        formattedResult = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.padStart(6, '0')}`;
      }
    }
    
    // Find student by name to get studentId
    const student = students.find(s => s.name === record.name);
    
    // Initialize form with formatted result and studentId
    const editFormData = {
      _id: record._id, // Include record ID for edit mode
      studentId: student?._id || '',
      name: record.name || '',
      eventName: record.eventName || '',
      eventDate: record.eventDate ? record.eventDate.split('T')[0] : '',
      eventType: record.eventType || '',
      gameType: record.gameType || '',
      competitionType: record.competitionType || '',
      groupName: record.groupName || '',
      points: record.points || '',
      position: record.position || '',
      score: record.score || '', // Add score field for 积分赛
      result: formattedResult || '',
      validity: record.validity !== undefined ? record.validity : true
    };
    console.log('Edit form data:', editFormData); // Debug log
    setEditForm(editFormData);
    setShowEditDialog(true);
  };



  const handleCancel = () => {
    setShowEditDialog(false);
    // Reset form state
    setEditForm({
      name: '',
      eventName: '',
      eventDate: '',
      eventType: '',
      gameType: '',
      competitionType: '',
      groupName: '',
      points: '',
      position: '',
      result: '',
      score: '',
      validity: true
    });
  };





  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const getPositionIcon = (position) => {
    if (position === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (position === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (position === 3) return <Medal className="w-4 h-4 text-amber-600" />;
    return <Target className="w-4 h-4 text-gray-500" />;
  };

  const getValidityBadge = (validity) => {
    return validity ? (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        有效
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        无效
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 mb-8">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Award className="w-6 h-6 mr-2 text-blue-600" />
                成绩管理
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加记录
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        {/* Statistics Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Award className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">总记录数</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">{Array.isArray(completionRecords) ? completionRecords.length : 0}</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">有效记录</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {Array.isArray(completionRecords) ? completionRecords.filter(r => r.validity).length : 0}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">参赛学生</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {Array.isArray(completionRecords) ? new Set(completionRecords.map(r => r.name)).size : 0}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">比赛项目</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">
                  {Array.isArray(completionRecords) ? new Set(completionRecords.map(r => r.eventName)).size : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                筛选条件
                {isFiltering && (
                  <div className="ml-2 flex items-center text-sm text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-1"></div>
                    筛选中...
                  </div>
                )}
              </h3>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                清除筛选
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  学生姓名
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                  <input
                    type="text"
                    value={filters.studentName}
                    onChange={(e) => handleFilterChange('studentName', e.target.value)}
                    placeholder="搜索学生姓名"
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  比赛名称
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                  <input
                    type="text"
                    value={filters.eventName}
                    onChange={(e) => handleFilterChange('eventName', e.target.value)}
                    placeholder="搜索比赛名称"
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  比赛项目
                </label>
                <select
                  value={filters.gameType}
                  onChange={(e) => handleFilterChange('gameType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">全部项目</option>
                  {gameTypes.map((type, index) => (
                    <option key={index} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  记录状态
                </label>
                <select
                  value={filters.validity}
                  onChange={(e) => handleFilterChange('validity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">全部状态</option>
                  <option value="true">有效</option>
                  <option value="false">无效</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  开始日期
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  排序字段
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="eventDate">比赛日期</option>
                  <option value="name">学生姓名</option>
                  <option value="result">成绩</option>
                  <option value="position">排名</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  排序方式
                </label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="desc">降序</option>
                  <option value="asc">升序</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Records Table - Responsive Design */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              参赛记录 ({filteredRecords.length})
            </h3>
          </div>

          {filteredRecords.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        学生信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        比赛信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        比赛项目
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        组别
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        成绩
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        排名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        日期
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredRecords.map((record) => {
                      const student = students.find(s => s.name === record.name);
                      return (
                        <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {student?.avatar ? (
                                  <img
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={student.avatar}
                                    alt={record.name}
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                    <User className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {record.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {record.class} · {record.gender}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {record.eventName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {record.eventType}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {typeof record.gameType === 'string' ? record.gameType : record.gameType?.name || record.gameType}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {record.groupName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {record.result}
                              {record.gameType === '积分赛' && record.score && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  积分: {record.score}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getPositionIcon(record.position)}
                              <span className="ml-2 text-sm text-gray-900 dark:text-white">
                                {record.position ? `第${record.position}名` : '未排名'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getValidityBadge(record.validity)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(record.eventDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              {student && (
                                <button
                                  onClick={() => navigate(`/coach/students/${student._id}`)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="查看学生档案"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEditRecord(record)}
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                title="编辑记录"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record._id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="删除记录"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden">
                {filteredRecords.map((record) => {
                  const student = students.find(s => s.name === record.name);
                  return (
                    <div key={record._id} className="border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center flex-1">
                          <div className="flex-shrink-0 h-10 w-10">
                            {student?.avatar ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={student.avatar}
                                alt={record.name}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                <User className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {record.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {record.class} · {record.gender}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getValidityBadge(record.validity)}
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {record.eventName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {record.eventType} • {formatDate(record.eventDate)}
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">比赛项目:</span>
                          <div className="font-medium text-gray-900 dark:text-white">{typeof record.gameType === 'string' ? record.gameType : record.gameType?.name || record.gameType}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">组别:</span>
                          <div className="font-medium text-gray-900 dark:text-white">{record.groupName}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">成绩:</span>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {record.result}
                            {record.gameType === '积分赛' && record.score && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                积分: {record.score}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">排名:</span>
                          <div className="font-medium flex items-center text-gray-900 dark:text-white">
                            {getPositionIcon(record.position)}
                            <span className="ml-1">
                              {record.position ? `第${record.position}名` : '未排名'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-end space-x-3">
                        {student && (
                          <button
                            onClick={() => navigate(`/coach/students/${student._id}`)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            查看
                          </button>
                        )}
                        <button
                          onClick={() => handleEditRecord(record)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium flex items-center"
                        >
                          <Edit3 className="w-4 h-4 mr-1" />
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record._id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium flex items-center"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          删除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Award className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无参赛记录</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {completionRecords.length > 0 ? '没有符合筛选条件的记录' : '还没有任何参赛记录'}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  添加第一条记录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Record Modal */}
      <CompetitionRecordForm
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          fetchData(false); // Refresh the data
        }}
        studentId={null} // Will be determined by student name
        studentName="" // Will be input by user
        events={events}
        completionRecords={completionRecords}
        mode="create"
      />

      {/* Edit Record Modal */}
      <CompetitionRecordForm
        isOpen={showEditDialog}
        onClose={handleCancel}
        onSuccess={() => {
          fetchData(false); // Refresh the data
        }}
        events={events}
        completionRecords={completionRecords}
        mode="edit"
        initialData={editForm}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">确认删除</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                确定要删除这条参赛记录吗？此操作无法撤销。
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDeleteRecord}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
                >
                  取消
                </button>
                <button
                  onClick={confirmDeleteRecord}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceManagement;