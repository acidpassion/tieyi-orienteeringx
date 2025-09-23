import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const Matching = ({ question, selectedAnswers, onAnswerChange }) => {
  const { getLocalizedText } = useLanguage();
  
  // Convert selectedAnswers array to matches object
  const initializeMatches = () => {
    if (!selectedAnswers) return {};
    
    // If selectedAnswers is already an object, use it
    if (typeof selectedAnswers === 'object' && !Array.isArray(selectedAnswers)) {
      return selectedAnswers;
    }
    
    // If selectedAnswers is an array (e.g., ["1D", "2C"]), convert to object
    if (Array.isArray(selectedAnswers)) {
      const matchesObj = {};
      selectedAnswers.forEach(answer => {
        if (typeof answer === 'string' && answer.length === 2) {
          const matchId = answer[0];
          const optionId = answer[1];
          matchesObj[optionId] = matchId;
        }
      });
      return matchesObj;
    }
    
    return {};
  };
  
  const [matches, setMatches] = useState(initializeMatches);

  const handleMatch = (optionId, matchId) => {
    const newMatches = { ...matches };
    
    // Remove any existing match for this option
    Object.keys(newMatches).forEach(key => {
      if (newMatches[key] === matchId) {
        delete newMatches[key];
      }
    });
    
    // Add new match
    if (matchId) {
      newMatches[optionId] = matchId;
    } else {
      delete newMatches[optionId];
    }
    
    setMatches(newMatches);
    // Format answer as matchId + optionId (e.g., "1D", "2C") to match correct_answer format
    onAnswerChange(Object.entries(newMatches).map(([option, match]) => `${match}${option}`));
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {getLocalizedText(question.question_text, question.question_text_cn)}
      </h2>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {getLocalizedText('Match each item on the left with the correct item on the right', '将左侧的每个项目与右侧的正确项目匹配')}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column - Options */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 dark:text-white">{getLocalizedText('Items to match:', '待匹配项目：')}</h3>
          {question.options.map((option) => (
            <div
              key={option.id}
              className="p-3 border border-gray-300 rounded-lg bg-blue-50 dark:bg-blue-900 dark:border-blue-700"
            >
              <div className="text-gray-900 dark:text-white font-medium">
                {option.id}. {getLocalizedText(option.text, option.text_cn)}
              </div>
              <select
                value={matches[option.id] || ''}
                onChange={(e) => handleMatch(option.id, e.target.value)}
                className="mt-2 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{getLocalizedText('Select a match...', '选择匹配项...')}</option>
                {question.matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.id}. {getLocalizedText(match.text, match.text_cn)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        
        {/* Right column - Matches */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 dark:text-white">{getLocalizedText('Available matches:', '可用匹配项：')}</h3>
          {question.matches.map((match) => (
            <div
              key={match.id}
              className="p-3 border border-gray-300 rounded-lg bg-green-50 dark:bg-green-900 dark:border-green-700"
            >
              <div className="text-gray-900 dark:text-white">
                {match.id}. {getLocalizedText(match.text, match.text_cn)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Matching;