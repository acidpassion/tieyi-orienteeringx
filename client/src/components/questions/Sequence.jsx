import React, { useState, useEffect } from 'react';

const Sequence = ({ question, selectedAnswers, onAnswerChange }) => {
  const [orderedOptions, setOrderedOptions] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    // Initialize with the original order or previously selected order
    if (selectedAnswers && selectedAnswers.length > 0) {
      // Convert option IDs back to indices for internal state
      const indices = selectedAnswers.map(id => {
        const index = question.options.findIndex(opt => opt.id === id);
        return index !== -1 ? index : 0;
      });
      setOrderedOptions(indices);
    } else {
      // Initialize with original option order (option indices)
      const initialOrder = question.options.map((_, index) => index);
      setOrderedOptions(initialOrder);
      // Convert to option IDs for answer
      const initialAnswerIds = initialOrder.map(index => question.options[index].id);
      onAnswerChange(initialAnswerIds);
    }
  }, [question._id, question.options, selectedAnswers, onAnswerChange]);

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null);
      setDragOverIndex(null);
      return;
    }

    const newOrderedOptions = [...orderedOptions];
    const draggedOptionIndex = newOrderedOptions[draggedItem];
    
    // Remove the dragged item
    newOrderedOptions.splice(draggedItem, 1);
    
    // Insert at new position
    const insertIndex = dropIndex > draggedItem ? dropIndex - 1 : dropIndex;
    newOrderedOptions.splice(insertIndex, 0, draggedOptionIndex);
    
    setOrderedOptions(newOrderedOptions);
    // Convert indices to option IDs for answer
    const answerIds = newOrderedOptions.map(index => question.options[index].id);
    onAnswerChange(answerIds);
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        拖拽选项以排列正确顺序：
      </div>
      
      <div className="space-y-2 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        {orderedOptions.map((optionIndex, index) => {
          const option = question.options[optionIndex];
          const isDragging = draggedItem === index;
          const isDragOver = dragOverIndex === index;
          
          return (
            <div
              key={`option-${optionIndex}-pos-${index}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`p-4 rounded-lg border transition-all duration-200 cursor-move ${
                isDragging
                  ? 'opacity-50 bg-blue-100 border-blue-400 shadow-lg dark:bg-blue-900/40 dark:border-blue-500'
                  : isDragOver
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md dark:bg-gray-800 dark:border-gray-600 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 dark:text-white">
                    {option.text_cn || option.text || `选项 ${String.fromCharCode(65 + optionIndex)}`}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="text-gray-400 dark:text-gray-500">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 8h12M4 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        💡 提示：拖拽选项卡片来重新排序
      </div>
    </div>
  );
};

export default Sequence;