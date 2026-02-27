/**
 * 業務ツール立替申請 - スプレッドシート 読み書き GAS
 *
 * - doPost: Next.js フォームからの申請データをスプレッドシートに保存（書き込み）
 * - doGet ?action=api&method=getApplications: 申請一覧を JSON で返す（Next.js 承認画面用・読み取り専用）
 * - doGet ?action=api&method=getImageBase64: 領収書画像を Base64 で返す
 * - doGet（上記以外）: テスト用 HTML ページを表示
 *
 * @version 1.1.0
 * @lastUpdated 2025-10-20
 */

// ====================================================================
// 設定
// ====================================================================

const CONFIG = {
  SPREADSHEET_ID: '1VOwrM01j8HdHThLRZlTVx0lv-DR0ODZKR0LahLiBUfQ',
  DRIVE_FOLDER_ID: '17ZoGfgvvHWoCmCfFsfNHl9HcT2870lrc',
  SHEET_NAME: '申請管理'
};

// ====================================================================
// doGet - API とテストページの振り分け
// ====================================================================

function doGet(e) {
  e = e || {};
  var params = e.parameter || {};
  var action = params.action;

  if (action === 'api') {
    var method = params.method;
    if (method === 'getApplications') {
      return apiGetApplications(params.month);
    }
    if (method === 'getImageBase64') {
      return apiGetImageBase64(params.fileId);
    }
    if (method === 'submitCheck') {
      return apiSubmitCheck(params);
    }
    return apiError('Invalid method: ' + (method || ''));
  }

  return doGetTestPage();
}

// ====================================================================
// API: 申請一覧取得（Next.js 承認画面用・読み取り専用）
// ====================================================================

function apiGetApplications(targetMonth) {
  try {
    var apps = getAllApplicationsByMonth(targetMonth);
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: apps }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return apiError(error.toString());
  }
}

/**
 * API: チェック送信（経理承認・役員承認・差し戻しなど）
 * params: applicationId, checkAction, checker, comment(optional)
 */
function apiSubmitCheck(params) {
  try {
    var applicationId = params.applicationId;
    var action = params.checkAction;
    var checker = params.checker;
    var comment = params.comment || '';

    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    var data = sheet.getDataRange().getValues();

    var targetRow = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == applicationId) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) {
      return apiError('Application not found');
    }

    var now = new Date();

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
      case 'cancel_approval':
        var currentStatus = String(sheet.getRange(targetRow, 16).getValue()).trim();
        if (currentStatus !== '最終承認済') {
          return apiError('承認をキャンセルできるのは最終承認済の申請のみです（現在: ' + (currentStatus || '空') + '）');
        }
        sheet.getRange(targetRow, 16).setValue('未確認');
        sheet.getRange(targetRow, 19).setValue('');
        sheet.getRange(targetRow, 20).setValue('');
        sheet.getRange(targetRow, 21).setValue('');
        sheet.getRange(targetRow, 22).setValue('');
        sheet.getRange(targetRow, 23).setValue('');
        sheet.getRange(targetRow, 24).setValue('');
        break;
      default:
        return apiError('Invalid checkAction: ' + (action || ''));
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Check submitted successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return apiError(error.toString());
  }
}

/**
 * 月別の全申請を取得（ヘッダー名で列を解決）
 */
