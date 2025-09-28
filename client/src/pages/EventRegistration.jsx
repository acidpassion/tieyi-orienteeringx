import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { createApiUrl } from '../config/api';
import { Calendar, MapPin, Users, Trophy, Clock, CheckCircle, XCircle, UserPlus, Search, Filter } from 'lucide-react';

const EventRegistration = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, open, registered
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
      
      // Handle different response structures
      let registrationsData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          registrationsData = response.data;
        } else if (response.data.registrations && Array.isArray(response.data.registrations)) {
          registrationsData = response.data.registrations;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          registrationsData = response.data.data;
        }
      }
      
      console.log('EventRegistration - Fetched user registrations:', registrationsData);
      setUserRegistrations(registrationsData);
    } catch (error) {
      console.error('获取用户报名信息失败:', error);
      setUserRegistrations([]); // Ensure userRegistrations is always an array
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

  const isRegistered = (eventId) => {
    return Array.isArray(userRegistrations) && userRegistrations.some(reg => reg.event && reg.event._id === eventId);
  };

  const isRegistrationOpen = (event) => {
    const now = new Date();
    const endDate = new Date(event.endDate);
    return event.openRegistration && endDate >= now;
  };

  // Filter events based on search term and status
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const registered = isRegistered(event._id);
    const canRegister = isRegistrationOpen(event) && !registered;
    
    switch (filterStatus) {
      case 'open':
        return matchesSearch && canRegister;
      case 'registered':
        return matchesSearch && registered;
      default:
        return matchesSearch;
    }
  });

  const getRegistrationStatus = (eventId) => {
    if (!Array.isArray(userRegistrations)) return null;
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
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            赛事报名
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            选择您想要参加的赛事并完成报名
          </p>
        </div>
        
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索赛事名称、主办方或地点..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">全部赛事</option>
              <option value="open">可报名</option>
              <option value="registered">已报名</option>
            </select>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>共 {events.length} 个赛事</span>
          <span>可报名 {events.filter(e => isRegistrationOpen(e) && !isRegistered(e._id)).length} 个</span>
          <span>已报名 {events.filter(e => isRegistered(e._id)).length} 个</span>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => {
          const registered = isRegistered(event._id);
          const status = getRegistrationStatus(event._id);
          const canRegister = isRegistrationOpen(event) && !registered;

          return (
            <div key={event._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              {/* Event Status Banner */}
              {registered && (
                <div className={`px-4 py-2 text-sm font-medium text-center ${
                  status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                  status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                  'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  <div className="flex items-center justify-center space-x-1">
                    {getStatusIcon(status)}
                    <span>已报名 - {getStatusText(status)}</span>
                  </div>
                </div>
              )}
              
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {event.eventName}
                  </h3>
                  {!canRegister && !registered && (
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                      报名已截止
                    </span>
                  )}
                  {canRegister && (
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                      正在报名
                    </span>
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

      {filteredEvents.length === 0 && events.length > 0 && (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">未找到匹配的赛事</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            尝试调整搜索条件或筛选选项
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('all');
            }}
            className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            清除筛选条件
          </button>
        </div>
      )}

      {events.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无开放报名的赛事</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">请稍后再来查看最新的赛事信息</p>
        </div>
      )}


    </div>
  );
};

export default EventRegistration;