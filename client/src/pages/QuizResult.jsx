import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../config/axiosConfig';
import { useLanguage } from '../contexts/LanguageContext';
import { getImagePath, handleImageError } from '../utils/imageUtils';
import { CheckCircle, XCircle, Clock, Trophy, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const QuizResult = () => {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [showOnlyIncorrect, setShowOnlyIncorrect] = useState(false);
  const { getLocalizedText } = useLanguage();

  useEffect(() => {
    fetchResult();
  }, [id]);

  const fetchResult = async () => {
    try {
      const response = await axios.get(createApiUrl(`/api/results/${id}`));
      setResult(response.data);
    } catch (error) {
      console.error('Error fetching result:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

  if (!result) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">未找到结果</h3>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/history"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回历史记录
        </Link>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6">
          {/* Mobile-first layout */}
          <div className="space-y-4">
            {/* Title and Date - Full width on mobile */}
            <div className="text-center sm:text-left">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                {getLocalizedText(result.quizId.quiz_title, result.quizId.quiz_title_cn)}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                完成于 {new Date(result.createdAt).toLocaleDateString()}
              </p>
            </div>
            
            {/* Score Display - Prominent on mobile */}
            <div className="text-center sm:text-right">
              <div className={`text-3xl sm:text-4xl font-bold ${getScoreColor(result.score)} leading-none`}>
                {result.score}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {result.correctCount} / {result.correctCount + result.incorrectCount} 题正确
              </div>
            </div>
            
            {/* Stats Grid - Compact on mobile */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start mb-1">
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                </div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">得分</div>
                <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">{result.score}%</div>
              </div>
              
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start mb-1">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">用时</div>
                <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">{formatDuration(result.duration)}</div>
              </div>
              
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start mb-1">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">正确答案</div>
                <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                  {result.correctCount}/{result.correctCount + result.incorrectCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Navigation */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">题目导航</h2>
          <button
            onClick={() => setShowOnlyIncorrect(!showOnlyIncorrect)}
            className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            {showOnlyIncorrect ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
            {showOnlyIncorrect ? 
              getLocalizedText('Show All', '显示全部') : 
              getLocalizedText('Show Incorrect Only', '仅显示错误')}
          </button>
        </div>
        
        <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-20 gap-2">
          {result.responses.map((response, index) => {
            if (showOnlyIncorrect && response.isCorrect) return null;
            
            return (
              <button
                key={index}
                onClick={() => setSelectedQuestionIndex(selectedQuestionIndex === index ? null : index)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                  response.isCorrect 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                } ${
                  selectedQuestionIndex === index 
                    ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800 scale-110' 
                    : 'hover:scale-105'
                }`}
                title={`第 ${index + 1} 题 - ${response.isCorrect ? '正确' : '错误'}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        
        <div className="mt-4 flex items-center text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center mr-6">
            <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
            <span>{getLocalizedText('Correct', '正确')}</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
            <span>{getLocalizedText('Incorrect', '错误')}</span>
          </div>
        </div>
      </div>

      {/* Selected Question Detail */}
      {selectedQuestionIndex !== null && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getLocalizedText('Question Details', '题目详情')}
            </h3>
            <button
              onClick={() => setSelectedQuestionIndex(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          
          {(() => {
            const response = result.responses[selectedQuestionIndex];
            return (
              <div>
                <div className="flex items-center mb-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">
                    第 {selectedQuestionIndex + 1} 题
                  </span>
                  <span className="text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-2 py-0.5 rounded-full mr-2">
                    {(response.questionId && response.questionId.type) || response.type || 'unknown'}
                  </span>
                  {response.isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                
                <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                  {response.questionId && typeof response.questionId === 'object' ? 
                    getLocalizedText(
                      response.questionId.question_text || '', 
                      response.questionId.question_text_cn || ''
                    ) : 
                    response.question || `Question ${selectedQuestionIndex + 1}`}
                </h4>
                
                {response.questionId && typeof response.questionId === 'object' && response.questionId.image_url && (
                  <div className="mb-4">
                    <img 
                      src={getImagePath(response.questionId.image_url)} 
                      alt="Question illustration"
                      className="max-w-md h-auto rounded-lg shadow-md"
                      onError={handleImageError}
                    />
                  </div>
                )}
                
                <div className="space-y-3">
                  {/* Options */}
                  {response.questionId && typeof response.questionId === 'object' && 
                   response.questionId.options && Array.isArray(response.questionId.options) && 
                   response.questionId.options.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Options:</span>
                      <div className="mt-2 grid gap-1">
                        {response.questionId.options.map((option, optIndex) => {
                          const isSelected = Array.isArray(response.selectedAnswers) && 
                            response.selectedAnswers.includes(option);
                          const isCorrect = response.questionId && 
                            response.questionId.correct_answer && 
                            Array.isArray(response.questionId.correct_answer) ? 
                            response.questionId.correct_answer.includes(option) : false;
                          let bgColor = 'bg-gray-50 dark:bg-gray-700';
                          let textColor = 'text-gray-900 dark:text-gray-100';
                          
                          if (isSelected && isCorrect) {
                            bgColor = 'bg-green-100 dark:bg-green-900';
                            textColor = 'text-green-800 dark:text-green-200';
                          } else if (isSelected && !isCorrect) {
                            bgColor = 'bg-red-100 dark:bg-red-900';
                            textColor = 'text-red-800 dark:text-red-200';
                          } else if (!isSelected && isCorrect) {
                            bgColor = 'bg-yellow-100 dark:bg-yellow-900';
                            textColor = 'text-yellow-800 dark:text-yellow-200';
                          }
                          
                          return (
                            <div key={optIndex} className={`p-2 rounded flex items-center text-sm ${bgColor} ${textColor}`}>
                              <div className="mr-2 flex-shrink-0">
                                {isSelected ? (
                                  isCorrect ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  )
                                ) : isCorrect ? (
                                  <CheckCircle className="h-4 w-4 text-yellow-600" />
                                ) : (
                                  <span className="h-4 w-4 inline-block" />
                                )}
                              </div>
                              <div className="flex-1">
                                {typeof option === 'object' && option !== null ? 
                                  getLocalizedText(option.text || '', option.text_cn || '') : 
                                  option}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Compact Answer Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Answer:</span>
                      <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                        {Array.isArray(response.selectedAnswers) && response.selectedAnswers.length > 0 ?
                          response.selectedAnswers.join(', ') :
                          getLocalizedText('No answer selected', '未选择答案')}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Correct Answer:</span>
                      <div className="mt-1 p-2 bg-green-50 dark:bg-green-900 rounded text-sm">
                        {response.questionId && typeof response.questionId === 'object' && 
                          response.questionId.correct_answer && 
                          Array.isArray(response.questionId.correct_answer) ?
                          response.questionId.correct_answer.join(', ') :
                          Array.isArray(response.correctAnswers) && 
                          response.correctAnswers.length > 0 ?
                          response.correctAnswers.join(', ') :
                          getLocalizedText('No correct answer provided', '未提供正确答案')}
                      </div>
                    </div>
                  </div>
                  
                  {/* Explanation */}
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Explanation:</span>
                    <div className="mt-1 p-3 bg-blue-50 dark:bg-blue-900 rounded text-sm">
                      {response.questionId && typeof response.questionId === 'object' ? 
                        (response.questionId.explanation_cn || 
                         getLocalizedText(
                           response.questionId.explanation || '', 
                           response.questionId.explanation_cn || ''
                         )) : 
                        getLocalizedText('No explanation available', '暂无解析')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
          }
        </div>
      )}
      
      {/* Summary for incorrect answers */}
      {result.incorrectCount > 0 && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            {getLocalizedText('Review Needed', '需要复习')}
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">
            {getLocalizedText(
              `You got ${result.incorrectCount} question${result.incorrectCount > 1 ? 's' : ''} wrong. Click on the red dots above to review them.`,
              `您答错了 ${result.incorrectCount} 道题。点击上方的红点来复习这些题目。`
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default QuizResult;