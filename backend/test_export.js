const ExcelJS = require('exceljs');
const fs = require('fs');

async function testExport() {
  try {
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('成绩数据');
    
    // Define columns with Chinese headers
    worksheet.columns = [
      { header: '姓名', key: 'name', width: 12 },
      { header: '比赛', key: 'eventName', width: 25 },
      { header: '比赛日期', key: 'eventDate', width: 15 },
      { header: '比赛类型', key: 'eventType', width: 12 },
      { header: '项目', key: 'gameType', width: 15 },
      { header: '组别', key: 'groupName', width: 12 },
      { header: '成绩', key: 'result', width: 12 },
      { header: '得分', key: 'score', width: 10 },
      { header: '有效性', key: 'validity', width: 10 },
      { header: '排名', key: 'position', width: 10 }
    ];
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add test data
    worksheet.addRow({
      name: '张三',
      eventName: '测试比赛',
      eventDate: '2025-10-10',
      eventType: '省级',
      gameType: '短距离',
      groupName: 'M21',
      result: '00:15:30',
      score: '100',
      validity: '有效',
      position: '1'
    });
    
    worksheet.addRow({
      name: '李四',
      eventName: '测试比赛',
      eventDate: '2025-10-10',
      eventType: '省级',
      gameType: '短距离',
      groupName: 'M21',
      result: '00:16:30',
      score: '95',
      validity: '有效',
      position: '2'
    });
    
    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    
    // Write to file
    const filename = `test_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    await workbook.xlsx.writeFile(filename);
    
    console.log(`✅ Test export successful! File created: ${filename}`);
    console.log(`File size: ${fs.statSync(filename).size} bytes`);
  } catch (error) {
    console.error('❌ Test export failed:', error);
  }
}

testExport();
