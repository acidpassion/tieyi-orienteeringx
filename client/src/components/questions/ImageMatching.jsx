import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { handleImageError } from '../../utils/imageUtils';

const ImageMatching = ({ question, selectedAnswers, onAnswerChange }) => {
  const { getLocalizedText } = useLanguage();
  const [matches, setMatches] = useState({});
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);

  // Reset matches when question changes or selectedAnswers change
  useEffect(() => {
    // Convert selectedAnswers array to matches object
    const matchesObj = {};
    if (selectedAnswers && Array.isArray(selectedAnswers)) {
      selectedAnswers.forEach(answer => {
        if (typeof answer === 'string' && answer.includes(':')) {
          const [option, match] = answer.split(':');
          matchesObj[option] = match;
        } else if (typeof answer === 'string' && answer.length >= 4) {
          // Handle format like "A1B3"
          const option = answer.substring(0, 2);
          const match = answer.substring(2);
          matchesObj[option] = match;
        }
      });
    }
    setMatches(matchesObj);
  }, [question.id, selectedAnswers]);

  // Get image path for contours images
  const getContourImagePath = (imageName) => {
    if (!imageName) return '';
    return `/assets/images/contours/${imageName}`;
  };

  const handleImageClick = (item, side) => {
    // If item is already matched, remove the match
    if (isMatched(item.id, side === 'left' ? 'option' : 'match')) {
      if (side === 'left') {
        handleRemoveMatch(item.id);
      } else {
        // For right side, find the option that matches this item and remove it
        const matchedOption = Object.keys(matches).find(optionId => matches[optionId] === item.id);
        if (matchedOption) {
          handleRemoveMatch(matchedOption);
        }
      }
      return;
    }

    if (side === 'left') {
      setSelectedLeft(selectedLeft?.id === item.id ? null : item);
    } else {
      setSelectedRight(selectedRight?.id === item.id ? null : item);
    }
  };

  // Create match when both sides are selected
  useEffect(() => {
    if (selectedLeft && selectedRight) {
      const newMatches = { ...matches };
      
      // Remove any existing match for this option
      Object.keys(newMatches).forEach(key => {
        if (newMatches[key] === selectedRight.id) {
          delete newMatches[key];
        }
      });
      
      // Add new match
      newMatches[selectedLeft.id] = selectedRight.id;
      
      setMatches(newMatches);
      // Convert to the expected format for onAnswerChange
      const answersArray = Object.entries(newMatches).map(([option, match]) => `${option}${match}`);
      onAnswerChange(answersArray);
      
      // Clear selections
      setSelectedLeft(null);
      setSelectedRight(null);
    }
  }, [selectedLeft, selectedRight, matches, onAnswerChange]);

  const handleRemoveMatch = (optionId) => {
    const newMatches = { ...matches };
    delete newMatches[optionId];
    setMatches(newMatches);
    const answersArray = Object.entries(newMatches).map(([option, match]) => `${option}${match}`);
    onAnswerChange(answersArray);
  };

  const isMatched = (itemId, type) => {
    if (type === 'option') {
      return Object.keys(matches).includes(itemId);
    } else {
      return Object.values(matches).includes(itemId);
    }
  };

  const getMatchedPair = (itemId, type) => {
    if (type === 'option') {
      return matches[itemId];
    } else {
      return Object.keys(matches).find(optionId => matches[optionId] === itemId);
    }
  };

  const isSelected = (itemId, side) => {
    if (side === 'left') {
      return selectedLeft?.id === itemId;
    } else {
      return selectedRight?.id === itemId;
    }
  };

  // Get the option that is currently matched to a specific match ID

  // Get gradient color theme for each match pair
  const getGradientTheme = (optionId, matchId) => {
    const pairKey = `${optionId}${matchId}`;
    const themes = {
      'A1B1': 'from-blue-400 to-purple-500',
      'A2B2': 'from-green-400 to-teal-500', 
      'A3B3': 'from-orange-400 to-red-500',
      'A4B3': 'from-pink-400 to-violet-500',
      'A1B2': 'from-indigo-400 to-blue-500',
      'A2B1': 'from-emerald-400 to-green-500',
      'A3B4': 'from-yellow-400 to-orange-500',
      'A4B4': 'from-rose-400 to-pink-500',
      'A1B3': 'from-cyan-400 to-blue-500',
      'A2B3': 'from-lime-400 to-green-500',
      'A3B1': 'from-amber-400 to-yellow-500',
      'A4B1': 'from-fuchsia-400 to-purple-500',
      'A1B4': 'from-sky-400 to-indigo-500',
      'A2B4': 'from-teal-400 to-cyan-500',
      'A3B2': 'from-red-400 to-rose-500',
      'A4B2': 'from-violet-400 to-fuchsia-500'
    };
    return themes[pairKey] || 'from-gray-400 to-gray-500';
  };
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {getLocalizedText(question.question_text, question.question_text_cn)}
      </h2>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        单击左侧的一张图片和右侧的一张图片来创建匹配。点击已匹配的图片取消匹配。
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Options Column */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Options
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {question.options.map((option) => {
              const matched = isMatched(option.id, 'option');
              const selected = isSelected(option.id, 'left');
              const matchedPair = getMatchedPair(option.id, 'option');
              
              return (
                <div
                  key={option.id}
                  onClick={() => handleImageClick(option, 'left')}
                  className={`relative group cursor-pointer transition-all duration-200 ${
                    matched 
                      ? 'opacity-90' 
                      : selected
                        ? 'scale-105 shadow-lg'
                        : 'hover:scale-105 hover:shadow-md'
                  }`}
                >
                  <div className={`bg-white dark:bg-gray-800 rounded-lg p-3 border-2 transition-colors ${
                    matched 
                      ? `border-2 border-transparent bg-gradient-to-r ${getGradientTheme(option.id, matchedPair)} p-0.5` 
                      : selected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    {matched && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                        <div className="h-20 flex items-center justify-center mb-2">
                          <img
                            src={getContourImagePath(option.image)}
                            alt={`Option ${option.id}`}
                            className="max-w-full max-h-full object-contain rounded-md"
                            onError={handleImageError}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {option.id}{matchedPair}
                          </p>
                        </div>
                      </div>
                    )}
                    {!matched && (
                      <>
                        <div className="h-20 flex items-center justify-center mb-2">
                          <img
                            src={getContourImagePath(option.image)}
                            alt={`Option ${option.id}`}
                            className="max-w-full max-h-full object-contain rounded-md"
                            onError={handleImageError}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {option.id}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  {matched && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Matches Column */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Matches
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {question.matches.map((match) => {
              const matched = isMatched(match.id, 'match');
              const selected = isSelected(match.id, 'right');
              const matchedPair = getMatchedPair(match.id, 'match');
              
              return (
                <div
                  key={match.id}
                  onClick={() => handleImageClick(match, 'right')}
                  className={`relative group cursor-pointer transition-all duration-200 ${
                    matched 
                      ? 'opacity-90' 
                      : selected
                        ? 'scale-105 shadow-lg'
                        : 'hover:scale-105 hover:shadow-md'
                  }`}
                >
                  <div className={`bg-white dark:bg-gray-800 rounded-lg p-3 border-2 transition-colors ${
                    matched 
                      ? `border-2 border-transparent bg-gradient-to-r ${getGradientTheme(matchedPair, match.id)} p-0.5` 
                      : selected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    {matched && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                        <div className="h-20 flex items-center justify-center mb-2">
                          <img
                            src={getContourImagePath(match.image)}
                            alt={`Match ${match.id}`}
                            className="max-w-full max-h-full object-contain rounded-md"
                            onError={handleImageError}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {matchedPair}{match.id}
                          </p>
                        </div>
                      </div>
                    )}
                    {!matched && (
                      <>
                        <div className="h-20 flex items-center justify-center mb-2">
                          <img
                            src={getContourImagePath(match.image)}
                            alt={`Match ${match.id}`}
                            className="max-w-full max-h-full object-contain rounded-md"
                            onError={handleImageError}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {match.id}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  {matched && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
       </div>
      </div>
    );
  };

export default ImageMatching;