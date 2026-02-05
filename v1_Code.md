// ===========================================
// 業務ツール立替申請システム - メインコード (code.gs)
// ===========================================
// Next.js 承認システム用 API (action=api) を組み込み済み

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
// doGet - API と Web アプリの振り分け
// ===========================================
function doGet(e) {
  e = e || {};
  const params = e.parameter || {};
  const action = params.action;

  // Next.js 承認システム用 API
  if (action === 'api') {
    const method = params.method;
    switch (method) {
      case 'getApplications':
        return apiGetApplications(params.month);
      case 'submitCheck':
        return apiSubmitCheck(params);
      case 'getImageBase64':
        return apiGetImageBase64(params.fileId);
      default:
        return apiError('Invalid method');
    }
  }

  // 既存の HTML 表示処理
  return doGetHtml(e);
}

// ===========================================
// API: 申請一覧取得
// ===========================================
function apiGetApplications(targetMonth) {
  try {
    const apps = getAllApplicationsByMonth(targetMonth);
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: apps }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return apiError(error.toString());
  }
}

// ===========================================
// API: チェック送信
// ===========================================
function apiSubmitCheck(params) {
  try {
    const applicationId = params.applicationId;
    const action = params.checkAction;
    const checker = params.checker;
    const comment = params.comment || '';

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
    const data = sheet.getDataRange().getValues();

    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == applicationId) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow == -1) {
      return apiError('Application not found');
    }

    const now = new Date();

    switch (action) {
      case 'accounting_approve':
        sheet.getRange(targetRow, 16).setValue('経理承認済');
        sheet.getRange(targetRow, 19).setValue(checker);
        sheet.getRange(targetRow, 20).setValue(now);
        sheet.getRange(targetRow, 21).setValue(comment);
        break;
      case 'accounting_reject':
        sheet.getRange(targetRow, 16).setValue('差し戻し');
        sheet.getRange(targetRow, 19).setValue(checker);
        sheet.getRange(targetRow, 20).setValue(now);
        sheet.getRange(targetRow, 21).setValue(comment);
        break;
      case 'send_to_executive':
        sheet.getRange(targetRow, 16).setValue('役員確認待ち');
        sheet.getRange(targetRow, 19).setValue(checker);
        sheet.getRange(targetRow, 20).setValue(now);
        sheet.getRange(targetRow, 21).setValue(comment);
        break;
      case 'executive_approve':
        sheet.getRange(targetRow, 16).setValue('最終承認済');
        sheet.getRange(targetRow, 22).setValue(checker);
        sheet.getRange(targetRow, 23).setValue(now);
        sheet.getRange(targetRow, 24).setValue(comment);
        break;
      case 'executive_reject':
        sheet.getRange(targetRow, 16).setValue('却下');
        sheet.getRange(targetRow, 22).setValue(checker);
        sheet.getRange(targetRow, 23).setValue(now);
        sheet.getRange(targetRow, 24).setValue(comment);
        break;
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Check submitted successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return apiError(error.toString());
  }
}

// ===========================================
// API: 画像を Base64 で取得
// ===========================================
function apiGetImageBase64(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    const base64 = Utilities.base64Encode(blob.getBytes());
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, base64: base64, mimeType: blob.getContentType() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return apiError('Failed to get image: ' + error.toString());
  }
}

// ===========================================
// API: エラーレスポンス
// ===========================================
function apiError(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===========================================
// Webアプリケーション表示（既存）
// ===========================================
function doGetHtml(e) {
  const page = e && e.parameter ? e.parameter.page : null;

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

  let debugInfo = [];
  try {
    const filesToCheck = ['index', 'list', 'approval', 'accounting'];
    for (const fileName of filesToCheck) {
      try {
        HtmlService.createTemplateFromFile(fileName);
        debugInfo.push('✓ ' + fileName + '.html が存在します');
      } catch (err) {
        debugInfo.push('✗ ' + fileName + '.html が見つかりません: ' + err);
      }
    }

    if (page === 'debug') {
      return HtmlService.createHtmlOutput(
        '<!DOCTYPE html><html><head><base target="_top"><title>デバッグ情報</title></head><body><h1>デバッグ情報</h1><h2>ファイル確認結果：</h2><ul>' +
        debugInfo.map(function (info) { return '<li>' + info + '</li>'; }).join('') +
        '</ul><h2>パラメータ：</h2><pre>' + JSON.stringify(e, null, 2) + '</pre></body></html>'
      );
    }

    var template;
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
    return HtmlService.createHtmlOutput(
      '<h1>エラーが発生しました</h1><p>' + error.toString() + '</p><h2>デバッグ情報：</h2><ul>' +
      debugInfo.map(function (info) { return '<li>' + info + '</li>'; }).join('') + '</ul>'
    );
  }
}

// HTMLファイルをインクルード
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===========================================
// 申請関連の関数
// ===========================================

function saveApplication(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);

    const duplicate = checkDuplicateApplication(data.employeeNumber, data.tool, data.targetMonth);
    if (duplicate) {
      return { success: false, message: '同じツール・対象月の申請が既に存在します' };
    }

    const applicationId = 'APP' + new Date().getTime();
    var fileUrl = '';
    if (data.imageData) {
      const imageBlob = Utilities.newBlob(
        Utilities.base64Decode(data.imageData.split(',')[1]),
        data.imageType,
        applicationId + '_' + data.imageName
      );
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const file = folder.createFile(imageBlob);
      fileUrl = file.getUrl();
    }

    var creditUrl = '';
    if (data.creditData) {
      const creditBlob = Utilities.newBlob(
        Utilities.base64Decode(data.creditData.split(',')[1]),
        data.creditType,
        applicationId + '_' + data.creditName
      );
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const creditFile = folder.createFile(creditBlob);
      creditUrl = creditFile.getUrl();
    }

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
      fileUrl,
      creditUrl,
      APPLICATION_STATUS.PENDING,
      '',
      '',
      '',
      ACCOUNTING_STATUS.UNCONFIRMED
    ]);

    return { success: true, message: '申請を受け付けました' };
  } catch (error) {
    console.error('Error in saveApplication:', error);
    return { success: false, message: 'エラーが発生しました: ' + error.toString() };
  }
}

