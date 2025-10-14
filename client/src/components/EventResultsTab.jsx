import React, { useState, useEffect } from 'react';
import axios from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { createApiUrl } from '../config/api';
import { Download, Trophy, Users, X } from 'lucide-react';

const EventResultsTab = ({ eventId, isCreating }) => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [results, setResults] = useState([]);
  const [gameTypes, setGameTypes] = useState([]);
  const [event, setEvent] = useState(null);
  const [teamColors, setTeamColors] = useState({});

  // Generate gradient colors for teams
  const generateTeamColors = (teamResults) => {
    const colors = {};
    const baseColors = [
      'bg-red-50 border-red-200',
      'bg-blue-50 border-blue-200', 
      'bg-green-50 border-green-200',
      'bg-yellow-50 border-yellow-200',
      'bg-purple-50 border-purple-200',
      'bg-pink-50 border-pink-200',
      'bg-indigo-50 border-indigo-200',
      'bg-orange-50 border-orange-200',
      'bg-teal-50 border-teal-200',
      'bg-cyan-50 border-cyan-200'
    ];
    
    let colorIndex = 0;
    const uniqueTeamIds = [...new Set(teamResults.map(result => result.teamId).filter(Boolean))];
    
    uniqueTeamIds.forEach(teamId => {
      colors[teamId] = baseColors[colorIndex % baseColors.length];
      colorIndex++;
    });
    
    return colors;
  };

  // Fetch event results
  const fetchEventResults = async () => {
    if (isCreating) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(createApiUrl(`/api/event-results/${eventId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const { event, gameTypes, results } = response.data.data;
        setEvent(event);
        setGameTypes(gameTypes); // Already ordered: relay first, then individual
        setResults(results);
        
        // Generate team colors for visual grouping
        const teamResults = results.filter(r => r.isTeamMember);
        setTeamColors(generateTeamColors(teamResults));
      }
    } catch (error) {
      console.error('获取赛事成绩失败:', error);
      const errorMessage = error.response?.data?.message || '获取赛事成绩失败';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const handleExport = async () => {
    if (isCreating) {
      toast.error('请先保存赛事后再导出成绩');
      return;
    }

    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(createApiUrl(`/api/event-results/${eventId}/export`), {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${event?.eventName || '赛事'}_成绩表_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('成绩表导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      const errorMessage = error.response?.data?.message || '导出失败，请稍后重试';
      toast.error(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  // Render position cell with validity check
  const renderPositionCell = (gameResult) => {
    if (!gameResult) {
      return <td className="px-1 py-1 text-center border border-gray-200 dark:border-gray-600 whitespace-nowrap" style={{ minWidth: '40px' }}></td>;
    }

    if (!gameResult.validity && gameResult.reason) {
      return (
        <td className="px-1 py-1 text-center border border-gray-200 dark:border-gray-600 whitespace-nowrap" style={{ minWidth: '40px' }}>
          <div className="flex items-center justify-center space-x-0.5">
            <X className="h-2 w-2 text-red-500 flex-shrink-0" />
            <span className="text-red-500 text-xs truncate" title={gameResult.reason}>
              {gameResult.reason}
            </span>
          </div>
        </td>
      );
    }

    return (
      <td className="px-1 py-1 text-center text-xs border border-gray-200 dark:border-gray-600 whitespace-nowrap" style={{ minWidth: '40px' }}>
        {gameResult.position || ''}
      </td>
    );
  };

  // Get row styling based on team membership
  const getRowStyling = (student) => {
    if (student.isTeamMember && student.teamId && teamColors[student.teamId]) {
      return teamColors[student.teamId];
    }
    return '';
  };

  useEffect(() => {
    fetchEventResults();
  }, [eventId, isCreating]);

  if (isCreating) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          暂无成绩数据
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          请先保存赛事并添加成绩数据后查看
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          暂无成绩数据
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          该赛事暂未录入成绩数据
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with export button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Trophy className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {event?.eventName} - 赛事成绩
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              共 {results.length} 名学生，{gameTypes.length} 个比赛项目
            </p>
          </div>
        </div>
        
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          {exporting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span>{exporting ? '导出中...' : '导出Excel'}</span>
        </button>
      </div>



      {/* Results table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700" style={{ minWidth: 'max-content' }}>
            <thead className="bg-gray-50 dark:bg-gray-700">
              {/* Header row 1: Game type names */}
              <tr>
                <th
                  rowSpan={2}
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600 whitespace-nowrap"
                  style={{ minWidth: '100px' }}
                >
                  学生信息
                </th>
                {gameTypes.map(gameType => (
                  <th
                    key={gameType}
                    colSpan={3}
                    className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600 whitespace-nowrap"
                    style={{ minWidth: '120px' }}
                  >
                    {gameType}
                  </th>
                ))}
              </tr>
              
              {/* Header row 2: Column names */}
              <tr>
                {gameTypes.map(gameType => (
                  <React.Fragment key={`${gameType}-headers`}>
                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600 whitespace-nowrap" style={{ minWidth: '40px' }}>
                      组别
                    </th>
                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600 whitespace-nowrap" style={{ minWidth: '60px' }}>
                      成绩
                    </th>
                    <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border border-gray-200 dark:border-gray-600 whitespace-nowrap" style={{ minWidth: '40px' }}>
                      名次
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((student, index) => {
                const rowStyling = getRowStyling(student);
                return (
                  <tr
                    key={`${student.name}-${index}`}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${rowStyling}`}
                  >
                    {/* Student name */}
                    <td className="px-2 py-1 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600" style={{ minWidth: '100px' }}>
                      <span className="text-sm">{student.name}</span>
                    </td>
                    
                    {/* Game type results */}
                    {gameTypes.map(gameType => {
                      const gameResult = student.gameTypes[gameType];
                      return (
                        <React.Fragment key={`${student.name}-${gameType}`}>
                          {/* Group name */}
                          <td className="px-1 py-1 text-center text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 whitespace-nowrap" style={{ minWidth: '40px' }}>
                            {gameResult?.groupName || ''}
                          </td>
                          
                          {/* Result */}
                          <td className="px-1 py-1 text-center text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 whitespace-nowrap" style={{ minWidth: '60px' }}>
                            {gameResult?.result || ''}
                          </td>
                          
                          {/* Position */}
                          {renderPositionCell(gameResult)}
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              参赛学生
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {results.length}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              比赛项目
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {gameTypes.length}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              团队成员
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {results.filter(r => r.isTeamMember).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventResultsTab;