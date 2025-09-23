import { useLanguage } from '../../contexts/LanguageContext';
import { getImagePath, handleImageError } from '../../utils/imageUtils';

const TrueFalse = ({ question, selectedAnswers, onAnswerChange }) => {
  const { getLocalizedText } = useLanguage();
  
  // Convert backend format (A/B) to UI format (true/false)
  const displayValue = Array.isArray(selectedAnswers) && selectedAnswers.length > 0 ?
    (selectedAnswers[0] === 'A' ? 'true' : selectedAnswers[0] === 'B' ? 'false' : '') :
    (selectedAnswers === 'A' ? 'true' : selectedAnswers === 'B' ? 'false' : selectedAnswers);
  
  const handleChange = (value) => {
    // Convert UI format (true/false) to backend format (A/B)
    const backendValue = value === 'true' ? 'A' : 'B';
    onAnswerChange(backendValue);
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
        <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
          <input
            type="radio"
            name={`question-${question._id}`}
            value="true"
            checked={displayValue === 'true'}
            onChange={() => handleChange('true')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
          />
          <span className="ml-3 text-lg text-gray-900 dark:text-white">
            {getLocalizedText('True', '正确')}
          </span>
        </label>
        
        <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
          <input
            type="radio"
            name={`question-${question._id}`}
            value="false"
            checked={displayValue === 'false'}
            onChange={() => handleChange('false')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
          />
          <span className="ml-3 text-lg text-gray-900 dark:text-white">
            {getLocalizedText('False', '错误')}
          </span>
        </label>
      </div>
    </div>
  );
};

export default TrueFalse;