function checkDuplicateApplication(employeeNumber, tool, targetMonth) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
  const data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] == employeeNumber && data[i][5] == tool && data[i][7] == targetMonth && data[i][10] != APPLICATION_STATUS.REJECTED) {
      return true;
    }
  }
  return false;
}

// ===========================================
// データ取得関数
// ===========================================

function getEmployeeInfo(employeeNumber) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEE_MASTER);
  const data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
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

function getMasterData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const employeeSheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEE_MASTER);
  const employeeData = employeeSheet.getDataRange().getValues();
  var employees = [];
  for (var i = 1; i < employeeData.length; i++) {
    if (employeeData[i][0]) {
      employees.push({
        employeeNumber: employeeData[i][0],
        name: employeeData[i][1],
        location: employeeData[i][2],
        supervisor: employeeData[i][3]
      });
    }
  }
  const toolSheet = ss.getSheetByName(SHEET_NAMES.TOOL_MASTER);
  const toolData = toolSheet.getDataRange().getValues();
  var tools = [];
  for (var i = 1; i < toolData.length; i++) {
    if (toolData[i][0]) {
      tools.push(toolData[i][0]);
    }
  }
  return { employees: employees, tools: tools };
}

function getMyApplications(employeeNumber) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
  const data = sheet.getDataRange().getValues();
  var applications = [];
  for (var i = 1; i < data.length; i++) {
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
  applications.sort(function (a, b) { return b.applicationDate.localeCompare(a.applicationDate); });
  return applications;
}

function getPendingApplications(approverName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const approverSheet = ss.getSheetByName(SHEET_NAMES.APPROVER_MASTER);
  const approverData = approverSheet.getDataRange().getValues();
  var approveableLocations = [];
  for (var i = 1; i < approverData.length; i++) {
    if (approverData[i][0] == approverName) {
      approveableLocations = approverData[i][1].split(',').map(function (loc) { return loc.trim(); });
      break;
    }
  }
  const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
  const data = sheet.getDataRange().getValues();
  var applications = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][10] == APPLICATION_STATUS.PENDING && approveableLocations.indexOf(data[i][4]) !== -1) {
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
// 月別の全申請を取得（承認管理用・Next.js API 用フォーマット対応）
// ===========================================
function getAllApplicationsByMonth(targetMonth) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  function getHeaderIndex(headers, name) {
    return headers.findIndex(function (h) { return h.replace(/\s/g, '') === name.replace(/\s/g, ''); });
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
    rejectReason: getHeaderIndex(headers, '却下理由')
  };

  const employeeSheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEE_MASTER);
  const employeeData = employeeSheet.getDataRange().getValues();
  var supervisorMap = {};
  for (var i = 1; i < employeeData.length; i++) {
    supervisorMap[employeeData[i][0]] = employeeData[i][3];
  }

  var applications = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;

    var match = true;
    if (targetMonth) {
      var rawDate = data[i][idx.date];
      var rowMonth = '';
      if (rawDate instanceof Date) {
        rowMonth = Utilities.formatDate(rawDate, 'JST', 'yyyy-MM');
      } else if (typeof rawDate === 'string') {
        rowMonth = rawDate.trim().replace(/\//g, '-').slice(0, 7);
      } else {
        rowMonth = String(rawDate).trim();
      }
      match = (rowMonth === targetMonth);
    }
    if (!match) continue;

    var row = data[i];
    var app = {
      applicationId: row[idx.id],
      applicationDate: row[idx.appDate] ? Utilities.formatDate(new Date(row[idx.appDate]), 'JST', 'yyyy/MM/dd') : '',
      employeeNumber: row[idx.number],
      employeeName: row[idx.name],
      location: row[idx.location],
      tool: row[idx.tool],
      amount: row[idx.amount],
      targetMonth: row[idx.date],
      purpose: row[idx.purpose],
      receiptUrl: row[idx.receipt] || '',
      creditUrl: row[idx.credit] !== undefined && row[idx.credit] !== null ? row[idx.credit] : '',
      status: row[idx.status],
      approver: row[idx.approver] || '',
      approvalDate: row[idx.approvalDate] ? Utilities.formatDate(new Date(row[idx.approvalDate]), 'JST', 'yyyy/MM/dd') : '',
      rejectReason: row[idx.rejectReason] || '',
      supervisor: supervisorMap[row[idx.number]] || '',
      checkStatus: (row[15] !== undefined && row[15] !== null && row[15] !== '') ? row[15] : '未確認'
    };

    if (row.length > 16) {
      app.aiRiskLevel = row[17] || null;
      app.accountingChecker = row[18] || '';
      app.accountingCheckDate = row[19] ? (row[19] instanceof Date ? Utilities.formatDate(row[19], 'JST', 'yyyy/MM/dd') : String(row[19])) : '';
      app.accountingComment = row[20] || '';
      app.executiveApprover = row[21] || '';
      app.executiveApprovalDate = row[22] ? (row[22] instanceof Date ? Utilities.formatDate(row[22], 'JST', 'yyyy/MM/dd') : String(row[22])) : '';
      app.executiveComment = row[23] || '';
    }

    applications.push(app);
  }

  applications.sort(function (a, b) { return b.applicationDate.localeCompare(a.applicationDate); });
  return applications;
}

