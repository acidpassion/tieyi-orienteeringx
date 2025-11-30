import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Filter, Search, Plus, Edit3, Trash2, Download, Upload, Calendar, Trophy, Medal, Target, User, Eye } from 'lucide-react';
import { toast } from "react-toastify";

import { useConfiguration } from '../../context/ConfigurationContext';
import CompetitionRecordForm from '../../components/CompetitionRecordForm';
import EventAutocompleteInput from '../../components/EventAutocompleteInput';
import GameTypeFilter from '../../components/GameTypeFilter';
import PerformanceMatrix from '../../components/PerformanceMatrix';
import { getAllGameTypes } from '../../utils/matrixTransform';

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

  // State for matrix view gameType filter
  const [selectedGameTypes, setSelectedGameTypes] = useState([]);
  const [hideStudentsWithoutRecords, setHideStudentsWithoutRecords] = useState(false);


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

  // Initialize selectedGameTypes when records are loaded
  useEffect(() => {
    if (completionRecords.length > 0 && selectedGameTypes.length === 0) {
      const allTypes = getAllGameTypes(completionRecords);
      setSelectedGameTypes(allTypes);
    }
  }, [completionRecords]);

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
        console.log('Events API response:', data); // Debug log
        if (data.success && Array.isArray(data.data)) {
          console.log('Setting events from data.data:', data.data); // Debug log
          setEvents(data.data);
        } else if (Array.isArray(data)) {
          console.log('Setting events from direct array:', data); // Debug log
          setEvents(data);
        } else {
          console.log('Unexpected events data structure:', data); // Debug log
          setEvents([]);
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

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Build URL with current filters
      const urlParams = new URLSearchParams();
      
      if (filters.studentName) urlParams.append('studentName', filters.studentName);
      if (filters.eventName) urlParams.append('eventName', filters.eventName);
      if (filters.gameType) urlParams.append('gameType', filters.gameType);
      if (filters.startDate) urlParams.append('startDate', filters.startDate);
      if (filters.endDate) urlParams.append('endDate', filters.endDate);
      if (filters.validity) urlParams.append('validity', filters.validity);
      
      const exportUrl = `/api/completion-records/export?${urlParams.toString()}`;
      
      const response = await fetch(exportUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `成绩数据_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('数据导出成功');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('数据导出失败');
    }
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

  const getReasonBadge = (reason) => {
    if (!reason) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          -
        </span>
      );
    }

    // Different colors for different reason types
    const reasonStyles = {
      'OK': 'bg-green-100 text-green-800',
      'DNF': 'bg-red-100 text-red-800',
      'DSQ': 'bg-red-100 text-red-800',
      'MP': 'bg-yellow-100 text-yellow-800',
      'OT': 'bg-orange-100 text-orange-800',
      'default': 'bg-blue-100 text-blue-800'
    };

    const styleClass = reasonStyles[reason] || reasonStyles.default;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styleClass}`}>
        {reason}
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
                onClick={handleExportData}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                导出数据
              </button>
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

      <div className="px-4 sm:px-6 lg:px-8">
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

            </div>
          </div>
        </div>

        {/* GameType Filter */}
        <GameTypeFilter
          availableGameTypes={getAllGameTypes(completionRecords)}
          selectedGameTypes={selectedGameTypes}
          onSelectionChange={setSelectedGameTypes}
          hideStudentsWithoutRecords={hideStudentsWithoutRecords}
          onHideStudentsChange={setHideStudentsWithoutRecords}
        />

        {/* Performance Matrix */}
        <PerformanceMatrix
          records={completionRecords}
          students={students}
          selectedGameTypes={selectedGameTypes}
          hideStudentsWithoutRecords={hideStudentsWithoutRecords}
          onEditRecord={handleEditRecord}
          onDeleteRecord={handleDeleteRecord}
        />
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