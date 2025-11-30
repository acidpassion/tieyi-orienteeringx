import React, { useMemo } from 'react';
import { Award } from 'lucide-react';
import { transformToMatrix } from '../utils/matrixTransform';

/**
 * Performance Matrix Component
 * Displays student performance in a matrix layout
 */
const PerformanceMatrix = ({
  records = [],
  students = [],
  selectedGameTypes = [],
  hideStudentsWithoutRecords = false,
  onEditRecord,
  onDeleteRecord
}) => {
  // Transform data into matrix structure with memoization
  const matrixData = useMemo(() => {
    return transformToMatrix(records, students, selectedGameTypes);
  }, [records, students, selectedGameTypes]);

  // Filter students based on hideStudentsWithoutRecords option
  const filteredStudentRows = useMemo(() => {
    if (!hideStudentsWithoutRecords) {
      return matrixData.students;
    }
    
    // Only show students who have at least one result
    return matrixData.students.filter(student => student.results.size > 0);
  }, [matrixData.students, hideStudentsWithoutRecords]);

  const { games } = matrixData;
  const studentRows = filteredStudentRows;

  // Empty state when no data
  if (studentRows.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
        <div className="text-center">
          <Award className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无学生数据</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            没有找到符合条件的学生
          </p>
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
        <div className="text-center">
          <Award className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">没有符合筛选条件的比赛</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            请调整筛选条件或添加新的比赛记录
          </p>
        </div>
      </div>
    );
  }

  if (selectedGameTypes.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
        <div className="text-center">
          <Award className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">请至少选择一个比赛项目</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            使用上方的比赛项目筛选器选择要查看的项目
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)] touch-pan-x touch-pan-y">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <MatrixHeader games={games} />
          <MatrixBody 
            studentRows={studentRows} 
            games={games}
            onEditRecord={onEditRecord}
            onDeleteRecord={onDeleteRecord}
          />
        </table>
      </div>
    </div>
  );
};

/**
 * Matrix Header Component
 * Renders the header row with game and gameType columns
 */
const MatrixHeader = ({ games }) => {
  return (
    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
      {/* Game headers row */}
      <tr>
        <th 
          rowSpan="2"
          className="px-2 py-1 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600"
          style={{ position: 'sticky', left: 0, top: 0, zIndex: 30 }}
        >
          学生
        </th>
        {games.map((game, idx) => {
          const gameTypeCount = game.gameTypes.length;
          if (gameTypeCount === 0) return null;
          
          return (
            <th
              key={`${game.eventName}_${idx}`}
              colSpan={gameTypeCount}
              className="px-2 py-0.5 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
            >
              <div className="font-semibold text-xs leading-tight">{game.eventName}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                {new Date(game.eventDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
              </div>
            </th>
          );
        })}
      </tr>
      
      {/* GameType sub-headers row */}
      <tr>
        {/* No need for student column here as it spans 2 rows */}
        {games.map((game, gameIdx) => 
          game.gameTypes.map((gameType, gtIdx) => (
            <th
              key={`${game.eventName}_${gameType}_${gameIdx}_${gtIdx}`}
              className="px-2 py-1 text-center text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 border-r border-gray-200 dark:border-gray-600"
            >
              {gameType}
            </th>
          ))
        )}
      </tr>
    </thead>
  );
};

/**
 * Matrix Body Component
 * Renders student rows with result cells
 */
const MatrixBody = ({ studentRows, games, onEditRecord, onDeleteRecord }) => {
  return (
    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
      {studentRows.map((student, idx) => (
        <StudentRow
          key={student.studentId}
          student={student}
          games={games}
          isEven={idx % 2 === 0}
          onEditRecord={onEditRecord}
          onDeleteRecord={onDeleteRecord}
        />
      ))}
    </tbody>
  );
};

/**
 * Student Row Component
 * Renders a single student row with all their results
 */
const StudentRow = React.memo(({ student, games, isEven, onEditRecord, onDeleteRecord }) => {
  const rowBgClass = isEven ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750';
  
  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${rowBgClass}`}>
      {/* Student info cell - sticky */}
      <td className={`sticky left-0 px-3 py-2 whitespace-nowrap border-r border-gray-200 dark:border-gray-600 ${rowBgClass}`} style={{ zIndex: 5 }}>
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {student.name} <span className="text-xs text-gray-500 dark:text-gray-400">({student.grade}{student.class ? ` ${student.class}班` : ''})</span>
        </div>
      </td>
      
      {/* Result cells */}
      {games.map((game, gameIdx) =>
        game.gameTypes.map((gameType, gtIdx) => {
          const resultKey = `${game.eventName}_${gameType}`;
          const result = student.results.get(resultKey);
          
          return (
            <ResultCell
              key={`${student.studentId}_${resultKey}_${gameIdx}_${gtIdx}`}
              result={result}
              onEditRecord={onEditRecord}
              onDeleteRecord={onDeleteRecord}
            />
          );
        })
      )}
    </tr>
  );
});

StudentRow.displayName = 'StudentRow';

/**
 * Result Cell Component
 * Renders a single result cell with result data
 */
const ResultCell = ({ result, onEditRecord, onDeleteRecord }) => {
  if (!result) {
    return (
      <td className="px-2 py-2 text-center text-xs text-gray-400 dark:text-gray-500 border-r border-gray-200 dark:border-gray-600">
        -
      </td>
    );
  }

  return (
    <td 
      className={`px-2 py-2 text-center text-xs border-r border-gray-200 dark:border-gray-600 ${
        result.validity 
          ? 'bg-green-50 dark:bg-green-900/10' 
          : 'bg-red-50 dark:bg-red-900/10'
      }`}
    >
      <div className="font-medium text-gray-900 dark:text-white text-xs">
        {result.result}
      </div>
      {result.position && (
        <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
          #{result.position}
        </div>
      )}
      {!result.validity && result.reason && (
        <div className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
          {result.reason}
        </div>
      )}
      {result.score && (
        <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
          {result.score}分
        </div>
      )}
    </td>
  );
};

export default PerformanceMatrix;
