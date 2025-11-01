import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../config/axiosConfig';
import { toast } from 'react-toastify';
import { createApiUrl } from '../../config/api';
import { useConfiguration } from '../../context/ConfigurationContext';
import { ArrowLeft, Download, Users, Trophy, Clock, CheckCircle, XCircle, AlertCircle, Upload, X, FileText, AlertTriangle, BarChart3, Search } from 'lucide-react';
import ResultUploadModal from '../../components/ResultUploadModal';

const EventRegistrations = () => {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const { difficultyGrades } = useConfiguration();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [relayTeams, setRelayTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0
  });
  const [activeTab, setActiveTab] = useState('individual');
  const [exporting, setExporting] = useState(false);
  
  // Upload functionality state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchEventData();
    fetchRegistrations();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(createApiUrl(`/api/events/${eventId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvent(response.data);
    } catch (error) {
      console.error('获取赛事信息失败:', error);
      toast.error('获取赛事信息失败');
    }
  };

  const fetchRegistrations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(createApiUrl(`/api/registrations/event/${eventId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const registrations = response.data.registrations || [];
      setRegistrations(registrations);
      setStats(response.data.stats || { total: 0, confirmed: 0, pending: 0, cancelled: 0 });

      // Extract unique relay teams from registrations using inviteCode
      const relayTeamsMap = new Map();
      registrations.forEach(registration => {
        if (registration.gameTypes && Array.isArray(registration.gameTypes)) {
          registration.gameTypes.forEach(gameType => {
            if ((gameType.name === '接力赛' || gameType.name === '团队赛' || gameType.name?.includes('接力')) &&
              gameType.team && gameType.team.members && gameType.team.members.length > 0 &&
              gameType.inviteCode) {

              // Use inviteCode as unique identifier to avoid duplicates
              if (!relayTeamsMap.has(gameType.inviteCode)) {
                relayTeamsMap.set(gameType.inviteCode, {
                  _id: gameType.inviteCode,
                  teamName: gameType.team.name || '未命名团队',
                  gameType: gameType.name,
                  group: gameType.group,
                  difficultyGrade: gameType.difficultyGrade || '',
                  members: gameType.team.members.map((member, index) => {
                    // Find student data from registrations
                    let studentData = null;
                    let memberId = typeof member === 'string' ? member : member._id;

                    const studentReg = registrations.find(reg => reg.student?._id === memberId);
                    studentData = studentReg?.student;

                    return {
                      _id: memberId,
                      student: studentData,
                      name: studentData?.name || '未知成员',
                      runOrder: member.runOrder || (index + 1),
                      captain: member.captain || false
                    };
                  }).sort((a, b) => a.runOrder - b.runOrder), // Sort by run order
                  inviteCode: gameType.inviteCode,
                  isFull: gameType.team.members.length >= 2, // Relay teams need at least 2 members
                  createdAt: registration.createdAt,
                  status: registration.status
                });
              }
            }
          });
        }
      });
      setRelayTeams(Array.from(relayTeamsMap.values()));
    } catch (error) {
      console.error('获取报名信息失败:', error);
      toast.error('获取报名信息失败');
    } finally {
      setLoading(false);
    }
  };



  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        createApiUrl(`/api/registrations/event/${eventId}/export`),
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${event?.eventName || '赛事'}_报名统计.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return '已确认';
      case 'pending': return '待确认';
      case 'cancelled': return '已取消';
      default: return '未知';
    }
  };

  const formatGameTypeWithDetails = (gameType) => {
    const name = typeof gameType === 'string' ? gameType : gameType.name;
    const group = typeof gameType === 'object' ? gameType.group : '';
    const difficultyGrade = typeof gameType === 'object' ? gameType.difficultyGrade : '';

    let result = name;
    if (group) result += ` (${group}`;
    if (difficultyGrade) result += group ? `-${difficultyGrade})` : ` (${difficultyGrade})`;
    else if (group) result += ')';

    return result;
  };

  const getDifficultyGradeColor = (gradeName) => {
    const grade = difficultyGrades.find(g => g.color === gradeName);
    return grade?.colorCode || '#000000';
  };

  // Upload functionality
  const handleFileSelect = (file) => {
    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error('请选择CSV或Excel文件');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('文件大小不能超过10MB');
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
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

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('请先选择文件');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        createApiUrl(`/api/events/${eventId}/upload-registrations`),
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      );

      setUploadResult(response.data);
      
      if (response.data.success) {
        toast.success(`上传成功！处理了 ${response.data.data.totalProcessed} 条记录，成功 ${response.data.data.successCount} 条`);
        // Refresh registrations data
        fetchRegistrations();
      } else {
        toast.error(response.data.message || '上传失败');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error.response?.data?.message || '上传失败，请稍后重试';
      toast.error(errorMessage);
      setUploadResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadProgress(0);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    resetUpload();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/coach/events')}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              报名管理
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {event?.eventName}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>上传报名表</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            {exporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{exporting ? '导出中...' : '导出Excel'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总报名</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">已确认</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.confirmed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">待确认</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">已取消</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.cancelled}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('individual')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'individual'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
          >
            个人报名
          </button>
          <button
            onClick={() => setActiveTab('relay')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'relay'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
          >
            接力团队
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'individual' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    学生信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    报名项目
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    报名时间
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {registrations.map((registration) => (
                  <tr key={registration._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {registration.student?.avatar && registration.student.avatar.startsWith('data:image') ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={registration.student.avatar}
                              alt={registration.student.name || '学生头像'}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {registration.student?.name?.charAt(0) || '?'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {registration.student?.name || '未知学生'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {registration.student?.grade && registration.student?.class && (
                              `${registration.student.grade}${registration.student.class}班`
                            )}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {registration.student?.gender} · {registration.student?.age}岁
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {(registration.gameTypes || []).map((gameType, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {formatGameTypeWithDetails(gameType)}
                            </span>
                            {typeof gameType === 'object' && gameType.difficultyGrade && (
                              <div
                                className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                                style={{ backgroundColor: getDifficultyGradeColor(gameType.difficultyGrade) }}
                              ></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(registration.status)}
                        <span className="text-sm text-gray-900 dark:text-white">
                          {getStatusText(registration.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(registration.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {registrations.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无报名</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">还没有学生报名此赛事</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'relay' && (
        <div className="space-y-6">
          {relayTeams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
              {relayTeams.map((team) => (
                <div key={team._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
                  {/* Team Header */}
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={team.teamName}>
                      {team.teamName}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                        {team.gameType}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${team.isFull
                          ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-100'
                        }`}>
                        {team.isFull ? '已满员' : '招募中'}
                      </span>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="space-y-2 mb-3">
                    {team.members && team.members.length > 0 ? (
                      team.members.map((member, index) => (
                        <div key={member._id || index} className="flex items-center space-x-2">
                          <div className="flex-shrink-0 h-6 w-6">
                            {member.student?.avatar && member.student.avatar.startsWith('data:image') ? (
                              <img
                                className="h-6 w-6 rounded-full object-cover"
                                src={member.student.avatar}
                                alt={member.student.name || '成员头像'}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {member.student?.name?.charAt(0) || member.name?.charAt(0) || '?'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1">
                              <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                {member.student?.name || member.name || '未知成员'}
                              </span>
                              {member.captain && (
                                <span className="text-xs text-yellow-600 dark:text-yellow-400">👑</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              第{member.runOrder}棒
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">暂无成员</span>
                    )}
                  </div>

                  {/* Team Footer */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <span>{team.group}</span>
                        {team.difficultyGrade && (
                          <div className="flex items-center space-x-1">
                            <div
                              className="w-2 h-2 rounded-full border border-gray-400"
                              style={{ backgroundColor: getDifficultyGradeColor(team.difficultyGrade) }}
                            ></div>
                            <span>{team.difficultyGrade}</span>
                          </div>
                        )}
                      </div>
                      <span>{new Date(team.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                    {team.inviteCode && (
                      <div className="mt-1 text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {team.inviteCode}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
              <Trophy className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无团队</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">还没有接力团队报名此赛事</p>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                上传报名表
              </h3>
              <button
                onClick={closeUploadModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* File Upload Area */}
            {!uploadResult && (
              <div className="space-y-4">
                {/* Drag and Drop Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
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
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
                      >
                        选择文件
                      </label>
                    </div>
                  )}
                </div>

                {/* File Format Instructions */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    文件格式要求：
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• 必须包含列：赛事、姓名、组别、项目</li>
                    <li>• 项目列支持多个项目，用逗号分隔（如：短距离,百米赛）</li>
                    <li>• 赛事名称必须与当前赛事完全匹配</li>
                    <li>• 学生姓名必须在系统中存在</li>
                  </ul>
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">上传进度</span>
                      <span className="text-gray-900 dark:text-white">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={closeUploadModal}
                    disabled={uploading}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>上传中...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>开始上传</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Upload Results */}
            {uploadResult && (
              <div className="space-y-4">
                {uploadResult.success ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h4 className="text-sm font-medium text-green-900 dark:text-green-100">
                        上传成功
                      </h4>
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-200 space-y-1">
                      <p>总处理记录：{uploadResult.data?.totalProcessed || 0} 条</p>
                      <p>成功注册：{uploadResult.data?.successCount || 0} 条</p>
                      {uploadResult.data?.errorCount > 0 && (
                        <p>失败记录：{uploadResult.data.errorCount} 条</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                        上传失败
                      </h4>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-200">
                      {uploadResult.message}
                    </p>
                  </div>
                )}

                {/* Error Details */}
                {uploadResult.data?.errors && uploadResult.data.errors.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                      错误详情：
                    </h4>
                    <div className="max-h-40 overflow-y-auto">
                      <ul className="text-sm text-yellow-700 dark:text-yellow-200 space-y-1">
                        {uploadResult.data.errors.map((error, index) => (
                          <li key={index}>
                            第 {error.row} 行 - {error.studentName}: {error.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Result Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={resetUpload}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                  >
                    重新上传
                  </button>
                  <button
                    onClick={closeUploadModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    完成
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventRegistrations;