import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import GradeSection from '../../components/roster/GradeSection';
import RosterHeader from '../../components/roster/RosterHeader';

// Add print-specific styles with enhanced page break controls and mobile viewport fix
const printStyles = `
  @media print {
    /* Force desktop viewport for consistent layout across all devices */
    @page {
      size: A4 landscape;
      margin: 0.5in;
      orphans: 5;
      widows: 5;
    }
    
    /* Force body to behave like ultra-wide desktop viewport for consistent 5-card layout */
    body {
      width: 1600px !important;
      min-width: 1600px !important;
      max-width: none !important;
      margin: 0 auto !important;
      transform-origin: top left !important;
      zoom: 1 !important;
      overflow-x: visible !important;
      box-sizing: border-box !important;
    }
    
    /* Force root container to ultra-wide desktop width */
    html {
      width: 1600px !important;
      min-width: 1600px !important;
      overflow-x: visible !important;
      box-sizing: border-box !important;
    }
    
    /* Override viewport meta behavior for print - ultra-wide container */
    .page-container {
      width: 1600px !important;
      min-width: 1600px !important;
      max-width: none !important;
      margin: 0 auto !important;
      padding-left: 4rem !important;
      padding-right: 4rem !important;
      box-sizing: border-box !important;
    }
    
    /* Force all responsive container classes to use fixed width */
    .max-w-screen-2xl,
    .max-w-7xl,
    .max-w-6xl,
    .max-w-5xl,
    .max-w-4xl {
      max-width: none !important;
      width: 100% !important;
    }
    
    /* Make header container match the wider page container */
    .page-container > div:first-child {
      width: 100% !important;
      max-width: none !important;
    }
    
    .break-inside-avoid {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .page-break-inside-avoid {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .page-break-after-avoid {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .break-after-avoid {
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
    
    .page-break-before {
      break-before: page !important;
      page-break-before: always !important;
    }
    
    .page-break-after {
      break-after: page !important;
      page-break-after: always !important;
    }
    
    .grade-section {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-bottom: 20px;
      orphans: 3;
      widows: 3;
      width: 100% !important;
      max-width: none !important;
    }
    
    .grade-section-container {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    
    /* 强制保持学生卡片完整性 */
    .student-card {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      display: block !important;
      height: 128px !important;
      min-height: 128px !important;
      max-height: 128px !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      margin-bottom: 8px;
      width: 100% !important;
    }
    
    .student-card-wrapper {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      display: block !important;
      orphans: 1 !important;
      widows: 1 !important;
      height: 128px !important;
      min-height: 128px !important;
      max-height: 128px !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }
    
    .page-break-before {
      page-break-before: always !important;
      break-before: page !important;
    }
    
    /* 防止年级标题孤立 */
    .grade-header {
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
    
    /* 强化网格布局在打印时的稳定性 */
    .grid {
      display: grid !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
        
    /* CRITICAL: Force exactly 5 cards per row regardless of device */
    .student-row {
      display: grid !important;
      grid-template-columns: repeat(5, 1fr) !important;
      gap: 0.75rem !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      orphans: 5 !important;
      widows: 5 !important;
      margin-bottom: 1.25rem !important;
      min-height: 140px !important;
      max-height: 140px !important;
      overflow: visible !important;
      box-sizing: border-box !important;
      align-items: start !important;
      justify-items: center !important;
      max-width: none !important;
      width: 100% !important;
      justify-content: space-between !important;
    }
        
    /* Override all responsive grid classes for print - AGGRESSIVE OVERRIDE */
    .student-row.grid,
    .grid.student-row {
      grid-template-columns: repeat(5, 1fr) !important;
    }
        
    /* Force override ALL responsive grid classes with maximum specificity */
    .student-row.grid-cols-3,
    .student-row.sm\:grid-cols-3,
    .student-row.md\:grid-cols-4,
    .student-row.lg\:grid-cols-5,
    .student-row.xl\:grid-cols-6,
    .grid.grid-cols-3,
    .grid.sm\:grid-cols-3,
    .grid.md\:grid-cols-4,
    .grid.lg\:grid-cols-5,
    .grid.xl\:grid-cols-6,
    .grid-cols-1,
    .grid-cols-2,
    .grid-cols-3,
    .grid-cols-4,
    .grid-cols-5,
    .grid-cols-6,
    .sm\:grid-cols-1,
    .sm\:grid-cols-2,
    .sm\:grid-cols-3,
    .sm\:grid-cols-4,
    .sm\:grid-cols-5,
    .sm\:grid-cols-6,
    .md\:grid-cols-1,
    .md\:grid-cols-2,
    .md\:grid-cols-3,
    .md\:grid-cols-4,
    .md\:grid-cols-5,
    .md\:grid-cols-6,
    .lg\:grid-cols-1,
    .lg\:grid-cols-2,
    .lg\:grid-cols-3,
    .lg\:grid-cols-4,
    .lg\:grid-cols-5,
    .lg\:grid-cols-6,
    .xl\:grid-cols-1,
    .xl\:grid-cols-2,
    .xl\:grid-cols-3,
    .xl\:grid-cols-4,
    .xl\:grid-cols-5,
    .xl\:grid-cols-6 {
      grid-template-columns: repeat(5, 1fr) !important;
    }
        
    /* Ensure print grid classes work correctly */
    .print\:grid-cols-5,
    .print\:\!grid-cols-5 {
      grid-template-columns: repeat(5, 1fr) !important;
    }
        
    .print\:gap-4,
    .print\:\!gap-4 {
      gap: 0.75rem !important;
    }
        
    .print\:\!max-w-none {
      max-width: none !important;
    }
         
         /* Prevent partial rows at page bottom */
         .space-y-4 > * {
           break-inside: avoid !important;
           page-break-inside: avoid !important;
         }
         
         /* Enhanced page break controls for student containers */
          .p-6 {
            orphans: 2 !important;
            widows: 2 !important;
          }
          
          /* Enhanced page break controls to prevent card cutting */
          @page {
            margin: 0.5in;
            size: A4;
            orphans: 5;
            widows: 5;
          }
          
          /* Prevent any element from being split */
          * {
            box-decoration-break: clone !important;
          }
          
          /* Strong protection for student cards */
          .student-card,
          .student-card * {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Grade section protection */
          .grade-section {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          
          /* Ensure minimum space before breaking */
          .student-row:last-child {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          
          /* Additional row-level protection */
          .space-y-4 > .student-row {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            break-before: auto !important;
            break-after: avoid !important;
            page-break-before: auto !important;
            page-break-after: avoid !important;
            margin-bottom: 1.5rem !important;
          }
          
          /* 强制保持年级组完整性 */
          .grade-section-container {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* 防止年级标题孤立在页面底部 */
          .grade-header {
            break-after: avoid !important;
            page-break-after: avoid !important;
            orphans: 2 !important;
            widows: 2 !important;
          }
          
          /* Ensure grade sections don't break awkwardly */
          .grade-section {
            break-before: auto !important;
            break-after: avoid !important;
            page-break-before: auto !important;
            page-break-after: avoid !important;
          }
    
    .min-h-screen {
      min-height: 100vh !important;
    }
    
    .flex-1 {
      flex: 1 !important;
    }
    
    .flex-shrink-0 {
      flex-shrink: 0 !important;
    }
  }
  .pdf-export-container {
    width: 210mm;
    margin: 0 auto;
    padding: 10mm;
    box-sizing: border-box;
  }
  /* 运行时分页检测样式 */
  .page-boundary-detector {
    position: relative;
  }
  .page-boundary-detector::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: transparent;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = printStyles;
  document.head.appendChild(styleSheet);
}

const StudentRoster = () => {
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paginatedData, setPaginatedData] = useState(null);
  const contentRef = useRef(null);

  // Page layout constants (in pixels, assuming 96 DPI)
  const PAGE_CONSTANTS = {
    A4_HEIGHT_PX: 1123, // A4 height at 96 DPI (297mm)
    A4_WIDTH_PX: 794,   // A4 width at 96 DPI (210mm)
    MARGIN_PX: 48,      // 0.5in margins converted to pixels
    HEADER_HEIGHT_PX: 200, // RosterHeader height estimate
    GRADE_HEADER_HEIGHT_PX: 100, // Grade section header height
    STUDENT_ROW_HEIGHT_PX: 160, // Student row height (includes margin)
    BOTTOM_STATS_HEIGHT_PX: 100, // Bottom statistics section height
    CARDS_PER_ROW: 5 // PDF export uses 5 cards per row
  };

  // Calculate how many student rows can fit on a page
  const calculateRowsPerPage = (isFirstPage = false) => {
    let availableHeight = PAGE_CONSTANTS.A4_HEIGHT_PX - (PAGE_CONSTANTS.MARGIN_PX * 2);
    
    if (isFirstPage) {
      availableHeight -= PAGE_CONSTANTS.HEADER_HEIGHT_PX;
      availableHeight -= PAGE_CONSTANTS.BOTTOM_STATS_HEIGHT_PX;
      // Add extra buffer for first page
      availableHeight -= 80;
    }
    
    // Reserve space for at least one grade header per page
    availableHeight -= PAGE_CONSTANTS.GRADE_HEADER_HEIGHT_PX;
    
    const maxRows = Math.floor(availableHeight / PAGE_CONSTANTS.STUDENT_ROW_HEIGHT_PX);
    
    // 确保每页至少能容纳2行学生（10个学生）
    const minRows = 2;
    
    if (isFirstPage) {
      return Math.max(minRows, Math.min(maxRows, 2)); // 首页最多2行，为底部统计留空间
    }
    
    return Math.max(minRows, Math.min(maxRows, 4)); // 其他页面最多4行
  };

  // Paginate roster data intelligently
  const paginateRosterData = (data) => {
    if (!data || !data.gradeGroups) return null;



    const pages = [];
    let currentPage = { gradeGroups: [], isFirstPage: true };
    let currentPageRows = 0;
    const maxRowsFirstPage = calculateRowsPerPage(true);
    const maxRowsOtherPages = calculateRowsPerPage(false);
    


    data.gradeGroups.forEach((gradeGroup, gradeIndex) => {
      const studentsInGrade = gradeGroup.students || [];
      const rowsNeeded = Math.ceil(studentsInGrade.length / PAGE_CONSTANTS.CARDS_PER_ROW);
      const maxRowsCurrentPage = currentPage.isFirstPage ? maxRowsFirstPage : maxRowsOtherPages;

      // 如果年级组需要的行数超过单页容量，需要分割年级组
      if (rowsNeeded > maxRowsCurrentPage) {
        // 先完成当前页面
        if (currentPage.gradeGroups.length > 0) {
          pages.push(currentPage);
          currentPage = { gradeGroups: [], isFirstPage: false };
          currentPageRows = 0;
        }
        
        // 将大年级组分割到多个页面
        const studentsPerPage = maxRowsOtherPages * PAGE_CONSTANTS.CARDS_PER_ROW;
        
        for (let i = 0; i < studentsInGrade.length; i += studentsPerPage) {
          const pageStudents = studentsInGrade.slice(i, i + studentsPerPage);
          
          const splitGradeGroup = {
            ...gradeGroup,
            students: pageStudents,
            totalCount: pageStudents.length,
            maleCount: pageStudents.filter(s => s.gender === '男').length,
            femaleCount: pageStudents.filter(s => s.gender === '女').length
          };
          
          pages.push({ gradeGroups: [splitGradeGroup], isFirstPage: false });
        }
        currentPageRows = 0;
      } else if (currentPageRows + rowsNeeded <= maxRowsCurrentPage) {
        // 年级组可以放在当前页面
        currentPage.gradeGroups.push(gradeGroup);
        currentPageRows += rowsNeeded;
      } else {
        // 开始新页面
        if (currentPage.gradeGroups.length > 0) {
          pages.push(currentPage);
          currentPage = { gradeGroups: [gradeGroup], isFirstPage: false };
        } else {
          currentPage.gradeGroups.push(gradeGroup);
        }
        currentPageRows = rowsNeeded;
      }
    });

    // 添加最后一页
    if (currentPage.gradeGroups.length > 0) {
      pages.push(currentPage);
    }

    // 确保第一页标记正确
    if (pages.length > 0) {
      pages[0].isFirstPage = true;
    }

    return { ...data, pages };
  };

  useEffect(() => {
    fetchRosterData();
  }, []);

  const fetchRosterData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/students/roster', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('获取花名册数据失败');
      }
      const response_data = await response.json();
      const rawData = response_data.data;
      
      // 重新排序年级组：按正确教育阶段顺序排列
      if (rawData && rawData.gradeGroups) {
        const gradeOrder = ['初一', '初二', '初三', '高一', '高二', '高三', '已毕业学员'];
        
        const sortedGradeGroups = [...rawData.gradeGroups].sort((a, b) => {
          const aIsGraduated = a.gradeName.includes('毕业') || a.gradeName.includes('已毕业');
          const bIsGraduated = b.gradeName.includes('毕业') || b.gradeName.includes('已毕业');
          
          // 已毕业的排在最后
          if (aIsGraduated && !bIsGraduated) return 1;
          if (!aIsGraduated && bIsGraduated) return -1;
          
          // 如果都是已毕业，按名称排序
          if (aIsGraduated && bIsGraduated) {
            return a.gradeName.localeCompare(b.gradeName, 'zh-CN');
          }
          
          // 按照预定义的年级顺序排序
          const aIndex = gradeOrder.findIndex(grade => a.gradeName.includes(grade));
          const bIndex = gradeOrder.findIndex(grade => b.gradeName.includes(grade));
          
          // 如果找到了对应的年级顺序，按顺序排列
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          
          // 如果只有一个找到了，找到的排在前面
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          
          // 都没找到，按名称排序
          return a.gradeName.localeCompare(b.gradeName, 'zh-CN');
        });
        
        rawData.gradeGroups = sortedGradeGroups;
      }
      
      // 对每个年级组内的学生进行排序
      if (rawData && rawData.gradeGroups) {
        rawData.gradeGroups.forEach(gradeGroup => {
          if (gradeGroup.students && gradeGroup.students.length > 0) {
            gradeGroup.students.sort((a, b) => {
              // 首先按班级排序
              const classA = parseInt(a.class) || 0;
              const classB = parseInt(b.class) || 0;
              if (classA !== classB) {
                return classA - classB;
              }
              // 班级相同时按性别排序，女生在前
              if (a.gender !== b.gender) {
                return a.gender === '女' ? -1 : 1;
              }
              return 0;
            });
          }
        });
      }
      
      // 重新计算totalCount，排除已毕业学员
      if (rawData && rawData.gradeGroups) {
        const nonGraduatedCount = rawData.gradeGroups.reduce((total, gradeGroup) => {
          // 检查年级名称是否包含'毕业'或'已毕业'
          const isGraduated = gradeGroup.gradeName.includes('毕业') || gradeGroup.gradeName.includes('已毕业');
          if (!isGraduated) {
            return total + (gradeGroup.totalCount || 0);
          }
          return total;
        }, 0);
        
        // 更新totalCount为非已毕业学员的数量
        rawData.totalCount = nonGraduatedCount;
      }
      
      setRosterData(rawData);
      
      // Calculate pagination
      const paginated = paginateRosterData(rawData);
      

      
      setPaginatedData(paginated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // PDF导出功能
  const exportToPDF = async () => {
    if (!contentRef.current || !paginatedData) return;
    
    try {
      // Store original viewport meta tag
      const originalViewport = document.querySelector('meta[name="viewport"]');
      const originalViewportContent = originalViewport ? originalViewport.getAttribute('content') : null;
      
      // Store original body and html styles
      const originalBodyStyle = {
        width: document.body.style.width,
        minWidth: document.body.style.minWidth,
        maxWidth: document.body.style.maxWidth,
        margin: document.body.style.margin,
        transform: document.body.style.transform,
        zoom: document.body.style.zoom
      };
      
      const originalHtmlStyle = {
        width: document.documentElement.style.width,
        minWidth: document.documentElement.style.minWidth,
        maxWidth: document.documentElement.style.maxWidth
      };
      
      // ULTRA-AGGRESSIVE viewport and layout override - completely isolate from browser window size
      if (originalViewport) {
        originalViewport.setAttribute('content', 'width=1600, initial-scale=1.0, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0, viewport-fit=cover');
      } else {
        const viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        viewportMeta.content = 'width=1600, initial-scale=1.0, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0, viewport-fit=cover';
        document.head.appendChild(viewportMeta);
      }
      
      // Store original window dimensions
      const originalInnerWidth = window.innerWidth;
      const originalInnerHeight = window.innerHeight;
      
      // Override window dimensions to force consistent layout calculation
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1600
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 900
      });
      
      // Force body and html to ultra-wide desktop width for consistent 5-card layout
      document.body.style.cssText = `
        width: 1600px !important;
        min-width: 1600px !important;
        max-width: none !important;
        margin: 0 auto !important;
        transform: none !important;
        zoom: 1 !important;
        overflow-x: visible !important;
        box-sizing: border-box !important;
      `;
      
      document.documentElement.style.cssText = `
        width: 1600px !important;
        min-width: 1600px !important;
        max-width: none !important;
        overflow-x: visible !important;
        box-sizing: border-box !important;
      `;
      
      // Inject aggressive CSS to override ALL responsive behavior
      const aggressiveOverride = document.createElement('style');
      aggressiveOverride.id = 'pdf-viewport-override';
      aggressiveOverride.textContent = `
        * {
          box-sizing: border-box !important;
        }
        
        body, html {
          width: 1600px !important;
          min-width: 1600px !important;
          max-width: none !important;
        }
        
        .page-container {
          width: 1600px !important;
          min-width: 1600px !important;
          max-width: none !important;
          padding-left: 4rem !important;
          padding-right: 4rem !important;
        }
        
        /* Override ALL Tailwind responsive classes */
        .px-4, .sm\:px-6, .md\:px-8, .lg\:px-12, .xl\:px-16 {
          padding-left: 4rem !important;
          padding-right: 4rem !important;
        }
        
        .max-w-screen-2xl, .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl {
          max-width: none !important;
          width: 100% !important;
        }
      `;
      document.head.appendChild(aggressiveOverride);
      
      // Force multiple resize events with fixed dimensions
      for (let i = 0; i < 5; i++) {
        window.dispatchEvent(new Event('resize'));
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      // Extended wait for layout to fully settle with forced dimensions
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 10; // 10mm margins
      
      const tempStyle = document.createElement('style');
      tempStyle.textContent = `
        .pdf-export {
          width: 100% !important;
          max-width: none !important;
        }
        
        /* Force all responsive container classes to use fixed width in PDF export */
        .pdf-export .max-w-screen-2xl,
        .pdf-export .max-w-7xl,
        .pdf-export .max-w-6xl,
        .pdf-export .max-w-5xl,
        .pdf-export .max-w-4xl {
          max-width: none !important;
          width: 100% !important;
        }
        
        .pdf-export h1 {
          text-align: center !important;
          font-size: 36px !important;
          margin-bottom: 30px !important;
        }
        
        /* CRITICAL: Override ALL responsive grid classes with maximum specificity */
        .pdf-export .student-row.grid,
        .pdf-export .grid.student-row,
        .pdf-export .student-row,
        .pdf-export .grid {
          display: grid !important;
          grid-template-columns: repeat(5, minmax(216px, 1fr)) !important;
          gap: 1rem !important;
          margin-bottom: 2rem !important;
          justify-items: center !important;
          align-items: start !important;
          max-width: none !important;
          width: 100% !important;
        }
        
        /* Force override ALL Tailwind responsive grid classes with highest specificity */
        .pdf-export .student-row.grid-cols-3,
        .pdf-export .student-row.sm\:grid-cols-3,
        .pdf-export .student-row.md\:grid-cols-4,
        .pdf-export .student-row.lg\:grid-cols-5,
        .pdf-export .student-row.xl\:grid-cols-6,
        .pdf-export .grid.grid-cols-3,
        .pdf-export .grid.sm\:grid-cols-3,
        .pdf-export .grid.md\:grid-cols-4,
        .pdf-export .grid.lg\:grid-cols-5,
        .pdf-export .grid.xl\:grid-cols-6 {
          grid-template-columns: repeat(5, minmax(216px, 1fr)) !important;
        }
        
        .pdf-export .student-card {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          width: 100% !important;
          height: 280px !important;
          min-height: 280px !important;
          max-width: 216px !important;
          padding: 5rem 1rem 1rem 1rem !important;
          margin-top: 5rem !important;
          border-radius: 8px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: flex-start !important;
          text-align: center !important;
          box-sizing: border-box !important;
          overflow: visible !important;
          position: relative !important;
        }
        
        /* Override component's print styles with higher specificity */
        .pdf-export .student-card.student-card {
          height: 280px !important;
          min-height: 280px !important;
          max-height: none !important;
          overflow: visible !important;
          transform: none !important;
        }
        
        .pdf-export .student-card .relative {
          margin: 3rem auto 1rem auto !important;
          display: block !important;
          position: static !important;
        }
        
        .pdf-export .student-card .relative > div {
          width: 120px !important;
          height: 120px !important;
          border-radius: 50% !important;
          position: relative !important;
          padding: 4px !important;
          margin: 1rem auto !important;
        }
        
        .pdf-export .student-card .relative > div:first-child {
          position: absolute !important;
          inset: 0 !important;
          border-radius: 50% !important;
        }
        
        .pdf-export .student-card .relative > div > div:last-child {
          width: 100% !important;
          height: 100% !important;
          border-radius: 50% !important;
          overflow: hidden !important;
          position: relative !important;
          z-index: 10 !important;
          ring: 2px solid white !important;
        }
        
        .pdf-export .student-card img {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 50% !important;
        }
        
        .pdf-export .student-card .text-center {
          width: 100% !important;
        }
        
        .pdf-export .student-card h3 {
          font-size: 24px !important;
          line-height: 1.2 !important;
          margin-top: 2.5rem !important;
          margin-bottom: 0.5rem !important;
          padding-top: 3rem !important;
          padding-bottom: 0.5rem !important;
          font-weight: bold !important;
          color: #1f2937 !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          text-align: center !important;
          width: 100% !important;
          position: relative !important;
          z-index: 999 !important;
        }
        
        /* Override component's print styles for h3 with higher specificity */
        .pdf-export .student-card h3.text-xs {
          font-size: 24px !important;
          line-height: 1.2 !important;
          color: #1f2937 !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        .pdf-export .student-card .text-center {
          margin-top: 0.5rem !important;
          padding-top: 0.5rem !important;
          padding-bottom: 0.5rem !important;
          width: 100% !important;
          position: relative !important;
          z-index: 999 !important;
          display: block !important;
        }
        
        /* Ensure the flex container for name shows properly */
        .pdf-export .student-card .flex.flex-col {
          height: auto !important;
          padding-top: 0.5rem !important;
          padding-bottom: 1rem !important;
          position: static !important;
          margin-top: 0 !important;
        }
        
        /* Override absolute positioning in the card */
        .pdf-export .student-card .absolute {
          position: static !important;
        }
        
        /* Ensure proper spacing between avatar and name */
        .pdf-export .student-card .flex.flex-col.items-center {
          margin-top: 1rem !important;
          position: static !important;
        }
        
        /* Ensure class badge (grade badge) stays visible at top right with professional border overlap */
        .pdf-export .student-card .class-badge {
          position: absolute !important;
          top: -1px !important;
          right: -1px !important;
          z-index: 20 !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          background: #3b82f6 !important;
          color: white !important;
          font-size: 15px !important;
          padding: 2px 8px 2px 8px !important;
          border-radius: 8px !important;
          font-weight: 500 !important;
          line-height: 0.9 !important;
          border: 1px solid #3b82f6 !important;
          min-width: 32px !important;
          min-height: 24px !important;
          display: flex !important;
        align-items: flex-start !important;
          padding-top: 2px !important;  /* fine-tune */
          justify-content: center !important;
          text-align: center !important;
        }

      .pdf-export .student-card .class-badge span {
        position: relative;
        top: -4px;   /* move text up inside the badge */
      }
        
        /* Ensure the main card container allows for badge overflow */
        .pdf-export .student-card {
          overflow: visible !important;
        }
        
        .pdf-export .grade-header h2 {
          font-size: 20px !important;
        }
        
        .pdf-export .grade-header .flex {
          font-size: 16px !important;
        }
        
        .pdf-export button {
          display: none !important;
        }
      `;
      
      document.head.appendChild(tempStyle);
      contentRef.current.classList.add('pdf-export');
      
      // Wait for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100));
      
      for (let pageIndex = 0; pageIndex < paginatedData.pages.length; pageIndex++) {
        if (pageIndex > 0) {
          pdf.addPage();
        }
        
        const pageElement = contentRef.current.children[pageIndex];
        
        if (pageElement) {
          const canvas = await html2canvas(pageElement, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - (margin * 2);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
        }
      }
      
      // Cleanup
      contentRef.current.classList.remove('pdf-export');
      document.head.removeChild(tempStyle);
      
      // Remove aggressive override styles
      const aggressiveOverrideStyle = document.getElementById('pdf-viewport-override');
      if (aggressiveOverrideStyle) {
        document.head.removeChild(aggressiveOverrideStyle);
      }
      
      // Restore original viewport meta tag
      if (originalViewport) {
        if (originalViewportContent) {
          originalViewport.setAttribute('content', originalViewportContent);
        } else {
          originalViewport.remove();
        }
      }
      
      // Restore original window dimensions
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: originalInnerHeight
      });
      
      // Restore original body styles
      document.body.style.width = originalBodyStyle.width;
      document.body.style.minWidth = originalBodyStyle.minWidth;
      document.body.style.maxWidth = originalBodyStyle.maxWidth;
      document.body.style.margin = originalBodyStyle.margin;
      document.body.style.transform = originalBodyStyle.transform;
      document.body.style.zoom = originalBodyStyle.zoom;
      document.body.style.overflow = originalBodyStyle.overflow || '';
      document.body.style.boxSizing = originalBodyStyle.boxSizing || '';
      
      // Restore original html styles
      document.documentElement.style.width = originalHtmlStyle.width;
      document.documentElement.style.minWidth = originalHtmlStyle.minWidth;
      document.documentElement.style.maxWidth = originalHtmlStyle.maxWidth;
      document.documentElement.style.overflow = originalHtmlStyle.overflow || '';
      document.documentElement.style.boxSizing = originalHtmlStyle.boxSizing || '';
      
      // Trigger multiple resize events to restore responsive layout
      for (let i = 0; i < 3; i++) {
        window.dispatchEvent(new Event('resize'));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      pdf.save('2025届铁一定向队员名册.pdf');
    } catch (error) {
      console.error('PDF导出失败:', error);
      // Cleanup on error
      if (contentRef.current) {
        contentRef.current.classList.remove('pdf-export');
      }
      const tempStyles = document.querySelectorAll('style');
      tempStyles.forEach(style => {
        if (style.textContent.includes('.pdf-export')) {
          document.head.removeChild(style);
        }
      });
      
      // Remove aggressive override styles on error
      const aggressiveOverrideStyle = document.getElementById('pdf-viewport-override');
      if (aggressiveOverrideStyle) {
        document.head.removeChild(aggressiveOverrideStyle);
      }
      
      // Restore original viewport meta tag on error
      const currentViewport = document.querySelector('meta[name="viewport"]');
      if (currentViewport) {
        if (originalViewportContent) {
          currentViewport.setAttribute('content', originalViewportContent);
        } else {
          currentViewport.remove();
        }
      }
      
      // Restore original window dimensions on error
      if (typeof originalInnerWidth !== 'undefined') {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: originalInnerWidth
        });
      }
      if (typeof originalInnerHeight !== 'undefined') {
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: originalInnerHeight
        });
      }
      
      // Trigger multiple resize events to restore responsive layout
      for (let i = 0; i < 3; i++) {
        window.dispatchEvent(new Event('resize'));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-300">正在加载花名册...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">加载失败</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={fetchRosterData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={contentRef} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {paginatedData?.pages?.map((page, pageIndex) => (
        <div key={`page-${pageIndex}`} className={`page-container px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 mx-auto max-w-screen-2xl ${pageIndex > 0 ? 'page-break-before' : ''}`}>
          {/* 主页面标题 - 只在第一页显示 */}
          {pageIndex === 0 && (
            <RosterHeader 
              totalCount={rosterData?.totalCount || 0}
              onExportPDF={exportToPDF}
            />
          )}

          {/* 年级分组 */}
          <div className="space-y-1 sm:space-y-2">
            {page.gradeGroups?.map((gradeGroup, gradeGroupIndex) => (
               <div key={gradeGroup.gradeName} className="grade-section">
                 <GradeSection 
                   gradeGroup={gradeGroup}
                   students={gradeGroup.students || []}
                   grade={gradeGroup.gradeName}
                   totalCount={gradeGroup.totalCount || 0}
                   maleCount={gradeGroup.maleCount || 0}
                   femaleCount={gradeGroup.femaleCount || 0}
                   isFirstPage={true}
                 />
               </div>
             ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StudentRoster;