import { useState } from 'react';
import { X, Upload, FileText, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from '../config/axiosConfig';
import { createApiUrl } from '../config/api';

const ResultUploadModal = ({ isOpen, onClose, event, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: upload, 2: mapping, 3: preview
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Parsed data from file
  const [fileColumns, setFileColumns] = useState([]);
  const [fileData, setFileData] = useState([]);
  
  // Mapping configuration
  const [selectedGameType, setSelectedGameType] = useState('');
  const [columnMapping, setColumnMapping] = useState({});
  
  // Preview data
  const [previewData, setPreviewData] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  // Available fields for mapping
  const availableFields = [
    { value: 'name', label: '姓名', required: true },
    { value: 'groupName', label: '组别', required: true },
    { value: 'result', label: '成绩', required: true },
    { value: 'startTime', label: '开始时间', required: false },
    { value: 'finishTime', label: '结束时间', required: false },
    { value: 'validity', label: '有效性', required: false },
    { value: 'score', label: '分数', required: false },
    { value: 'position', label: '名次', required: false },
    { value: 'reason', label: '原因', required: false }
  ];

  if (!isOpen) return null;

  const handleFileSelect = (file) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error('请选择CSV或Excel文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('文件大小不能超过10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const parseFile = async () => {
    if (!selectedFile) {
      toast.error('请先选择文件');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        createApiUrl('/api/completion-records/parse-file'),
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setFileColumns(response.data.data.columns);
        setFileData(response.data.data.rows);
        
        // Auto-map common column names
        const autoMapping = {};
        response.data.data.columns.forEach(col => {
          const lowerCol = col.toLowerCase();
          if (lowerCol.includes('姓名') || lowerCol.includes('name')) {
            autoMapping[col] = 'name';
          } else if (lowerCol.includes('组别') || lowerCol.includes('group')) {
            autoMapping[col] = 'groupName';
          } else if (lowerCol.includes('成绩') || lowerCol.includes('result') || lowerCol.includes('时间') && !lowerCol.includes('开始') && !lowerCol.includes('结束')) {
            autoMapping[col] = 'result';
          } else if (lowerCol.includes('开始') || lowerCol.includes('start')) {
            autoMapping[col] = 'startTime';
          } else if (lowerCol.includes('结束') || lowerCol.includes('finish') || lowerCol.includes('end')) {
            autoMapping[col] = 'finishTime';
          } else if (lowerCol.includes('名次') || lowerCol.includes('position') || lowerCol.includes('排名')) {
            autoMapping[col] = 'position';
          } else if (lowerCol.includes('分数') || lowerCol.includes('score') || lowerCol.includes('积分')) {
            autoMapping[col] = 'score';
          } else if (lowerCol.includes('有效') || lowerCol.includes('validity')) {
            autoMapping[col] = 'validity';
          } else if (lowerCol.includes('原因') || lowerCol.includes('reason')) {
            autoMapping[col] = 'reason';
          }
        });
        
        setColumnMapping(autoMapping);
        setStep(2);
        toast.success('文件解析成功');
      }
    } catch (error) {
      console.error('Parse file failed:', error);
      toast.error(error.response?.data?.message || '文件解析失败');
    } finally {
      setUploading(false);
    }
  };

  // Helper function to parse validity values
  const parseValidity = (value) => {
    if (value === null || value === undefined || value === '') {
      return false;
    }
    
    if (typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      // Check for various positive validity indicators
      return (
        lowerValue === '有效' ||
        lowerValue === 'true' ||
        lowerValue === 'yes' ||
        lowerValue === 'y' ||
        lowerValue === '1' ||
        lowerValue === '√' ||
        lowerValue === '✓' ||
        lowerValue.includes('有效') ||
        lowerValue.includes('valid')
      );
    }
    
    // For numbers, treat 1 as true, 0 as false
    if (typeof value === 'number') {
      return value === 1;
    }
    
    return Boolean(value);
  };

  const generatePreview = async () => {
    if (!selectedGameType) {
      toast.error('请选择比赛项目');
      return;
    }

    // Check required fields are mapped
    const requiredFields = availableFields.filter(f => f.required).map(f => f.value);
    const mappedFields = Object.values(columnMapping);
    const missingFields = requiredFields.filter(f => !mappedFields.includes(f));
    
    if (missingFields.length > 0) {
      toast.error(`请映射必填字段: ${missingFields.map(f => availableFields.find(af => af.value === f)?.label).join(', ')}`);
      return;
    }

    // Generate preview data for ALL records (not just first 10)
    const allPreviewData = fileData.map((row, index) => {
      const record = {
        _index: index,
        eventName: event.eventName,
        eventType: event.eventType,
        gameType: selectedGameType,
        eventDate: event.startDate
      };

      // Map columns to fields
      Object.entries(columnMapping).forEach(([fileCol, dbField]) => {
        let value = row[fileCol];
        
        // Handle validity field with improved parsing
        if (dbField === 'validity') {
          value = parseValidity(value);
        }
        
        // Handle position and score as numbers
        if (dbField === 'position' || dbField === 'score') {
          value = value ? Number(value) : null;
        }
        
        record[dbField] = value;
      });

      return record;
    });

    setPreviewData(allPreviewData);
    setStep(3);
  };

  const handleSave = async () => {
    console.log('handleSave called!');
    try {
      setSaving(true);
      console.log('Starting save process...');

      // First, get list of valid student names from the backend
      const token = localStorage.getItem('token');
      const studentsResponse = await axios.get(createApiUrl('/api/students'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const validStudentNames = new Set(
        studentsResponse.data.map(student => student.name)
      );

      // Generate all records with improved validity parsing
      const allRecords = fileData.map((row) => {
        const record = {
          eventName: event.eventName,
          eventType: event.eventType,
          gameType: selectedGameType,
          eventDate: event.startDate
        };

        Object.entries(columnMapping).forEach(([fileCol, dbField]) => {
          let value = row[fileCol];
          
          // Handle validity field with improved parsing
          if (dbField === 'validity') {
            value = parseValidity(value);
          }
          
          // Handle position and score as numbers
          if (dbField === 'position' || dbField === 'score') {
            value = value ? Number(value) : null;
          }
          
          record[dbField] = value;
        });

        return record;
      });

      console.log('Generated records sample:', allRecords[0]);
      console.log('Event data:', { 
        eventName: event.eventName, 
        eventType: event.eventType, 
        startDate: event.startDate,
        endDate: event.endDate
      });

      // Filter records to only include students that exist in the system
      const validRecords = allRecords.filter(record => 
        record.name && validStudentNames.has(record.name)
      );

      const invalidRecords = allRecords.filter(record => 
        !record.name || !validStudentNames.has(record.name)
      );

      console.log('Student validation:', {
        totalRecords: allRecords.length,
        validStudentNames: Array.from(validStudentNames).slice(0, 5), // Show first 5 names
        validRecords: validRecords.length,
        invalidRecords: invalidRecords.length,
        sampleValidRecord: validRecords[0],
        sampleInvalidRecord: invalidRecords[0]
      });

      if (validRecords.length === 0) {
        console.error('No valid records found. Student names in file:', allRecords.map(r => r.name).slice(0, 10));
        toast.error('没有找到有效的学生记录。请确保姓名与系统中的学生姓名匹配。');
        return;
      }

      // Save only valid records
      console.log('Making API call to bulk-upsert with', validRecords.length, 'records');
      console.log('Sample record:', validRecords[0]);
      
      const response = await axios.post(
        createApiUrl('/api/completion-records/bulk-upsert'),
        { records: validRecords },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('API response:', response.data);

      if (response.data.success) {
        const result = {
          ...response.data.data,
          totalUploaded: allRecords.length,
          validRecords: validRecords.length,
          invalidRecords: invalidRecords.length,
          invalidNames: invalidRecords.map(r => r.name).filter(Boolean)
        };
        
        setSaveResult(result);
        
        let message = `成功保存！插入 ${result.inserted} 条，更新 ${result.updated} 条`;
        if (result.invalidRecords > 0) {
          message += `\n跳过 ${result.invalidRecords} 条无效记录（学生不存在）`;
        }
        
        toast.success(message);
        
        // Call onSuccess after a short delay to show the result
        setTimeout(() => {
          onSuccess && onSuccess();
          handleClose();
        }, 3000);
      }
    } catch (error) {
      console.error('Save failed:', error);
      toast.error(error.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedFile(null);
    setFileColumns([]);
    setFileData([]);
    setSelectedGameType('');
    setColumnMapping({});
    setPreviewData([]);
    setSaveResult(null);
    onClose();
  };

  const resetUpload = () => {
    setSelectedFile(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              导入成绩
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {event?.eventName}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">上传文件</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">字段映射</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">预览保存</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload File */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="h-12 w-12 text-green-500 mx-auto" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={resetUpload}
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      重新选择
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      拖拽文件到此处或点击选择
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      支持 CSV 和 Excel 文件，最大 10MB
                    </p>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                      className="hidden"
                      id="result-file-upload"
                    />
                    <label
                      htmlFor="result-file-upload"
                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
                    >
                      选择文件
                    </label>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  文件格式说明：
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• 文件可以包含任意列名，下一步将进行字段映射</li>
                  <li>• 必须包含：姓名、组别、成绩</li>
                  <li>• 可选字段：开始时间、结束时间、名次、分数、有效性、原因</li>
                  <li>• 时间格式支持：ISO 8601 (2024-01-01T10:00:00)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Game Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  选择比赛项目 <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedGameType}
                  onChange={(e) => setSelectedGameType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">请选择项目</option>
                  {event?.gameTypes?.map((gt, index) => {
                    // Handle both string and object formats
                    const gameTypeName = typeof gt === 'string' ? gt : gt.name;
                    return (
                      <option key={index} value={gameTypeName}>
                        {gameTypeName}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Column Mapping */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  字段映射
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fileColumns.map((col) => (
                    <div key={col} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {col}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          文件列
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <select
                          value={columnMapping[col] || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, [col]: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                        >
                          <option value="">不映射</option>
                          {availableFields.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label} {field.required && '*'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium mb-1">注意事项：</p>
                  <ul className="space-y-1">
                    <li>• 标记 * 的字段为必填项，必须映射</li>
                    <li>• 系统会根据 eventName + name + gameType + groupName 判断是插入还是更新</li>
                    <li>• 如果记录已存在，将更新其他字段</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-4">
              {saveResult ? (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-green-900 dark:text-green-100 mb-2">
                    保存成功！
                  </h4>
                  <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                    <p>插入新记录：{saveResult.inserted} 条</p>
                    <p>更新已有记录：{saveResult.updated} 条</p>
                    <p>成功处理：{saveResult.validRecords} 条</p>
                    {saveResult.invalidRecords > 0 && (
                      <p className="text-yellow-700 dark:text-yellow-300">
                        跳过无效记录：{saveResult.invalidRecords} 条（学生不存在）
                      </p>
                    )}
                    <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                      总上传：{saveResult.totalUploaded} 条
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      预览所有 {previewData.length} 条记录
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      注意：只有系统中存在的学生记录才会被保存
                    </p>
                  </div>

                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">状态</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">姓名</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">组别</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">成绩</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">名次</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">分数</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">有效性</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {previewData.map((record, index) => {
                          // This will be determined during save, for now show all as valid for preview
                          const isValidStudent = record.name && record.name.trim() !== '';
                          return (
                            <tr key={index} className={!isValidStudent ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                              <td className="px-3 py-2 text-sm">
                                {isValidStudent ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                    待验证
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                                    无效
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{record.name || '(空)'}</td>
                              <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{record.groupName}</td>
                              <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{record.result}</td>
                              <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{record.position || '-'}</td>
                              <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{record.score || '-'}</td>
                              <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                                {record.validity !== undefined ? (record.validity ? '有效' : '无效') : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div>
            {step > 1 && !saveResult && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                上一步
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              {saveResult ? '关闭' : '取消'}
            </button>
            {step === 1 && (
              <button
                onClick={parseFile}
                disabled={!selectedFile || uploading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg flex items-center space-x-2"
              >
                {uploading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <span>{uploading ? '解析中...' : '下一步'}</span>
              </button>
            )}
            {step === 2 && (
              <button
                onClick={generatePreview}
                disabled={!selectedGameType}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg"
              >
                下一步
              </button>
            )}
            {step === 3 && !saveResult && (
              <button
                onClick={() => {
                  console.log('Save button clicked!');
                  handleSave();
                }}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg flex items-center space-x-2"
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <span>{saving ? '保存中...' : '保存'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultUploadModal;
