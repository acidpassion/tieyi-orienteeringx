import React from 'react';
import { Download, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RosterHeader = ({ totalCount, onExportPDF }) => {
  const navigate = useNavigate();

  const handleSplashScreen = () => {
    navigate('/coach/roster/splash');
  };

  return (
    <div className="mb-3 sm:mb-4">
      {/* 主标题 */}
      <div className="text-center mb-2 sm:mb-3 relative px-4 sm:px-0">
        {/* Action Buttons - 移动端显示在标题下方 */}
        <div className="hidden sm:flex absolute top-0 right-0 print:hidden gap-2">
          <button
            onClick={handleSplashScreen}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 shadow-sm transform hover:scale-105"
            title="头像动画展示"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            动画展示
          </button>
          <button
            onClick={onExportPDF}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
            title="导出为PDF"
          >
            <Download className="w-4 h-4 mr-2" />
            导出PDF
          </button>
        </div>
        
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight text-center mb-3 sm:mb-4">
          2025届铁一定向队员名册 ({totalCount}人)
        </h1>
        
        {/* 移动端按钮 */}
        <div className="sm:hidden mb-4 print:hidden flex flex-col gap-2">
          <button
            onClick={handleSplashScreen}
            className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 shadow-sm mx-auto"
            title="头像动画展示"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            动画展示
          </button>
          <button
            onClick={onExportPDF}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm mx-auto"
            title="导出为PDF"
          >
            <Download className="w-4 h-4 mr-2" />
            导出PDF
          </button>
        </div>
        

      </div>
      
      {/* 分隔线 */}
      <div className="border-b border-gray-200 dark:border-gray-700"></div>
    </div>
  );
};

export default RosterHeader;