function getAllApplicationsByMonth(targetMonth) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error('シート "' + CONFIG.SHEET_NAME + '" が見つかりません');
  }
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return [];
  }
  var headers = data[0];

  function getHeaderIndex(hdrs, name) {
    var n = (name || '').replace(/\s/g, '');
    for (var i = 0; i < hdrs.length; i++) {
      if ((hdrs[i] || '').replace(/\s/g, '') === n) return i;
    }
    return -1;
  }

  var idx = {
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
    checkStatus: getHeaderIndex(headers, '経理確認')
  };

  var applications = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[idx.id]) continue;

    if (targetMonth) {
      var rawDate = row[idx.date];
      var rowMonth = '';
      if (rawDate instanceof Date) {
        rowMonth = Utilities.formatDate(rawDate, 'JST', 'yyyy-MM');
      } else if (typeof rawDate === 'string') {
        rowMonth = rawDate.trim().replace(/\//g, '-').slice(0, 7);
      } else {
        rowMonth = String(rawDate).trim();
      }
      if (rowMonth !== targetMonth) continue;
    }

    var targetMonthStr = row[idx.date];
    if (targetMonthStr instanceof Date) {
      targetMonthStr = Utilities.formatDate(targetMonthStr, 'JST', 'yyyy-MM');
    } else if (typeof targetMonthStr === 'string') {
      targetMonthStr = targetMonthStr.trim().replace(/\//g, '-').slice(0, 7);
    } else {
      targetMonthStr = String(targetMonthStr || '').trim();
    }

    var app = {
      applicationId: row[idx.id],
      applicationDate: row[idx.appDate] ? Utilities.formatDate(new Date(row[idx.appDate]), 'JST', 'yyyy/MM/dd') : '',
      employeeNumber: idx.number >= 0 ? row[idx.number] : '',
      employeeName: idx.name >= 0 ? row[idx.name] : '',
      location: idx.location >= 0 ? row[idx.location] : '',
      tool: row[idx.tool],
      amount: Number(row[idx.amount]) || 0,
      targetMonth: targetMonthStr,
      purpose: idx.purpose >= 0 ? row[idx.purpose] : '',
      receiptUrl: idx.receipt >= 0 ? (row[idx.receipt] || '') : '',
      creditUrl: idx.credit >= 0 ? (row[idx.credit] || '') : '',
      status: idx.status >= 0 ? row[idx.status] : '申請中',
      checkStatus: idx.checkStatus >= 0 && row[idx.checkStatus] ? row[idx.checkStatus] : '未確認',
      supervisor: ''
    };

    if (row.length > 16) {
      app.aiRiskLevel = row[17] || null;
      app.accountingChecker = row[18] || '';
      app.accountingCheckDate = row[19] ? (row[19] instanceof Date ? Utilities.formatDate(row[19], 'JST', 'yyyy/MM/dd HH:mm') : String(row[19])) : '';
      app.accountingComment = row[20] || '';
      app.executiveApprover = row[21] || '';
      app.executiveApprovalDate = row[22] ? (row[22] instanceof Date ? Utilities.formatDate(row[22], 'JST', 'yyyy/MM/dd HH:mm') : String(row[22])) : '';
      app.executiveComment = row[23] || '';
    }

    applications.push(app);
  }

  applications.sort(function (a, b) {
    return (b.applicationDate || '').localeCompare(a.applicationDate || '');
  });
  return applications;
}

// ====================================================================
// API: 画像を Base64 で取得（領収書表示用）
// ====================================================================

function apiGetImageBase64(fileId) {
  try {
    if (!fileId) {
      return apiError('fileId is required');
    }
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    var base64 = Utilities.base64Encode(blob.getBytes());
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, base64: base64, mimeType: blob.getContentType() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return apiError('Failed to get image: ' + error.toString());
  }
}

