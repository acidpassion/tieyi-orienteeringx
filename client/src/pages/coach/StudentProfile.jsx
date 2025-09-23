import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Calendar, Award, Filter, Search, ChevronLeft, Edit3, Trophy, Medal, Target, GraduationCap, Users, Cake, Save, X, Camera, Check, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [completionRecords, setCompletionRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('records');
  const [filters, setFilters] = useState({
    eventName: '',
    startDate: '',
    endDate: '',
    sortBy: 'eventDate',
    sortOrder: 'desc'
  });
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Image cropping states
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({ aspect: 1, width: 150, height: 150 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);

  useEffect(() => {
    fetchStudentProfile();
  }, [id]);

  // Image cropping effect
  useEffect(() => {
    if (completedCrop?.width && completedCrop?.height && imgRef.current && previewCanvasRef.current) {
      generateCroppedImage();
    }
  }, [completedCrop]);

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      // Check if it's an image file
      if (!file.type.startsWith('image/')) {
        toast.error('请选择图片文件。');
        return;
      }
      
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('图片文件过大，请选择小于5MB的图片。');
        return;
      }
      
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setSelectedImage(reader.result);
        setCroppedImageUrl('');
      });
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          // Check file size (5MB limit)
          if (file.size > 5 * 1024 * 1024) {
            toast.error('图片文件过大，请选择小于5MB的图片。');
            return;
          }
          
          const reader = new FileReader();
          reader.addEventListener('load', () => {
            setSelectedImage(reader.result);
            setCroppedImageUrl('');
          });
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  useEffect(() => {
    applyFilters();
  }, [completionRecords, filters]);

  // Keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showEditModal) {
        closeEditModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('paste', handlePaste);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('paste', handlePaste);
    };
  }, [showEditModal]);

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/students/${id}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch student profile');
      }

      const data = await response.json();
      if (data.success) {
        setStudent(data.data.student);
        setCompletionRecords(data.data.completionRecords);
      } else {
        throw new Error(data.message || 'Failed to fetch student profile');
      }
    } catch (error) {
      console.error('Error fetching student profile:', error);
      toast.error('获取学生档案失败');
      navigate('/coach/students');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...completionRecords];

    // Filter by event name
    if (filters.eventName) {
      filtered = filtered.filter(record => 
        record.eventName.toLowerCase().includes(filters.eventName.toLowerCase())
      );
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(record => 
        new Date(record.eventDate) >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(record => 
        new Date(record.eventDate) <= new Date(filters.endDate)
      );
    }

    // Sort records
    filtered.sort((a, b) => {
      const aValue = filters.sortBy === 'eventDate' ? new Date(a.eventDate) : a.result;
      const bValue = filters.sortBy === 'eventDate' ? new Date(b.eventDate) : b.result;
      
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
    setFilters({
      eventName: '',
      startDate: '',
      endDate: '',
      sortBy: 'eventDate',
      sortOrder: 'desc'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const calculateAge = (birthday) => {
    if (!birthday) return '未知';
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getPositionIcon = (position) => {
    if (position === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (position === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (position === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <Target className="w-5 h-5 text-gray-500" />;
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

  // Edit modal functions
  const parseGradeAndClass = (gradeString) => {
    if (!gradeString) return { gradeOnly: '', classNumber: '1' };
    const match = gradeString.match(/^(.+?)(\d+)班?$/);
    if (match) {
      return {
        gradeOnly: match[1],
        classNumber: match[2]
      };
    }
    return { gradeOnly: gradeString, classNumber: '1' };
  };

  const handleEditStudent = () => {
    let gradeOnly, classNumber;
    
    // Handle new data structure with separate grade and class fields
    if (student.class !== undefined) {
      gradeOnly = student.grade;
      classNumber = student.class ? student.class.toString() : '';
    } else {
      // Handle old data structure for backward compatibility
      const parsed = parseGradeAndClass(student.grade);
      gradeOnly = parsed.gradeOnly;
      classNumber = parsed.classNumber;
    }
    
    setEditingStudent({
      ...student,
      originalAvatar: student.avatar,
      gradeOnly,
      classNumber,
      // Format birthday for date input (YYYY-MM-DD)
      birthday: student.birthday ? student.birthday.split('T')[0] : ''
    });
    setSelectedImage(null);
    setCroppedImageUrl('');
    setDragActive(false);
    setShowEditModal(true);
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('图片文件过大，请选择小于5MB的图片。');
        return;
      }
      
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setSelectedImage(reader.result);
        setCroppedImageUrl('');
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    const cropSize = Math.min(width, height) * 0.8;
    const x = (width - cropSize) / 2;
    const y = (height - cropSize) / 2;
    
    setCrop({
      unit: 'px',
      width: cropSize,
      height: cropSize,
      x,
      y,
      aspect: 1
    });
  };

  const generateCroppedImage = () => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const crop = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    // Set canvas size to a reasonable avatar size (200x200 max)
    const maxSize = 200;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;
    const size = Math.min(maxSize, Math.max(cropWidth, cropHeight));
    
    canvas.width = size;
    canvas.height = size;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      size,
      size
    );

    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Canvas is empty');
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setCroppedImageUrl(reader.result);
        setEditingStudent(prev => ({
          ...prev,
          avatar: reader.result
        }));
      });
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.95);
  };

  const removeAvatar = () => {
    setEditingStudent(prev => ({
      ...prev,
      avatar: ''
    }));
    setSelectedImage(null);
    setCroppedImageUrl('');
  };

  const handleSaveStudent = async () => {
    if (!editingStudent?.name?.trim()) {
      toast.error('请输入学生姓名');
      return;
    }

    // Validate class field for non-graduated students
    if (editingStudent.gradeOnly !== '已毕业队员') {
      const classNum = parseInt(editingStudent.classNumber);
      if (!editingStudent.classNumber || isNaN(classNum) || classNum < 1 || classNum > 50) {
        toast.error('请输入有效的班级号码（1-50）');
        return;
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      // Prepare the data to send with separate grade and class fields
      const studentData = {
        ...editingStudent,
        grade: editingStudent.gradeOnly,
        // Only include class field for non-graduated students
        ...(editingStudent.gradeOnly !== '已毕业队员' && {
          class: parseInt(editingStudent.classNumber)
        }),
        // Remove temporary fields that shouldn't be sent to backend
        originalAvatar: undefined,
        gradeOnly: undefined,
        classNumber: undefined
      };

      const response = await fetch(`/api/students/${editingStudent._id || editingStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(studentData),
      });

      if (response.ok) {
        const updatedStudent = await response.json();
        setStudent(updatedStudent);
        closeEditModal();
        toast.success('学生信息更新成功！');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || '更新失败，请重试。');
      }
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('网络错误，请检查网络连接后重试。');
    } finally {
      setSaving(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingStudent(null);
    setSelectedImage(null);
    setCroppedImageUrl('');
    setDragActive(false);
    setCrop({
      unit: '%',
      width: 50,
      height: 50,
      x: 25,
      y: 25,
      aspect: 1
    });
    setCompletedCrop(null);
  };

  const handleEditFormChange = (field, value) => {
    setEditingStudent(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">学生未找到</h2>
          <button
            onClick={() => navigate('/coach/students')}
            className="text-blue-600 hover:text-blue-800"
          >
            返回学生列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 mb-8">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/coach/students')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                返回学生列表
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">学生档案</h1>
            </div>
          </div>
        </div>
      </div>

      <div>
        {/* Student Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 mb-8">
          <div className="p-4">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {student.avatar && student.avatar.trim() !== '' ? (
                  <div className="relative">
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white shadow-md"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.parentNode.querySelector('.avatar-fallback');
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="avatar-fallback w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-2 border-white shadow-md absolute top-0 left-0" style={{display: 'none'}}>
                      <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-2 border-white shadow-md">
                    <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                )}
              </div>

              {/* Student Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{student.name}</h2>
                  <button
                    onClick={handleEditStudent}
                    className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors ml-2"
                  >
                    <Edit3 className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">编辑档案</span>
                    <span className="sm:hidden">编辑</span>
                  </button>
                </div>

                {/* Compact Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <GraduationCap className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">班级</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {student.class ? `${student.grade}${student.class}班` : student.grade}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <Users className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">性别</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{student.gender || '未设置'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">年龄</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{calculateAge(student.birthday)}岁</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <Cake className="w-4 h-4 text-pink-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">生日</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {student.birthday ? formatDate(student.birthday) : '未设置'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <User className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">用户名</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{student.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <Award className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">参赛记录</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{completionRecords.length} 条</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('records')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'records'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Award className="w-4 h-4 inline mr-2" />
                参赛记录 ({completionRecords.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'records' && (
              <div>
                {/* Filters */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                      <Filter className="w-5 h-5 mr-2" />
                      筛选条件
                    </h3>
                    <button
                      onClick={clearFilters}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      清除筛选
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        比赛名称
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          value={filters.eventName}
                          onChange={(e) => handleFilterChange('eventName', e.target.value)}
                          placeholder="搜索比赛名称"
                          className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="desc">降序</option>
                        <option value="asc">升序</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Records Table */}
                {filteredRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            比赛信息
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            成绩
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            排名
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            组别
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            状态
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            日期
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredRecords.map((record, index) => (
                          <tr key={record._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                                {record.result}
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {record.groupName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getValidityBadge(record.validity)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(record.eventDate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Award className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无参赛记录</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {completionRecords.length > 0 ? '没有符合筛选条件的记录' : '该学生还没有参赛记录'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div 
            className={`relative top-20 mx-auto p-5 border dark:border-gray-600 w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 ${
              dragActive ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">编辑学生信息</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Avatar Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  头像
                </label>
                <div className="flex items-center space-x-4">
                  {/* Current Avatar Display */}
                  <div className="flex-shrink-0">
                    {editingStudent?.avatar && editingStudent.avatar.trim() !== '' ? (
                      <img
                        src={editingStudent.avatar}
                        alt="头像预览"
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                        <User className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Upload Controls */}
                  <div className="flex-1">
                    <div className="flex space-x-2">
                      <label className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <Camera className="w-4 h-4 mr-2" />
                        选择图片
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                      {editingStudent?.avatar && (
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-2" />
                          移除
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      支持 JPG、PNG 格式，文件大小不超过 5MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Image Cropping Section */}
              {selectedImage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    裁剪头像
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 dark:bg-gray-700">
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={1}
                      minWidth={50}
                      minHeight={50}
                      keepSelection
                    >
                      <img
                        ref={imgRef}
                        alt="裁剪预览"
                        src={selectedImage}
                        style={{ maxHeight: '300px', maxWidth: '100%' }}
                        onLoad={onImageLoad}
                      />
                    </ReactCrop>
                    <div className="mt-3 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={generateCroppedImage}
                        disabled={!completedCrop?.width || !completedCrop?.height}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        确认裁剪
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null);
                          setCroppedImageUrl('');
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                  <canvas
                    ref={previewCanvasRef}
                    style={{ display: 'none' }}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  姓名
                </label>
                <input
                  type="text"
                  value={editingStudent?.name || ''}
                  onChange={(e) => handleEditFormChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  年级
                </label>
                <select
                  value={editingStudent?.gradeOnly || ''}
                  onChange={(e) => {
                    handleEditFormChange('gradeOnly', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">选择年级</option>
                  <option value="一年级">一年级</option>
                  <option value="二年级">二年级</option>
                  <option value="三年级">三年级</option>
                  <option value="四年级">四年级</option>
                  <option value="五年级">五年级</option>
                  <option value="六年级">六年级</option>
                  <option value="初一">初一</option>
                  <option value="初二">初二</option>
                  <option value="初三">初三</option>
                  <option value="高一">高一</option>
                  <option value="高二">高二</option>
                  <option value="高三">高三</option>
                  <option value="已毕业队员">已毕业队员</option>
                </select>
              </div>

              {editingStudent?.gradeOnly && editingStudent.gradeOnly !== '已毕业队员' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    班级
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editingStudent?.classNumber || ''}
                    onChange={(e) => {
                      handleEditFormChange('classNumber', e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入班级号码 (1-50)"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  性别
                </label>
                <select
                  value={editingStudent?.gender || ''}
                  onChange={(e) => handleEditFormChange('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">请选择性别</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  生日
                </label>
                <input
                  type="date"
                  value={editingStudent?.birthday || ''}
                  onChange={(e) => handleEditFormChange('birthday', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveStudent}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;