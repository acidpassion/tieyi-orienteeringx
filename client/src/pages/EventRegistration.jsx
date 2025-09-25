import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { createApiUrl } from '../config/api';
import { Calendar, MapPin, Users, Trophy, Clock, CheckCircle, XCircle, Plus, UserPlus } from 'lucide-react';

const EventRegistration = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedGameTypes, setSelectedGameTypes] = useState([]);
  const [userRegistrations, setUserRegistrations] = useState([]);

  useEffect(() => {
    fetchOpenEvents();
    fetchUserRegistrations();
  }, []);

  const fetchOpenEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(createApiUrl('/api/events/open'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(response.data || []);
    } catch (error) {
      console.error('获取开放报名赛事失败:', error);
      toast.error('获取赛事信息失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRegistrations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(createApiUrl('/api/registrations/my'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserRegistrations(response.data || []);
    } catch (error) {
      console.error('获取用户报名信息失败:', error);
    }
  };

  const handleRegisterClick = (event) => {
    if (isRegistered(event._id)) {
      toast.info('您已报名该赛事');
      return;
    }
    
    if (!isRegistrationOpen(event)) {
      toast.error('该赛事未开放报名或已截止');
      return;
    }
    
    navigate(`/events/register/${event._id}`);
  };

  const handleGameTypeToggle = (gameType) => {
    setSelectedGameTypes(prev => 
      prev.includes(gameType)
        ? prev.filter(type => type !== gameType)
        : [...prev, gameType]
    );
  };

  const submitRegistration = async () => {
    if (selectedGameTypes.length === 0) {
      toast.error('请至少选择一个比赛项目');
      return;
    }

    try {
      setRegistering(true);
      const token = localStorage.getItem('token');
      
      // 构建新的gameTypes结构
      const gameTypesData = selectedGameTypes.map(gameType => {
        const gameTypeName = typeof gameType === 'string' ? gameType : gameType.name;
        
        // 基础结构
        const gameTypeData = {
          name: gameTypeName,
          group: selectedEvent.groups?.[0] || '默认组别' // 使用事件的第一个组别或默认值
        };
        
        // 根据比赛类型添加特定结构
        if (gameTypeName === '接力赛') {
          gameTypeData.team = {
            name: '', // 队伍名称待填写
            members: [] // 队员信息待填写
          };
        } else if (gameTypeName === '团队赛') {
          gameTypeData.members = []; // 团队成员待填写
        }
        
        return gameTypeData;
      });
      
      await axios.post(
        createApiUrl('/api/registrations'),
        {
          eventId: selectedEvent._id,
          gameTypes: gameTypesData
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      toast.success('报名成功！');
      setShowRegistrationModal(false);
      fetchUserRegistrations(); // 刷新用户报名信息
    } catch (error) {
      console.error('报名失败:', error);
      const errorMessage = error.response?.data?.message || '报名失败';
      toast.error(errorMessage);
    } finally {
      setRegistering(false);
    }
  };

  const isRegistered = (eventId) => {
    return userRegistrations.some(reg => reg.event && reg.event._id === eventId);
  };

  const getRegistrationStatus = (eventId) => {
    const registration = userRegistrations.find(reg => reg.event && reg.event._id === eventId);
    return registration?.status || null;
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
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return '已确认';
      case 'pending': return '待确认';
      case 'cancelled': return '已取消';
      default: return '';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isRegistrationOpen = (event) => {
    const now = new Date();
    const endDate = new Date(event.endDate);
    return event.openRegistration && endDate >= now;
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            赛事报名
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            选择您想要参加的赛事并完成报名
          </p>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => {
          const registered = isRegistered(event._id);
          const status = getRegistrationStatus(event._id);
          const canRegister = isRegistrationOpen(event) && !registered;

          return (
            <div key={event._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {event.eventName}
                  </h3>
                  {registered && (
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(status)}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {getStatusText(status)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(event.startDate)} - {formatDate(event.endDate)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4 mr-2" />
                    {event.location || '待定'}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4 mr-2" />
                    {event.organization}
                  </div>
                </div>

                {/* Game Types */}
                {event.gameTypes && event.gameTypes.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      比赛项目:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {event.gameTypes.map((gameType, index) => (
                        <span
                          key={index}
                          className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full"
                        >
                          {typeof gameType === 'string' ? gameType : gameType.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Groups */}
                {event.groups && event.groups.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      参赛组别:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {event.groups.map((group, index) => (
                        <span
                          key={index}
                          className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 rounded-full"
                        >
                          {group}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="flex justify-end">
                  {canRegister ? (
                    <button
                      onClick={() => handleRegisterClick(event)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>立即报名</span>
                    </button>
                  ) : registered ? (
                    <button
                      onClick={() => navigate('/profile?tab=registrations')}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <Trophy className="h-4 w-4" />
                      <span>查看详情</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed"
                    >
                      报名已截止
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无开放报名的赛事</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">请稍后再来查看最新的赛事信息</p>
        </div>
      )}

      {/* Registration Modal */}
      {showRegistrationModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                报名 - {selectedEvent.eventName}
              </h3>
              <button
                onClick={() => setShowRegistrationModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  选择参赛项目 *
                </label>
                <div className="space-y-2">
                  {selectedEvent.gameTypes?.map((gameType, index) => (
                    <label key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedGameTypes.includes(gameType)}
                        onChange={() => handleGameTypeToggle(gameType)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-900 dark:text-white">
                        {typeof gameType === 'string' ? gameType : gameType.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedEvent.groups && selectedEvent.groups.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    参赛组别
                  </label>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedEvent.groups.join(', ')}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    报名后将自动分配到: {selectedEvent.groups[0]}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRegistrationModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
              >
                取消
              </button>
              <button
                onClick={submitRegistration}
                disabled={registering || selectedGameTypes.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center"
              >
                {registering && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                {registering ? '报名中...' : '确认报名'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventRegistration;