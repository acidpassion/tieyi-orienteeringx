import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useConfiguration } from '../context/ConfigurationContext';
import axios from '../config/axiosConfig';
import { toast } from 'sonner';
import { ArrowLeft, Users, Clock, MapPin, Calendar, Copy, Check, GripVertical, Upload } from 'lucide-react';
import { createApiUrl } from '../config/api';
import AutocompleteInput from '../components/AutocompleteInput';
import Avatar from '../components/Avatar';
import TeamMemberCard from '../components/TeamMemberCard';
import RemoveMemberModal from '../components/RemoveMemberModal';
import FileUpload from '../components/FileUpload';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

const EventRegistrationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { difficultyGrades } = useConfiguration();
  const confirm = useConfirmDialog();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedGameTypes, setSelectedGameTypes] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState({});
  const [selectedDifficultyGrades, setSelectedDifficultyGrades] = useState({});
  const [teamNames, setTeamNames] = useState({});
  const [relayTeams, setRelayTeams] = useState({});
  const [relayTeamIds, setRelayTeamIds] = useState([]);
  const [relayTeamMembers, setRelayTeamMembers] = useState({}); // Store full student data including avatars
  const [currentUser, setCurrentUser] = useState(null);
  const [userAge, setUserAge] = useState(null);
  const [existingRegistration, setExistingRegistration] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [removeMemberModal, setRemoveMemberModal] = useState({ isOpen: false, member: null, gameType: null });
  const [removingMember, setRemovingMember] = useState(false);
  const [draggedMember, setDraggedMember] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [syncingTeamData, setSyncingTeamData] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);


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

  const fetchDocuments = async (registrationId) => {
    if (!registrationId) return;
    
    setLoadingDocuments(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        createApiUrl(`/api/documents/registration/${registrationId}`),
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('获取文件列表失败:', error);
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchExistingRegistration = async () => {
    try {
      // Ensure event data is available before processing
      if (!event) {
        console.warn('Event data not available, skipping existing registration fetch');
        return;
      }

      const response = await axios.get(createApiUrl(`/api/registrations/my?eventId=${id}`));

      // Handle different response structures
      let userRegistrations = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          userRegistrations = response.data;
        } else if (response.data.registrations && Array.isArray(response.data.registrations)) {
          userRegistrations = response.data.registrations;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          userRegistrations = response.data.data;
        }
      }

      // Validate response data
      if (!Array.isArray(userRegistrations)) {
        console.warn('Invalid user registrations data after processing:', userRegistrations);
        return;
      }

      // 查找当前赛事的报名记录
      const existingReg = userRegistrations.find(reg =>
        reg && reg.eventId && reg.eventId._id === id
      );

      if (existingReg) {
        setExistingRegistration(existingReg);
        setIsEditMode(true);
        
        // Fetch documents for existing registration
        fetchDocuments(existingReg._id);

        // 预填充表单数据
        if (existingReg && existingReg.gameTypes && Array.isArray(existingReg.gameTypes) && existingReg.gameTypes.length > 0) {

          const gameTypeSelections = [];
          const groupSelections = {};
          const difficultyGradeSelections = {};
          const teamNameData = {};
          const teamData = {};
          const teamIdData = {};

          // 过滤掉null值并确保gameTypes数组存在
          const validGameTypes = existingReg.gameTypes?.filter(gameType => gameType !== null && gameType !== undefined) || [];


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

            if (gt.difficultyGrade) {
              console.log(`Setting difficulty grade for ${gt.name}: ${gt.difficultyGrade}`);
              difficultyGradeSelections[gt.name] = gt.difficultyGrade;
            }
            
            // Extract team name for team games
            if ((gt.name.includes('接力') || gt.name === '团队赛') && gt.team?.name) {
              teamNameData[gt.name] = gt.team.name;
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
                console.log(`Processing ${gt.team.members.length} team members for ${gt.name}`);
                gt.team.members.forEach((member, memberIndex) => {
                  if (memberIndex < teamSize && member !== null && member !== undefined) {
                    console.log(`Processing member ${memberIndex}:`, member);
                    // Use the populated name from backend, fallback to other fields
                    const memberName = member.name || member.realName || member.username || `Member ${memberIndex + 1}`;
                    teamArray[memberIndex] = memberName;
                    teamIdArray[memberIndex] = member._id || '';
                    teamMemberArray[memberIndex] = {
                      ...member,
                      name: memberName // Ensure name is available
                    };
                    console.log(`Set member ${memberIndex}: name="${memberName}", id="${member._id}"`);
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
          setSelectedDifficultyGrades(difficultyGradeSelections);
          setTeamNames(teamNameData);
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

        // 将当前用户设为第一个队员（队长）
        if (user) {
          const userId = user._id || user.id; // Try both _id and id
          
          initialTeams[0] = user.name;
          initialTeamIds[0] = userId;
          // Store current user data for avatar display
          setRelayTeamMembers(prev => ({
            ...prev,
            [gameTypeName]: [{ ...user, _id: userId, captain: true }, ...Array(teamSize - 1).fill(null)]
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

  const handleGroupChange = async (gameTypeName, groupCode) => {
    setSelectedGroups(prev => ({
      ...prev,
      [gameTypeName]: groupCode
    }));

    // For team games (relay and team), synchronize group changes across all team members
    if (isEditMode && (gameTypeName.includes('接力') || gameTypeName === '团队赛')) {
      await synchronizeTeamData(gameTypeName, { group: groupCode });
    }
  };

  const handleDifficultyGradeChange = async (gameTypeName, difficultyGrade) => {
    setSelectedDifficultyGrades(prev => ({
      ...prev,
      [gameTypeName]: difficultyGrade
    }));

    // For team games (relay and team), synchronize difficulty grade changes across all team members
    if (isEditMode && (gameTypeName.includes('接力') || gameTypeName === '团队赛')) {
      await synchronizeTeamData(gameTypeName, { difficultyGrade });
    }
  };

  const handleTeamNameChange = (gameTypeName, teamName) => {
    // Only update local state, no real-time sync
    setTeamNames(prev => ({
      ...prev,
      [gameTypeName]: teamName
    }));
  };

  // Synchronize team data across all team members' registrations
  const synchronizeTeamData = async (gameTypeName, updates) => {
    setSyncingTeamData(true);
    try {
      const currentGameType = existingRegistration?.gameTypes?.find(gt => gt.name === gameTypeName);
      if (!currentGameType?.team?.members) return;

      console.log('Starting team synchronization:', { gameTypeName, updates });

      // Call the backend API to synchronize team data
      const syncData = {
        eventId: id,
        gameTypeName: gameTypeName,
        updates: updates
      };

      const response = await axios.post(createApiUrl('/api/registrations/sync-team'), syncData);

      console.log('Team sync response:', response.data);

      // Refresh current registration to reflect changes
      await fetchExistingRegistration();

      const { updatedRegistrations, createdRegistrations, totalMembers } = response.data;

      let message = `已同步更新 ${updatedRegistrations}/${totalMembers} 名队员的${updates.group ? '组别' : '团队'}信息`;
      if (createdRegistrations > 0) {
        message += `，创建了 ${createdRegistrations} 个新的报名记录`;
      }

      toast.success(message);
    } catch (error) {
      console.error('同步团队数据失败:', error);
      const errorMessage = error.response?.data?.message || '同步团队数据失败，请重试';
      toast.error(errorMessage);
    } finally {
      setSyncingTeamData(false);
    }
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

  const handleRelayTeamSelect = async (gameTypeName, memberIndex, student) => {
    // 检查团队冲突
    if (student.teamStatus && (student.teamStatus === 'in_relay_team' || student.teamStatus === 'registered_other_game')) {
      const conflictMessage = student.teamStatus === 'in_relay_team'
        ? `${student.name} 已经加入了其他接力团队`
        : `${student.name} 已经注册了其他游戏类型`;

      const shouldContinue = window.confirm(`${conflictMessage}，是否仍要添加到队伍中？`);
      if (!shouldContinue) {
        return;
      }
    }

    // 检查是否已经在当前队伍中
    const currentTeamIds = relayTeamIds[gameTypeName] || [];
    if (currentTeamIds.includes(student._id)) {
      toast.error(`${student.name} 已经在当前队伍中`);
      return;
    }

    // 检查是否在其他队伍中
    const isInOtherTeam = Object.entries(relayTeamIds).some(([otherGameType, teamIds]) => {
      if (otherGameType === gameTypeName) return false;
      return teamIds.includes(student._id);
    });

    if (isInOtherTeam) {
      const shouldContinue = window.confirm(`${student.name} 已经在其他队伍中，是否仍要添加到当前队伍？`);
      if (!shouldContinue) {
        return;
      }
    }

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
      // 检查是否有接力赛或团队赛，如果有则先进行团队成员批量注册
      // 构建新的gameTypes数据结构
      const gameTypes = selectedGameTypes.map(gameTypeName => {
        const gameTypeObj = {
          name: gameTypeName,
          group: selectedGroups[gameTypeName],
          difficultyGrade: selectedDifficultyGrades[gameTypeName] || ''
        };

        // 如果是接力赛，添加team结构
        if (gameTypeName.includes('接力')) {
          const teamMembers = relayTeamIds[gameTypeName] || [];
          console.log(`DEBUG - ${gameTypeName} teamMembers:`, teamMembers);
          
          // 过滤掉空的memberId
          let validMembers = teamMembers.filter(memberId => memberId && memberId.trim() !== '');
          console.log(`DEBUG - ${gameTypeName} validMembers after filter:`, validMembers);
          console.log(`DEBUG - user._id:`, user?._id);
          console.log(`DEBUG - user.id:`, user?.id);
          
          // 确保发起人总是在队伍中（如果还没有任何成员，添加发起人）
          const userId = user?._id || user?.id; // Try both _id and id
          if (validMembers.length === 0 && userId) {
            console.log(`DEBUG - Adding initiator ${userId} to ${gameTypeName}`);
            validMembers = [userId];
          }
          
          console.log(`DEBUG - Final validMembers for ${gameTypeName}:`, validMembers);
          
          // 为接力赛创建team结构（至少包含发起人）
          gameTypeObj.team = {
            name: teamNames[gameTypeName] || `${gameTypeName}队伍`,
            members: validMembers.map((memberId, index) => ({
              _id: memberId,
              runOrder: index + 1,
              captain: index === 0 // 第一个成员（注册发起人）为队长
            }))
          };
          
          console.log(`DEBUG - Created team structure for ${gameTypeName}:`, gameTypeObj.team);
        }
        // 如果是团队赛，添加team结构（不包含runOrder）
        else if (gameTypeName === '团队赛') {
          const teamMembers = relayTeamIds[gameTypeName] || [];
          console.log(`DEBUG - ${gameTypeName} teamMembers:`, teamMembers);
          
          // 过滤掉空的memberId
          let validMembers = teamMembers.filter(memberId => memberId && memberId.trim() !== '');
          console.log(`DEBUG - ${gameTypeName} validMembers after filter:`, validMembers);
          console.log(`DEBUG - user._id:`, user?._id);
          console.log(`DEBUG - user.id:`, user?.id);
          
          // 确保发起人总是在队伍中（如果还没有任何成员，添加发起人）
          const userId = user?._id || user?.id; // Try both _id and id
          if (validMembers.length === 0 && userId) {
            console.log(`DEBUG - Adding initiator ${userId} to ${gameTypeName}`);
            validMembers = [userId];
          }
          
          console.log(`DEBUG - Final validMembers for ${gameTypeName}:`, validMembers);
          
          // 为团队赛创建team结构（至少包含发起人）
          gameTypeObj.team = {
            name: teamNames[gameTypeName] || `${gameTypeName}队伍`,
            members: validMembers.map((memberId, index) => ({
              _id: memberId,
              captain: index === 0 // 第一个成员（注册发起人）为队长
            }))
          };
          
          console.log(`DEBUG - Created team structure for ${gameTypeName}:`, gameTypeObj.team);
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

        // Update state for new registration
        if (!isEditMode) {
          setExistingRegistration(registrationData);
          setIsEditMode(true);
          // Fetch documents for the new registration
          fetchDocuments(registrationData._id);
        }

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

        // Synchronize team names across all team members after successful submission
        if (isEditMode) {
          const teamGameTypes = selectedGameTypes.filter(gt => gt.includes('接力') || gt === '团队赛');
          for (const gameTypeName of teamGameTypes) {
            if (teamNames[gameTypeName]) {
              try {
                await synchronizeTeamData(gameTypeName, { 
                  teamName: teamNames[gameTypeName] 
                });
              } catch (error) {
                console.error(`Failed to sync team name for ${gameTypeName}:`, error);
                // Don't show error to user as the main registration was successful
              }
            }
          }
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
          group: selectedGroups[selectedGameType],
          difficultyGrade: selectedDifficultyGrades[selectedGameType] || ''
        };

        if (selectedGameType === gameTypeName) {
          // 为退出的游戏类型更新团队成员
          if (selectedGameType.includes('接力')) {
            if (filteredMembers.length > 0) {
              gameTypeObj.team = {
                name: teamNames[selectedGameType] || `${selectedGameType}队伍`,
                members: filteredMembers.map((memberId, index) => ({
                  _id: memberId,
                  runOrder: index + 1,
                  captain: index === 0 // 第一个成员为队长
                }))
              };
            }
          } else if (selectedGameType === '团队赛') {
            if (filteredMembers.length > 0) {
              gameTypeObj.team = {
                name: teamNames[selectedGameType] || `${selectedGameType}队伍`,
                members: filteredMembers.map((memberId, index) => ({
                  _id: memberId,
                  captain: index === 0 // 第一个成员为队长
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
                  name: teamNames[selectedGameType] || `${selectedGameType}队伍`,
                  members: validMembers.map((memberId, index) => ({
                    _id: memberId,
                    runOrder: index + 1,
                    captain: index === 0 // 第一个成员为队长
                  }))
                };
              } else {
                gameTypeObj.team = {
                  name: teamNames[selectedGameType] || `${selectedGameType}队伍`,
                  members: validMembers.map((memberId, index) => ({
                    _id: memberId,
                    captain: index === 0 // 第一个成员为队长
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

  // Handle remove member (captain only)
  const handleRemoveMember = (member, gameType) => {
    console.log('Opening remove member modal for:', member.name);

    if (!member || !gameType) {
      console.error('Missing member or gameType data');
      toast.error('数据错误，无法移除成员');
      return;
    }

    setRemoveMemberModal({
      isOpen: true,
      member,
      gameType
    });
  };

  // Drag and drop handlers for reordering team members
  const handleDragStart = (e, member, index) => {
    setDraggedMember({ member, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, dropIndex, gameTypeName) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedMember || draggedMember.index === dropIndex) {
      setDraggedMember(null);
      return;
    }

    try {
      const currentGameType = existingRegistration.gameTypes.find(gt => gt.name === gameTypeName);
      if (!currentGameType || !currentGameType.team?.members) return;

      const members = [...currentGameType.team.members];
      const draggedItem = members[draggedMember.index];

      // Remove dragged item and insert at new position
      members.splice(draggedMember.index, 1);
      members.splice(dropIndex, 0, draggedItem);

      // Update run orders for relay games
      const updatedMembers = members.map((member, index) => ({
        ...member,
        ...(gameTypeName.includes('接力') && { runOrder: index + 1 })
      }));

      // Build complete game types array including all existing registrations
      const updatedGameTypes = existingRegistration.gameTypes.map(existingGT => {
        if (existingGT.name === gameTypeName) {
          return {
            name: gameTypeName,
            group: existingGT.group,
            team: {
              ...existingGT.team,
              members: updatedMembers
            }
          };
        } else {
          return {
            name: existingGT.name,
            group: existingGT.group,
            ...(existingGT.team && { team: existingGT.team }),
            ...(existingGT.members && { members: existingGT.members })
          };
        }
      });

      const registrationData = {
        eventId: id,
        gameTypes: updatedGameTypes
      };

      await axios.put(createApiUrl(`/api/registrations/${existingRegistration._id}`), registrationData);
      await fetchExistingRegistration();

      // Synchronize team data across all team members
      await synchronizeTeamData(gameTypeName, {
        group: existingRegistration.gameTypes.find(gt => gt.name === gameTypeName)?.group
      });

      toast.success('队员顺序已更新');
    } catch (error) {
      console.error('更新队员顺序失败:', error);
      toast.error('更新队员顺序失败，请重试');
    } finally {
      setDraggedMember(null);
    }
  };

  const confirmRemoveMember = async () => {
    if (!removeMemberModal.member || !existingRegistration) {
      console.error('Missing data for remove member');
      return;
    }

    console.log('Removing member:', removeMemberModal.member.name);

    setRemovingMember(true);
    try {
      const requestData = {
        eventId: id,
        memberStudentId: removeMemberModal.member.userId,
        gameTypeName: removeMemberModal.gameType.name,
        inviteCode: removeMemberModal.gameType.team?.inviteCode
      };

      const response = await axios.delete(createApiUrl(`/api/registrations/${existingRegistration._id}/remove-member`), {
        data: requestData
      });

      console.log('Member removed successfully:', response.data);

      // Refresh registration data
      await fetchExistingRegistration();

      // Synchronize team data across remaining team members
      await synchronizeTeamData(removeMemberModal.gameType.name, {
        group: existingRegistration.gameTypes.find(gt => gt.name === removeMemberModal.gameType.name)?.group
      });

      toast.success('成员已移除');
      setRemoveMemberModal({ isOpen: false, member: null, gameType: null });
    } catch (error) {
      console.error('移除成员失败:', error);
      toast.error(error.response?.data?.message || '移除成员失败，请重试');
    } finally {
      setRemovingMember(false);
    }
  };

  // Check if current user is captain of a specific game type
  const isCurrentUserCaptain = (gameType) => {
    if (!user || !gameType.team?.members) return false;
    const currentUserMember = gameType.team.members.find(m => (m.userId || m._id) === user._id);
    return currentUserMember?.captain === true;
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <button
            onClick={() => navigate('/events/register')}
            className={`flex items-center self-start ${isDarkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">返回赛事列表</span>
            <span className="sm:hidden">返回</span>
          </button>

          <button
            onClick={copyRegistrationUrl}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
          >
            {urlCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            <span className="hidden sm:inline">{urlCopied ? '已复制' : '复制报名链接'}</span>
            <span className="sm:hidden">{urlCopied ? '已复制' : '复制链接'}</span>
          </button>
        </div>

        {/* Event Info */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-4 sm:p-6 mb-6`}>
          <h1 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4 break-words`}>
            {event.eventName}
          </h1>

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <div className="flex items-start sm:items-center">
              <Calendar className="h-4 w-4 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
              <span className="break-words">
                {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-start sm:items-center">
              <MapPin className="h-4 w-4 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
              <span className="break-words">{event.location || '待定'}</span>
            </div>
            <div className="flex items-start sm:items-center">
              <Users className="h-4 w-4 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
              <span className="break-words">{event.organization}</span>
            </div>
            <div className="flex items-start sm:items-center">
              <Clock className="h-4 w-4 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
              <span className="break-words">{event.eventType}</span>
            </div>
          </div>
        </div>



        {/* Registration Form */}
        <form onSubmit={handleSubmit} className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-4 sm:p-6`}>
          <RemoveMemberModal
            isOpen={removeMemberModal.isOpen}
            onClose={() => setRemoveMemberModal({ isOpen: false, member: null, gameType: null })}
            onConfirm={confirmRemoveMember}
            member={removeMemberModal.member}
            gameTypeName={removeMemberModal.gameType?.name}
            loading={removingMember}
          />
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
                          <div className="relative">
                            <select
                              value={selectedGroups[gameTypeName] || ''}
                              onChange={(e) => handleGroupChange(gameTypeName, e.target.value)}
                              disabled={syncingTeamData}
                              className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${syncingTeamData ? 'opacity-50 cursor-not-allowed' : ''}`}
                              required
                            >
                              <option value="">请选择组别</option>
                              {getAvailableGroups().map((groupCode, groupIndex) => (
                                <option key={groupIndex} value={groupCode}>
                                  {groupCode}
                                </option>
                              ))}
                            </select>
                            {syncingTeamData && (
                              <div className="absolute inset-y-0 right-8 flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                          </div>
                          {userAge && (
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                              您的年龄: {userAge}岁，可选择{userAge}岁及以上的组别
                            </p>
                          )}
                          {syncingTeamData && (
                            <p className={`text-xs text-blue-600 dark:text-blue-400 mt-1`}>
                              正在同步团队数据...
                            </p>
                          )}
                        </div>

                        {/* Difficulty Grade Selection */}
                        <div>
                          <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                            难度等级
                          </label>
                          <div className="relative">
                            <select
                              value={selectedDifficultyGrades[gameTypeName] || ''}
                              onChange={(e) => handleDifficultyGradeChange(gameTypeName, e.target.value)}
                              disabled={syncingTeamData}
                              className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${syncingTeamData ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <option value="">请选择难度等级</option>
                              {difficultyGrades.map((grade, gradeIndex) => (
                                <option key={gradeIndex} value={grade.color}>
                                  {grade.color} - {grade.level} (等级 {grade.number})
                                </option>
                              ))}
                            </select>
                            {syncingTeamData && (
                              <div className="absolute inset-y-0 right-8 flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                          </div>
                          {selectedDifficultyGrades[gameTypeName] && (
                            <div className="flex items-center mt-2">
                              <div
                                className="w-4 h-4 rounded-full border border-gray-300 mr-2"
                                style={{ 
                                  backgroundColor: difficultyGrades.find(g => g.color === selectedDifficultyGrades[gameTypeName])?.colorCode || '#000000'
                                }}
                              ></div>
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                已选择: {selectedDifficultyGrades[gameTypeName]}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Team Name Field for Relay and Team Games */}
                        {(gameTypeName.includes('接力') || gameTypeName === '团队赛') && (
                          <div className="mb-4">
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                              队伍名称
                            </label>
                            <input
                              type="text"
                              value={teamNames[gameTypeName] || ''}
                              onChange={(e) => handleTeamNameChange(gameTypeName, e.target.value)}
                              placeholder={`输入${gameTypeName}队伍名称`}
                              className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                              队伍名称将在提交表单时同步给所有队员
                            </p>
                          </div>
                        )}

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
                            {/* 显示现有团队成员（如果存在） */}
                            {(() => {
                              const currentGameType = existingRegistration?.gameTypes?.find(gt => gt.name === gameTypeName);
                              const isCurrentUserCaptain = currentGameType?.team?.members?.some(m =>
                                (m.userId === user?._id || m._id === user?._id) && m.captain === true
                              ) || false;

                              // Check if we have team members from existing registration OR from local state (for newly added game types)
                              const hasExistingMembers = currentGameType?.team?.members?.length > 0;
                              const hasLocalMembers = relayTeamIds[gameTypeName]?.some(id => id && id.trim() !== '');
                              const shouldShowMembers = hasExistingMembers || hasLocalMembers;

                              if (isEditMode && shouldShowMembers) {
                                return (
                                  <div className="space-y-2 mb-4">
                                    {!isCurrentUserCaptain && (
                                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
                                        <p className={`text-sm ${isDarkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
                                          <strong>注意：</strong>只有队长可以修改团队成员。
                                        </p>
                                      </div>
                                    )}
                                    {(() => {
                                      // Use existing members if available, otherwise use local state members
                                      const membersToShow = hasExistingMembers 
                                        ? currentGameType.team.members 
                                        : (relayTeamIds[gameTypeName] || [])
                                            .filter(id => id && id.trim() !== '')
                                            .map((id, index) => ({
                                              _id: id,
                                              userId: id,
                                              name: relayTeamMembers[gameTypeName]?.[index]?.name || 'Unknown',
                                              captain: index === 0, // First member is captain
                                              runOrder: gameTypeName.includes('接力') ? index + 1 : undefined
                                            }));
                                      
                                      return membersToShow.map((member, memberIndex) => {
                                      const memberData = {
                                        userId: member.userId || member._id,
                                        name: member.realName || member.name || member.username,
                                        username: member.username,
                                        avatar: member.avatar,
                                        runOrder: member.runOrder
                                      };
                                      const isCaptain = member.captain === true;

                                      const isRelay = gameTypeName.includes('接力');
                                      const isTeamGame = gameTypeName.includes('接力') || gameTypeName === '团队赛';
                                      const isDraggable = isCurrentUserCaptain && isRelay; // Only relay games can be reordered
                                      const isDragOver = dragOverIndex === memberIndex;

                                      return (
                                        <div
                                          key={memberIndex}
                                          className={`mb-2 transition-all duration-200 ${isDragOver ? 'transform scale-105 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2' : ''
                                            }`}
                                        >
                                          <div
                                            draggable={isDraggable}
                                            onDragStart={(e) => isDraggable && handleDragStart(e, memberData, memberIndex)}
                                            onDragOver={(e) => isDraggable && handleDragOver(e, memberIndex)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => isDraggable && handleDrop(e, memberIndex, gameTypeName)}
                                            className={`flex items-center gap-2 ${isDraggable ? 'cursor-move hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1' : ''
                                              }`}
                                          >
                                            {isDraggable && (
                                              <div className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                                <GripVertical className="h-4 w-4" />
                                              </div>
                                            )}
                                            <div className="flex-1">
                                              <TeamMemberCard
                                                member={memberData}
                                                isCaptain={isCaptain}
                                                isCurrentUserCaptain={isCurrentUserCaptain}
                                                canRemove={isCurrentUserCaptain && !isCaptain}
                                                onRemove={() => handleRemoveMember(memberData, currentGameType)}
                                                className={`${isDraggable ? 'select-none' : ''}`}
                                              />
                                            </div>
                                          </div>

                                        </div>
                                      );
                                    });
                                    })()}

                                    {/* Drag and drop instruction for relay games */}
                                    {(() => {
                                      const currentGameType = existingRegistration?.gameTypes?.find(gt => gt.name === gameTypeName);
                                      const isCurrentUserCaptain = currentGameType?.team?.members?.some(m =>
                                        (m.userId === user?._id || m._id === user?._id) && m.captain === true
                                      ) || false;
                                      const isRelay = gameTypeName.includes('接力');
                                      const hasMembers = currentGameType?.team?.members?.length > 0;

                                      if (isCurrentUserCaptain && isRelay && hasMembers) {
                                        return (
                                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-3 text-center bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                                            💡 拖拽队员卡片可调整接力棒次
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}

                                    {!isCurrentUserCaptain && (
                                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                                        如需修改团队成员，请联系队长操作。
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* 队长添加新成员的输入框（编辑模式下显示空槽位） */}
                            {(() => {
                              const currentGameType = existingRegistration?.gameTypes?.find(gt => gt.name === gameTypeName);
                              const isCurrentUserCaptain = currentGameType?.team?.members?.some(m =>
                                (m.userId === user?._id || m._id === user?._id) && m.captain === true
                              ) || false;

                              // 在编辑模式下，如果是队长或者还没有团队成员（可以创建团队），显示可用的空槽位供添加新成员
                              const hasNoTeamYet = !currentGameType?.team?.members || currentGameType.team.members.length === 0;
                              const canManageTeam = isCurrentUserCaptain || hasNoTeamYet;

                              if (isEditMode && canManageTeam) {
                                const gameTypeConfig = event.gameTypes?.find(gt => (typeof gt === 'string' ? gt : gt.name) === gameTypeName);
                                const maxTeamSize = (typeof gameTypeConfig === 'object' && gameTypeConfig.teamSize) || 2;
                                // Count both existing members and local state members
                                const existingMembers = currentGameType?.team?.members || [];
                                const localMembers = relayTeamIds[gameTypeName]?.filter(id => id && id.trim() !== '') || [];
                                
                                // Use existing members if available, otherwise use local members
                                const currentMembers = existingMembers.length > 0 ? existingMembers : localMembers.map(id => ({ _id: id }));
                                const availableSlots = maxTeamSize - currentMembers.length;

                                if (availableSlots > 0) {
                                  return (
                                    <div className="space-y-2 mt-4">
                                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        添加新成员 ({availableSlots} 个空位可用)
                                      </p>
                                      {Array.from({ length: availableSlots }, (_, index) => (
                                        <div key={`empty-slot-${index}`} className="flex items-center space-x-3">
                                          <Avatar
                                            size="sm"
                                            fallbackText="?"
                                            className="opacity-50"
                                          />
                                          <div className="flex-1">
                                            <AutocompleteInput
                                              value=""
                                              onChange={(value) => {
                                                // Handle adding new member
                                                if (value && value.trim()) {
                                                  handleRelayTeamChange(gameTypeName, currentMembers.length + index, value);
                                                }
                                              }}
                                              onSelect={async (student) => {
                                                // Add the new member to the team
                                                try {
                                                  // Construct team members with required fields
                                                  const existingMembers = currentMembers.map((m, index) => ({
                                                    _id: m._id || m.userId,
                                                    captain: m.captain || false,
                                                    ...(gameTypeName.includes('接力') && { runOrder: m.runOrder || (index + 1) })
                                                  }));

                                                  // Add new member
                                                  const newMember = {
                                                    _id: student._id,
                                                    captain: false, // New members are never captains
                                                    ...(gameTypeName.includes('接力') && { runOrder: existingMembers.length + 1 })
                                                  };

                                                  // Ensure at least one captain exists
                                                  const allMembers = [...existingMembers, newMember];
                                                  const hasCaptain = allMembers.some(m => m.captain === true);
                                                  if (!hasCaptain && allMembers.length > 0) {
                                                    allMembers[0].captain = true; // Make first member captain if none exists
                                                  }

                                                  // Build complete game types array including all existing registrations
                                                  const updatedGameTypes = existingRegistration.gameTypes.map(existingGT => {
                                                    if (existingGT.name === gameTypeName) {
                                                      // Update the current game type with new team member
                                                      return {
                                                        name: gameTypeName,
                                                        group: selectedGroups[gameTypeName] || existingGT.group,
                                                        team: {
                                                          name: `${gameTypeName}队伍`,
                                                          members: allMembers
                                                        }
                                                      };
                                                    } else {
                                                      // Keep other game types unchanged
                                                      return {
                                                        name: existingGT.name,
                                                        group: existingGT.group,
                                                        ...(existingGT.team && { team: existingGT.team }),
                                                        ...(existingGT.members && { members: existingGT.members })
                                                      };
                                                    }
                                                  });

                                                  const registrationData = {
                                                    eventId: id,
                                                    gameTypes: updatedGameTypes
                                                  };

                                                  await axios.put(createApiUrl(`/api/registrations/${existingRegistration._id}`), registrationData);
                                                  await fetchExistingRegistration();

                                                  // Synchronize team data across all team members
                                                  await synchronizeTeamData(gameTypeName, {
                                                    group: selectedGroups[gameTypeName] || existingRegistration.gameTypes.find(gt => gt.name === gameTypeName)?.group
                                                  });

                                                  toast.success(`已添加 ${student.name} 到团队`);
                                                } catch (error) {
                                                  console.error('添加成员失败:', error);
                                                  toast.error(error.response?.data?.message || '添加成员失败，请重试');
                                                }
                                              }}
                                              placeholder={`搜索并添加队员 ${currentMembers.length + index + 1}`}
                                              className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                              eventId={id}
                                              showTeamStatus={true}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                                        搜索学生姓名或用户名来添加新的团队成员
                                      </p>
                                    </div>
                                  );
                                }
                              }

                              // 新建模式下的原有逻辑
                              if (!isEditMode) {
                                return (
                                  <>
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
                                                  eventId={id}
                                                  showTeamStatus={true}
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
                                  </>
                                );
                              }

                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* File Upload Section */}
          <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6 mb-6`}>
            <div className="flex items-center mb-4">
              <Upload className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                上传相关文件
              </h3>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
              请上传保险单据和责任告知书等相关文件
            </p>
            
            {!existingRegistration ? (
              <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Upload className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>请先完成报名，然后即可上传相关文件</p>
              </div>
            ) : loadingDocuments ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <FileUpload
                registrationId={existingRegistration._id}
                existingDocuments={documents}
                onUploadSuccess={() => fetchDocuments(existingRegistration._id)}
                confirmDialog={confirm}
              />
            )}
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