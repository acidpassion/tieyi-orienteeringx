import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { createApiUrl } from '../config/api';
import { Clock, Calendar, Trophy, Eye, Trash2 } from 'lucide-react';

const History = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getLocalizedText } = useLanguage();
  const confirm = useConfirmDialog();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await axios.get(createApiUrl('/api/results/student'));
      setResults(response.data);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResult = async (resultId) => {
    const confirmed = await confirm({
      title: 'Delete Quiz Result',
      titleCn: '删除测验记录',
      message: 'Are you sure you want to delete this quiz result? This action cannot be undone.',
      messageCn: '确定要删除这个测验记录吗？此操作无法撤销。',
      confirmText: 'Delete',
      confirmTextCn: '删除',
      cancelText: 'Cancel',
      cancelTextCn: '取消'
    });

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(createApiUrl(`/api/results/${resultId}`));
      // Remove the deleted result from the state
      setResults(results.filter(result => result._id !== resultId));
      toast.success(getLocalizedText('Quiz result deleted successfully', '测验记录删除成功'));
    } catch (error) {
      console.error('Error deleting result:', error);
      toast.error(getLocalizedText('Failed to delete quiz result', '删除测验记录失败'));
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">测验历史</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          查看您过去的测验尝试和结果
        </p>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无测验历史</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            您还没有完成任何测验。
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {results.map((result) => (
            <div key={result._id} className="relative bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 pb-14 sm:pb-16">
              {/* Quiz Title */}
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                  {getLocalizedText(result.quizId.quiz_title, result.quizId.quiz_title_cn)}
                </h3>
              </div>

              {/* Category Badge */}
              <div className="mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                  {getLocalizedText(result.quizId.category, result.quizId.category_cn)}
                </span>
              </div>

              {/* Score Display */}
              <div className="mb-3">
                <div className={`text-2xl sm:text-3xl font-bold ${getScoreColor(result.score)} mb-1`}>
                  {result.score}%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {result.correctCount}/{result.correctCount + result.incorrectCount} 题正确
                </div>
              </div>

              {/* Date and Duration Row */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                  <span>{formatDate(result.createdAt)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="flex-shrink-0 mr-1.5 h-4 w-4" />
                  <span>{formatDuration(result.duration)}</span>
                </div>
              </div>

              {/* Action Buttons - Bottom Right Corner */}
              <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex items-center space-x-1 sm:space-x-2">
                <Link
                  to={`/results/${result._id}`}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"
                  title={getLocalizedText('View Details', '查看详情')}
                >
                  <Eye className="h-4 w-4" />
                </Link>
                
                <button
                  onClick={() => handleDeleteResult(result._id)}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"
                  title={getLocalizedText('Delete this quiz result', '删除这个测验记录')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;