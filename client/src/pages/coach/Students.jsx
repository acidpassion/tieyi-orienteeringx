import { useState, useEffect, useRef } from 'react';
import axios from '../../config/axiosConfig';
import { toast } from 'react-toastify';
import { createApiUrl } from '../../config/api';
import { Users, Search, Edit, X, Save, User, Camera, Check, Upload, ChevronDown, Trash2, FileText } from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Simple Avatar Component - Direct approach
const SimpleAvatar = ({ src, name, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-16 w-16', 
    lg: 'h-24 w-24',
    xl: 'h-32 w-32'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      {src && src.startsWith('data:image/') ? (
        <img
          className={`w-full h-full rounded-full object-cover shadow-md`}
          src={src}
          alt={name || 'Profile picture'}
        />
      ) : (
        <DefaultAvatar name={name} size={size} />
      )}
    </div>
  );
};

// Default Avatar Component
const DefaultAvatar = ({ name, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-16 w-16', 
    lg: 'h-24 w-24',
    xl: 'h-32 w-32'
  };
  
  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12', 
    xl: 'h-16 w-16'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm', 
    lg: 'text-lg',
    xl: 'text-xl'
  };

  // Generate initials from name
  const getInitials = (fullName) => {
    if (!fullName || fullName.trim().length === 0) return '';
    
    const names = fullName.trim().split(' ').filter(n => n.length > 0);
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return names.slice(0, 2).map(n => n.charAt(0).toUpperCase()).join('');
  };

  const initials = getInitials(name);
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center shadow-lg ${className}`}>
      <div className="relative flex items-center justify-center">
        {initials ? (
          <span className={`font-semibold text-white ${textSizes[size]}`}>
            {initials}
          </span>
        ) : (
          <User className={`${iconSizes[size]} text-white opacity-90`} />
        )}
      </div>
    </div>
  );
};

// Multi-select grade dropdown component
const GradeMultiSelect = ({ selectedGrades, availableGrades, onGradeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGradeToggle = (grade) => {
    const newSelectedGrades = selectedGrades.includes(grade)
      ? selectedGrades.filter(g => g !== grade)
      : [...selectedGrades, grade];
    onGradeChange(newSelectedGrades);
  };

  const handleSelectAll = () => {
    onGradeChange(availableGrades);
  };

  const handleClearAll = () => {
    onGradeChange([]);
  };

  const getDisplayText = () => {
    if (selectedGrades.length === 0) return '所有年级';
    if (selectedGrades.length === 1) return selectedGrades[0];
    return `${selectedGrades.length} 个年级已选择`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{getDisplayText()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Select All / Clear All */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-600">
            <div className="flex justify-between">
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                onClick={handleSelectAll}
              >
                全选
              </button>
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={handleClearAll}
              >
                清空
              </button>
            </div>
          </div>

          {/* Grade Options */}
          {availableGrades.map(grade => (
            <label
              key={grade}
              className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
            >
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={selectedGrades.includes(grade)}
                onChange={() => handleGradeToggle(grade)}
              />
              <span className="ml-2 text-sm text-gray-900 dark:text-white">{grade}</span>
            </label>
          ))}

          {availableGrades.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              暂无年级数据
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Students = () => {
  const [allStudents, setAllStudents] = useState([]); // Store all students for grade options
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Sorting states
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Batch selection states
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [showGenderUpdateModal, setShowGenderUpdateModal] = useState(false);
  const [selectedGender, setSelectedGender] = useState('male');
  
  // Batch upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  
  // Image cropping states
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({ aspect: 1, width: 150, height: 150 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);

  useEffect(() => {
    fetchAllStudents();
  }, []);

  useEffect(() => {
    filterStudentsByGrade();
  }, [allStudents, selectedGrades]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, sortField, sortDirection]);

  const fetchAllStudents = async () => {
    try {
      const response = await axios.get(createApiUrl('/api/students'));
      setAllStudents(response.data);
      setStudents(response.data); // Initially show all students
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterStudentsByGrade = () => {
    if (selectedGrades.length === 0) {
      setStudents(allStudents);
    } else {
      const filtered = allStudents.filter(student => {
        // Handle both old combined format and new separate format
        if (student.class) {
          // New format: separate grade and class fields
          return selectedGrades.some(grade => student.grade === grade);
        } else {
          // Old format: combined grade field (for backward compatibility)
          return selectedGrades.some(grade => student.grade.startsWith(grade));
        }
      });
      setStudents(filtered);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    if (sortField) {
      filtered = sortStudents(filtered, sortField, sortDirection);
    }

    setFilteredStudents(filtered);
  };

  // Sorting function
  const sortStudents = (studentsToSort, field, direction) => {
    return [...studentsToSort].sort((a, b) => {
      let aValue, bValue;
      
      if (field === 'grade') {
        // Special handling for grade sorting
        const gradeOrder = ['初一', '初二', '初三', '高一', '高二', '高三', '已毕业队员'];
        aValue = gradeOrder.indexOf(a.grade);
        bValue = gradeOrder.indexOf(b.grade);
        
        // If grade not found in order, put it at the end
        if (aValue === -1) aValue = gradeOrder.length;
        if (bValue === -1) bValue = gradeOrder.length;
      } else {
        aValue = a[field] || '';
        bValue = b[field] || '';
        
        // For string comparison, convert to lowercase
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      }
      
      if (direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  // Handle column header click for sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, start with ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon for column header
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return null; // No icon if not sorted by this field
    }
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getUniqueGrades = () => {
    const grades = [...new Set(allStudents.map(student => {
      // Handle both old combined format and new separate format
      if (student.class) {
        // New format: separate grade and class fields
        return student.grade;
      } else {
        // Old format: combined grade field (for backward compatibility)
        // Special handling for graduated students to preserve full name
        if (student.grade === '已毕业队员') {
          return student.grade;
        }
        return student.grade.substring(0, 2);
      }
    }))];
    const gradeOrder = ['初一', '初二', '初三', '高一', '高二', '高三', '已毕业队员'];
    return grades.sort((a, b) => {
      const indexA = gradeOrder.indexOf(a);
      const indexB = gradeOrder.indexOf(b);
      return indexA - indexB;
    });
  };

  // Batch selection handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
      setSelectAll(false);
    } else {
      setSelectedStudents(filteredStudents.map(student => student._id));
      setSelectAll(true);
    }
  };

  const handleStudentSelect = (studentId) => {
    const newSelectedStudents = selectedStudents.includes(studentId)
      ? selectedStudents.filter(id => id !== studentId)
      : [...selectedStudents, studentId];
    
    setSelectedStudents(newSelectedStudents);
    setSelectAll(newSelectedStudents.length === filteredStudents.length && filteredStudents.length > 0);
  };

  // Update selectAll state when filteredStudents changes
  useEffect(() => {
    if (filteredStudents.length === 0) {
      setSelectAll(false);
      setSelectedStudents([]);
    } else {
      const allSelected = filteredStudents.every(student => selectedStudents.includes(student._id));
      setSelectAll(allSelected && selectedStudents.length > 0);
    }
  }, [filteredStudents]);

  // Handle batch grade upgrade
  const handleBatchGradeUpgrade = async () => {
    if (selectedStudents.length === 0) {
      toast.error('请先选择要升年级的学生');
      return;
    }

    // Get selected students data
    const selectedStudentsData = filteredStudents.filter(student => 
      selectedStudents.includes(student._id)
    );

    // Check if all selected students have the same grade
    const grades = [...new Set(selectedStudentsData.map(student => student.grade))];
    if (grades.length > 1) {
      toast.error('不能选择不同年级的学生进行批量升年级操作，请重新选择');
      return;
    }

    const currentGrade = grades[0];
    const nextGrade = getNextGrade(currentGrade);

    if (!nextGrade) {
      toast.error(`${currentGrade} 年级无法继续升级`);
      return;
    }

    try {
      setSaving(true);
      
      // Call batch update API
      const response = await axios.put(createApiUrl('/api/students/batch-promote'), {
        studentIds: selectedStudents,
        currentGrade,
        nextGrade
      });

      if (response.data.success) {
        toast.success(`成功将 ${selectedStudents.length} 名学生从 ${currentGrade} 升级到 ${nextGrade}`);
        
        // Refresh student list
        await fetchAllStudents();
        
        // Clear selections
        setSelectedStudents([]);
        setSelectAll(false);
        setShowActionDropdown(false);
      }
    } catch (error) {
      console.error('Batch grade upgrade error:', error);
      toast.error(error.response?.data?.message || '批量升年级失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // Get next grade based on current grade
  const getNextGrade = (currentGrade) => {
    const gradeMap = {
      '初一': '初二',
      '初二': '初三', 
      '初三': '已毕业队员',
      '高一': '高二',
      '高二': '高三',
      '高三': '已毕业队员'
    };
    
    return gradeMap[currentGrade] || null;
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedStudents.length === 0) {
      toast.error('请先选择要删除的学生');
      return;
    }

    try {
      setSaving(true);
      
      const response = await axios.delete(createApiUrl('/api/students/batch-delete'), {
        data: {
          studentIds: selectedStudents
        }
      });

      if (response.data.success) {
        toast.success(`成功删除 ${response.data.deletedCount} 名学生`);
        
        // Refresh student list
        await fetchAllStudents();
        
        // Clear selections
        setSelectedStudents([]);
        setSelectAll(false);
        setShowBatchDeleteModal(false);
        setShowActionDropdown(false);
      }
    } catch (error) {
      console.error('Batch delete error:', error);
      toast.error(error.response?.data?.message || '批量删除失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // Handle batch gender update
  const handleBatchGenderUpdate = async () => {
    if (selectedStudents.length === 0) {
      toast.error('请先选择要更新的学生');
      return;
    }

    try {
      setSaving(true);
      
      const response = await axios.put(createApiUrl('/api/students/batch-update-gender'), {
        studentIds: selectedStudents,
        gender: selectedGender
      });

      if (response.data.success) {
        toast.success(`成功更新 ${response.data.updatedCount} 名学生的性别`);
        
        // Refresh student list
        await fetchAllStudents();
        
        // Clear selections
        setSelectedStudents([]);
        setSelectAll(false);
        setShowGenderUpdateModal(false);
        setShowActionDropdown(false);
      }
    } catch (error) {
      console.error('Batch gender update error:', error);
      toast.error(error.response?.data?.message || '批量更新性别失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // Helper function to parse grade and class from combined grade string
  const parseGradeAndClass = (gradeString) => {
    if (!gradeString) return { gradeOnly: '', classNumber: '1' };
    
    // If it's "已毕业队员", return as is
    if (gradeString === '已毕业队员') {
      return { gradeOnly: '已毕业队员', classNumber: '' };
    }
    
    // Try to match pattern like "初一3班", "高二10班" (with "班" character)
    const matchWithBan = gradeString.match(/^(初一|初二|初三|高一|高二|高三)(\d+)班$/);
    if (matchWithBan) {
      return { gradeOnly: matchWithBan[1], classNumber: matchWithBan[2] };
    }
    
    // Try to match pattern like "初一3", "高二10" (without "班" character)
    const matchWithoutBan = gradeString.match(/^(初一|初二|初三|高一|高二|高三)(\d+)$/);
    if (matchWithoutBan) {
      return { gradeOnly: matchWithoutBan[1], classNumber: matchWithoutBan[2] };
    }
    
    // For backward compatibility, if it doesn't match the new pattern,
    // treat the whole string as gradeOnly and default class to 1
    const validGrades = ['初一', '初二', '初三', '高一', '高二', '高三', '已毕业队员'];
    if (validGrades.includes(gradeString)) {
      return { gradeOnly: gradeString, classNumber: gradeString === '已毕业队员' ? '' : '1' };
    }
    
    // If it's an old format, try to extract grade part
    return { gradeOnly: '', classNumber: '1' };
  };

  const handleEditStudent = (student) => {
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
      classNumber
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

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      cropWidth,
      cropHeight,
      0,
      0,
      size,
      size
    );

    // Convert to base64 with compression
    const base64Image = canvas.toDataURL('image/jpeg', 0.7); // Reduced quality for smaller size
    setCroppedImageUrl(base64Image);
    setEditingStudent(prev => ({
      ...prev,
      avatar: base64Image
    }));
  };

  const handleSaveStudent = async () => {
    if (!editingStudent.name || !editingStudent.gradeOnly) {
      toast.error('请填写所有必填字段');
      return;
    }

    // Validate class number for non-graduated students
    if (editingStudent.gradeOnly !== '已毕业队员' && (!editingStudent.classNumber || editingStudent.classNumber < 1 || editingStudent.classNumber > 50)) {
      toast.error('请选择有效的班级（1-50）');
      return;
    }

    setSaving(true);
    try {
      let response;
      const studentData = {
        name: editingStudent.name,
        grade: editingStudent.gradeOnly,
        role: editingStudent.role,
        avatar: editingStudent.avatar,
        gender: editingStudent.gender,
        birthday: editingStudent.birthday
      };

      // Add class field only for non-graduated students
      if (editingStudent.gradeOnly !== '已毕业队员') {
        studentData.class = parseInt(editingStudent.classNumber);
      }

      if (isCreatingNew) {
        response = await axios.post(createApiUrl('/api/students'), studentData);
        // Add new student to the list
        setStudents(prev => [...prev, response.data]);
        setAllStudents(prev => [...prev, response.data]);
        toast.success('学生创建成功！');
      } else {
        response = await axios.put(createApiUrl(`/api/students/${editingStudent._id}`), studentData);
        // Update the student in the local state
        setStudents(prev => prev.map(student => 
          student._id === editingStudent._id ? response.data : student
        ));
        setAllStudents(prev => prev.map(student => 
          student._id === editingStudent._id ? response.data : student
        ));
        toast.success('学生更新成功！');
      }

      setShowEditModal(false);
      setEditingStudent(null);
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error('保存学生信息时出错，请重试。');
    } finally {
      setSaving(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingStudent(null);
    setIsCreatingNew(false);
    setSelectedImage(null);
    setCroppedImageUrl('');
    setDragActive(false);
  };

  const handleDeleteStudent = (student) => {
    setDeletingStudent(student);
    setShowDeleteModal(true);
  };

  const confirmDeleteStudent = async () => {
    if (!deletingStudent) return;
    
    try {
      const response = await fetch(createApiUrl(`/api/students/${deletingStudent._id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        // Remove student from local state
        setStudents(students.filter(s => s._id !== deletingStudent._id));
        setShowDeleteModal(false);
        setDeletingStudent(null);
      } else {
        const errorData = await response.json();
        alert(`删除失败: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Delete student error:', error);
      alert('删除学生时发生错误');
    }
  };

  const handleCreateNewStudent = () => {
    setEditingStudent({
      name: '',
      gradeOnly: '',
      classNumber: '1',
      role: 'student',
      avatar: '',
      gender: '男',
      birthday: ''
    });
    setIsCreatingNew(true);
    setShowEditModal(true);
  };

  // Handle batch upload
  const handleBatchUpload = () => {
    setShowUploadModal(true);
    setUploadFile(null);
    setUploadResults(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('只支持 Excel (.xlsx, .xls) 和 CSV 文件格式');
        return;
      }
      
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('文件大小不能超过 5MB');
        return;
      }
      
      setUploadFile(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      toast.error('请选择要上传的文件');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await axios.post(
        createApiUrl('/api/students/batch-upload'),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        setUploadResults(response.data.results);
        toast.success(response.data.message);
        
        // Refresh student list if any students were created or updated
        if (response.data.results.created > 0 || response.data.results.duplicates > 0) {
          await fetchAllStudents();
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadResults(null);
    setUploading(false);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingStudent(null);
  };

  const removeAvatar = () => {
    setEditingStudent(prev => ({
      ...prev,
      avatar: ''
    }));
    setSelectedImage(null);
    setCroppedImageUrl('');
  };

  const handlePaste = async (e) => {
    e.preventDefault();
    const items = e.clipboardData?.items;
    
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          // Check file size (5MB limit)
          if (file.size > 5 * 1024 * 1024) {
            toast.error('粘贴的图片过大，请使用小于5MB的图片。');
            return;
          }
          
          const reader = new FileReader();
          reader.onload = (event) => {
            setSelectedImage(event.target.result);
            setCroppedImageUrl('');
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      // The paste event will be handled by handlePaste
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        toast.error('请拖放图片文件。');
        return;
      }
      
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('图片文件过大，请选择小于5MB的图片。');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target.result);
        setCroppedImageUrl('');
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">学生管理</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          管理和查看所有学生
        </p>
      </div>

      {/* Filters and Add Button */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="搜索学生..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="sm:w-48 relative">
          <GradeMultiSelect 
            selectedGrades={selectedGrades}
            availableGrades={getUniqueGrades()}
            onGradeChange={setSelectedGrades}
          />
        </div>
        <div className="flex items-center gap-3">
          {/* Batch Action Dropdown */}
          {selectedStudents.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowActionDropdown(!showActionDropdown)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
              >
                批量操作 ({selectedStudents.length})
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showActionDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showActionDropdown && (
                <div className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 w-48 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={handleBatchGradeUpgrade}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      升年级
                    </button>
                    <button
                      onClick={() => {
                        setShowGenderUpdateModal(true);
                        setShowActionDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      批量更新性别
                    </button>
                    <button
                      onClick={() => {
                        setShowBatchDeleteModal(true);
                        setShowActionDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex space-x-3">
            <button
              onClick={handleCreateNewStudent}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Users className="h-4 w-4 mr-2" />
              添加学生
            </button>
            <button
              onClick={handleBatchUpload}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Upload className="h-4 w-4 mr-2" />
              上传队员
            </button>
          </div>
        </div>
      </div>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">未找到学生</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || selectedGrades.length > 0 ? '请尝试调整筛选条件。' : '暂未添加学生。'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-x-auto sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-2 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  学生信息
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                  <button
                    onClick={() => handleSort('grade')}
                    className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                    title="点击排序"
                  >
                    <span>年级</span>
                    {getSortIcon('grade') && (
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        {getSortIcon('grade')}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStudents.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-2 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={selectedStudents.includes(student._id)}
                      onChange={() => handleStudentSelect(student._id)}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <SimpleAvatar 
                        src={student.avatar} 
                        name={student.name} 
                        size="sm" 
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {student.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{student.grade}</div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => window.location.href = `/coach/students/${student._id}`}
                        className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        title="查看档案"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditStudent(student)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="编辑学生"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="删除学生"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
显示 {filteredStudents.length} / {students.length} 名学生
      </div>

      {/* Edit Student Modal */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeEditModal}></div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-[90vw] sm:w-full sm:max-w-4xl">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {isCreatingNew ? '添加学生' : '编辑学生'}
                  </h3>
                  <button
                    onClick={closeEditModal}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Avatar Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                      头像
                    </label>
                    
                    {/* Unified Upload Area with Avatar Preview */}
                    <div 
                      className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                        dragActive 
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onPaste={handlePaste}
                      tabIndex={0}
                      onKeyDown={handleKeyDown}
                    >
                      {/* Avatar Preview - Centered at top */}
                      <div className="flex justify-center mb-3">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-lg bg-gray-100 dark:bg-gray-700">
                          <SimpleAvatar 
                            src={croppedImageUrl || editingStudent.avatar} 
                            name={editingStudent.name} 
                            size="md" 
                            className="rounded-full"
                          />
                        </div>
                      </div>

                      {/* Upload Content */}
                      <div className="space-y-2">
                        {/* Upload Text */}
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            拖拽图片到此处或{' '}
                            <label
                              htmlFor="avatar-upload"
                              className="text-blue-600 hover:text-blue-700 cursor-pointer underline"
                            >
                              浏览文件
                            </label>
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            支持 JPG、PNG 或 GIF 格式
                          </p>
                        </div>

                        {/* Remove Photo Button */}
                        {(croppedImageUrl || editingStudent.avatar) && (
                          <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                            <button
                              onClick={removeAvatar}
                              className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            >
                              移除当前照片
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Hidden File Input */}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="avatar-upload"
                      />
                    </div>



                    {/* Image Cropping */}
                    {selectedImage && (
                      <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center mb-3">
                          <div className="h-2 w-2 bg-blue-500 rounded-full mr-2"></div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            裁剪照片
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          拖拽调整位置并调整圆圈大小以完美框选面部
                        </p>
                        
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-inner">
                          <ReactCrop
                            crop={crop}
                            onChange={(newCrop) => setCrop(newCrop)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={1}
                            circularCrop
                            className="max-w-full"
                          >
                            <img
                              ref={imgRef}
                              alt="Crop preview"
                              src={selectedImage}
                              style={{ maxHeight: '300px', maxWidth: '100%', borderRadius: '8px' }}
                              onLoad={onImageLoad}
                            />
                          </ReactCrop>
                        </div>
                        
                        <div className="mt-4 flex justify-between items-center">
                          <button
                            onClick={() => {
                              setSelectedImage(null);
                              setCroppedImageUrl('');
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          >
取消
                          </button>
                          <button
                            onClick={generateCroppedImage}
                            disabled={!completedCrop}
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
                          >
                            <Check className="h-4 w-4 mr-2" />
应用裁剪
                          </button>
                        </div>
                        
                        <canvas
                          ref={previewCanvasRef}
                          style={{ display: 'none' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Student Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        姓名 *
                      </label>
                      <input
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        value={editingStudent.name}
                        onChange={(e) => setEditingStudent(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        性别
                      </label>
                      <select
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        value={editingStudent.gender || '男'}
                        onChange={(e) => setEditingStudent(prev => ({ ...prev, gender: e.target.value }))}
                      >
                        <option value="男">男</option>
                        <option value="女">女</option>
                      </select>
                    </div>

                    {/* Birthday */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        生日
                      </label>
                      <input
                        type="date"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        value={editingStudent.birthday ? new Date(editingStudent.birthday).toISOString().split('T')[0] : ''}
                        onChange={(e) => setEditingStudent(prev => ({ ...prev, birthday: e.target.value ? new Date(e.target.value) : null }))}
                      />
                    </div>

                    {/* Grade */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        年级 *
                      </label>
                      <select
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        value={editingStudent.gradeOnly || ''}
                        onChange={(e) => {
                          const gradeOnly = e.target.value;
                          setEditingStudent(prev => ({ 
                            ...prev, 
                            gradeOnly
                          }));
                        }}
                      >
                        <option value="">请选择年级</option>
                        <option value="初一">初一</option>
                        <option value="初二">初二</option>
                        <option value="初三">初三</option>
                        <option value="高一">高一</option>
                        <option value="高二">高二</option>
                        <option value="高三">高三</option>
                        <option value="已毕业队员">已毕业队员</option>
                      </select>
                    </div>

                    {/* Class Number */}
                    {editingStudent.gradeOnly && editingStudent.gradeOnly !== '已毕业队员' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          班级 *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          value={editingStudent.classNumber || '1'}
                          onChange={(e) => {
                            const classNumber = e.target.value;
                            setEditingStudent(prev => ({ 
                              ...prev, 
                              classNumber
                            }));
                          }}
                          placeholder="请输入班级号（1-50）"
                        />
                      </div>
                    )}

                    {/* Role */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        角色
                      </label>
                      <select
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        value={editingStudent.role}
                        onChange={(e) => setEditingStudent(prev => ({ ...prev, role: e.target.value }))}
                      >
                        <option value="student">学生</option>
                        <option value="coach">教练</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                    type="button"
                    onClick={handleSaveStudent}
                    disabled={saving}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? '保存中...' : (isCreatingNew ? '创建学生' : '保存更改')}
                  </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500"
                >
取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">
                确认删除学生
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  您确定要删除学生 <span className="font-semibold">{deletingStudent?.name}</span> 吗？
                  此操作无法撤销。
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={confirmDeleteStudent}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 mb-2"
                >
                  确认删除
                </button>
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
                <Upload className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4 text-center">
                批量上传队员
              </h3>
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  支持Excel (.xlsx) 和 CSV (.csv) 格式文件，文件需包含"姓名"和"班级"列。
                </p>
                
                <div 
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center"
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer.files;
                    if (files && files[0]) {
                      const file = files[0];
                      const fileType = file.type;
                      const fileName = file.name.toLowerCase();
                      
                      // Check if it's a valid file type
                      if (fileType.includes('sheet') || fileType.includes('excel') || 
                          fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || 
                          fileType === 'text/csv' || fileName.endsWith('.csv')) {
                        setUploadFile(file);
                      } else {
                        toast.error('请选择Excel (.xlsx, .xls) 或 CSV (.csv) 文件');
                      }
                    }
                  }}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      点击选择文件或拖拽文件到此处
                    </span>
                  </label>
                  
                  {uploadFile && (
                    <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        已选择: {uploadFile.name}
                      </span>
                    </div>
                  )}
                </div>
                
                {uploadResults && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      上传结果
                    </h4>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p>成功上传: {uploadResults.created}人</p>
                      <p>更新: {uploadResults.duplicates}人</p>
                      {uploadResults.errors > 0 && (
                        <p className="text-red-600 dark:text-red-400">
                          错误: {uploadResults.errors}人
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closeUploadModal}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-md shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  关闭
                </button>
                <button
                  onClick={handleUploadSubmit}
                  disabled={!uploadFile || uploading}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? '上传中...' : '开始上传'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">
                确认批量删除学生
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  您确定要删除选中的 <span className="font-semibold">{selectedStudents.length}</span> 名学生吗？
                  此操作无法撤销。
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleBatchDelete}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 mb-2"
                >
                  确认删除
                </button>
                <button
                  onClick={() => setShowBatchDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gender Update Modal */}
      {showGenderUpdateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4 text-center">
                批量更新性别
              </h3>
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  为选中的 <span className="font-semibold">{selectedStudents.length}</span> 名学生更新性别：
                </p>
                
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="男"
                      checked={selectedGender === '男'}
                      onChange={(e) => setSelectedGender(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">男</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="女"
                      checked={selectedGender === '女'}
                      onChange={(e) => setSelectedGender(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">女</span>
                  </label>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowGenderUpdateModal(false);
                    setSelectedGender('');
                  }}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-md shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleBatchGenderUpdate}
                  disabled={!selectedGender}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  更新性别
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;