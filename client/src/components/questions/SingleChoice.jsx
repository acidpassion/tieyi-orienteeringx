import { useLanguage } from '../../contexts/LanguageContext';
import { getImagePath, handleImageError } from '../../utils/imageUtils';

const SingleChoice = ({ question, selectedAnswers, onAnswerChange }) => {
  const { getLocalizedText } = useLanguage();
  const handleChange = (optionId) => {
    onAnswerChange(optionId);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {getLocalizedText(question.question_text, question.question_text_cn)}
      </h2>
      
      {question.image_url && (
        <div className="mb-6">
          <img 
            src={getImagePath(question.image_url)} 
            alt="Question illustration"
            className="max-w-full h-auto rounded-lg shadow-md"
            onError={handleImageError}
          />
        </div>
      )}
      
      <div className="space-y-3">
        {question.options.map((option) => (
          <label
            key={option.id}
            className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <input
              type="radio"
              name={`question-${question._id}`}
              value={option.id}
              checked={selectedAnswers === option.id}
              onChange={() => handleChange(option.id)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-3 text-gray-900 dark:text-white">
              {getLocalizedText(option.text, option.text_cn)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default SingleChoice;