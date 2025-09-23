import React from 'react';
import { Download } from 'lucide-react';

const RosterHeader = ({ totalCount, onExportPDF }) => {
  return (
    <div className="mb-3 sm:mb-4">
      {/* 主标题 */}
      <div className="text-center mb-2 sm:mb-3 relative px-4 sm:px-0">
        {/* Export PDF Button - 移动端显示在标题下方 */}
        <div className="hidden sm:block absolute top-0 right-0 print:hidden">
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
        
        {/* 移动端导出按钮 */}
        <div className="sm:hidden mb-4 print:hidden">
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