function apiError(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ====================================================================
// doPost - 申請データの保存（Next.js フォームから）
// ====================================================================

function doPost(e) {
  try {
    Logger.log('doPost called');
    Logger.log('Request data: ' + e.postData.contents);

    var data = JSON.parse(e.postData.contents);
    var result = saveApplicationData(data);

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'エラーが発生しました: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ====================================================================
// テスト用 HTML ページ（doGet で action=api 以外のとき）
// ====================================================================

function doGetTestPage() {
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head><title>業務ツール立替申請API - テスト</title>' +
    '<style>body{font-family:Arial,sans-serif;max-width:800px;margin:50px auto;padding:20px;}h1{color:#4285f4;}.status{padding:10px;background:#e8f5e9;border-left:4px solid #4caf50;margin:20px 0;}.info{background:#f5f5f5;padding:15px;border-radius:5px;margin:10px 0;}</style></head><body>' +
    '<h1>✅ 業務ツール立替申請API</h1>' +
    '<div class="status"><strong>ステータス:</strong> 正常に動作しています</div>' +
    '<h2>📋 設定情報</h2><div class="info">' +
    '<p><strong>スプレッドシートID:</strong> ' + CONFIG.SPREADSHEET_ID + '</p>' +
    '<p><strong>Google DriveフォルダID:</strong> ' + CONFIG.DRIVE_FOLDER_ID + '</p>' +
    '<p><strong>シート名:</strong> ' + CONFIG.SHEET_NAME + '</p></div>' +
    '<h2>📡 エンドポイント</h2><div class="info">' +
    '<p><strong>POST</strong> … 申請データ保存（フォームから）</p>' +
    '<p><strong>GET ?action=api&amp;method=getApplications&amp;month=yyyy-MM</strong> … 申請一覧（JSON）</p>' +
    '<p><strong>GET ?action=api&amp;method=getImageBase64&amp;fileId=xxx</strong> … 画像取得（JSON）</p></div>' +
    '<p style="color:#666;margin-top:30px;"><small>Version 1.1.0</small></p></body></html>'
  );
}

// ====================================================================
// データ保存処理
// ====================================================================

function saveApplicationData(data) {
  try {
    Logger.log('=== 申請データ保存開始 ===');

    var applicationId = 'APP' + new Date().getTime();
    var applicationDate = new Date();
    Logger.log('申請ID: ' + applicationId);

    var receiptUrl = '';
    if (data.imageData) {
      Logger.log('領収書を保存中...');
      receiptUrl = saveFileToDrive(
        data.imageData,
        data.imageType,
        applicationId + '_' + data.imageName
      );
      Logger.log('領収書URL: ' + receiptUrl);
    } else {
      throw new Error('領収書データが見つかりません');
    }

    var creditUrl = '';
    if (data.creditData) {
      Logger.log('クレカ明細を保存中...');
      creditUrl = saveFileToDrive(
        data.creditData,
        data.creditType,
        applicationId + '_credit_' + data.creditName
      );
    }

    Logger.log('スプレッドシートを開いています...');
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      throw new Error('シート "' + CONFIG.SHEET_NAME + '" が見つかりません');
    }

    Logger.log('データを追加中...');
    sheet.appendRow([
      applicationId,
      applicationDate,
      data.employeeNumber,
      data.employeeName,
      data.location,
      data.tool,
      data.amount,
      data.targetMonth,
      data.purpose,
      receiptUrl,
      creditUrl,
      '申請中',
      '',
      '',
      '',
      '未確認'
    ]);

    Logger.log('✅ 申請データ保存完了');
    return {
      success: true,
      message: '申請を受け付けました',
      applicationId: applicationId
    };
  } catch (error) {
    Logger.log('❌ エラー発生: ' + error.toString());
    throw error;
  }
}

function saveFileToDrive(base64Data, mimeType, fileName) {
  try {
    Logger.log('ファイル保存開始: ' + fileName);
    var base64Content = base64Data.indexOf(',') !== -1 ? base64Data.split(',')[1] : base64Data;
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64Content),
      mimeType,
      fileName
    );
    var folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    var file = folder.createFile(blob);
    var fileUrl = file.getUrl();
    Logger.log('ファイル保存完了: ' + fileUrl);
    return fileUrl;
  } catch (error) {
    Logger.log('ファイル保存エラー: ' + error.toString());
    throw new Error('ファイル保存に失敗しました: ' + error.toString());
  }
}

// ====================================================================
// テスト・デバッグ用
// ====================================================================

function testSaveApplication() {
  Logger.log('=== テスト実行開始 ===');
  var testData = {
    employeeNumber: '001',
    employeeName: 'テスト太郎',
    location: '東京',
    tool: 'ChatGPT',
    amount: 2000,
    targetMonth: '2025-10',
    purpose: 'テスト目的でChatGPTを使用しました。',
    imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    imageType: 'image/png',
    imageName: 'test-receipt.png',
    creditData: null,
    creditType: '',
    creditName: ''
  };
  try {
    var result = saveApplicationData(testData);
    Logger.log('テスト結果: ' + JSON.stringify(result));
    Logger.log('✅ テスト成功');
    return result;
  } catch (error) {
    Logger.log('❌ テスト失敗: ' + error.toString());
    throw error;
  }
}

function checkConfiguration() {
  Logger.log('=== 設定確認 ===');
  try {
    Logger.log('スプレッドシートID: ' + CONFIG.SPREADSHEET_ID);
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    Logger.log('✅ スプレッドシート接続OK: ' + ss.getName());
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (sheet) {
      Logger.log('✅ シート接続OK 最終行: ' + sheet.getLastRow());
    } else {
      Logger.log('❌ シートが見つかりません');
    }
    var folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    Logger.log('✅ Driveフォルダ接続OK: ' + folder.getName());
    Logger.log('=== 設定確認完了 ===');
    return { spreadsheet: ss.getName(), sheet: sheet ? sheet.getName() : 'NOT FOUND', folder: folder.getName(), status: 'OK' };
  } catch (error) {
    Logger.log('❌ 設定確認エラー: ' + error.toString());
    throw error;
  }
}

function createSheetHeaders() {
  Logger.log('=== ヘッダー行作成 ===');
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    }
    var headers = ['申請ID', '申請日', '社員番号', '氏名', '拠点', 'ツール', '料金', '対象年月', '使用用途', '領収書URL', 'クレカ明細URL', '申請ステータス', '承認者', '承認日', '却下理由', '経理確認'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#f3f3f3');
    sheet.autoResizeColumns(1, headers.length);
    Logger.log('✅ ヘッダー行作成完了');
  } catch (error) {
    Logger.log('❌ ヘッダー行作成エラー: ' + error.toString());
    throw error;
  }
}
