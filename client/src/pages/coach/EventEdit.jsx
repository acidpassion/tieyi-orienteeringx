import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../config/axiosConfig';
import { toast } from 'react-toastify';
import { createApiUrl } from '../../config/api';
import { Calendar, Save, ArrowLeft, Settings, Users, Trophy, MapPin } from 'lucide-react';
import { useConfiguration } from '../../context/ConfigurationContext';

const EventEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCreating = !id || id === 'new';
  const [loading, setLoading] = useState(!isCreating);
  
  // Debug logging
  console.log('EventEdit Debug:', {
    id,
    isCreating,
    initialLoading: !isCreating
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Get configuration data first
  const { gameTypes: gameTypeOptions, classes: groupOptions, eventTypes, orgs, loading: configLoading } = useConfiguration();

  // Organization and event type options from configuration (with fallbacks)
  const organizationOptions = orgs || [];
  const eventTypeOptions = eventTypes || [];

  // Form state
  const [formData, setFormData] = useState({
    eventName: '',
    organization: '',
    startDate: '',
    endDate: '',
    eventType: '',
    location: '',
    scoreWeight: 1,
    openRegistration: false,
    gameTypes: [], // Array of objects with name and teamSize
    groups: []
  });

  // Fetch event data if editing
  useEffect(() => {
    console.log('useEffect triggered:', {
      isCreating,
      id,
      shouldFetch: !isCreating && id && id !== 'new'
    });
    
    if (!isCreating && id && id !== 'new') {
      console.log('Calling fetchEvent...');
      fetchEvent();
    } else {
      console.log('Skipping fetchEvent - creating new event');
      // Ensure loading is false for new events
      setLoading(false);
    }
  }, [id, isCreating]);

  const fetchEvent = async () => {
    console.log('fetchEvent called:', { isCreating, id });
    if (isCreating) {
      console.log('fetchEvent: Early return - isCreating is true');
      return;
    }
    
    try {
      console.log('fetchEvent: Setting loading to true');
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(createApiUrl(`/api/events/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const event = response.data;
      // Handle backward compatibility for old data structure
      let gameTypes = event.gameTypes || [];
      if (gameTypes.length > 0 && typeof gameTypes[0] === 'string') {
        // Convert old format to new format
        gameTypes = gameTypes.map(gameType => {
          const gameTypeSettings = event.gameTypeSettings || {};
          const settings = gameTypeSettings[gameType];
          const gameTypeObj = { name: gameType };
          if (settings && settings.teamSize) {
            gameTypeObj.teamSize = settings.teamSize;
          }
          return gameTypeObj;
        });
      }
      
      setFormData({
        eventName: event.eventName || '',
        organization: event.organization || '',
        startDate: event.startDate ? event.startDate.split('T')[0] : '',
        endDate: event.endDate ? event.endDate.split('T')[0] : '',
        eventType: event.eventType || '',
        location: event.location || '',
        scoreWeight: event.scoreWeight || 1,
        openRegistration: event.openRegistration || false,
        gameTypes: gameTypes,
        groups: event.groups || []
      });
    } catch (error) {
      console.error('获取赛事详情失败:', error);
      toast.error('获取赛事详情失败');
      navigate('/coach/events');
    } finally {
      setLoading(false);
    }
  };

  // Handle save event
  const handleSave = async () => {
    try {
      // Debug logging for handleSave
      console.debug('🔍 handleSave called');
      console.debug('🔍 id from useParams:', id);
      console.debug('🔍 isCreating:', isCreating);
      console.debug('🔍 typeof id:', typeof id);
      console.debug('🔍 id === "new":', id === 'new');
      console.debug('🔍 id === undefined:', id === undefined);
      
      // Validation
      if (!formData.eventName.trim()) {
        toast.error('请输入赛事名称');
        return;
      }
      if (!formData.organization) {
        toast.error('请选择主办方');
        return;
      }
      if (!formData.startDate) {
        toast.error('请选择开始日期');
        return;
      }
      if (!formData.endDate) {
        toast.error('请选择结束日期');
        return;
      }
      if (!formData.eventType) {
        toast.error('请选择赛事类型');
        return;
      }

      // Validate date range
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        toast.error('结束日期必须在开始日期之后');
        return;
      }

      // Validate scoreWeight
      if (formData.scoreWeight === '' || formData.scoreWeight < 10 || formData.scoreWeight > 100) {
        toast.error('积分权重必须在10-100之间');
        return;
      }

      setSaving(true);
      const token = localStorage.getItem('token');
      
      // Prepare form data with proper scoreWeight value
      const submitData = {
        ...formData,
        scoreWeight: parseFloat(formData.scoreWeight) || 1
      };
      
      console.debug('🔍 About to make API call');
      console.debug('🔍 isCreating check:', isCreating);
      
      if (isCreating) {
        // Create new event
        const createUrl = createApiUrl('/api/events');
        console.debug('🔍 Creating new event with POST to:', createUrl);
        await axios.post(createUrl, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('赛事创建成功');
      } else {
        // Update existing event
        const updateUrl = createApiUrl(`/api/events/${id}`);
        console.debug('🔍 Updating existing event with PUT to:', updateUrl);
        await axios.put(updateUrl, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('赛事更新成功');
      }

      navigate('/coach/events');
    } catch (error) {
      console.error('保存赛事失败:', error);
      const errorMessage = error.response?.data?.message || '保存赛事失败';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Handle game type toggle
  const handleGameTypeToggle = (gameTypeName) => {
    setFormData(prev => {
      const isRemoving = prev.gameTypes.some(gt => gt.name === gameTypeName);
      
      if (isRemoving) {
        // Remove the game type
        return {
          ...prev,
          gameTypes: prev.gameTypes.filter(gt => gt.name !== gameTypeName)
        };
      } else {
        // Add the game type
        const newGameType = { name: gameTypeName };
        
        // Add default team size for relay games and team games
        if (gameTypeName.includes('接力') || gameTypeName === '团队赛') {
          const defaultTeamSize = gameTypeName === '团队赛' ? 2 : 2;
          newGameType.teamSize = defaultTeamSize;
        }
        
        return {
          ...prev,
          gameTypes: [...prev.gameTypes, newGameType]
        };
      }
    });
  };

  // Handle team size change for relay games
  const handleTeamSizeChange = (gameTypeName, teamSize) => {
    setFormData(prev => ({
      ...prev,
      gameTypes: prev.gameTypes.map(gt => 
        gt.name === gameTypeName 
          ? { ...gt, teamSize: parseInt(teamSize) || 2 }
          : gt
      )
    }));
  };

  // Handle group toggle
  const handleGroupToggle = (group) => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.includes(group)
        ? prev.groups.filter(g => g !== group)
        : [...prev.groups, group]
    }));
  };

  if (loading || configLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'basic', name: '基本信息', icon: Calendar },
    { id: 'settings', name: '赛事设置', icon: Settings },
    { id: 'registration', name: '报名管理', icon: Users }
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/coach/events')}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <Calendar className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isCreating ? '创建赛事' : '编辑赛事'}
            </h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saving ? '保存中...' : '保存'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Event Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    赛事名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.eventName}
                    onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入赛事名称"
                  />
                </div>

                {/* Organization */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    主办方 *
                  </label>
                  <select
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择主办方</option>
                    {organizationOptions.map(org => (
                      <option key={org} value={org}>{org}</option>
                    ))}
                  </select>
                </div>

                {/* Event Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    赛事类型 *
                  </label>
                  <select
                    value={formData.eventType}
                    onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择赛事类型</option>
                    {eventTypeOptions.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    比赛地点
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入比赛地点"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    开始日期 *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    结束日期 *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Score Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Trophy className="inline h-4 w-4 mr-1" />
                  积分权重
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={formData.scoreWeight}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setFormData({ ...formData, scoreWeight: '' });
                    } else {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        setFormData({ ...formData, scoreWeight: numValue });
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  积分权重影响该赛事在总积分中的比重，范围：10-50
                </p>
              </div>

              {/* Game Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  比赛项目
                </label>
                <div className="space-y-4">
                  {gameTypeOptions.map(gameTypeName => {
                    const selectedGameType = formData.gameTypes.find(gt => gt.name === gameTypeName);
                    const isSelected = !!selectedGameType;
                    const isRelay = gameTypeName.includes('接力') || gameTypeName === '团队赛';
                    const teamSize = selectedGameType?.teamSize || 2;
                    
                    return (
                      <div key={gameTypeName} className="border rounded-lg p-4">
                        <label className="flex items-center space-x-2 cursor-pointer mb-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleGameTypeToggle(gameTypeName)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{gameTypeName}</span>
                        </label>
                        
                        {/* Team Size for Relay Games */}
                        {isSelected && isRelay && (
                          <div className="ml-6">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              队伍人数上限
                            </label>
                            <input
                              type="number"
                              min="2"
                              max="10"
                              value={teamSize}
                              onChange={(e) => handleTeamSizeChange(gameTypeName, e.target.value)}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">人</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Groups */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  参赛组别
                </label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {groupOptions.map(group => (
                    <label key={group} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.groups.includes(group)}
                        onChange={() => handleGroupToggle(group)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{group}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Registration Tab */}
          {activeTab === 'registration' && (
            <div className="space-y-6">
              {/* Open Registration */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    开放报名
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    允许学生在线报名参加此赛事
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.openRegistration}
                    onChange={(e) => setFormData({ ...formData, openRegistration: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {formData.openRegistration && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      报名功能已启用
                    </h3>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    学生可以通过系统报名参加此赛事。您可以在报名管理页面查看和管理所有报名信息。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventEdit;