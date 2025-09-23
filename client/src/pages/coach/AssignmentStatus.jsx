import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Clock, CheckCircle, XCircle, Eye, Award, Target, Calendar } from 'lucide-react';
import axios from '../../config/axiosConfig';

const AssignmentStatus = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentResult, setStudentResult] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);

  useEffect(() => {
    fetchAssignmentStatus();
  }, [assignmentId]);

  const fetchAssignmentStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/assignments/${assignmentId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setAssignment(response.data.assignment);
      setStudentResults(response.data.studentResults);
    } catch (error) {
      console.error('Error fetching assignment status:', error);
      setError('加载作业状态失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentResult = async (studentId) => {
    try {
      setResultLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/assignments/${assignmentId}/student/${studentId}/result`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setStudentResult(response.data);
    } catch (error) {
      console.error('Error fetching student result:', error);
      setStudentResult(null);
    } finally {
      setResultLoading(false);
    }
  };

  const handleViewResult = (student) => {
    setSelectedStudent(student);
    if (student.status === 'completed') {
      fetchStudentResult(student.studentId);
    }
  };

  const closeResultModal = () => {
    setSelectedStudent(null);
    setStudentResult(null);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'pending':
        return '待完成';
      default:
        return '未开始';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };



  const calculateAccuracy = (correctCount, totalQuestions) => {
    if (!totalQuestions || totalQuestions === 0) return 0;
    return Math.round((correctCount / totalQuestions) * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/coach/assignments')}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">作业未找到</h2>
          <button
            onClick={() => navigate('/coach/assignments')}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            返回作业列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/coach/assignments')}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              作业状态详情
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              查看学生完成情况和成绩详情
            </p>
          </div>
        </div>

        {/* Assignment Info */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">作业标题</h3>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {assignment.title}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">截止日期</h3>
              <p className="mt-1 text-lg text-gray-900 dark:text-white">
                {new Date(assignment.dueDate).toLocaleString('zh-CN')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">分配学生数</h3>
              <p className="mt-1 text-lg text-gray-900 dark:text-white">
                {assignment.assignedTo?.length || 0} 人
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">已完成</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {studentResults.filter(result => result.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">待完成</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {studentResults.filter(result => result.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center">
            <User className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">平均分</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {studentResults.length > 0 
                  ? Math.round(studentResults.reduce((sum, result) => sum + (result.score || 0), 0) / studentResults.length)
                  : 0
                }
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">平均准确率</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {studentResults.length > 0 
                  ? Math.round(studentResults.reduce((sum, result) => {
                      const accuracy = calculateAccuracy(result.correctCount, result.totalQuestions);
                      return sum + accuracy;
                    }, 0) / studentResults.length)
                  : 0
                }%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Student Results List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            学生完成详情
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            查看每个学生的完成状态和成绩
          </p>
        </div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {studentResults.map((result) => (
            <li key={result.studentId} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {result.student?.avatar ? (
                      <img
                        className="h-10 w-10 rounded-full"
                        src={result.student.avatar}
                        alt={result.student.name}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {result.student?.name || '未知学生'}
                      </p>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getStatusBadgeClass(result.status)
                      }`}>
                        {getStatusText(result.status)}
                      </span>
                    </div>
                    <div className="flex items-center mt-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        年级: {result.student?.grade || 'N/A'}
                      </p>
                      {result.status === 'completed' && (
                        <>
                          <span className="mx-2 text-gray-300">•</span>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            分数: {result.score || 0}
                          </p>
                          <span className="mx-2 text-gray-300">•</span>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            准确率: {calculateAccuracy(result.correctCount, result.totalQuestions)}%
                          </p>
                          {result.endTime && (
                            <>
                              <span className="mx-2 text-gray-300">•</span>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                完成时间: {new Date(result.endTime).toLocaleString('zh-CN')}
                              </p>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(result.status)}
                  {result.status === 'completed' && (
                    <button
                      onClick={() => handleViewResult(result)}
                      className={`inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        result.status === 'completed'
                          ? 'text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-blue-500 dark:text-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800'
                          : 'text-gray-400 bg-gray-100 cursor-not-allowed dark:text-gray-500 dark:bg-gray-700'
                      }`}
                      disabled={result.status !== 'completed'}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      查看详情
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {studentResults.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无学生数据</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              该作业还没有分配给任何学生。
            </p>
          </div>
        )}
      </div>

      {/* Result Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  学生答题详情
                </h3>
                <button
                  onClick={closeResultModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              {resultLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : studentResult ? (
                <div className="space-y-4">
                  {/* Student Info */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {(studentResult?.userId?.avatar || selectedStudent.student?.avatar) ? (
                          <img
                            className="h-12 w-12 rounded-full"
                            src={studentResult?.userId?.avatar || selectedStudent.student?.avatar}
                            alt={studentResult?.userId?.name || selectedStudent.student?.name}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                          {studentResult?.userId?.name || selectedStudent.student?.name || '未知学生'}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          年级: {studentResult?.userId?.grade || selectedStudent.student?.grade || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Score Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                      <Target className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">总分</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {studentResult.score}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                      <Award className="h-6 w-6 text-green-500 mx-auto mb-1" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">准确率</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {calculateAccuracy(studentResult.correctCount, studentResult.totalQuestions)}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900 rounded-lg">
                      <Clock className="h-6 w-6 text-purple-500 mx-auto mb-1" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">用时</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {studentResult.duration ? `${Math.round(studentResult.duration / 60)}分钟` : 'N/A'}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                      <Calendar className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">完成时间</p>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {studentResult.endTime ? new Date(studentResult.endTime).toLocaleDateString('zh-CN') : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Answers */}
                  {studentResult.answers && studentResult.answers.length > 0 && (
                    <div>
                      <h5 className="text-md font-medium text-gray-900 dark:text-white mb-3">答题详情</h5>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {studentResult.answers.map((answer, index) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  题目 {index + 1}: {answer.question}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                  学生答案: <span className={answer.isCorrect ? 'text-green-600' : 'text-red-600'}>
                                    {answer.studentAnswer}
                                  </span>
                                </p>
                                {!answer.isCorrect && (
                                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                    正确答案: {answer.correctAnswer}
                                  </p>
                                )}
                              </div>
                              <div className="ml-3">
                                {answer.isCorrect ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">无法加载学生答题详情</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentStatus;