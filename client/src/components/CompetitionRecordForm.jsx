import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Save, X } from 'lucide-react';
import { formatTimeInput } from '../utils/timeFormatter';
import StudentAutocomplete from './StudentAutocomplete';
import GroupAutocomplete from './GroupAutocomplete';
import { useConfiguration } from '../context/ConfigurationContext';

const CompetitionRecordForm = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  events = [],
  completionRecords = [],
  mode = 'create', // 'create' or 'edit'
  initialData = null
}) => {
  const { eventTypes, gameTypes } = useConfiguration();
  const safeEventTypes = eventTypes || [];
  const safeGameTypes = gameTypes || [];
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    eventName: '',
    eventDate: '',
    eventType: '',
    gameType: '',
    groupName: '',
    position: '',
    score: '',
    result: '',
    validity: true
  });
  
  const [saving, setSaving] = useState(false);

  // Initialize form data when component mounts or initialData changes
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        studentId: initialData.studentId || '',
        name: initialData.name || '',
        eventName: initialData.eventName || '',
        eventDate: initialData.eventDate ? initialData.eventDate.split('T')[0] : '',
        eventType: initialData.eventType || '',
        gameType: initialData.gameType || '',
        groupName: initialData.groupName || '',
        position: initialData.position || '',
        score: initialData.score || '',
        result: initialData.result || '',
        validity: initialData.validity !== undefined ? initialData.validity : true
      });
    } else {
      // Reset form for create mode, but use initialData for pre-filling if available
      setFormData({
        studentId: initialData?.studentId || '',
        name: initialData?.name || '',
        eventName: '',
        eventDate: '',
        eventType: '',
        gameType: '',
        groupName: '',
        position: '',
        score: '',
        result: '',
        validity: true
      });
    }
  }, [mode, initialData, isOpen]);

  // Handle event selection and auto-fill date and type
  const handleEventChange = (eventName) => {
    const selectedEvent = events.find(event => event.eventName === eventName);
    setFormData(prev => ({
      ...prev,
      eventName,
      eventDate: selectedEvent ? selectedEvent.startDate.split('T')[0] : '',
      eventType: selectedEvent ? selectedEvent.eventType : ''
    }));
  };

  // Handle time input change with formatting
  const handleTimeInputChange = (value) => {
    const formatted = formatTimeInput(value);
    setFormData(prev => ({ ...prev, result: formatted }));
  };

  // Handle student selection from autocomplete
  const handleStudentSelect = (studentData) => {
    setFormData(prev => ({
      ...prev,
      studentId: studentData.studentId,
      name: studentData.name
    }));
  };

  // Check for duplicate records (only for create mode)
  const checkDuplicate = () => {
    if (mode === 'edit') return false;
    
    return completionRecords.some(record => 
      record.eventDate === formData.eventDate &&
      record.eventType === formData.eventType &&
      record.gameType === formData.gameType &&
      record.groupName === formData.groupName
    );
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!formData.studentId || !formData.name || !formData.eventName || !formData.eventDate || !formData.eventType || 
        !formData.gameType || !formData.groupName || !formData.result) {
      toast.error('请填写所有必填字段');
      return;
    }

    // Validate result format (hh:mm:ss.S)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.[0-9]$/;
    if (!timeRegex.test(formData.result)) {
      toast.error('请输入正确的时间格式：HH:MM:SS.S');
      return;
    }

    if (checkDuplicate()) {
      toast.error('该记录已存在，请检查赛事日期、赛事类型、比赛项目和组别');
      return;
    }

    try {
      setSaving(true);
      const recordData = {
        ...formData
      };

      // Remove score if gameType is not 积分赛
      if (formData.gameType !== '积分赛') {
        delete recordData.score;
      }

      const url = mode === 'create' ? '/api/completion-records' : `/api/completion-records/${initialData._id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(recordData)
      });

      if (response.ok) {
        toast.success(mode === 'create' ? '参赛记录创建成功' : '参赛记录更新成功');
        handleCancel();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || `${mode === 'create' ? '创建' : '更新'}失败`);
      }
    } catch (error) {
      console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} record:`, error);
      toast.error(`${mode === 'create' ? '创建' : '更新'}失败，请重试`);
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel/close
  const handleCancel = () => {
    setFormData({
      studentId: '',
      name: '',
      eventName: '',
      eventDate: '',
      eventType: '',
      gameType: '',
      groupName: '',
      position: '',
      score: '',
      result: '',
      validity: true
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-md sm:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          {mode === 'create' ? '创建参赛记录' : '编辑参赛记录'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Student Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              学生姓名 *
            </label>
            <StudentAutocomplete
              value={{ studentId: formData.studentId, name: formData.name }}
              onChange={handleStudentSelect}
              placeholder="搜索学生姓名..."
              required
            />
          </div>

          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              赛事名称 *
            </label>
            <select
              value={formData.eventName}
              onChange={(e) => handleEventChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
              required
            >
              <option value="">选择比赛</option>
              {(events || []).map((event) => (
                <option key={event.id} value={event.eventName}>
                  {event.eventName}
                </option>
              ))}
            </select>
          </div>

          {/* Event Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              赛事日期 *
            </label>
            <input
              type="date"
              value={formData.eventDate}
              onChange={(e) => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
              required
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              赛事类型 *
            </label>
            <select
              value={formData.eventType}
              onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
              required
            >
              <option value="">选择比赛类型</option>
              {safeEventTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Game Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              比赛类型 *
            </label>
            <select
              value={formData.gameType}
              onChange={(e) => setFormData(prev => ({ ...prev, gameType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
              required
            >
              <option value="">选择比赛类型</option>
              {safeGameTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              组别 *
            </label>
            <GroupAutocomplete
              value={formData.groupName}
              onChange={(value) => setFormData(prev => ({ ...prev, groupName: value }))}
              placeholder="选择或输入组别..."
              required
            />
          </div>

          {/* Score (only for 积分赛) */}
          {formData.gameType === '积分赛' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                积分
              </label>
              <input
                type="number"
                value={formData.score}
                onChange={(e) => setFormData(prev => ({ ...prev, score: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                placeholder="输入积分"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              名次
            </label>
            <input
              type="number"
              value={formData.position}
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
              placeholder="输入名次"
            />
          </div>

          {/* Result */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">成绩 *</label>
            <input
              type="text"
              value={formData.result}
              onChange={(e) => handleTimeInputChange(e.target.value)}
              placeholder="HH:MM:SS.S (如：01:30:45.1)"
              pattern="^([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])\.[0-9]$"
              title="请输入正确的时间格式：HH:MM:SS.S"
              maxLength="10"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Validity */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">有效性</label>
            <div className="flex items-center space-x-4 mt-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="validity"
                  checked={formData.validity === true}
                  onChange={() => setFormData(prev => ({ ...prev, validity: true }))}
                  className="mr-2"
                />
                <span className="text-gray-900 dark:text-white">有效</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="validity"
                  checked={formData.validity === false}
                  onChange={() => setFormData(prev => ({ ...prev, validity: false }))}
                  className="mr-2"
                />
                <span className="text-gray-900 dark:text-white">无效</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-6">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm sm:text-base touch-manipulation"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? `${mode === 'create' ? '创建中' : '更新中'}...` : `${mode === 'create' ? '创建记录' : '更新记录'}`}</span>
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base touch-manipulation"
          >
            <X className="w-4 h-4" />
            <span>取消</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompetitionRecordForm;