import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { createApiUrl } from "../config/api";

const JoinRelayTeam = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInviteInfo();
  }, [inviteCode]);

  const fetchInviteInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 获取邀请码详细信息
      const response = await axios.post(createApiUrl('/api/registrations/invite-info'), {
        inviteCode
      });
      
      if (response.status === 200) {
        setInviteInfo(response.data.inviteInfo);
        setShowConfirmDialog(true);
      }
    } catch (error) {
      console.error('获取邀请信息失败:', error);
      
      if (error.response?.status === 404) {
        setError('无效的邀请码');
      } else if (error.response?.status === 400) {
        setError(error.response.data.message || '获取邀请信息失败');
      } else {
        setError('获取邀请信息失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const joinRelayTeam = async () => {
    try {
      setLoading(true);
      
      // 调用后端API加入接力队伍
      const response = await axios.post(createApiUrl('/api/registrations/join-relay'), {
        inviteCode
      });
      
      if (response.status === 200) {
        toast.success('成功加入接力队伍！');
        navigate('/profile');
      }
    } catch (error) {
      console.error('加入队伍失败:', error);
      if (error.response?.status === 400) {
        toast.error(error.response.data.message || '加入队伍失败');
      } else if (error.response?.status === 409) {
        toast.error('您已报名该赛事');
      } else {
        toast.error('加入队伍失败，请重试');
      }
      navigate('/profile');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (inviteInfo?.userStatus === 'already_registered') {
      // 用户已注册，需要先处理现有注册
      try {
        setLoading(true);
        
        // 获取用户现有注册
        const registrationsResponse = await axios.get(createApiUrl('/api/registrations/my'));
        const userRegistrations = registrationsResponse.data;
        
        // 找到该赛事的注册记录
        const existingReg = userRegistrations.find(reg => 
          reg.eventId._id === inviteInfo.event._id
        );
        
        if (existingReg) {
          // 删除现有注册
          await axios.delete(createApiUrl(`/api/registrations/${existingReg._id}`));
        }
        
        // 然后加入新队伍
        await joinRelayTeam();
      } catch (error) {
        console.error('切换队伍失败:', error);
        toast.error('切换队伍失败，请重试');
        navigate('/profile');
      }
    } else {
      // 用户未注册，直接加入
      await joinRelayTeam();
    }
  };

  const handleCancelJoin = () => {
    navigate('/profile');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在获取邀请信息...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">邀请码无效</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleCancelJoin}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            返回个人资料
          </button>
        </div>
      </div>
    );
  }

  if (showConfirmDialog && inviteInfo) {
    const isAlreadyRegistered = inviteInfo.userStatus === 'already_registered';
    const isTeamFull = inviteInfo.isTeamFull;
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
              isAlreadyRegistered ? 'bg-yellow-100' : isTeamFull ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              <svg className={`h-6 w-6 ${
                isAlreadyRegistered ? 'text-yellow-600' : isTeamFull ? 'text-red-600' : 'text-blue-600'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isAlreadyRegistered || isTeamFull ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                )}
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isAlreadyRegistered ? '您已经注册过该赛事' : isTeamFull ? '队伍已满员' : '确认加入队伍'}
            </h3>
          </div>
          
          {/* Event Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-2">赛事信息</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">赛事名称：</span>{inviteInfo.event.eventName}</p>
              <p><span className="font-medium">主办方：</span>{inviteInfo.event.organization}</p>
              <p><span className="font-medium">开始时间：</span>{formatDate(inviteInfo.event.startDate)}</p>
              <p><span className="font-medium">结束时间：</span>{formatDate(inviteInfo.event.endDate)}</p>
            </div>
          </div>
          
          {/* Game Type Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-2">比赛项目</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">项目名称：</span>{inviteInfo.gameType.name}</p>
              <p><span className="font-medium">队伍人数：</span>{inviteInfo.gameType.currentTeamSize}/{inviteInfo.gameType.maxTeamSize}</p>
            </div>
          </div>
          
          {/* Team Creator Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-2">队伍创建者</h4>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {inviteInfo.teamCreator.avatar ? (
                  <img
                    src={inviteInfo.teamCreator.avatar}
                    alt={inviteInfo.teamCreator.name || inviteInfo.teamCreator.username}
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ${inviteInfo.teamCreator.avatar ? 'hidden' : ''}`}>
                  <span className="text-sm font-medium text-white">
                    {inviteInfo.teamCreator.name?.charAt(0) || inviteInfo.teamCreator.username?.charAt(0) || '?'}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium">{inviteInfo.teamCreator.name || inviteInfo.teamCreator.username}</p>
                {inviteInfo.teamCreator.grade && <p className="text-gray-500">{inviteInfo.teamCreator.grade}</p>}
              </div>
            </div>
          </div>
          
          {/* Current Team Members */}
          {inviteInfo.teamMembers.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">当前队员</h4>
              <div className="space-y-2">
                {inviteInfo.teamMembers.map((member, index) => (
                  <div key={member._id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name || member.username}
                          className="h-6 w-6 rounded-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`h-6 w-6 rounded-full bg-gray-400 flex items-center justify-center ${member.avatar ? 'hidden' : ''}`}>
                        <span className="text-xs font-medium text-white">
                          {member.name?.charAt(0) || member.username?.charAt(0) || '?'}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 flex-1">
                      <span className="font-medium">{member.name || member.username}</span>
                      {member.grade && <span className="text-gray-500 ml-2">{member.grade}</span>}
                      {member.runOrder && <span className="text-blue-600 ml-2">第{member.runOrder}棒</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Status Message */}
          {isAlreadyRegistered && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                您已经注册过该赛事。如果确认加入此队伍，将会取消您当前的注册。
              </p>
            </div>
          )}
          
          {isTeamFull && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">
                该队伍已达到最大人数限制，无法加入。
              </p>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleCancelJoin}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
            {!isTeamFull && (
              <button
                onClick={handleConfirmJoin}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '处理中...' : (isAlreadyRegistered ? '确认切换队伍' : '确认加入')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default JoinRelayTeam;