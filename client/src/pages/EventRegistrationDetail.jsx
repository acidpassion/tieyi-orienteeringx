import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../config/axiosConfig';
import { toast } from 'sonner';
import { ArrowLeft, Users, Clock, MapPin, Calendar, Copy, Check } from 'lucide-react';
import { createApiUrl } from '../config/api';
import AutocompleteInput from '../components/AutocompleteInput';
import Avatar from '../components/Avatar';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

const EventRegistrationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const confirm = useConfirmDialog();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedGameTypes, setSelectedGameTypes] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState({});
  const [relayTeams, setRelayTeams] = useState({});
  const [relayTeamIds, setRelayTeamIds] = useState([]);
  const [relayTeamMembers, setRelayTeamMembers] = useState({}); // Store full student data including avatars
  const [currentUser, setCurrentUser] = useState(null);
  const [userAge, setUserAge] = useState(null);
  const [existingRegistration, setExistingRegistration] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);


  useEffect(() => {
    if (id) {
      fetchEventDetails();
      fetchCurrentUser();
    }
  }, [id]);

  useEffect(() => {
    if (user && user._id) {
      fetchUserProfile();
    }
  }, [user]);

  // Only fetch existing registration after event data is loaded
  useEffect(() => {
    if (event && id) {
      fetchExistingRegistration();
    }
  }, [event, id]);

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
    if (!user || !user._id) {
      console.warn('用户信息不完整，无法获取档案');
      setUserAge(null);
      return;
    }
    
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
      console.error('Error fetching current user:', error);
    }
  };

  const fetchExistingRegistration = async () => {
    try {
      // Ensure event data is available before processing
      if (!event) {
        console.warn('Event data not available, skipping existing registration fetch');
        return;
      }
      
      console.log('Fetching existing registrations for event:', id);
      const response = await axios.get(createApiUrl('/api/registrations/my'));
      const userRegistrations = response.data;
      console.log('All user registrations:', userRegistrations);
      
      // Validate response data
      if (!Array.isArray(userRegistrations)) {
        console.warn('Invalid user registrations data:', userRegistrations);
        return;
      }
      
      // 查找当前赛事的报名记录
      const existingReg = userRegistrations.find(reg => 
        reg && reg.eventId && reg.eventId._id === id
      );
      
      if (existingReg) {
        console.log('Found existing registration:', existingReg);
        console.log('Game types in registration:', existingReg.gameTypes);
        setExistingRegistration(existingReg);
        setIsEditMode(true);
        
        // 预填充表单数据
        if (existingReg && existingReg.gameTypes && Array.isArray(existingReg.gameTypes) && existingReg.gameTypes.length > 0) {
          console.log('Processing game types for form population...');
          const gameTypeSelections = [];
          const groupSelections = {};
          const teamData = {};
          const teamIdData = {};
          
          // 过滤掉null值并确保gameTypes数组存在
          const validGameTypes = existingReg.gameTypes?.filter(gameType => gameType !== null && gameType !== undefined) || [];
          console.log('Valid game types after filtering:', validGameTypes);
          
          validGameTypes.forEach((gt, index) => {
            console.log(`Processing game type ${index}:`, gt);
            // Add null check for game type object
            if (!gt || !gt.name) {
              console.warn('Invalid game type object found:', gt);
              return;
            }
            
            console.log(`Adding game type: ${gt.name}`);
            gameTypeSelections.push(gt.name);
            if (gt.group) {
              console.log(`Setting group for ${gt.name}: ${gt.group}`);
              groupSelections[gt.name] = gt.group;
            }
            // Process team data for relay/team games
            if (gt.name.includes('接力') || gt.name === '团队赛') {
              // Get team size from event configuration with proper null checks
              let teamSize = 2; // Default team size
              
              if (event && event.gameTypes && Array.isArray(event.gameTypes)) {
                const gameTypeConfig = event.gameTypes.find(eventGt => {
                  if (!eventGt) return false;
                  const eventGtName = typeof eventGt === 'string' ? eventGt : eventGt.name;
                  return eventGtName === gt.name;
                });
                
                if (gameTypeConfig && typeof gameTypeConfig === 'object' && gameTypeConfig.teamSize) {
                  teamSize = gameTypeConfig.teamSize;
                }
              }
              
              console.log(`Team size for ${gt.name}: ${teamSize}`);
              
              // Create arrays with full team size, filling existing members first
              const teamArray = Array(teamSize).fill('');
              const teamIdArray = Array(teamSize).fill('');
              const teamMemberArray = Array(teamSize).fill(null);
              
              // Fill existing members if they exist
              if (gt.team && gt.team.members && gt.team.members.length > 0) {
                gt.team.members.forEach((member, memberIndex) => {
                  if (memberIndex < teamSize && member !== null && member !== undefined) {
                    teamArray[memberIndex] = member.realName || member.name || member.username || '';
                    teamIdArray[memberIndex] = member._id || '';
                    teamMemberArray[memberIndex] = member;
                  }
                });
              }
              
              teamData[gt.name] = teamArray;
              teamIdData[gt.name] = teamIdArray;
              // Store full member data for avatar display
              setRelayTeamMembers(prev => ({
                ...prev,
                [gt.name]: teamMemberArray
              }));
            }
          });
          
          console.log('Final game type selections:', gameTypeSelections);
          console.log('Final group selections:', groupSelections);
          console.log('Final team data:', teamData);
          console.log('Final team ID data:', teamIdData);
          
          setSelectedGameTypes(gameTypeSelections);
          setSelectedGroups(groupSelections);
          setRelayTeams(teamData);
          setRelayTeamIds(teamIdData);
        }
      }
    } catch (error) {
      console.error('Error fetching existing registration:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        eventId: id
      });
      // Reset states to prevent UI issues
      setExistingRegistration(null);
      setIsEditMode(false);
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
          // Store current user data for avatar display
          setRelayTeamMembers(prev => ({
            ...prev,
            [gameTypeName]: [currentUser, ...Array(teamSize - 1).fill(null)]
          }));
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
      
      setRelayTeamMembers(prev => {
        const newMembers = { ...prev };
        delete newMembers[gameTypeName];
        return newMembers;
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
    
    // 更新队员完整数据（包含头像）
    setRelayTeamMembers(prev => ({
      ...prev,
      [gameTypeName]: prev[gameTypeName].map((memberData, index) => 
        index === memberIndex ? student : memberData
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
                _id: memberId,
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
                _id: memberId
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

      let response;
      if (isEditMode && existingRegistration) {
        // 编辑模式：更新现有报名记录
        response = await axios.put(createApiUrl(`/api/registrations/${existingRegistration._id}`), registrationData);
      } else {
        // 新建模式：创建新的报名记录
        response = await axios.post(createApiUrl('/api/registrations'), registrationData);
      }
      
      if (response.status === 201 || response.status === 200) {
        const registrationData = response.data;
        
        // 检查是否有接力赛或团队赛项目，如果有则生成分享链接
        const hasRelayGame = selectedGameTypes.some(gameType => gameType.includes('接力') || gameType === '团队赛');
        
        if (hasRelayGame && registrationData.inviteCode) {
          const shareUrl = `${window.location.origin}/join-relay/${registrationData.inviteCode}`;
          
          // 显示成功消息和分享链接
          toast.success(
            <div>
              <p>{isEditMode ? '报名信息更新成功！' : '报名成功！'}</p>
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
          toast.success(isEditMode ? '报名信息更新成功！' : '报名成功！');
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

  const handleQuitTeam = async (gameTypeName) => {
    if (!currentUser?._id) {
      toast.error('无法获取用户信息');
      return;
    }

    try {
      // 使用现有的确认对话框组件
      const confirmed = await confirm({
        titleCn: '退出团队',
        messageCn: `确定要退出${gameTypeName}团队吗？退出后需要重新加入。`,
        confirmTextCn: '确认退出',
        cancelTextCn: '取消'
      });
      
      if (!confirmed) {
        return;
      }

      // 从relayTeamIds中移除当前用户的所有条目
      const currentTeamMembers = relayTeamIds[gameTypeName] || [];
      const filteredMembers = currentTeamMembers.filter(memberId => memberId !== currentUser._id);
      
      // 构建更新后的gameTypes数据
      const updatedGameTypes = selectedGameTypes.map(selectedGameType => {
        const gameTypeObj = {
          name: selectedGameType,
          group: selectedGroups[selectedGameType]
        };

        if (selectedGameType === gameTypeName) {
          // 为退出的游戏类型更新团队成员
          if (selectedGameType.includes('接力')) {
            if (filteredMembers.length > 0) {
              gameTypeObj.team = {
                name: `${selectedGameType}队伍`,
                members: filteredMembers.map((memberId, index) => ({
                  _id: memberId,
                  runOrder: index + 1
                }))
              };
            }
          } else if (selectedGameType === '团队赛') {
            if (filteredMembers.length > 0) {
              gameTypeObj.team = {
                name: `${selectedGameType}队伍`,
                members: filteredMembers.map(memberId => ({
                  _id: memberId
                }))
              };
            }
          }
        } else {
          // 为其他游戏类型保持原有团队数据
          if (selectedGameType.includes('接力') || selectedGameType === '团队赛') {
            const teamMembers = relayTeamIds[selectedGameType] || [];
            const validMembers = teamMembers.filter(memberId => memberId && memberId.trim() !== '');
            if (validMembers.length > 0) {
              if (selectedGameType.includes('接力')) {
                gameTypeObj.team = {
                  name: `${selectedGameType}队伍`,
                  members: validMembers.map((memberId, index) => ({
                    _id: memberId,
                    runOrder: index + 1
                  }))
                };
              } else {
                gameTypeObj.team = {
                  name: `${selectedGameType}队伍`,
                  members: validMembers.map(memberId => ({
                    _id: memberId
                  }))
                };
              }
            }
          }
        }

        return gameTypeObj;
      });

      const registrationData = {
        eventId: id,
        gameTypes: updatedGameTypes
      };

      // 调用后端API更新注册数据
      if (isEditMode && existingRegistration) {
        await axios.put(createApiUrl(`/api/registrations/${existingRegistration._id}`), registrationData);
        
        // 更新本地状态
        setRelayTeamIds(prev => ({
          ...prev,
          [gameTypeName]: filteredMembers
        }));

        // 更新relayTeams状态（显示的名称）
        const updatedTeamNames = [];
        for (let i = 0; i < filteredMembers.length; i++) {
          const memberId = filteredMembers[i];
          const memberData = relayTeamMembers[gameTypeName]?.find(m => m._id === memberId);
          updatedTeamNames[i] = memberData?.name || '';
        }
        
        // 填充空位置
        const gameTypeConfig = event.gameTypes?.find(gt => (typeof gt === 'string' ? gt : gt.name) === gameTypeName);
        const maxTeamSize = (typeof gameTypeConfig === 'object' && gameTypeConfig.teamSize) || 2;
        while (updatedTeamNames.length < maxTeamSize) {
          updatedTeamNames.push('');
        }

        setRelayTeams(prev => ({
          ...prev,
          [gameTypeName]: updatedTeamNames
        }));

        // 更新relayTeamMembers状态
        const updatedMemberData = [];
        for (let i = 0; i < filteredMembers.length; i++) {
          const memberId = filteredMembers[i];
          const memberData = relayTeamMembers[gameTypeName]?.find(m => m._id === memberId);
          updatedMemberData[i] = memberData || null;
        }
        while (updatedMemberData.length < maxTeamSize) {
          updatedMemberData.push(null);
        }

        setRelayTeamMembers(prev => ({
          ...prev,
          [gameTypeName]: updatedMemberData
        }));

        // 重新获取最新的注册数据
        await fetchExistingRegistration();
        
        toast.success('已成功退出团队');
      } else {
        toast.error('无法退出团队：未找到现有注册记录');
      }
    } catch (error) {
      console.error('退出团队失败:', error);
      toast.error('退出团队失败，请重试');
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
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-6`}>{isEditMode ? '编辑报名信息' : '赛事报名'}</h2>
            
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
                              {/* 检查当前用户是否已在团队中 */}
                              {(() => {
                                const currentTeamMembers = relayTeamIds[gameTypeName] || [];
                                const currentUserId = currentUser?._id;
                                const userInTeam = currentTeamMembers.includes(currentUserId);
                                const duplicateCount = currentTeamMembers.filter(id => id === currentUserId).length;
                                
                                if (userInTeam && duplicateCount > 1) {
                                  return (
                                    <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
                                      <div className="flex items-center mb-2">
                                        <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span className={`font-medium ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>
                                          检测到重复成员
                                        </span>
                                      </div>
                                      <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'} mb-3`}>
                                        您在此团队中出现了 {duplicateCount} 次。请点击下方按钮退出团队，然后重新加入。
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => handleQuitTeam(gameTypeName)}
                                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                                      >
                                        退出团队
                                      </button>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              
                              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                {gameTypeName.includes('接力') ? '接力队员' : '团队成员'} (最多{(() => {
                                  const gameTypeConfig = event.gameTypes?.find(gt => (typeof gt === 'string' ? gt : gt.name) === gameTypeName);
                                  return (typeof gameTypeConfig === 'object' && gameTypeConfig.teamSize) || 2;
                                })()}人)
                              </label>
                              {(relayTeams[gameTypeName] || []).map((member, memberIndex) => {
                                const isCaptain = memberIndex === 0; // 第一个是队长
                                const memberData = relayTeamMembers[gameTypeName]?.[memberIndex];
                                return (
                                  <div key={memberIndex} className="mb-2">
                                    {isCaptain ? (
                                      <div className="relative flex items-center space-x-3">
                                        <Avatar 
                                          src={memberData?.avatar} 
                                          alt={memberData?.name || member}
                                          size="sm"
                                          fallbackText={memberData?.name || member}
                                        />
                                        <div className="flex-1 relative">
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
                                      </div>
                                    ) : (
                                      <div className="flex items-center space-x-3">
                                        <Avatar 
                                          src={memberData?.avatar} 
                                          alt={memberData?.name || member}
                                          size="sm"
                                          fallbackText={memberData?.name || member || '?'}
                                          className={!memberData ? 'opacity-50' : ''}
                                        />
                                        <div className="flex-1">
                                          <AutocompleteInput
                                            value={member}
                                            onChange={(value) => handleRelayTeamChange(gameTypeName, memberIndex, value)}
                                            onSelect={(student) => handleRelayTeamSelect(gameTypeName, memberIndex, student)}
                                            placeholder={`队员 ${memberIndex + 1} 姓名`}
                                            className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                          />
                                        </div>
                                      </div>
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
                {submitting ? '提交中...' : (isEditMode ? '更新报名' : '确认报名')}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default EventRegistrationDetail;