// ===========================================
// 承認関連の関数
// ===========================================

function processApproval(applicationId, approverName, isApproved, rejectReason) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
    const data = sheet.getDataRange().getValues();
    var targetRow = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == applicationId) {
        targetRow = i + 1;
        break;
      }
    }
    if (targetRow == -1) {
      return { success: false, message: '申請が見つかりません' };
    }
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

function batchApprove(applicationIds, approverName) {
  var successCount = 0;
  var errorCount = 0;
  for (var i = 0; i < applicationIds.length; i++) {
    var result = processApproval(applicationIds[i], approverName, true, '');
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
  }
  return { success: true, message: successCount + '件承認しました' + (errorCount > 0 ? '（' + errorCount + '件エラー）' : '') };
}

// ===========================================
// 経理関連の関数
// ===========================================

function getApprovedApplications(targetMonth) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
  const data = sheet.getDataRange().getValues();
  var applications = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    if (data[i][10] != APPLICATION_STATUS.APPROVED) continue;
    if (targetMonth) {
      var rowMonth = Utilities.formatDate(new Date(data[i][7]), 'JST', 'yyyy-MM');
      if (rowMonth !== targetMonth) continue;
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

function updateAccountingStatus(applicationIds, status) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.APPLICATION);
    const data = sheet.getDataRange().getValues();
    var updateCount = 0;
    for (var a = 0; a < applicationIds.length; a++) {
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] == applicationIds[a]) {
          sheet.getRange(i + 1, 15).setValue(status);
          updateCount++;
          break;
        }
      }
    }
    return { success: true, message: updateCount + '件のステータスを更新しました' };
  } catch (error) {
    console.error('Error in updateAccountingStatus:', error);
    return { success: false, message: 'エラーが発生しました: ' + error.toString() };
  }
}

function getMonthlyReportCSV(targetMonth) {
  const applications = getApprovedApplications(targetMonth);
  var summary = {};
  applications.forEach(function (app) {
    var key = app.employeeNumber + '_' + app.employeeName;
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
    summary[key].details.push({ tool: app.tool, amount: app.amount });
  });
  var csv = '社員番号,氏名,拠点,合計金額,明細\n';
  Object.keys(summary).forEach(function (k) {
    var emp = summary[k];
    var details = emp.details.map(function (d) { return d.tool + ':' + d.amount + '円'; }).join(' / ');
    csv += emp.employeeNumber + ',' + emp.employeeName + ',' + emp.location + ',' + emp.totalAmount + ',' + details + '\n';
  });
  return csv;
}

// ===========================================
// スプレッドシート列構成（Next.js 承認用）
// ===========================================
// A〜P: 既存のまま（申請ID〜経理確認）
// P列(16): チェックステータス … 未確認/経理承認済/差し戻し/役員確認待ち/最終承認済
// 以下を追加すると経理・役員の記録が残ります（未追加でも動作します）:
// Q(17): AI自動チェック結果（JSON）, R(18): AI検出フラグ, S(19): 経理チェック担当者,
// T(20): 経理チェック日時, U(21): 経理コメント, V(22): 役員承認者, W(23): 役員承認日時, X(24): 役員コメント
