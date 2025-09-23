import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from '../config/axiosConfig';
import { toast } from 'react-toastify';
import { useLanguage } from '../contexts/LanguageContext';
// Removed useConfirmDialog import - using custom modal instead
import { createApiUrl } from '../config/api';
import Timer from '../components/Timer';
import ProgressBar from '../components/ProgressBar';
// Removed QuestionNavigation import - replaced with dot indicators
import SingleChoice from '../components/questions/SingleChoice';
import MultiChoice from '../components/questions/MultiChoice';
import TrueFalse from '../components/questions/TrueFalse';
import GraphicsRecognition from '../components/questions/GraphicsRecognition';
import Matching from '../components/questions/Matching';
import ImageMatching from '../components/questions/ImageMatching';
import Sequence from '../components/questions/Sequence';

const Quiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getLocalizedText } = useLanguage();
  // Custom modal states for retake confirmation
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [pendingRetakeData, setPendingRetakeData] = useState(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [pendingResumeData, setPendingResumeData] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Scroll to current question in navigation when currentQuestionIndex changes
  useEffect(() => {
    if (quiz && quiz.questions && currentQuestionIndex >= 0) {
      const questionButton = document.querySelector(`[data-question-index="${currentQuestionIndex}"]`);
      if (questionButton) {
        questionButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentQuestionIndex, quiz]);
  const [responses, setResponses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isResuming, setIsResuming] = useState(false);
  const [hasConfirmedResume, setHasConfirmedResume] = useState(false);

  // Handle retake confirmation
  const handleRetakeConfirm = async () => {
    if (!pendingRetakeData) return;
    
    try {
      // User confirmed retake, make request with retake flag
      const response = await axios.post(createApiUrl('/api/quiz-sessions/start'), {
        quizId: pendingRetakeData.quizId,
        assignmentId: pendingRetakeData.assignmentId,
        retake: true
      });
      
      // Continue with session setup
      const { sessionId: newSessionId, responses: resumeResponses, timeRemaining: resumeTime, isResuming: resuming } = response.data;
      setSessionId(newSessionId);
      
      // Initialize fresh responses
      const freshResponses = quiz.questions.map(() => null);
      setResponses(freshResponses);
      setCurrentQuestionIndex(0);
      setTimeRemaining(quiz.maxTime * 60);
      setIsResuming(false);
      
      // Close modal and clear pending data
      setShowRetakeModal(false);
      setPendingRetakeData(null);
      
      toast.info(getLocalizedText('Starting quiz from the beginning', '从头开始测验'));
    } catch (error) {
      console.error('Error starting retake:', error);
      toast.error(getLocalizedText('Error starting quiz session', '启动测验会话时出错'));
    }
  };
  
  const handleRetakeCancel = () => {
    // User chose not to retake, navigate back to dashboard
    setShowRetakeModal(false);
    setPendingRetakeData(null);
    navigate('/dashboard');
  };

  const handleResumeConfirm = async () => {
    if (!pendingResumeData) return;
    
    try {
      setHasConfirmedResume(true);
      
      // Convert and set responses
      const arrayResponses = convertResponsesToArray(pendingResumeData.resumeResponses);
      setResponses(arrayResponses);
      
      // Calculate the correct position based on responses
      const calculatedPosition = calculateCurrentPosition(arrayResponses);
      setCurrentQuestionIndex(calculatedPosition);
      
      setTimeRemaining(pendingResumeData.resumeTime);
      setIsResuming(true);
      toast.info(getLocalizedText('Quiz resumed from where you left off', '测验已从您离开的地方恢复'));
      
      setShowResumeModal(false);
      setPendingResumeData(null);
    } catch (error) {
      console.error('Error resuming quiz:', error);
      toast.error(getLocalizedText('Error resuming quiz', '恢复测验时出错'));
    }
  };

  const handleResumeCancel = () => {
    if (!pendingResumeData) return;
    
    // User chose to start over
    setCurrentQuestionIndex(0);
    const freshResponses = pendingResumeData.quizData.questions.map(() => null);
    setResponses(freshResponses);
    setTimeRemaining(pendingResumeData.quizData.maxTime * 60);
    setIsResuming(false);
    toast.info(getLocalizedText('Starting quiz from the beginning', '从头开始测验'));
    
    setShowResumeModal(false);
    setPendingResumeData(null);
  };

  const handleSubmitConfirm = async () => {
    setShowSubmitModal(false);
    // Continue with the original submit logic
    await performSubmit();
  };

  const handleSubmitCancel = () => {
    setShowSubmitModal(false);
  };

  // Helper function to calculate current position based on responses
  const calculateCurrentPosition = useCallback((responses) => {
    if (!responses || !Array.isArray(responses)) return 0;
    
    // Find the first unanswered question
    for (let i = 0; i < responses.length; i++) {
      if (responses[i] === null || responses[i] === undefined || 
          (Array.isArray(responses[i]) && responses[i].length === 0)) {
        // Return the index of the first unanswered question
        return i;
      }
    }
    
    // If all questions are answered, return the last question index
    return responses.length - 1;
  }, []);

  // Helper function to get the next available question index
  const getNextAvailableQuestion = useCallback((responses) => {
    if (!responses || !Array.isArray(responses)) return 0;
    
    // Find the first unanswered question
    for (let i = 0; i < responses.length; i++) {
      if (responses[i] === null || responses[i] === undefined) {
        return i;
      }
    }
    
    // If all questions are answered, return the last question
    return responses.length - 1;
  }, []);

  // Helper function to check if a question can be navigated to
  const canNavigateToQuestion = useCallback((targetIndex, responses) => {
    if (!responses || !Array.isArray(responses)) return targetIndex === 0;
    
    // Can always go to answered questions
    if (responses[targetIndex] !== null && responses[targetIndex] !== undefined) {
      return true;
    }
    
    // Can go to the next unanswered question after the last answered question
    const nextAvailable = getNextAvailableQuestion(responses);
    return targetIndex === nextAvailable;
  }, [getNextAvailableQuestion]);

  // Helper function to properly convert responses to array format
  const convertResponsesToArray = useCallback((responses) => {
    if (!responses) {
      // Initialize empty responses array with null for each question
      return quiz?.questions?.map(() => null) || [];
    }
    
    // For structured array responses
    if (Array.isArray(responses)) {
      if (responses.length === 0) {
        // Empty responses array - initialize with null for each question
        console.log('🆕 Initializing empty responses array for', quiz?.questions?.length || 0, 'questions');
        return quiz?.questions?.map(() => null) || [];
      }
      
      console.log('🔄 Processing structured responses:', responses.length, 'items');
      return quiz?.questions?.map((question, index) => {
        // Match by questionId (MongoDB ObjectId) or sortIndex
        const structuredResponse = responses.find(r => {
          const questionId = question._id ? 
            (question._id.$oid ? question._id.$oid : question._id.toString()) : 
            null;
          const questionSortIndex = question.sortIndex !== undefined ? question.sortIndex : index;
          
          return (r.questionId && questionId && r.questionId.toString() === questionId) || 
                 (r.sortIndex !== undefined && r.sortIndex === questionSortIndex);
        });
        
        if (structuredResponse) {
          console.log(`✅ Found response for Q${index + 1} (sortIndex: ${question.sortIndex || index}):`, structuredResponse.selectedAnswers);
          return structuredResponse.selectedAnswers;
        }
        console.log(`❌ No response found for Q${index + 1} (sortIndex: ${question.sortIndex || index})`);
        return null;
      }) || [];
    }
    
    // For legacy object-based responses
    if (typeof responses === 'object' && !Array.isArray(responses)) {
      console.log('🔄 Processing legacy object responses');
      return quiz?.questions?.map((question, index) => {
        const questionId = question._id ? 
          (question._id.$oid ? question._id.$oid : question._id.toString()) : 
          `${quiz._id}_q${index + 1}`;
          
        if (responses[questionId]) {
          console.log(`✅ Found response for Q${index + 1}:`, responses[questionId]);
          return responses[questionId];
        }
        return null;
      }) || [];
    }
    
    // Fallback: initialize empty responses array
    return quiz?.questions?.map(() => null) || [];
  }, [quiz]);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  // Auto-save progress every 10 seconds
  useEffect(() => {
    if (!sessionId || !quiz) return;

    const interval = setInterval(() => {
      saveProgress();
    }, 10000); // Save every 10 seconds

    return () => clearInterval(interval);
  }, [sessionId, currentQuestionIndex, responses, timeRemaining]);

  const saveProgress = useCallback(async () => {
    if (!sessionId || !quiz) return;

    try {
      // Build structured responses only for answered questions
      const structuredResponses = quiz.questions
        .map((question, index) => {
          const selectedAnswers = responses[index];
          
          // Only include responses that have been answered
          if (!selectedAnswers || 
              (Array.isArray(selectedAnswers) && selectedAnswers.length === 0) ||
              selectedAnswers === null || selectedAnswers === undefined) {
            return null;
          }
          
          const selectedAnswersArray = Array.isArray(selectedAnswers) ? selectedAnswers : [selectedAnswers];
          
          // Get correct answers from question's correct_answer field
          const correctAnswers = question.correct_answer || [];
          
          // Check if answer is correct
          let isCorrect = false;
          if (question.type === 'sequence') {
            // For sequence questions, order matters - compare arrays directly
            isCorrect = selectedAnswersArray.length > 0 && 
              correctAnswers.length > 0 &&
              selectedAnswersArray.length === correctAnswers.length &&
              selectedAnswersArray.every((answer, index) => answer === correctAnswers[index]);
          } else if (question.type === 'matching') {
            // For matching questions, handle both "1D" and "D1" formats
            isCorrect = selectedAnswersArray.length > 0 && 
              correctAnswers.length > 0 &&
              selectedAnswersArray.length === correctAnswers.length &&
              selectedAnswersArray.every(selected => {
                return correctAnswers.some(correct => {
                  const selectedStr = String(selected);
                  const correctStr = String(correct);
                  // Check both original and reversed formats
                  if (selectedStr.length === 2 && correctStr.length === 2) {
                    return selectedStr === correctStr || 
                           selectedStr === correctStr[1] + correctStr[0];
                  }
                  return selectedStr === correctStr;
                });
              });
          } else {
            // For other question types, just check if all selected answers are in correct answers
            isCorrect = selectedAnswersArray.length > 0 && 
              correctAnswers.length > 0 &&
              selectedAnswersArray.length === correctAnswers.length &&
              selectedAnswersArray.every(answer => correctAnswers.includes(answer));
          }
          
          return {
            question: getLocalizedText(question.question_text, question.question_text_cn),
            questionId: question._id ? 
              (question._id.$oid ? question._id.$oid : question._id.toString()) : 
              `${quiz._id}_q${index + 1}`,
            questionOrder: question.sortIndex || index,
            sortIndex: question.sortIndex || index,
            selectedAnswers: selectedAnswersArray,
            type: question.type,
            correctAnswers: correctAnswers,
            isCorrect: isCorrect
          };
        })
        .filter(response => response !== null); // Remove null responses

      await axios.put(createApiUrl(`/api/quiz-sessions/${sessionId}/progress`), {
        responses: structuredResponses,
        timeRemaining
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [sessionId, currentQuestionIndex, responses, timeRemaining, quiz, getLocalizedText]);

  const startOrResumeSession = async (quizData) => {
    try {
      const assignmentId = location.state?.assignmentId || 'default';
      
      // First attempt to start session without retake flag
      let response;
      try {
        response = await axios.post(createApiUrl('/api/quiz-sessions/start'), {
          quizId: id,
          assignmentId
        });
      } catch (error) {
        // Check if assignment is already completed
        if (error.response?.status === 409 && error.response?.data?.assignmentCompleted) {
          // Show custom modal for retaking completed assignment
          setPendingRetakeData({ quizId: id, assignmentId });
          setShowRetakeModal(true);
          return; // Wait for user confirmation
        } else {
          throw error; // Re-throw other errors
        }
      }

      const { sessionId: newSessionId, responses: resumeResponses, timeRemaining: resumeTime, isResuming: resuming } = response.data;
      
      // Session data received
      
      setSessionId(newSessionId);
      

      
      // If there's an active session to resume, show confirmation dialog
      if (resuming && !hasConfirmedResume) {
        // Show custom resume modal
        setPendingResumeData({
          quizData,
          resumeResponses,
          resumeTime
        });
        setShowResumeModal(true);
        return; // Exit early to wait for user decision
      } else {
        // No active session or already confirmed
        // Convert structured responses to array-based responses if resuming or if there are existing responses
        if ((resuming && resumeResponses) || (resumeResponses && resumeResponses.length > 0)) {
          const arrayResponses = convertResponsesToArray(resumeResponses);
          setResponses(arrayResponses);
          
          // Calculate the correct position based on responses instead of using resumeIndex
          const calculatedPosition = calculateCurrentPosition(arrayResponses);
          setCurrentQuestionIndex(calculatedPosition);
          
          setTimeRemaining(resumeTime);
          setIsResuming(resuming);
          
          if (resuming) {
            toast.info(getLocalizedText('Quiz resumed from where you left off', '测验已从您离开的地方恢复'));
          }
        } else {
          // Starting fresh
          console.log('🆕 Starting fresh - no previous responses');
          setCurrentQuestionIndex(0);
          // Initialize responses array with null for each question
          const freshResponses = quizData.questions.map(() => null);
          setResponses(freshResponses);
          setTimeRemaining(quizData.maxTime * 60);
          setIsResuming(false);
        }
      }
    } catch (error) {
      console.error('Error starting quiz session:', error);
      toast.error(getLocalizedText('Error starting quiz session', '启动测验会话时出错'));
    }
  };

  const fetchQuiz = async () => {
    try {
      const response = await axios.get(createApiUrl(`/api/quizzes/${id}`));
      const quizData = response.data;
      setQuiz(quizData);
      
      // Start or resume quiz session
      await startOrResumeSession(quizData);
      
    } catch (error) {
      console.error('Error fetching quiz:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex, selectedAnswers) => {
    setResponses(prev => {
      const newResponses = [...prev];
      newResponses[questionIndex] = selectedAnswers;
      return newResponses;
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;

    // Show custom submit confirmation modal
    setShowSubmitModal(true);
  };

  const performSubmit = async () => {
    setSubmitting(true);
    
    // CRITICAL FIX: Save current progress before submitting to ensure all responses are captured
    try {
      await saveProgress();
      console.log('✅ Progress saved before submission');
    } catch (error) {
      console.error('❌ Error saving progress before submission:', error);
    }
    
    // Build structured responses with complete question information for all questions
    const structuredResponses = quiz.questions.map((question, index) => {
      const selectedAnswers = responses[index];
      let selectedAnswersArray = selectedAnswers ? 
        (Array.isArray(selectedAnswers) ? selectedAnswers : [selectedAnswers]) : 
        [];

      // Get correct answers from question's correct_answer field
      const correctAnswers = question.correct_answer || [];
      
      // Handle true/false type questions - ensure format matches backend expectations
      if (question.type === 'true_false' && selectedAnswersArray.length > 0) {
        // If we still have 'true'/'false' strings in the array, convert them to 'A'/'B'
        selectedAnswersArray = selectedAnswersArray.map(answer => {
          if (answer === 'true') return 'A';
          if (answer === 'false') return 'B';
          return answer;
        });
      }
      
      // Check if answer is correct
      let isCorrect = false;
      if (question.type === 'sequence') {
        // For sequence questions, order matters - compare arrays directly
        isCorrect = selectedAnswersArray.length > 0 && 
          correctAnswers.length > 0 &&
          selectedAnswersArray.length === correctAnswers.length &&
          selectedAnswersArray.every((answer, index) => answer === correctAnswers[index]);
      } else if (question.type === 'matching') {
        // For matching questions, handle both "1D" and "D1" formats
        isCorrect = selectedAnswersArray.length > 0 && 
          correctAnswers.length > 0 &&
          selectedAnswersArray.length === correctAnswers.length &&
          selectedAnswersArray.every(selected => {
            return correctAnswers.some(correct => {
              const selectedStr = String(selected);
              const correctStr = String(correct);
              // Check both original and reversed formats
              if (selectedStr.length === 2 && correctStr.length === 2) {
                return selectedStr === correctStr || 
                       selectedStr === correctStr[1] + correctStr[0];
              }
              return selectedStr === correctStr;
            });
          });
      } else {
        // For other question types, just check if all selected answers are in correct answers
        isCorrect = selectedAnswersArray.length > 0 && 
          correctAnswers.length > 0 &&
          selectedAnswersArray.length === correctAnswers.length &&
          selectedAnswersArray.every(answer => correctAnswers.includes(answer));
      }
      
      const response = {
        question: getLocalizedText(question.question_text, question.question_text_cn),
        questionId: question._id ? 
          (question._id.$oid ? question._id.$oid : question._id.toString()) : 
          `${quiz._id.$oid || quiz._id}_q${index + 1}`,
        questionOrder: question.sortIndex || index,
        sortIndex: question.sortIndex || index,
        selectedAnswers: selectedAnswersArray,
        type: question.type,
        correctAnswers: correctAnswers,
        isCorrect: isCorrect
      };
      
      return response;
    });

    console.log('📤 Submitting quiz with', structuredResponses.length, 'structured responses');

    try {
      // Complete the quiz session - this will handle both session completion and result creation
      if (sessionId) {
        const completionResponse = await axios.post(createApiUrl(`/api/quiz-sessions/${sessionId}/complete`));
        
        // If session was already completed, navigate directly to dashboard
        if (completionResponse.data.alreadyCompleted) {
          navigate('/dashboard');
          return;
        }
        
        // Show success message
        toast.success(getLocalizedText('Quiz submitted successfully', '测验提交成功'));
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        // Fallback: if no sessionId, show error
        toast.error(getLocalizedText('Error: No active session found', '错误：未找到活动会话'));
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error(getLocalizedText('Error submitting quiz', '提交测验时出错'));
      setSubmitting(false);
    }
  };

  const handleTimeUp = useCallback(() => {
    handleSubmit();
    // Ensure redirection to dashboard even if handleSubmit fails
    setTimeout(() => {
      if (submitting) {
        navigate('/dashboard');
      }
    }, 2000);
  }, [handleSubmit, submitting, navigate]);

  // Use ref to avoid setState during render
  const timeUpdateRef = useRef(null);
  
  const handleTimeUpdate = useCallback((newTime) => {
    timeUpdateRef.current = newTime;
  }, []);
  
  // Update timeRemaining state in useEffect to avoid render-time setState
  useEffect(() => {
    if (timeUpdateRef.current !== null) {
      setTimeRemaining(timeUpdateRef.current);
      timeUpdateRef.current = null;
    }
  });

  const renderQuestion = (question, questionIndex) => {
    // Get the response for this question, handling different question types
    const questionResponse = responses[questionIndex];
    let selectedAnswers;
    
    // For single choice, true/false, and graphics recognition, extract first value from array or use string
    if (['single_choice', 'true_false', 'graphics_recognition'].includes(question.type)) {
      if (Array.isArray(questionResponse) && questionResponse.length > 0) {
        selectedAnswers = questionResponse[0];
      } else {
        selectedAnswers = questionResponse || '';
      }
    } else {
      // For multi choice, matching, image matching, and sequence, use array or empty array
      selectedAnswers = questionResponse || [];
    }

    const commonProps = {
      question,
      selectedAnswers,
      onAnswerChange: (answers) => handleAnswerChange(questionIndex, answers)
    };

    switch (question.type) {
      case 'single_choice':
        return <SingleChoice {...commonProps} />;
      case 'multi_choice':
        return <MultiChoice {...commonProps} />;
      case 'true_false':
        return <TrueFalse {...commonProps} />;
      case 'graphics_recognition':
        return <GraphicsRecognition {...commonProps} />;
      case 'matching':
        return <Matching {...commonProps} />;
      case 'imageMatching':
        return <ImageMatching {...commonProps} />;
      case 'sequence':
        return <Sequence {...commonProps} />;
      default:
        return <div>不支持的题目类型</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">未找到测验</h3>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6 p-4 sm:p-6">
        <div className="relative mb-4">
          {/* Timer Badge - Top Right */}
          <div className="absolute top-0 right-0">
            <Timer
              duration={timeRemaining || quiz.maxTime * 60}
              onTimeUp={handleTimeUp}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>
          
          {/* Title and Question Info */}
          <div className="pr-20 sm:pr-24">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {getLocalizedText(quiz.quiz_title, quiz.quiz_title_cn)}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {getLocalizedText(
                `Question ${currentQuestionIndex + 1} of ${quiz.questions.length}`,
                `第 ${currentQuestionIndex + 1} 题，共 ${quiz.questions.length} 题`
              )}
            </p>
            {isResuming && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {getLocalizedText('Resumed from previous session', '从上次会话恢复')}
              </p>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <ProgressBar 
          current={currentQuestionIndex + 1} 
          total={quiz.questions.length}
          className="mb-4"
        />
        
        {/* Question Dot Navigation */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {quiz.questions.map((_, index) => {
            const isAnswered = responses[index] !== null && responses[index] !== undefined;
            const isCurrent = index === currentQuestionIndex;
            const canNavigate = canNavigateToQuestion(index, responses);
            
            return (
              <button
                key={index}
                data-question-index={index}
                onClick={() => {
                  if (canNavigate) {
                    setCurrentQuestionIndex(index);
                    saveProgress();
                  }
                }}
                disabled={!canNavigate}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs font-medium transition-all duration-200 ${
                  isCurrent
                    ? 'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1 sm:ring-offset-2'
                    : isAnswered
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : canNavigate
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                }`}
                title={`第 ${index + 1} 题${isAnswered ? ' (已答)' : ''}${isCurrent ? ' (当前)' : ''}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Area - Full Width */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          {renderQuestion(currentQuestion, currentQuestionIndex)}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => {
                // Navigate to previous question (only to answered questions)
                let newIndex = currentQuestionIndex - 1;
                while (newIndex >= 0 && !canNavigateToQuestion(newIndex, responses)) {
                  newIndex--;
                }
                if (newIndex >= 0) {
                  setCurrentQuestionIndex(newIndex);
                  saveProgress();
                }
              }}
              disabled={currentQuestionIndex === 0 || !responses.slice(0, currentQuestionIndex).some(r => r !== null && r !== undefined)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            {getLocalizedText('Previous', '上一题')}
          </button>

          <div className="flex space-x-3">
            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <button
                onClick={() => {
                  // Only allow navigation to next question if current is answered
                  const currentResponse = responses[currentQuestionIndex];
                  const hasAnswered = currentResponse !== null && currentResponse !== undefined;
                  
                  if (hasAnswered) {
                    // Simply go to the next sequential question
                    const targetIndex = currentQuestionIndex + 1;
                    if (targetIndex < quiz.questions.length) {
                      setCurrentQuestionIndex(targetIndex);
                      saveProgress();
                    }
                  }
                }}
                disabled={(() => {
                  const currentResponse = responses[currentQuestionIndex];
                  const currentQuestion = quiz.questions[currentQuestionIndex];
                  
                  // For ImageMatching questions, check if all 4 options are matched
                  if (currentQuestion.type === 'imageMatching') {
                    return !currentResponse || !Array.isArray(currentResponse) || currentResponse.length !== 4;
                  }
                  
                  // For other question types, use the original logic
                  return !currentResponse || currentResponse === null || currentResponse === undefined;
                })()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {getLocalizedText('Next', '下一题')}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? getLocalizedText('Submitting...', '提交中...') : getLocalizedText('Submit Quiz', '提交测验')}
              </button>
            )}
          </div>
        </div>
      
      {/* Retake Confirmation Modal */}
      {showRetakeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">
                作业已完成
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  您已完成此作业。您确定要重新做一遍吗？
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleRetakeConfirm}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 mb-2"
                >
                  是的，重做
                </button>
                <button
                  onClick={handleRetakeCancel}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  不，返回
                </button>
              </div>
            </div>
          </div>
        </div>
       )}
       
       {/* Resume Session Confirmation Modal */}
       {showResumeModal && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
             <div className="mt-3 text-center">
               <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900">
                 <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
               </div>
               <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">
                 恢复测验会话
               </h3>
               <div className="mt-2 px-7 py-3">
                 <p className="text-sm text-gray-500 dark:text-gray-400">
                   您有一个活跃的测验会话。您想从上次停止的地方继续吗？
                 </p>
               </div>
               <div className="items-center px-4 py-3">
                 <button
                   onClick={handleResumeConfirm}
                   className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2"
                 >
                   继续
                 </button>
                 <button
                   onClick={handleResumeCancel}
                   className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                 >
                   重新开始
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
       
       {/* Submit Quiz Confirmation Modal */}
       {showSubmitModal && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
             <div className="mt-3 text-center">
               <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900">
                 <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                 </svg>
               </div>
               <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">
                 提交测验
               </h3>
               <div className="mt-2 px-7 py-3">
                 <p className="text-sm text-gray-500 dark:text-gray-400">
                   您确定要提交测验吗？此操作无法撤销。
                 </p>
               </div>
               <div className="items-center px-4 py-3">
                 <button
                   onClick={handleSubmitConfirm}
                   className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 mb-2"
                 >
                   提交
                 </button>
                 <button
                   onClick={handleSubmitCancel}
                   className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
                 >
                   取消
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
    </div>
  </div>
  );
};

export default Quiz;