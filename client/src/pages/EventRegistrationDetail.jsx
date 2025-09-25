import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../config/axiosConfig';
import { toast } from 'sonner';
import { ArrowLeft, Users, Clock, MapPin, Calendar, Copy, Check } from 'lucide-react';
import { createApiUrl } from '../config/api';
import AutocompleteInput from '../components/AutocompleteInput';

const EventRegistrationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedGameTypes, setSelectedGameTypes] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState({});
  const [relayTeams, setRelayTeams] = useState({});
  const [relayTeamIds, setRelayTeamIds] = useState({}); // 存储队员的_id
  const [currentUser, setCurrentUser] = useState(null);
  const [userAge, setUserAge] = useState(null);
  const [urlCopied, setUrlCopied] = useState(false);


  useEffect(() => {
    fetchEventDetails();
    fetchCurrentUser();
  }, [id]);

  useEffect(() => {
    if (user && user._id) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchEventDetails = async () => {
    try {
      const response = await axios.get(createApiUrl(`/api/events/${id}`));
      setEvent(response.data);
    } catch (error) {
      console.error('获取赛事详情失败:', error);
      toast.error('获取赛事详情失败');
      navigate('/events/register');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(createApiUrl(`/api/students/${user._id}/profile`));
      const studentData = response.data?.data?.student;
      
      if (studentData && studentData.birthday) {
        const birthDate = new Date(studentData.birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        setUserAge(age);
      } else {
        console.warn('用户档案信息不完整，缺少生日信息');
        setUserAge(null);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      setUserAge(null);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(createApiUrl('/api/auth/profile'));
      setCurrentUser(response.data);
    } catch (error) {
      console.error('获取当前用户信息失败:', error);
    }
  };



  const handleGameTypeChange = (gameTypeName, checked) => {
    if (checked) {
      setSelectedGameTypes(prev => [...prev, gameTypeName]);
      // 为接力赛和团队赛初始化团队数据
      if (gameTypeName.includes('接力') || gameTypeName === '团队赛') {
        // 从新的gameTypes结构中获取teamSize
        const gameTypeConfig = event.gameTypes?.find(gt => (typeof gt === 'string' ? gt : gt.name) === gameTypeName);
        const teamSize = (typeof gameTypeConfig === 'object' && gameTypeConfig.teamSize) || 2;
        const initialTeams = Array(teamSize).fill('');
        const initialTeamIds = Array(teamSize).fill('');
        
        // 将当前用户设为第一个队员（不可编辑）
        if (currentUser) {
          initialTeams[0] = currentUser.name;
          initialTeamIds[0] = currentUser._id;
        }
        
        setRelayTeams(prev => ({
          ...prev,
          [gameTypeName]: initialTeams
        }));
        
        setRelayTeamIds(prev => ({
          ...prev,
          [gameTypeName]: initialTeamIds
        }));
      }
    } else {
      setSelectedGameTypes(prev => prev.filter(gt => gt !== gameTypeName));
      setSelectedGroups(prev => {
        const newGroups = { ...prev };
        delete newGroups[gameTypeName];
        return newGroups;
      });
      setRelayTeams(prev => {
        const newTeams = { ...prev };
        delete newTeams[gameTypeName];
        return newTeams;
      });
      
      setRelayTeamIds(prev => {
        const newTeamIds = { ...prev };
        delete newTeamIds[gameTypeName];
        return newTeamIds;
      });
    }
  };

  const handleGroupChange = (gameTypeName, groupCode) => {
    setSelectedGroups(prev => ({
      ...prev,
      [gameTypeName]: groupCode
    }));
  };

  const handleRelayTeamChange = (gameTypeName, index, value) => {
    setRelayTeams(prev => ({
      ...prev,
      [gameTypeName]: prev[gameTypeName].map((member, i) => i === index ? value : member)
    }));
  };

  const handleRelayTeamMemberChange = (gameTypeName, index, value) => {
    setRelayTeams(prev => ({
      ...prev,
      [gameTypeName]: prev[gameTypeName].map((member, i) => i === index ? value : member)
    }));
  };

  const handleRelayTeamSelect = (gameTypeName, memberIndex, student) => {
    // 更新队员姓名
    setRelayTeams(prev => ({
      ...prev,
      [gameTypeName]: prev[gameTypeName].map((member, index) => 
        index === memberIndex ? student.name : member
      )
    }));
    
    // 更新队员ID
    setRelayTeamIds(prev => ({
      ...prev,
      [gameTypeName]: prev[gameTypeName].map((id, index) => 
        index === memberIndex ? student._id : id
      )
    }));
  };

  const getAvailableGroups = () => {
    if (!event || !event.groups) return [];
    
    if (!userAge) {
      // 如果没有用户年龄信息，返回所有组别
      return event.groups;
    }
    
    return event.groups.filter(groupCode => {
      // 解析年龄范围，例如 "M14" -> 14, "W16" -> 16
      const ageMatch = groupCode.match(/\d+/);
      if (!ageMatch) return true;
      
      const groupAge = parseInt(ageMatch[0]);
      // 用户年龄必须大于等于组别年龄（可以选择年龄以上的组别）
      return userAge >= groupAge;
    });
  };

  const isFormValid = () => {
    if (selectedGameTypes.length === 0) return false;
    
    // 检查每个选中的比赛项目是否都选择了组别
    for (const gameType of selectedGameTypes) {
      if (!selectedGroups[gameType]) return false;
      
      // 检查接力赛和团队赛是否至少有队长（第一个队员）
      if (gameType.includes('接力') || gameType === '团队赛') {
        const teamMembers = relayTeams[gameType] || [];
        // 只检查第一个队员（队长）是否填写，其他队员可以为空
        if (!teamMembers[0] || !teamMembers[0].trim()) return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) {
      toast.error('请完善所有必填信息');
      return;
    }

    setSubmitting(true);
    try {
      // 构建新的gameTypes数据结构
      const gameTypes = selectedGameTypes.map(gameTypeName => {
        const gameTypeObj = {
          name: gameTypeName,
          group: selectedGroups[gameTypeName]
        };

        // 如果是接力赛，添加team结构
        if (gameTypeName.includes('接力')) {
          const teamMembers = relayTeamIds[gameTypeName] || [];
          // 过滤掉空的memberId
          const validMembers = teamMembers.filter(memberId => memberId && memberId.trim() !== '');
          if (validMembers.length > 0) {
            gameTypeObj.team = {
              name: `${gameTypeName}队伍`, // 可以根据需要调整队伍名称
              members: validMembers.map((memberId, index) => ({
                $oid: memberId,
                runOrder: index + 1
              }))
            };
          }
        }
        // 如果是团队赛，添加team结构（不包含runOrder）
        else if (gameTypeName === '团队赛') {
          const teamMembers = relayTeamIds[gameTypeName] || [];
          // 过滤掉空的memberId
          const validMembers = teamMembers.filter(memberId => memberId && memberId.trim() !== '');
          if (validMembers.length > 0) {
            gameTypeObj.team = {
              name: `${gameTypeName}队伍`, // 可以根据需要调整队伍名称
              members: validMembers.map(memberId => ({
                $oid: memberId
              }))
            };
          }
        }

        return gameTypeObj;
      });

      const registrationData = {
        eventId: id,
        gameTypes
      };

      const response = await axios.post(createApiUrl('/api/registrations'), registrationData);
      
      if (response.status === 201) {
        const registrationData = response.data;
        
        // 检查是否有接力赛或团队赛项目，如果有则生成分享链接
        const hasRelayGame = selectedGameTypes.some(gameType => gameType.includes('接力') || gameType === '团队赛');
        
        if (hasRelayGame && registrationData.inviteCode) {
          const shareUrl = `${window.location.origin}/join-relay/${registrationData.inviteCode}`;
          
          // 显示成功消息和分享链接
          toast.success(
            <div>
              <p>报名成功！</p>
              <p className="mt-2 text-sm">邀请队友加入：</p>
              <div className={`mt-1 p-2 rounded text-xs break-all ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
                {shareUrl}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success('链接已复制到剪贴板');
                }}
                className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                复制链接
              </button>
            </div>,
            { duration: 10000 }
          );
        } else {
          toast.success('报名成功！');
        }
        
        navigate('/events/register');
      }
    } catch (error) {
      console.error('报名失败:', error);
      toast.error(error.response?.data?.message || '报名失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const copyRegistrationUrl = async () => {
    const url = `${window.location.origin}/events/register/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
      toast.success('报名链接已复制到剪贴板');
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
      toast.error('复制失败，请手动复制链接');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>加载中...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>赛事不存在或已被删除</p>
          <button
            onClick={() => navigate('/events/register')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回赛事列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/events/register')}
            className={`flex items-center ${isDarkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            返回赛事列表
          </button>
          
          <button
            onClick={copyRegistrationUrl}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {urlCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {urlCopied ? '已复制' : '复制报名链接'}
          </button>
        </div>

        {/* Event Info */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6 mb-6`}>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4`}>{event.eventName}</h1>
          
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              <span>{new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{event.location || '待定'}</span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              <span>{event.organization}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              <span>{event.eventType}</span>
            </div>
          </div>
        </div>



        {/* Registration Form */}
        <form onSubmit={handleSubmit} className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-6`}>赛事报名</h2>
            
            {/* Game Types Selection */}
            <div className="mb-6">
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4`}>选择比赛项目</h3>
              <div className="space-y-3">
                {event.gameTypes?.map((gameType, index) => {
                  const gameTypeName = typeof gameType === 'string' ? gameType : gameType.name;
                  const isRelay = gameTypeName.includes('接力') || gameTypeName === '团队赛';
                  return (
                    <div key={index} className={`${isDarkMode ? 'border-gray-600' : 'border'} rounded-lg p-4`}>
                      <label className="flex items-center mb-3">
                        <input
                          type="checkbox"
                          checked={selectedGameTypes.includes(gameTypeName)}
                          onChange={(e) => handleGameTypeChange(gameTypeName, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className={`ml-3 text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                          {gameTypeName}
                          {isRelay && <span className={`ml-2 text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>接力赛</span>}
                        </span>
                      </label>
                      
                      {selectedGameTypes.includes(gameTypeName) && (
                        <div className="ml-7 space-y-4">
                          {/* Group Selection */}
                          <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                              选择组别
                            </label>
                            <select
                              value={selectedGroups[gameTypeName] || ''}
                              onChange={(e) => handleGroupChange(gameTypeName, e.target.value)}
                              className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                              required
                            >
                              <option value="">请选择组别</option>
                              {getAvailableGroups().map((groupCode, groupIndex) => (
                                <option key={groupIndex} value={groupCode}>
                                  {groupCode}
                                </option>
                              ))}
                            </select>
                            {userAge && (
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                您的年龄: {userAge}岁，可选择{userAge}岁及以上的组别
                              </p>
                            )}
                          </div>
                          
                          {/* Relay Team Members */}
                          {(gameTypeName.includes('接力') || gameTypeName === '团队赛') && (
                            <div>
                              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                {gameTypeName.includes('接力') ? '接力队员' : '团队成员'} (最多{(() => {
                                  const gameTypeConfig = event.gameTypes?.find(gt => (typeof gt === 'string' ? gt : gt.name) === gameTypeName);
                                  return (typeof gameTypeConfig === 'object' && gameTypeConfig.teamSize) || 2;
                                })()}人)
                              </label>
                              {(relayTeams[gameTypeName] || []).map((member, memberIndex) => {
                                const isCaptain = memberIndex === 0; // 第一个是队长
                                return (
                                  <div key={memberIndex} className="mb-2">
                                    {isCaptain ? (
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={member || ''}
                                          className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-600 text-gray-300' : 'border-gray-300 bg-gray-100 text-gray-600'} rounded-md cursor-not-allowed`}
                                          disabled
                                          readOnly
                                        />
                                        <span className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                                          队长
                                        </span>
                                      </div>
                                    ) : (
                                      <AutocompleteInput
                                        value={member}
                                        onChange={(value) => handleRelayTeamChange(gameTypeName, memberIndex, value)}
                                        onSelect={(student) => handleRelayTeamSelect(gameTypeName, memberIndex, student)}
                                        placeholder={`队员 ${memberIndex + 1} 姓名`}
                                        className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                队长默认为您本人，其他队员可以留空，稍后通过分享链接邀请加入
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !isFormValid()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '提交中...' : '确认报名'}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default EventRegistrationDetail;