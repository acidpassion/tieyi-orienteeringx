import { useState, useEffect } from 'react';
import axios from '../../config/axiosConfig';
import { toast } from 'react-toastify';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../context/AuthContext';

import { createApiUrl } from '../../config/api';
import { Plus, BookOpen, Users, Calendar, Eye, Edit, Trash2, X, ChevronDown } from 'lucide-react';

// Multi-select grade dropdown component
const GradeMultiSelect = ({ grades, selectedGrades, onGradeChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleGradeToggle = (grade) => {
    const newSelectedGrades = selectedGrades.includes(grade)
      ? selectedGrades.filter(g => g !== grade)
      : [...selectedGrades, grade];
    onGradeChange(newSelectedGrades);
  };

  const handleSelectAll = () => {
    onGradeChange(grades);
  };

  const handleClearAll = () => {
    onGradeChange([]);
  };

  const getDisplayText = () => {
    if (selectedGrades.length === 0) return '所有年级';
    if (selectedGrades.length === 1) return selectedGrades[0];
    return `${selectedGrades.length} 个年级`;
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
      >
        <span>{getDisplayText()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              >
                全选
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                清空
              </button>
            </div>
          </div>
          {grades.map(grade => (
            <label
              key={grade}
              className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedGrades.includes(grade)}
                onChange={() => handleGradeToggle(grade)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
              />
              <span className="text-sm text-gray-900 dark:text-white">{grade}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const { getLocalizedText } = useLanguage();
  const { user } = useAuth();


  const [newAssignment, setNewAssignment] = useState({
    quizId: '',
    title: '',
    selectedStudents: [],
    co_owned: [],
    dueDate: ''
  });

  const [editingAssignment, setEditingAssignment] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [coaches, setCoaches] = useState([]);

  const [studentFilter, setStudentFilter] = useState({
    grades: [],
    search: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assignmentsRes, quizzesRes, studentsRes, allUsersRes] = await Promise.all([
        axios.get(createApiUrl('/api/assignments/coach')),
        axios.get(createApiUrl('/api/quizzes')),
        axios.get(createApiUrl('/api/students')),
        axios.get(createApiUrl('/api/students/all'))
      ]);

      console.log('DEBUG: Loaded quizzes:', quizzesRes.data);
      console.log('DEBUG: Number of quizzes loaded:', quizzesRes.data.length);

      setAssignments(assignmentsRes.data);
      setQuizzes(quizzesRes.data);
      setStudents(studentsRes.data);
      setCoaches(allUsersRes.data.filter(s => s.role === 'coach' || s.role === 'IT'));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.quizId || !newAssignment.title || !newAssignment.dueDate || newAssignment.selectedStudents.length === 0) {
      toast.error('请填写所有必填字段并至少选择一名学生');
      return;
    }

    setCreating(true);
    try {
      // Create one assignment with multiple students
      await axios.post(createApiUrl('/api/assignments'), {
        quizId: newAssignment.quizId,
        title: newAssignment.title,
        assignedTo: newAssignment.selectedStudents, // Send array of student IDs
        co_owned: newAssignment.co_owned, // Send array of co-owner IDs
        dueDate: newAssignment.dueDate
      });

      // Refresh assignments list
      await fetchData();

      // Reset form and close modal
      setNewAssignment({
        quizId: '',
        title: '',
        selectedStudents: [],
        co_owned: [],
        dueDate: ''
      });
      setStudentFilter({
        grade: '',
        search: ''
      });
      setShowCreateModal(false);

      toast.success(`成功为${newAssignment.selectedStudents.length}名学生创建作业！`);
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('创建作业时出错，请重试。');
    } finally {
      setCreating(false);
    }
  };

  const handleStudentSelection = (studentId) => {
    setNewAssignment(prev => ({
      ...prev,
      selectedStudents: prev.selectedStudents.includes(studentId)
        ? prev.selectedStudents.filter(id => id !== studentId)
        : [...prev.selectedStudents, studentId]
    }));
  };

  const selectAllStudents = () => {
    setNewAssignment(prev => ({
      ...prev,
      selectedStudents: students.map(s => s._id)
    }));
  };

  const deselectAllStudents = () => {
    setNewAssignment(prev => ({
      ...prev,
      selectedStudents: []
    }));
  };

  const handleEditAssignment = (assignment) => {
    console.log('DEBUG: Editing assignment:', assignment);
    console.log('DEBUG: Assignment quizId:', assignment.quizId);
    console.log('DEBUG: Available quizzes:', quizzes);
    console.log('DEBUG: Number of available quizzes:', quizzes.length);

    // Format the due date for datetime-local input (YYYY-MM-DDTHH:MM)
    const formatDateForInput = (dateString) => {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Extract quiz ID - handle both populated and non-populated cases
    let extractedQuizId = '';

    if (assignment.quizId) {
      if (typeof assignment.quizId === 'object' && assignment.quizId !== null) {
        if (assignment.quizId._id) {
          // Populated quiz object with _id
          extractedQuizId = assignment.quizId._id;
        }
      } else if (typeof assignment.quizId === 'string') {
        // Direct quiz ID string
        extractedQuizId = assignment.quizId;
      }
    }
    // If quizId is null, keep extractedQuizId as empty string

    console.log('DEBUG: Extracted quizId:', extractedQuizId);

    // Only check for matching quiz if we have a valid extractedQuizId
    let matchingQuiz = null;
    if (extractedQuizId) {
      matchingQuiz = quizzes.find(q => String(q._id) === String(extractedQuizId));
      console.log('DEBUG: Matching quiz found:', matchingQuiz);
      
      if (!matchingQuiz) {
        console.log('DEBUG: Quiz not found in current list, clearing quizId');
        // Clear the quiz ID so user can select a new one
        extractedQuizId = '';
      }
    } else {
      console.log('DEBUG: No quizId to match (assignment.quizId was null)');
    }

    setEditingAssignment({
      ...assignment,
      quizId: String(extractedQuizId), // Convert to string for consistent comparison
      selectedStudents: assignment.assignedTo.map(s => s.studentId?._id || s._id).filter(Boolean),
      co_owned: assignment.co_owned?.map(c => c._id).filter(Boolean) || [],
      dueDate: formatDateForInput(assignment.dueDate)
    });
    setShowEditModal(true);
  };

  const handleUpdateAssignment = async () => {
    if (!editingAssignment.quizId || !editingAssignment.title || !editingAssignment.dueDate || editingAssignment.selectedStudents.length === 0) {
      toast.error('请填上所有必填内容');
      return;
    }

    setCreating(true);
    try {
      await axios.put(createApiUrl(`/api/assignments/${editingAssignment._id}`), {
        quizId: editingAssignment.quizId,
        title: editingAssignment.title,
        assignedTo: editingAssignment.selectedStudents,
        co_owned: editingAssignment.co_owned,
        dueDate: editingAssignment.dueDate
      });

      await fetchData();
      setShowEditModal(false);
      setEditingAssignment(null);

      toast.success('作业已更新');
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('更新作业失败，稍后重试');
    } finally {
      setCreating(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingAssignment(null);
  };

  const handleDeleteAssignment = (assignment) => {
    if (!canDeleteAssignment(assignment)) {
      toast.error('无可更新作业');
      return;
    }

    setDeletingAssignment(assignment);
    setShowDeleteModal(true);
  };

  const confirmDeleteAssignment = async () => {
    if (!deletingAssignment) return;

    try {
      await axios.delete(createApiUrl(`/api/assignments/${deletingAssignment._id}`));

      // Refresh assignments list
      await fetchData();

      toast.success('作业已成功删除');
      closeDeleteModal();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('删除出错，稍后重试');
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingAssignment(null);
  };

  const getFilteredStudents = () => {
    return students.filter(student => {
      const matchesGrade = studentFilter.grades.length === 0 || 
        studentFilter.grades.some(grade => {
          // Handle both old combined format and new separate format
          if (student.class) {
            // New format: separate grade and class fields
            return student.grade === grade;
          } else {
            // Old format: combined grade field (for backward compatibility)
            return student.grade.startsWith(grade);
          }
        });
      const matchesSearch = !studentFilter.search ||
        student.name.toLowerCase().includes(studentFilter.search.toLowerCase());
      return matchesGrade && matchesSearch;
    });
  };

  const getUniqueGrades = () => {
    const grades = [...new Set(students.map(student => {
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

  const getAvailableCoOwners = () => {
    // Filter out the current user from the co-owners list
    return coaches.filter(coach => coach._id !== user?.id);
  };

  const canDeleteAssignment = (assignment) => {
    if (!user) return false;

    // Check if user is the creator
    const isCreator = assignment.assignedBy?._id === user.id || assignment.assignedBy === user.id;

    // Check if user is a co-owner
    const isCoOwner = assignment.co_owned?.some(coOwner =>
      (typeof coOwner === 'object' ? coOwner._id : coOwner) === user.id
    );

    return isCreator || isCoOwner;
  };

  const selectAllFilteredStudents = () => {
    const filteredStudents = getFilteredStudents();
    const filteredIds = filteredStudents.map(s => s._id);
    setNewAssignment(prev => ({
      ...prev,
      selectedStudents: [...new Set([...prev.selectedStudents, ...filteredIds])]
    }));
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">作业管理</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            为学生创建和管理测验作业
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          新建作业
        </button>
      </div>

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无作业</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            开始创建新的作业吧。
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {assignments.map((assignment) => (
              <li key={assignment._id}>
                <div className="relative px-4 py-4 sm:px-6">
                  {/* 状态标签 - 移到左上角 */}
                  <div className="absolute top-4 right-4 z-10">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${assignment.status === 'completed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                      {assignment.status}
                    </span>
                  </div>

                  {/* 主要内容区域 */}
                  <div className="pr-20 pb-12">
                    {/* 标题和测验信息 */}
                    <div className="mb-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1 leading-tight">
                        {assignment.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        测验: {getLocalizedText(assignment.quizId?.quiz_title, assignment.quizId?.quiz_title_cn)}
                      </p>
                    </div>

                    {/* 分配信息 */}
                    <div className="mb-2">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                        <Users className="flex-shrink-0 mr-1.5 h-4 w-4" />
                        <span>
                          分配给: {Array.isArray(assignment.assignedTo)
                            ? `${assignment.assignedTo.length} 名学生`
                            : assignment.assignedTo?.name || '未知'}
                        </span>
                      </div>
                      {Array.isArray(assignment.assignedTo) && assignment.assignedTo.length > 0 && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 ml-5">
                          学生: {assignment.assignedTo.slice(0, 3).map(item => item.studentId?.name || item.studentId?.username || '未知').join(', ')}
                          {assignment.assignedTo.length > 3 && ` 等 ${assignment.assignedTo.length - 3} 人...`}
                        </div>
                      )}
                    </div>

                    {/* 截止时间 */}
                    <div className="mb-2">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                        <span>截止时间: {formatDate(assignment.dueDate)}</span>
                      </div>
                    </div>

                    {/* 协作者信息 */}
                    {assignment.co_owned && assignment.co_owned.length > 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        协作者: {assignment.co_owned.map(coOwner => coOwner.name || coOwner.username).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 - 移到右下角 */}
                  <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                    <button
                      onClick={() => window.location.href = `/coach/assignments/${assignment._id}/status`}
                      className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"
                      title="查看状态"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditAssignment(assignment)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"
                      title="编辑作业"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {canDeleteAssignment(assignment) && (
                      <button
                        onClick={() => handleDeleteAssignment(assignment)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"
                        title="删除作业"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)}></div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    创建新作业
                  </h3>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setStudentFilter({ grades: [], search: '' });
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Quiz Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      选择测验
                    </label>
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      value={newAssignment.quizId}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, quizId: e.target.value }))}
                    >
                      <option value="">选择一个测验...</option>
                      {quizzes.map(quiz => (
                        <option key={quiz._id} value={String(quiz._id)}>
                          {getLocalizedText(quiz.quiz_title, quiz.quiz_title_cn)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assignment Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      作业标题 *
                    </label>
                    <input
                      type="text"
                      placeholder="输入作业标题..."
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      截止日期 *
                    </label>
                    <input
                      type="datetime-local"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      value={newAssignment.dueDate}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>

                  {/* Co-owners Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      协作者 (可选)
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
                      {getAvailableCoOwners().length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
                          暂无其他教练
                        </div>
                      ) : (
                        getAvailableCoOwners().map(coach => (
                          <label
                            key={coach._id}
                            className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                              checked={newAssignment.co_owned.includes(coach._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewAssignment(prev => ({
                                    ...prev,
                                    co_owned: [...prev.co_owned, coach._id]
                                  }));
                                } else {
                                  setNewAssignment(prev => ({
                                    ...prev,
                                    co_owned: prev.co_owned.filter(id => id !== coach._id)
                                  }));
                                }
                              }}
                            />
                            <div className="ml-3 flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {coach.name}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                                  {coach.role}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Student Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        选择学生 (已选择 {newAssignment.selectedStudents.length} 人)
                      </label>
                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={selectAllFilteredStudents}
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          选择筛选结果
                        </button>
                        <button
                          type="button"
                          onClick={selectAllStudents}
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          全选
                        </button>
                        <button
                          type="button"
                          onClick={deselectAllStudents}
                          className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          清空
                        </button>
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="搜索学生..."
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        value={studentFilter.search}
                        onChange={(e) => setStudentFilter(prev => ({ ...prev, search: e.target.value }))}
                      />
                      <GradeMultiSelect
                        grades={getUniqueGrades()}
                        selectedGrades={studentFilter.grades}
                        onGradeChange={(grades) => setStudentFilter(prev => ({ ...prev, grades }))}
                      />
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      显示 {getFilteredStudents().length} / {students.length} 名学生
                    </div>

                    <div className="max-h-80 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
                      {getFilteredStudents().length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          没有学生符合当前筛选条件
                        </div>
                      ) : (
                        getFilteredStudents().map(student => (
                          <label
                            key={student._id}
                            className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                              checked={newAssignment.selectedStudents.includes(student._id)}
                              onChange={() => handleStudentSelection(student._id)}
                            />
                            <div className="ml-3 flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {student.name}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                                  {student.class ? `${student.grade}${student.class}班` : student.grade}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleCreateAssignment}
                  disabled={creating}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? '创建中...' : '创建作业'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setStudentFilter({ grade: '', search: '' });
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-500"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {showEditModal && editingAssignment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeEditModal}></div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    编辑作业
                  </h3>
                  <button
                    onClick={closeEditModal}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Quiz Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      选择测验
                    </label>
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      value={editingAssignment.quizId}
                      onChange={(e) => setEditingAssignment(prev => ({ ...prev, quizId: e.target.value }))}
                    >
                      <option value="">
                        {!editingAssignment.quizId && editingAssignment.title ?
                          '⚠️ 原测验未找到 - 请选择新测验...' :
                          '选择测验...'
                        }
                      </option>
                      {quizzes.map(quiz => (
                        <option key={quiz._id} value={String(quiz._id)}>
                          {getLocalizedText(quiz.quiz_title, quiz.quiz_title_cn)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assignment Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      作业标题 *
                    </label>
                    <input
                      type="text"
                      placeholder="输入作业标题..."
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      value={editingAssignment.title}
                      onChange={(e) => setEditingAssignment(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      截止日期 *
                    </label>
                    <input
                      type="datetime-local"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      value={editingAssignment.dueDate}
                      onChange={(e) => setEditingAssignment(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>

                  {/* Co-owners Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Co-owners ({editingAssignment.co_owned.length} selected)
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
                      {getAvailableCoOwners().length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
                          No other coaches available
                        </div>
                      ) : (
                        getAvailableCoOwners().map(coach => (
                          <label
                            key={coach._id}
                            className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                              checked={editingAssignment.co_owned.includes(coach._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditingAssignment(prev => ({
                                    ...prev,
                                    co_owned: [...prev.co_owned, coach._id]
                                  }));
                                } else {
                                  setEditingAssignment(prev => ({
                                    ...prev,
                                    co_owned: prev.co_owned.filter(id => id !== coach._id)
                                  }));
                                }
                              }}
                            />
                            <div className="ml-3 flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {coach.name}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                                  {coach.role}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Student Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        选择学生 (已选择 {editingAssignment.selectedStudents.length} 人)
                      </label>
                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingAssignment(prev => ({
                            ...prev,
                            selectedStudents: students.map(s => s._id)
                          }))}
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          全选
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAssignment(prev => ({
                            ...prev,
                            selectedStudents: []
                          }))}
                          className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          清空
                        </button>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
                      {students.map(student => (
                        <label
                          key={student._id}
                          className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                            checked={editingAssignment.selectedStudents.includes(student._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingAssignment(prev => ({
                                  ...prev,
                                  selectedStudents: [...prev.selectedStudents, student._id]
                                }));
                              } else {
                                setEditingAssignment(prev => ({
                                  ...prev,
                                  selectedStudents: prev.selectedStudents.filter(id => id !== student._id)
                                }));
                              }
                            }}
                          />
                          <div className="ml-3 flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {student.name}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                                {student.class ? `${student.grade}${student.class}班` : student.grade}
                              </span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleUpdateAssignment}
                  disabled={creating}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? '更新中...' : '更新作业'}
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
                确认删除作业
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  您确定要删除作业 <span className="font-semibold">{deletingAssignment?.title}</span> 吗？
                  此操作无法撤销。
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={confirmDeleteAssignment}
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
    </div>
  );
};

export default Assignments;