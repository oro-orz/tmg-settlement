// ===========================================
// 業務ツール立替申請システム - メインコード (code.gs)
// ===========================================

// スプレッドシートとフォルダの設定
const SPREADSHEET_ID = '1VOwrM01j8HdHThLRZlTVx0lv-DR0ODZKR0LahLiBUfQ';
const DRIVE_FOLDER_ID = '17ZoGfgvvHWoCmCfFsfNHl9HcT2870lrc';

// シート名の定義
const SHEET_NAMES = {
  APPLICATION: '申請管理',
  EMPLOYEE_MASTER: '社員マスタ',
  TOOL_MASTER: 'ツールマスタ',
  APPROVER_MASTER: '承認者マスタ'
};

// 申請ステータスの定義
const APPLICATION_STATUS = {
  PENDING: '申請中',
  APPROVED: '承認済',
  REJECTED: '却下'
};

// 経理確認ステータスの定義
const ACCOUNTING_STATUS = {
  UNCONFIRMED: '未確認',
  CONFIRMED: '確認済',
  PAID: '支払済'
};

// ===========================================
// Webアプリケーション表示（デバッグ版）
// ===========================================
function doGet(e) {
  // デバッグ用ログ
  console.log('doGet called with parameters:', e);
  
  // パラメータが存在しない場合の対処
  const page = e && e.parameter ? e.parameter.page : null;
  console.log('Page parameter:', page);
  
  // デバッグ用：直接HTMLを返す
  if (page === 'test') {
    return HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
      <head>
        <base target="_top">
        <title>テスト</title>
      </head>
      <body>
        <h1>テスト画面</h1>
        <p>この画面が表示されれば、doGet関数は正常に動作しています。</p>
        <p>パラメータ: ${JSON.stringify(e)}</p>
        <hr>
        <h2>リンクテスト</h2>
        <ul>
          <li><a href="?">ホーム（申請入力）</a></li>
          <li><a href="?page=list">申請一覧</a></li>
          <li><a href="?page=approval">承認管理</a></li>
          <li><a href="?page=accounting">経理確認</a></li>
        </ul>
      </body>
      </html>
    `);
  }
  
  // HTMLテンプレートファイルの存在確認
  let debugInfo = [];
  
  try {
    // 各ファイルの存在確認
    const filesToCheck = ['index', 'list', 'approval', 'accounting'];
    
    for (const fileName of filesToCheck) {
      try {
        HtmlService.createTemplateFromFile(fileName);
        debugInfo.push(`✓ ${fileName}.html が存在します`);
      } catch (err) {
        debugInfo.push(`✗ ${fileName}.html が見つかりません: ${err}`);
      }
    }
    
    // デバッグモードの場合
    if (page === 'debug') {
      return HtmlService.createHtmlOutput(`
        <!DOCTYPE html>
        <html>
        <head>
          <base target="_top">
          <title>デバッグ情報</title>
        </head>
        <body>
          <h1>デバッグ情報</h1>
          <h2>ファイル確認結果：</h2>
          <ul>
            ${debugInfo.map(info => `<li>${info}</li>`).join('')}
          </ul>
          <h2>パラメータ：</h2>
          <pre>${JSON.stringify(e, null, 2)}</pre>
        </body>
        </html>
      `);
    }
    
    // 通常の処理
    let template;
    
    switch (page) {
      case 'list':
        template = HtmlService.createTemplateFromFile('list');
        break;
      case 'approval':
        template = HtmlService.createTemplateFromFile('approval');
        break;
      case 'accounting':
        template = HtmlService.createTemplateFromFile('accounting');
        break;
      default:
        template = HtmlService.createTemplateFromFile('index');
    }
    
    return template.evaluate()
      .setTitle('業務ツール立替申請')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
  } catch (error) {
    console.error('Error in doGet:', error);
    return HtmlService.createHtmlOutput(`
      <h1>エラーが発生しました</h1>
      <p>${error.toString()}</p>
      <h2>デバッグ情報：</h2>
      <ul>
        ${debugInfo.map(info => `<li>${info}</li>`).join('')}
      </ul>
    `);
  }
}

// HTMLファイルをインクルード
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===========================================
// 申請関連の関数
// ===========================================

// 申請データを保存
function saveApplication(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
    
    // 重複チェック
    const duplicate = checkDuplicateApplication(data.employeeNumber, data.tool, data.targetMonth);
    if (duplicate) {
      return { 
        success: false, 
        message: '同じツール・対象月の申請が既に存在します' 
      };
    }
    
    // 申請IDを生成（タイムスタンプベース）
    const applicationId = 'APP' + new Date().getTime();
    
    // 領収書画像をDriveに保存
    let fileUrl = '';
    if (data.imageData) {
      const imageBlob = Utilities.newBlob(
        Utilities.base64Decode(data.imageData.split(',')[1]),
        data.imageType,
        `${applicationId}_${data.imageName}`
      );
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const file = folder.createFile(imageBlob);
      fileUrl = file.getUrl();
    }

    // クレカ明細等をDriveに保存（任意）
    let creditUrl = '';
    if (data.creditData) {
      const creditBlob = Utilities.newBlob(
        Utilities.base64Decode(data.creditData.split(',')[1]),
        data.creditType,
        `${applicationId}_${data.creditName}`
      );
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const creditFile = folder.createFile(creditBlob);
      creditUrl = creditFile.getUrl();
    }
    
    // スプレッドシートにデータを記録
    sheet.appendRow([
      applicationId,
      new Date(),
      data.employeeNumber,
      data.employeeName,
      data.location,
      data.tool,
      data.amount,
      data.targetMonth,
      data.purpose,
      fileUrl,         // 領収書URL
      creditUrl,       // クレカ明細URL（新規追加）
      APPLICATION_STATUS.PENDING,
      '', // 承認者
      '', // 承認日
      '', // 却下理由
      ACCOUNTING_STATUS.UNCONFIRMED // 経理確認
    ]);
    
    return { success: true, message: '申請を受け付けました' };
  } catch (error) {
    console.error('Error in saveApplication:', error);
    return { success: false, message: 'エラーが発生しました: ' + error.toString() };
  }
}

// 重複申請チェック
function checkDuplicateApplication(employeeNumber, tool, targetMonth) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] == employeeNumber && 
        data[i][5] == tool && 
        data[i][7] == targetMonth &&
        data[i][10] != APPLICATION_STATUS.REJECTED) {
      return true;
    }
  }
  return false;
}

// ===========================================
// データ取得関数
// ===========================================

// 社員情報を取得
function getEmployeeInfo(employeeNumber) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEE_MASTER);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == employeeNumber) {
      return {
        employeeNumber: data[i][0],
        name: data[i][1],
        location: data[i][2],
        supervisor: data[i][3]
      };
    }
  }
  return null;
}

// マスタデータを取得
function getMasterData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 社員マスタ
  const employeeSheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEE_MASTER);
  const employeeData = employeeSheet.getDataRange().getValues();
  const employees = [];
  for (let i = 1; i < employeeData.length; i++) {
    if (employeeData[i][0]) {
      employees.push({
        employeeNumber: employeeData[i][0],
        name: employeeData[i][1],
        location: employeeData[i][2],
        supervisor: employeeData[i][3]
      });
    }
  }
  
  // ツールマスタ
  const toolSheet = ss.getSheetByName(SHEET_NAMES.TOOL_MASTER);
  const toolData = toolSheet.getDataRange().getValues();
  const tools = [];
  for (let i = 1; i < toolData.length; i++) {
    if (toolData[i][0]) {
      tools.push(toolData[i][0]);
    }
  }
  
  return {
    employees: employees,
    tools: tools
  };
}

// 申請一覧を取得（社員用）
function getMyApplications(employeeNumber) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
  const data = sheet.getDataRange().getValues();
  
  const applications = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] == employeeNumber) {
      applications.push({
        applicationId: data[i][0],
        applicationDate: Utilities.formatDate(new Date(data[i][1]), 'JST', 'yyyy/MM/dd'),
        tool: data[i][5],
        amount: data[i][6],
        targetMonth: data[i][7],
        status: data[i][10],
        rejectReason: data[i][13]
      });
    }
  }
  
  // 新しい順にソート
  applications.sort((a, b) => b.applicationDate.localeCompare(a.applicationDate));
  
  return applications;
}

// 承認待ち一覧を取得（承認者用）
function getPendingApplications(approverName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 承認可能拠点を取得
  const approverSheet = ss.getSheetByName(SHEET_NAMES.APPROVER_MASTER);
  const approverData = approverSheet.getDataRange().getValues();
  let approveableLocations = [];
  
  for (let i = 1; i < approverData.length; i++) {
    if (approverData[i][0] == approverName) {
      approveableLocations = approverData[i][1].split(',').map(loc => loc.trim());
      break;
    }
  }
  
  // 申請データを取得
  const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
  const data = sheet.getDataRange().getValues();
  
  const applications = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][10] == APPLICATION_STATUS.PENDING && 
        approveableLocations.includes(data[i][4])) {
      applications.push({
        applicationId: data[i][0],
        applicationDate: Utilities.formatDate(new Date(data[i][1]), 'JST', 'yyyy/MM/dd'),
        employeeNumber: data[i][2],
        employeeName: data[i][3],
        location: data[i][4],
        tool: data[i][5],
        amount: data[i][6],
        targetMonth: data[i][7],
        purpose: data[i][8],
        receiptUrl: data[i][9]
      });
    }
  }
  
  return applications;
}

// ===========================================
// 月別の全申請を取得（承認管理用）
// ===========================================
function getAllApplicationsByMonth(targetMonth) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // カラム名の前後空白や全角・半角の違いも吸収する関数
  function getHeaderIndex(headers, name) {
    return headers.findIndex(h => h.replace(/\s/g, '') === name.replace(/\s/g, ''));
  }

  const idx = {
    id: getHeaderIndex(headers, '申請ID'),
    appDate: getHeaderIndex(headers, '申請日'),
    number: getHeaderIndex(headers, '社員番号'),
    name: getHeaderIndex(headers, '氏名'),
    location: getHeaderIndex(headers, '拠点'),
    tool: getHeaderIndex(headers, 'ツール'),
    amount: getHeaderIndex(headers, '料金'),
    date: getHeaderIndex(headers, '対象年月'),
    purpose: getHeaderIndex(headers, '使用用途'),
    receipt: getHeaderIndex(headers, '領収書URL'),
    credit: getHeaderIndex(headers, 'クレカ明細URL'),
    status: getHeaderIndex(headers, '申請ステータス'),
    approver: getHeaderIndex(headers, '承認者'),
    approvalDate: getHeaderIndex(headers, '承認日'),
    rejectReason: getHeaderIndex(headers, '却下理由'),
    // supervisor: getHeaderIndex(headers, '上長名'), // supervisorMapは別途
  };

  // 社員マスタから上長情報を取得
  const employeeSheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEE_MASTER);
  const employeeData = employeeSheet.getDataRange().getValues();
  const supervisorMap = {};
  for (let i = 1; i < employeeData.length; i++) {
    supervisorMap[employeeData[i][0]] = employeeData[i][3];
  }

  const applications = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;

    // 対象年月の比較
    let match = true;
    if (targetMonth) {
      let rawDate = data[i][idx.date];
      let rowMonth = '';
      if (rawDate instanceof Date) {
        rowMonth = Utilities.formatDate(rawDate, 'JST', 'yyyy-MM');
      } else if (typeof rawDate === 'string') {
        rowMonth = rawDate.trim().replace(/\//g, '-').slice(0, 7);
      } else {
        rowMonth = String(rawDate).trim();
      }
      // ここで値をログ出力
      console.log('row', i, 'rowMonth:', rowMonth, 'targetMonth:', targetMonth);
      match = (rowMonth === targetMonth);
    }
    if (!match) continue;

    applications.push({
      applicationId: data[i][idx.id],
      applicationDate: data[i][idx.appDate] ? Utilities.formatDate(new Date(data[i][idx.appDate]), 'JST', 'yyyy/MM/dd') : '',
      employeeNumber: data[i][idx.number],
      employeeName: data[i][idx.name],
      location: data[i][idx.location],
      tool: data[i][idx.tool],
      amount: data[i][idx.amount],
      targetMonth: data[i][idx.date],
      purpose: data[i][idx.purpose],
      receiptUrl: data[i][idx.receipt],
      credit: data[i][idx.credit],
      status: data[i][idx.status],
      approver: data[i][idx.approver] || '',
      approvalDate: data[i][idx.approvalDate] ? Utilities.formatDate(new Date(data[i][idx.approvalDate]), 'JST', 'yyyy/MM/dd') : '',
      rejectReason: data[i][idx.rejectReason] || '',
      supervisor: supervisorMap[data[i][idx.number]] || ''
    });
  }

  applications.sort((a, b) => b.applicationDate.localeCompare(a.applicationDate));
  console.log('applications:', applications);
  return applications;
}

// ===========================================
// 承認関連の関数
// ===========================================

// 申請を承認/却下
function processApproval(applicationId, approverName, isApproved, rejectReason) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
    const data = sheet.getDataRange().getValues();
    
    // 対象行を検索
    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == applicationId) {
        targetRow = i + 1;
        break;
      }
    }
    
    if (targetRow == -1) {
      return { success: false, message: '申請が見つかりません' };
    }
    
    // ステータスを更新
    const status = isApproved ? APPLICATION_STATUS.APPROVED : APPLICATION_STATUS.REJECTED;
    sheet.getRange(targetRow, 11).setValue(status);
    sheet.getRange(targetRow, 12).setValue(approverName);
    sheet.getRange(targetRow, 13).setValue(new Date());
    
    if (!isApproved) {
      sheet.getRange(targetRow, 14).setValue(rejectReason);
    }
    
    return { success: true, message: isApproved ? '承認しました' : '却下しました' };
  } catch (error) {
    console.error('Error in processApproval:', error);
    return { success: false, message: 'エラーが発生しました: ' + error.toString() };
  }
}

// 一括承認
function batchApprove(applicationIds, approverName) {
  let successCount = 0;
  let errorCount = 0;
  
  for (const id of applicationIds) {
    const result = processApproval(id, approverName, true, '');
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
  }
  
  return {
    success: true,
    message: `${successCount}件承認しました${errorCount > 0 ? `（${errorCount}件エラー）` : ''}`
  };
}

// ===========================================
// 経理関連の関数
// ===========================================

// 承認済み申請一覧を取得（経理用）
function getApprovedApplications(targetMonth) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
  const data = sheet.getDataRange().getValues();
  
  const applications = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    
    // 承認済みのみ取得
    if (data[i][10] != APPLICATION_STATUS.APPROVED) {
      continue;
    }
    
    // 対象月でフィルター
    if (targetMonth) {
      const rowMonth = Utilities.formatDate(new Date(data[i][7]), 'JST', 'yyyy-MM');
      if (rowMonth !== targetMonth) {
        continue;
      }
    }
    
    applications.push({
      applicationId: data[i][0],
      applicationDate: Utilities.formatDate(new Date(data[i][1]), 'JST', 'yyyy/MM/dd'),
      employeeNumber: data[i][2],
      employeeName: data[i][3],
      location: data[i][4],
      tool: data[i][5],
      amount: data[i][6],
      targetMonth: Utilities.formatDate(new Date(data[i][7]), 'JST', 'yyyy-MM'),
      purpose: data[i][8],
      receiptUrl: data[i][9],
      approver: data[i][11] || '',
      approvalDate: data[i][12] ? Utilities.formatDate(new Date(data[i][12]), 'JST', 'yyyy/MM/dd') : '',
      accountingStatus: data[i][14]
    });
  }
  
  return applications;
}

// 経理確認ステータスを更新
function updateAccountingStatus(applicationIds, status) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
    const data = sheet.getDataRange().getValues();
    
    let updateCount = 0;
    
    for (const applicationId of applicationIds) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == applicationId) {
          sheet.getRange(i + 1, 15).setValue(status);
          updateCount++;
          break;
        }
      }
    }
    
    return { 
      success: true, 
      message: `${updateCount}件のステータスを更新しました` 
    };
  } catch (error) {
    console.error('Error in updateAccountingStatus:', error);
    return { success: false, message: 'エラーが発生しました: ' + error.toString() };
  }
}

// 月次レポートをCSV形式で取得
function getMonthlyReportCSV(targetMonth) {
  const applications = getApprovedApplications(targetMonth);
  
  // 社員別に集計
  const summary = {};
  applications.forEach(app => {
    const key = `${app.employeeNumber}_${app.employeeName}`;
    if (!summary[key]) {
      summary[key] = {
        employeeNumber: app.employeeNumber,
        employeeName: app.employeeName,
        location: app.location,
        totalAmount: 0,
        details: []
      };
    }
    summary[key].totalAmount += app.amount;
    summary[key].details.push({
      tool: app.tool,
      amount: app.amount
    });
  });
  
  // CSV形式で出力
  let csv = '社員番号,氏名,拠点,合計金額,明細\n';
  Object.values(summary).forEach(emp => {
    const details = emp.details.map(d => `${d.tool}:${d.amount}円`).join(' / ');
    csv += `${emp.employeeNumber},${emp.employeeName},${emp.location},${emp.totalAmount},${details}\n`;
  });
  
  return csv;
}