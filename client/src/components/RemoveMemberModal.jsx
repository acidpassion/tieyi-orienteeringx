import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Avatar from './Avatar';

const RemoveMemberModal = ({
  isOpen,
  onClose,
  onConfirm,
  member,
  gameTypeName,
  loading = false
}) => {
  const { isDarkMode } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
          {/* Header */}
          <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${isDarkMode ? 'bg-red-900/20' : 'bg-red-100'
                  }`}>
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className={`text-lg font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                  移除团队成员
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <div className="flex items-center space-x-4 mb-4">
              <Avatar
                src={member?.avatar}
                alt={member?.name || member?.username}
                size="md"
                fallbackText={member?.name || member?.username}
              />
              <div>
                <p className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                  {member?.name || member?.username}
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  {gameTypeName}
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'
              }`}>
              <p className={`text-sm ${isDarkMode ? 'text-yellow-200' : 'text-yellow-800'
                }`}>
                <strong>注意：</strong>移除成员后，该成员的整个比赛类型注册记录将被删除。如果该成员只报名了这一个项目，其完整的报名记录也将被删除。
              </p>
            </div>

            <p className={`mt-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
              确定要移除 <strong>{member?.name || member?.username}</strong> 吗？此操作无法撤销。
            </p>
          </div>

          {/* Footer */}
          <div className={`px-6 py-4 border-t flex justify-end space-x-3 ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
            }`}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isDarkMode
                ? 'text-gray-300 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400'
                }`}
            >
              取消
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${loading
                ? 'bg-red-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700'
                }`}
            >
              {loading ? '移除中...' : '确认移除'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemoveMemberModal;