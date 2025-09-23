import { useLanguage } from '../contexts/LanguageContext';

const ProgressBar = ({ current, total, className = '' }) => {
  const { getLocalizedText } = useLanguage();
  const percentage = Math.round((current / total) * 100);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getLocalizedText('Progress', '进度')}
        </span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {current}/{total} ({percentage}%)
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 shadow-inner">
        <div 
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
          style={{ width: `${percentage}%` }}
        >
          <div className="h-full bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
        </div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>{getLocalizedText('Started', '已开始')}</span>
        <span>{getLocalizedText('Complete', '完成')}</span>
      </div>
    </div>
  );
};

export default ProgressBar;