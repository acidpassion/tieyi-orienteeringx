import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../config/axiosConfig';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { createApiUrl } from '../config/api';
import { Clock, Calendar, BookOpen, Play, CheckCircle } from 'lucide-react';

const Dashboard = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizResults, setQuizResults] = useState({});
  const { getLocalizedText } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAssignments();
      fetchQuizResults();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      const response = await axios.get(createApiUrl('/api/assignments/student'));
      setAssignments(response.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizResults = async () => {
    try {
      const response = await axios.get(createApiUrl('/api/results/student'));
      const resultsMap = {};
      response.data.forEach(result => {
        if (result.quizId && result.quizId._id) {
          resultsMap[result.quizId._id] = result;
        }
      });
      setQuizResults(resultsMap);
    } catch (error) {
      console.error('Error fetching quiz results:', error);
    }
  };

  const formatDueDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // const getDifficultyColor = (difficulty) => {
  //   switch (difficulty) {
  //     case '1': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  //     case '2': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  //     case '3': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  //     default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  //   }
  // };

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">我的作业</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          请在截止日期前完成分配的测验
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无作业</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            您目前没有待完成的作业。
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => (
            <div
              key={assignment._id}
              className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {/* <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(assignment.quizId?.difficulty || '1')}`}>
                      等级 {assignment.quizId?.difficulty || '?'}
                    </span> */}
                    {assignment.studentStatus === 'completed' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        已完成
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {assignment.quizId ? getLocalizedText(assignment.quizId.category, assignment.quizId.category_cn) : '未知类别'}
                  </span>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {assignment.quizId ? getLocalizedText(assignment.quizId.quiz_title, assignment.quizId.quiz_title_cn) : assignment.title}
                </h3>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {assignment.quizId ? getLocalizedText(assignment.quizId.description, assignment.quizId.description_cn) : '测验详情不可用'}
                </p>
                
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <Clock className="h-4 w-4 mr-1" />
                  {assignment.quizId?.maxTime || '?'} 分钟
                </div>
                
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <Calendar className="h-4 w-4 mr-1" />
                  截止时间: {formatDueDate(assignment.dueDate)}
                </div>
                
                {assignment.studentStatus === 'completed' && assignment.quizId && quizResults[assignment.quizId._id] && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">测验分数</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {Math.round(quizResults[assignment.quizId._id].score)}%
                      </span>
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {quizResults[assignment.quizId._id].correctCount}/{quizResults[assignment.quizId._id].totalQuestions} 题正确
                    </div>
                  </div>
                )}
                
                {assignment.quizId && assignment.quizId._id ? (
                  <Link
                    to={`/quiz/${assignment.quizId._id}`}
                    state={{ assignmentId: assignment._id }}
                    className={`w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      assignment.studentStatus === 'completed'
                        ? 'text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-500 dark:text-green-200 dark:bg-green-900 dark:hover:bg-green-800'
                        : 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    }`}
                  >
                    {assignment.studentStatus === 'completed' ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        重新测验
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        开始测验
                      </>
                    )}
                  </Link>
                ) : (
                  <div className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-100 cursor-not-allowed">
                    <Play className="h-4 w-4 mr-2" />
                    测验不可用
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;