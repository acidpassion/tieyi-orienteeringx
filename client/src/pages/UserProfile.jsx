import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { User, Edit, Save, X, Calendar, MapPin, Trophy, Medal, Shield, BookOpen, Plus } from 'lucide-react';
import CompletionRecordsTable from '../components/CompletionRecordsTable';
import CompetitionRecordForm from '../components/CompetitionRecordForm';


const UserProfile = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [completionRecords, setCompletionRecords] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [events, setEvents] = useState([]);
  const [editFormData, setEditFormData] = useState(null);
  
  // Get student ID from URL parameter, fallback to user.id
  const studentId = searchParams.get('id') || user?.id;

  // Initialize activeTab based on URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'info' || tabParam === 'completionRecords') {
      setActiveTab(tabParam === 'completionRecords' ? 'records' : tabParam);
    }
  }, [searchParams]);

  // Handle tab change with URL parameter sync
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams);
    if (tab === 'info') {
      newSearchParams.set('tab', 'info');
    } else if (tab === 'records') {
      newSearchParams.set('tab', 'completionRecords');
    }
    setSearchParams(newSearchParams);
  };

  useEffect(() => {
    console.log('UserProfile: user object:', user);
    console.log('UserProfile: studentId from URL:', studentId);
    if (!studentId) {
      console.error('UserProfile: studentId is undefined');
      setLoading(false);
      return;
    }
    fetchProfile();
    fetchEvents();
  }, [user, studentId]);

  const fetchProfile = async () => {
    if (!studentId) {
      console.error('fetchProfile: studentId is undefined');
      setLoading(false);
      return;
    }
    
    try {
      console.log('Fetching profile for studentId:', studentId, 'user role:', user?.role);
      let response;
      if (user?.role === 'student') {
        if (!studentId) {
          console.error('No studentId provided for student profile fetch');
          toast.error('缺少学生ID，无法获取档案信息');
          setLoading(false);
          return;
        }
        
        response = await fetch(`/api/students/${studentId}/profile`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      } else {
        // For coaches and other roles, use basic user info with fallback values
        const fallbackProfile = {
          name: user?.name || '未知用户',
          username: user?.username || '',
          role: user?.role || 'user',
          email: user?.email || ''
        };
        setProfile(fallbackProfile);
        setEditForm({
          name: user?.name || '',
          email: user?.email || ''
        });
        setLoading(false);
        return;
      }
      
      if (response && response.ok) {
        const data = await response.json();
        console.log('=== COMPREHENSIVE API RESPONSE DEBUG ===');
        console.log('Raw API response:', data);
        console.log('Response type:', typeof data);
        console.log('Response keys:', Object.keys(data || {}));
        console.log('data.data exists:', !!data.data);
        console.log('data.student exists:', !!data.student);
        console.log('data.data content:', data.data);
        console.log('data.student content:', data.student);
        console.log('Full response structure:', JSON.stringify(data, null, 2));
        console.log('========================================');
        
        // Comprehensive validation of API response structure
        if (!data) {
          console.error('API returned null or undefined data');
          toast.error('获取档案信息失败：服务器返回空数据');
          return;
        }
        
        // Extract student data with multiple fallbacks
        const responseData = data.data || data.student || data;
        console.log('=== STUDENT DATA EXTRACTION DEBUG ===');
        console.log('Extracted responseData:', responseData);
        console.log('responseData type:', typeof responseData);
        console.log('responseData keys:', Object.keys(responseData || {}));
        
        // The actual student data is nested inside responseData.student
        const studentData = responseData.student || responseData;
        console.log('Final studentData:', studentData);
        console.log('studentData.name:', studentData?.name);
        console.log('studentData.name type:', typeof studentData?.name);
        console.log('=====================================');
        
        if (!studentData) {
          console.error('API response missing student data. Full response:', data);
          toast.error('获取档案信息失败：学生数据不存在');
          return;
        }
        
        // Set profile with fallback values for missing fields
        const studentProfile = {
          name: studentData.name || '未知姓名',
          grade: studentData.grade || '',
          gender: studentData.gender || '',
          birthday: studentData.birthday || null,
          ...studentData // Spread to include any additional fields
        };
        
        setProfile(studentProfile);
        setEditForm({
          name: studentProfile.name || '',
          grade: studentProfile.grade || '',
          gender: studentProfile.gender || '',
          birthday: studentProfile.birthday ? studentProfile.birthday.split('T')[0] : ''
        });
        
        // Store completion records if available from API response
        if (responseData.completionRecords) {
          console.log('Setting completion records from API response:', responseData.completionRecords.length, 'records');
          setCompletionRecords(responseData.completionRecords);
        } else if (studentProfile.name && studentProfile.name !== '未知姓名') {
          console.log('Fetching completion records for student:', studentProfile.name);
          fetchCompletionRecords(studentProfile.name);
        } else {
          console.warn('No completion records available and student name is missing or invalid');
          setCompletionRecords([]);
        }
      } else {
        console.error('Failed to fetch profile:', response?.status);
        toast.error('获取档案信息失败');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('获取档案信息失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletionRecords = async (studentName) => {
    if (!studentName) {
      console.error('fetchCompletionRecords: studentName is required');
      return;
    }
    
    try {
      console.log('Fetching completion records for student:', studentName);
      const response = await fetch(`/api/completion-records/${studentName}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCompletionRecords(data.data?.records || []);
      } else {
        console.error('Failed to fetch completion records:', response.status);
      }
    } catch (error) {
      console.error('Error fetching completion records:', error);
    }
  };

  // Fetch events for dropdown
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      } else {
        console.error('Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Check if password change is requested
      const isPasswordChange = editForm.currentPassword && editForm.newPassword && editForm.confirmPassword;
      
      if (isPasswordChange) {
        // Validate password fields
        if (editForm.newPassword !== editForm.confirmPassword) {
          toast.error('新密码和确认密码不匹配');
          setSaving(false);
          return;
        }
        
        if (editForm.newPassword.length < 8) {
          toast.error('新密码至少需要8位字符');
          setSaving(false);
          return;
        }
        
        // Handle password change
        try {
          const passwordResponse = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              oldPassword: editForm.currentPassword,
              newPassword: editForm.newPassword
            })
          });
          
          if (passwordResponse.ok) {
            toast.success('密码修改成功');
            // Clear password fields
            setEditForm(prev => ({
              ...prev,
              currentPassword: '',
              newPassword: '',
              confirmPassword: ''
            }));
          } else {
            const errorData = await passwordResponse.json();
            toast.error(errorData.message || '密码修改失败');
            setSaving(false);
            return;
          }
        } catch (error) {
          console.error('Error changing password:', error);
          toast.error('密码修改失败');
          setSaving(false);
          return;
        }
      }
      
      // Handle profile update
      let response;
      if (user?.role === 'student') {
        // Create a copy of editForm without password fields for profile update
        const profileData = { ...editForm };
        delete profileData.currentPassword;
        delete profileData.newPassword;
        delete profileData.confirmPassword;
        
        response = await fetch(`/api/students/${studentId}/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(profileData)
        });
      } else {
        // For non-student roles, update basic info
        // This would need to be implemented in the backend
        if (!isPasswordChange) {
          toast.info('教练和管理员档案更新功能待开发');
        }
        setSaving(false);
        return;
      }
      
      if (response && response.ok) {
        const data = await response.json();
        // Handle the correct API response structure
        const updatedStudent = data.data || data.student;
        if (updatedStudent) {
          setProfile(updatedStudent);
          setIsEditing(false);
          if (isPasswordChange) {
            toast.success('档案和密码更新成功');
          } else {
            toast.success('档案更新成功');
          }
        } else {
          console.error('Invalid update response structure:', data);
          toast.error('更新成功但数据格式异常');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || '更新失败');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('更新失败');
    } finally {
       setSaving(false);
     }
   };

   // Handle edit record
   const handleEditRecord = (record) => {
     setSelectedRecord(record);
     
     // Format result for time display
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
     
     // Set edit form data for CompetitionRecordForm
     const editData = {
       _id: record._id,
       studentId: profile?._id || studentId,
       name: profile?.name || '',
       eventName: record.eventName || '',
       eventDate: record.eventDate ? record.eventDate.split('T')[0] : '',
       eventType: record.eventType || '',
       gameType: record.gameType || '',
       groupName: record.groupName || '',
       position: record.position || '',
       score: record.score || '',
       result: formattedResult || '',
       validity: record.validity !== undefined ? record.validity : true
     };
     
     setEditFormData(editData);
     setShowEditDialog(true);
   };



   // Handle delete record
   const handleDeleteRecord = (record) => {
     setSelectedRecord(record);
     setShowDeleteDialog(true);
   };

   // Confirm delete record
   const confirmDeleteRecord = async () => {
     try {
       setSaving(true);
       const response = await fetch(`/api/completion-records/${selectedRecord._id}`, {
         method: 'DELETE',
         headers: {
           'Authorization': `Bearer ${localStorage.getItem('token')}`
         }
       });

       if (response.ok) {
         toast.success('参赛记录删除成功');
         setShowDeleteDialog(false);
         setSelectedRecord(null);
         fetchCompletionRecords(profile?.name || user?.name);
       } else {
         const errorData = await response.json();
         toast.error(errorData.message || '删除失败');
       }
     } catch (error) {
       console.error('Error deleting record:', error);
       toast.error('删除失败，请重试');
     } finally {
       setSaving(false);
     }
   };

  const handleCancel = () => {
    if (user?.role === 'student') {
      setEditForm({
        name: profile.name || '',
        grade: profile.grade || '',
        gender: profile.gender || '',
        birthday: profile.birthday ? profile.birthday.split('T')[0] : '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } else {
      setEditForm({
        name: profile.name || '',
        email: profile.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
    setIsEditing(false);
  };







  // Handle record form success
  const handleRecordSuccess = () => {
    setShowCreateDialog(false);
    setShowEditDialog(false);
    setEditFormData(null);
    // Refresh completion records
    if (profile?.name) {
      fetchCompletionRecords(profile.name);
    }
    toast.success('操作成功');
  };

  // Handle record form close
  const handleRecordClose = () => {
    setShowCreateDialog(false);
    setShowEditDialog(false);
    setEditFormData(null);
  };



  const formatDate = (dateString) => {
    if (!dateString) return '未设置';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const calculateAge = (birthday) => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'student':
        return <User className="w-8 h-8 text-blue-600" />;
      case 'coach':
        return <Shield className="w-8 h-8 text-green-600" />;
      case 'admin':
        return <BookOpen className="w-8 h-8 text-purple-600" />;
      default:
        return <User className="w-8 h-8 text-gray-600" />;
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'student':
        return '学生';
      case 'coach':
        return '教练';
      case 'admin':
        return '管理员';
      default:
        return '用户';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-4">请先登录以查看个人资料</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  if (!user.id) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">用户信息不完整，请重新登录</p>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            重新登录
          </button>
        </div>
      </div>
    );
  }

  // Check if studentId is valid (should be a valid MongoDB ObjectId format)
  if (!studentId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">缺少学生ID参数，无法加载个人资料</p>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  // Validate studentId format (basic MongoDB ObjectId validation)
  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(studentId);
  if (!isValidObjectId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">无效的学生ID格式</p>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 个人信息头部 - 优化移动端布局 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {(profile?.avatar || user?.avatar) ? (
                <img
                  src={profile?.avatar || user?.avatar}
                  alt="用户头像"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center ${(profile?.avatar || user?.avatar) ? 'hidden' : 'flex'}`}>
                {getRoleIcon(profile?.role || user?.role)}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{profile?.name || user?.name || '未设置'}</h1>
              <p className="text-gray-500 text-xs sm:text-sm">{getRoleText(profile?.role || user?.role)}</p>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex-shrink-0 ml-4"
          >
            <Edit className="w-3 h-3" />
            <span className="hidden sm:inline">{isEditing ? '取消' : '编辑'}</span>
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">姓名</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {user?.role === 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">年级</label>
                    <select
                      value={editForm.grade}
                      onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">请选择年级</option>
                      <option value="初一">初一</option>
                      <option value="初二">初二</option>
                      <option value="初三">初三</option>
                      <option value="高一">高一</option>
                      <option value="高二">高二</option>
                      <option value="高三">高三</option>
                      <option value="毕业生">毕业生</option>
                      <option value="已转校">已转校</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">性别</label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">请选择性别</option>
                      <option value="男">男</option>
                      <option value="女">女</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">生日</label>
                    <input
                      type="date"
                      value={editForm.birthday}
                      onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
              
              {user?.role !== 'student' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">邮箱</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
            
            {/* 密码修改区域 */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">修改密码</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">当前密码</label>
                  <input
                    type="password"
                    value={editForm.currentPassword || ''}
                    onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入当前密码"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">新密码</label>
                  <input
                    type="password"
                    value={editForm.newPassword || ''}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入新密码（至少8位）"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">确认新密码</label>
                  <input
                    type="password"
                    value={editForm.confirmPassword || ''}
                    onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="再次输入新密码"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? '保存中...' : '保存'}</span>
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>取消</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {user?.role === 'student' && (
              <>
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400">年级</p>
                    <p className="font-medium text-gray-900 dark:text-white truncate">{profile?.grade || '未设置'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400">性别</p>
                    <p className="font-medium text-gray-900 dark:text-white truncate">{profile?.gender || '未设置'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400">生日</p>
                    <p className="font-medium text-gray-900 dark:text-white truncate">{formatDate(profile?.birthday)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400">年龄</p>
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {(() => {
                        const age = calculateAge(profile?.birthday);
                        return age !== null ? `${age}岁` : '未设置';
                      })()}
                    </p>
                  </div>
                </div>
              </>
            )}
            
            {user?.role !== 'student' && (
              <>
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400">角色</p>
                    <p className="font-medium text-gray-900 dark:text-white truncate">{getRoleText(profile?.role || user?.role)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400">邮箱</p>
                    <p className="font-medium text-gray-900 dark:text-white truncate">{profile?.email || '未设置'}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 标签页导航 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 overflow-x-auto">
            <button
              onClick={() => handleTabChange('info')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'info'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              基本信息
            </button>
            <button
              onClick={() => handleTabChange('records')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'records'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              参赛记录
              {completionRecords.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                  {completionRecords.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">账户信息</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">用户名:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{profile?.name || user?.name || '未设置'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">角色:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{getRoleText(profile?.role || user?.role)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">统计信息</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">参赛次数:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{completionRecords?.length || 0}次</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">有效成绩:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {completionRecords?.filter(record => record.validity === true)?.length || 0}次
                      </span>
                    </div>
                  </div>
                </div>
                
                {user?.role !== 'student' && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">系统信息</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">权限级别:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{user?.role === 'coach' ? '教练' : '管理员'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">状态:</span>
                        <span className="font-medium text-green-600">活跃</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">参赛记录</h3>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>创建新记录</span>
                </button>
              </div>
              <CompletionRecordsTable 
                records={completionRecords} 
                onEdit={handleEditRecord}
                onDelete={handleDeleteRecord}
              />
            </div>
          )}
        </div>
      </div>

      {/* Create Record Dialog */}
      {showCreateDialog && (
        <CompetitionRecordForm
          isOpen={showCreateDialog}
          onClose={handleRecordClose}
          onSuccess={handleRecordSuccess}
          events={events}
          completionRecords={completionRecords}
          mode="create"
          initialData={{
            studentId: profile?._id || studentId,
            name: profile?.name || user?.name
          }}
        />
      )}

      {/* Edit Record Dialog */}
      {showEditDialog && (
        <CompetitionRecordForm
          isOpen={showEditDialog}
          onClose={handleRecordClose}
          onSuccess={handleRecordSuccess}
          events={events}
          completionRecords={completionRecords}
          mode="edit"
          initialData={editFormData}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">确认删除</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              确定要删除这条参赛记录吗？此操作无法撤销。
            </p>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setSelectedRecord(null);
                }}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors touch-manipulation"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDeleteRecord}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 touch-manipulation"
              >
                {saving ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;