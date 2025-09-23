import React from 'react';
import { User } from 'lucide-react';

const StudentCard = ({ student }) => {
  const { name, avatar, gender, grade, class: classNumber } = student;

  // 根据性别确定头像边框渐变色
  const getAvatarBorderGradient = () => {
    if (gender === '男') {
      return 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600';
    } else {
      return 'bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600';
    }
  };

  return (
    <div className="student-card group relative w-24 h-30 sm:w-28 sm:h-34 md:w-32 md:h-38 lg:w-36 lg:h-42 bg-gradient-to-br from-white via-gray-50 to-blue-50 rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border border-gray-200 hover:border-blue-300 overflow-hidden print:!w-20 print:!h-24 print:shadow-md print:border-gray-300 print:transform-none print:hover:scale-100 print:overflow-visible print:!m-0 print:!p-1">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-white to-orange-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500 print:hidden"></div>
      
      {/* Class Badge with Enhanced Styling */}
       <div className="class-badge absolute -top-1 -right-1 bg-gradient-to-r from-blue-400 to-blue-500 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-md z-10 print:bg-blue-400 print:!px-1 print:!py-0 print:!text-xs print:!-top-0.5 print:!-right-0.5 min-w-max whitespace-nowrap flex items-center justify-center print:!leading-none">
         <span>{classNumber ? `${classNumber}班` : '未分班'} </span>
       </div>
      
      {/* Decorative Corner Elements */}
      <div className="absolute top-2 left-2 w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-300 print:hidden"></div>
      <div className="absolute bottom-2 right-2 w-2 h-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-300 print:hidden"></div>
      
      {/* Avatar Container with Enhanced Styling - 居中布局 */}
      <div className="flex flex-col items-center justify-center h-full pt-6 pb-2 relative z-10 print:!pt-2 print:!pb-1">
        <div className="relative mb-2">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 rounded-full relative p-1 shadow-lg group-hover:shadow-xl transition-all duration-300 print:!w-10 print:!h-10 print:!p-1 print:shadow-md print:border-2 ${gender === '男' ? 'print:border-blue-500' : 'print:border-pink-500'}`}>
            {/* Border gradient background with opacity */}
            <div className={`absolute inset-0 rounded-full ${getAvatarBorderGradient()} opacity-70`}></div>
            <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 ring-2 ring-white dark:ring-gray-800 shadow-inner relative z-10">
              {avatar ? (
                <img 
                  src={avatar} 
                  alt={student.name} 
                  className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                 <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-500 dark:to-gray-600 flex items-center justify-center group-hover:from-blue-300 group-hover:to-purple-400 transition-all duration-300">
                   <User className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-white drop-shadow-lg" />
                 </div>
               )}
            </div>
          </div>
          
          {/* Floating Particles Effect */}
          <div className="absolute inset-0 pointer-events-none print:hidden">
            <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-yellow-400 rounded-full opacity-0 group-hover:opacity-60 group-hover:animate-ping transition-all duration-1000"></div>
            <div className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-orange-400 rounded-full opacity-0 group-hover:opacity-40 group-hover:animate-pulse transition-all duration-1000 delay-200"></div>
          </div>
        </div>
        
        {/* Student Name with Enhanced Typography - 居中显示 */}
        <div className="text-center px-1 print:!px-0">
          <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 leading-tight print:!text-xs print:text-gray-800 print:!leading-none">
            {student.name}
          </h3>
        </div>
      </div>
    </div>
  );
};

export default StudentCard;