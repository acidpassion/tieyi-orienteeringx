import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../config/axiosConfig';
import { toast } from 'react-toastify';
import { createApiUrl } from '../../config/api';
import { ArrowLeft, Download, Users, Trophy, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const EventRegistrations = () => {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
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
      
      // Extract relay teams from registrations
      const relayTeamsData = [];
      registrations.forEach(registration => {
        if (registration.gameTypes && Array.isArray(registration.gameTypes)) {
          registration.gameTypes.forEach(gameType => {
            if ((gameType.name === '接力赛' || gameType.name?.includes('接力')) && gameType.team && gameType.team.members && gameType.team.members.length > 0) {
              console.log('Debug - Relay team gameType:', gameType);
              console.log('Debug - Team members:', gameType.team.members);
              
              relayTeamsData.push({
                _id: gameType._id || `${registration._id}_${gameType.name}`,
                teamName: gameType.team.name || '未命名团队',
                gameType: gameType.name,
                group: gameType.group,
                members: gameType.team.members.map((member, index) => {
                  console.log(`Debug - Processing member ${index}:`, member);
                  
                  // Check if member is just an ID string or has student data
                  let studentData = null;
                  let memberId = null;
                  
                  if (typeof member === 'string') {
                    // Member is just an ID
                    memberId = member;
                    // Try to find student data from registrations
                    const studentReg = registrations.find(reg => reg.student?._id === member);
                    studentData = studentReg?.student;
                  } else if (member._id) {
                    // Member is an object with _id
                    memberId = member._id;
                    studentData = member.student || member;
                    
                    // If no student data, try to find from registrations
                    if (!studentData?.name) {
                      const studentReg = registrations.find(reg => reg.student?._id === memberId);
                      studentData = studentReg?.student;
                    }
                  }
                  
                  console.log(`Debug - Member ${index} processed:`, {
                    memberId,
                    studentData,
                    hasName: !!studentData?.name,
                    hasAvatar: !!studentData?.avatar
                  });
                  
                  return {
                    _id: memberId,
                    student: studentData,
                    name: studentData?.name || '未知成员',
                    runOrder: member.runOrder || (index + 1)
                  };
                }),
                inviteCode: gameType.inviteCode,
                isFull: gameType.team.members.length >= 3,
                createdAt: registration.createdAt,
                status: registration.status
              });
            }
          });
        }
      });
      setRelayTeams(relayTeamsData);
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

  const formatGameTypes = (gameTypes) => {
    if (!gameTypes || gameTypes.length === 0) return '无';
    return gameTypes.map(gt => typeof gt === 'string' ? gt : gt.name).join(', ');
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
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'individual'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            个人报名
          </button>
          <button
            onClick={() => setActiveTab('relay')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'relay'
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatGameTypes(registration.gameTypes)}
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
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    团队名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    项目类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    成员
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    创建时间
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {relayTeams.map((team) => (
                  <tr key={team._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {team.teamName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {typeof team.gameType === 'string' ? team.gameType : team.gameType?.name || team.gameType}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {team.members && team.members.length > 0 ? (
                          team.members.map((member, index) => (
                            <div key={member._id || index} className="flex items-center space-x-3 mb-2">
                              <div className="flex-shrink-0 h-8 w-8">
                                {member.student?.avatar && member.student.avatar.startsWith('data:image') ? (
                                  <img
                                    className="h-8 w-8 rounded-full object-cover"
                                    src={member.student.avatar}
                                    alt={member.student.name || '成员头像'}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                      {member.student?.name?.charAt(0) || member.name?.charAt(0) || '?'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {member.student?.name || member.name || '未知成员'}
                                </div>
                                {member.runOrder && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    第{member.runOrder}棒
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400">暂无成员</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        team.isFull
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                      }`}>
                        {team.isFull ? '已满员' : '招募中'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(team.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {relayTeams.length === 0 && (
              <div className="text-center py-12">
                <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无团队</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">还没有接力团队报名此赛事</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventRegistrations;