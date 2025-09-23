import { useState, useEffect } from 'react';
import axios from '../../config/axiosConfig';
import { useLanguage } from '../../contexts/LanguageContext';
import { createApiUrl } from '../../config/api';
import { Users, ClipboardList, BookOpen, TrendingUp } from 'lucide-react';

const CoachDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalAssignments: 0,
    totalQuizzes: 0,
    completedAssignments: 0
  });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getLocalizedText } = useLanguage();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [studentsRes, assignmentsRes, quizzesRes] = await Promise.all([
        axios.get(createApiUrl('/api/students')),
        axios.get(createApiUrl('/api/assignments/coach')),
        axios.get(createApiUrl('/api/quizzes'))
      ]);

      // Calculate completed assignments - count assignments where at least one student has completed
      const completedAssignments = assignmentsRes.data.filter(assignment => {
        return assignment.assignedTo && assignment.assignedTo.some(student => student.status === 'completed');
      }).length;
      
      setStats({
        totalStudents: studentsRes.data.length,
        totalAssignments: assignmentsRes.data.length,
        totalQuizzes: quizzesRes.data.length,
        completedAssignments: completedAssignments
      });

      setRecentAssignments(assignmentsRes.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">教练仪表板</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          管理学生、作业并跟踪进度
        </p>
      </div>

      {/* Stats Overview Card */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-8">
        <div className="px-6 py-5">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            概览统计
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  学生总数
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalStudents}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  作业总数
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalAssignments}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  可用测验
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalQuizzes}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  已完成
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.completedAssignments}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Assignments */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            最近作业
          </h3>
          {recentAssignments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">暂无作业。</p>
          ) : (
            <div className="overflow-hidden">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentAssignments.map((assignment) => (
                  <li key={assignment._id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {assignment.title || getLocalizedText(assignment.quizId?.quiz_title, assignment.quizId?.quiz_title_cn)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          测验: {getLocalizedText(assignment.quizId?.quiz_title, assignment.quizId?.quiz_title_cn)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          分配给: {Array.isArray(assignment.assignedTo) 
                            ? `${assignment.assignedTo.length} 名学生` 
                            : assignment.assignedTo?.name || '未知'}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assignment.status === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {assignment.status}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoachDashboard;