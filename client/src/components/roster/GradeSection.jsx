import React from "react";
import { Users } from "lucide-react";
import StudentCard from "./StudentCard";

const GradeSection = ({
  gradeGroup,
  isFirstPage,
  grade,
  totalCount,
  maleCount,
  femaleCount,
  students = [],
}) => {
  const safeStudents = students || [];

  // Create standardized responsive layout
  const createStandardizedLayout = (studentList) => {
    const layouts = [];
    // Standardized responsive patterns: mobile (3), tablet (4), desktop (6)
    const CARDS_PER_ROW = {
      mobile: 3,
      tablet: 4,
      desktop: 6,
    };

    let currentIndex = 0;

    while (currentIndex < studentList.length) {
      const rowSize = CARDS_PER_ROW.desktop; // Always use 6 for desktop
      const rowStudents = studentList.slice(
        currentIndex,
        currentIndex + rowSize
      );
      layouts.push({
        students: rowStudents,
        size: rowSize,
      });
      currentIndex += rowSize;
    }

    return layouts;
  };

  const standardizedRows = createStandardizedLayout(safeStudents);

  return (
    <div className="grade-section mb-2 print:!mb-1">
      {/* 年级容器 - 浅灰色背景 */}
      <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-6 relative print:!p-2 print:!bg-white">
        {/* 年级标题 - 左上角内联显示 */}
        <div className="grade-header mb-4 print:!mb-2">
          <div className="flex flex-wrap items-center gap-3 text-base sm:text-lg">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200">
              {grade}
            </h2>
            <span className="text-gray-500 dark:text-gray-400">|</span>

            <span className="gender-indicator-male flex items-center text-gray-700 dark:text-gray-300">
              <span className="gender-dot-male inline-block w-3 h-3 bg-blue-500 rounded-full mr-2 align-middle"></span>
              男生: {maleCount}人
            </span>

            <span className="gender-indicator-female flex items-center text-gray-700 dark:text-gray-300">
              <span className="gender-dot-female inline-block w-3 h-3 bg-pink-500 rounded-full mr-2 align-middle"></span>
              女生: {femaleCount}人
            </span>

            <span className="font-semibold text-gray-800 dark:text-gray-200">
              总计: {totalCount}人
            </span>
          </div>
        </div>

        {/* 学生网格 */}
        <div className="student-row grid gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 justify-items-center justify-center mx-auto max-w-7xl grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 print:!grid-cols-5 print:!gap-1 print:!max-w-none print:!mx-0 print:!px-0">
          {safeStudents.map((student, studentIndex) => (
            <StudentCard key={student._id || studentIndex} student={student} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GradeSection;
