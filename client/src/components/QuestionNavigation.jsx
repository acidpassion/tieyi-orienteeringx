import { CheckCircle, Circle } from 'lucide-react';

const QuestionNavigation = ({ questions, currentIndex, responses, onQuestionSelect }) => {
  const isAnswered = (index) => {
    const response = responses[index];
    return response && (Array.isArray(response) ? response.length > 0 : response !== '');
  };

  // Calculate the next available question (first unanswered question)
  const getNextAvailableQuestion = () => {
    for (let i = 0; i < questions.length; i++) {
      if (!isAnswered(i)) {
        return i;
      }
    }
    return questions.length - 1; // If all answered, return last question
  };

  const nextAvailableIndex = getNextAvailableQuestion();

  // Check if a question is clickable (answered or next available)
  const isClickable = (index) => {
    return isAnswered(index) || index === nextAvailableIndex;
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Questions</h3>
      <div className="grid grid-cols-5 lg:grid-cols-1 gap-2">
        {questions.map((question, index) => {
          const clickable = isClickable(index);
          const answered = isAnswered(index);
          const isNext = index === nextAvailableIndex && !answered;
          
          return (
            <button
              key={question._id}
              data-question-index={index}
              onClick={() => clickable && onQuestionSelect(index)}
              disabled={!clickable}
              className={`flex items-center justify-center p-3 rounded-md text-sm font-medium transition-colors ${
                index === currentIndex
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-500 dark:bg-blue-900 dark:text-blue-200'
                  : answered
                  ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700 cursor-pointer'
                  : isNext
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700 cursor-pointer'
                  : 'bg-gray-200 text-gray-400 border border-gray-200 cursor-not-allowed dark:bg-gray-600 dark:text-gray-500 dark:border-gray-600'
              } ${!clickable ? 'opacity-50' : ''}`}
            >
              <span className="lg:hidden">{index + 1}</span>
              <div className="hidden lg:flex lg:items-center lg:space-x-2">
                {isAnswered(index) ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                <span>Question {index + 1}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionNavigation;