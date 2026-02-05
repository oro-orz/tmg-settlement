/**
 * 業務ツール立替申請 - スプレッドシート書き込み専用GAS
 * 
 * @description Next.jsフォームからのデータをスプレッドシートに保存
 * @version 1.0.0
 * @author TMG開発チーム
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
// メイン関数
// ====================================================================

/**
 * POSTリクエスト受信
 * 
 * @param {Object} e - イベントオブジェクト
 * @returns {ContentService.TextOutput} JSON形式のレスポンス
 */
function doPost(e) {
  try {
    Logger.log('doPost called');
    Logger.log('Request data: ' + e.postData.contents);
    
    const data = JSON.parse(e.postData.contents);
    const result = saveApplicationData(data);
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'エラーが発生しました: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GETリクエスト受信（テスト用）
 * 
 * @returns {HtmlService.HtmlOutput} テスト画面
 */
function doGet() {
  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>業務ツール立替申請API - テスト</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
        }
        h1 { color: #4285f4; }
        .status { 
          padding: 10px; 
          background: #e8f5e9; 
          border-left: 4px solid #4caf50;
          margin: 20px 0;
        }
        .info {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <h1>✅ 業務ツール立替申請API</h1>
      <div class="status">
        <strong>ステータス:</strong> 正常に動作しています
      </div>
      
      <h2>📋 設定情報</h2>
      <div class="info">
        <p><strong>スプレッドシートID:</strong> ${CONFIG.SPREADSHEET_ID}</p>
        <p><strong>Google DriveフォルダID:</strong> ${CONFIG.DRIVE_FOLDER_ID}</p>
        <p><strong>シート名:</strong> ${CONFIG.SHEET_NAME}</p>
      </div>
      
      <h2>📡 エンドポイント</h2>
      <div class="info">
        <p><strong>メソッド:</strong> POST</p>
        <p><strong>Content-Type:</strong> application/json</p>
        <p><strong>説明:</strong> このURLにPOSTリクエストを送信してください</p>
      </div>
      
      <h2>📝 リクエストボディ例</h2>
      <pre style="background: #263238; color: #aed581; padding: 15px; border-radius: 5px; overflow-x: auto;">
{
  "employeeNumber": "001",
  "employeeName": "山田太郎",
  "location": "東京",
  "tool": "ChatGPT",
  "amount": 2000,
  "targetMonth": "2025-10",
  "purpose": "動画編集用のスクリプト作成に使用...",
  "imageData": "data:image/png;base64,...",
  "imageType": "image/png",
  "imageName": "receipt.png",
  "creditData": null,
  "creditType": "",
  "creditName": ""
}
      </pre>
      
      <p style="color: #666; margin-top: 30px;">
        <small>Version 1.0.0 | Last Updated: 2025-10-20</small>
      </p>
    </body>
    </html>
  `);
}

// ====================================================================
// データ保存処理
// ====================================================================

/**
 * 申請データをスプレッドシートに保存
 * 
 * @param {Object} data - 申請データ
 * @param {string} data.employeeNumber - 社員番号
 * @param {string} data.employeeName - 氏名
 * @param {string} data.location - 拠点
 * @param {string} data.tool - ツール名
 * @param {number} data.amount - 料金
 * @param {string} data.targetMonth - 対象年月（yyyy-MM形式）
 * @param {string} data.purpose - 使用用途
 * @param {string} data.imageData - 領収書画像（Base64）
 * @param {string} data.imageType - 画像MIMEタイプ
 * @param {string} data.imageName - 画像ファイル名
 * @param {string|null} data.creditData - クレカ明細（Base64、任意）
 * @param {string} data.creditType - クレカ明細MIMEタイプ
 * @param {string} data.creditName - クレカ明細ファイル名
 * @returns {Object} 実行結果
 */
function saveApplicationData(data) {
  try {
    Logger.log('=== 申請データ保存開始 ===');
    
    // 1. 申請IDを生成
    const applicationId = 'APP' + new Date().getTime();
    const applicationDate = new Date();
    
    Logger.log('申請ID: ' + applicationId);
    Logger.log('申請日: ' + applicationDate.toISOString());
    
    // 2. 領収書をDriveに保存
    let receiptUrl = '';
    if (data.imageData) {
      Logger.log('領収書を保存中...');
      receiptUrl = saveFileToDrive(
        data.imageData,
        data.imageType,
        `${applicationId}_${data.imageName}`
      );
      Logger.log('領収書URL: ' + receiptUrl);
    } else {
      throw new Error('領収書データが見つかりません');
    }
    
    // 3. クレカ明細をDriveに保存（任意）
    let creditUrl = '';
    if (data.creditData) {
      Logger.log('クレカ明細を保存中...');
      creditUrl = saveFileToDrive(
        data.creditData,
        data.creditType,
        `${applicationId}_credit_${data.creditName}`
      );
      Logger.log('クレカ明細URL: ' + creditUrl);
    }
    
    // 4. スプレッドシートを開く
    Logger.log('スプレッドシートを開いています...');
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      throw new Error(`シート "${CONFIG.SHEET_NAME}" が見つかりません`);
    }
    
    // 5. データを1行追加
    Logger.log('データを追加中...');
    sheet.appendRow([
      applicationId,              // A: 申請ID
      applicationDate,            // B: 申請日
      data.employeeNumber,        // C: 社員番号
      data.employeeName,          // D: 氏名
      data.location,              // E: 拠点
      data.tool,                  // F: ツール
      data.amount,                // G: 料金
      data.targetMonth,           // H: 対象年月
      data.purpose,               // I: 使用用途
      receiptUrl,                 // J: 領収書URL
      creditUrl,                  // K: クレカ明細URL
      '申請中',                   // L: 申請ステータス
      '',                         // M: 承認者
      '',                         // N: 承認日
      '',                         // O: 却下理由
      '未確認'                    // P: 経理確認
    ]);
    
    Logger.log('✅ 申請データ保存完了');
    Logger.log('=== 処理終了 ===');
    
    return {
      success: true,
      message: '申請を受け付けました',
      applicationId: applicationId
    };
    
  } catch (error) {
    Logger.log('❌ エラー発生: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    throw error;
  }
}

// ====================================================================
// ファイル保存処理
// ====================================================================

/**
 * ファイルをGoogle Driveに保存
 * 
 * @param {string} base64Data - Base64エンコードされたデータ（data URL形式）
 * @param {string} mimeType - ファイルのMIMEタイプ
 * @param {string} fileName - 保存するファイル名
 * @returns {string} 保存されたファイルのURL
 */
function saveFileToDrive(base64Data, mimeType, fileName) {
  try {
    Logger.log('ファイル保存開始: ' + fileName);
    
    // 1. Base64のdata URL部分を削除
    const base64Content = base64Data.includes(',') 
      ? base64Data.split(',')[1] 
      : base64Data;
    
    // 2. Blobに変換
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Content),
      mimeType,
      fileName
    );
    
    Logger.log('Blob作成完了: ' + blob.getBytes().length + ' bytes');
    
    // 3. Driveフォルダに保存
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    const file = folder.createFile(blob);
    
    const fileUrl = file.getUrl();
    Logger.log('ファイル保存完了: ' + fileUrl);
    
    return fileUrl;
    
  } catch (error) {
    Logger.log('ファイル保存エラー: ' + error.toString());
    throw new Error('ファイル保存に失敗しました: ' + error.toString());
  }
}

// ====================================================================
// テスト・デバッグ用関数
// ====================================================================

/**
 * テスト用関数 - 手動実行してスプレッドシートへの書き込みをテスト
 */
function testSaveApplication() {
  Logger.log('=== テスト実行開始 ===');
  
  // テストデータ（1x1pxの透明PNG画像）
  const testData = {
    employeeNumber: '001',
    employeeName: 'テスト太郎',
    location: '東京',
    tool: 'ChatGPT',
    amount: 2000,
    targetMonth: '2025-10',
    purpose: 'テスト目的でChatGPTを使用しました。動画編集用のスクリプト作成に活用し、作業効率が大幅に向上しました。',
    imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    imageType: 'image/png',
    imageName: 'test-receipt.png',
    creditData: null,
    creditType: '',
    creditName: ''
  };
  
  try {
    const result = saveApplicationData(testData);
    Logger.log('テスト結果: ' + JSON.stringify(result));
    Logger.log('✅ テスト成功');
    return result;
  } catch (error) {
    Logger.log('❌ テスト失敗: ' + error.toString());
    throw error;
  }
}

/**
 * 設定確認用関数
 */
function checkConfiguration() {
  Logger.log('=== 設定確認 ===');
  
  try {
    // 1. スプレッドシート確認
    Logger.log('スプレッドシートID: ' + CONFIG.SPREADSHEET_ID);
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    Logger.log('✅ スプレッドシート接続OK: ' + ss.getName());
    
    // 2. シート確認
    Logger.log('シート名: ' + CONFIG.SHEET_NAME);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (sheet) {
      Logger.log('✅ シート接続OK');
      Logger.log('  - 最終行: ' + sheet.getLastRow());
      Logger.log('  - 最終列: ' + sheet.getLastColumn());
    } else {
      Logger.log('❌ シートが見つかりません');
    }
    
    // 3. Driveフォルダ確認
    Logger.log('DriveフォルダID: ' + CONFIG.DRIVE_FOLDER_ID);
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    Logger.log('✅ Driveフォルダ接続OK: ' + folder.getName());
    
    Logger.log('=== 設定確認完了 ===');
    
    return {
      spreadsheet: ss.getName(),
      sheet: sheet ? sheet.getName() : 'NOT FOUND',
      folder: folder.getName(),
      status: 'OK'
    };
    
  } catch (error) {
    Logger.log('❌ 設定確認エラー: ' + error.toString());
    throw error;
  }
}

/**
 * スプレッドシートのヘッダー行を作成（初回のみ実行）
 */
function createSheetHeaders() {
  Logger.log('=== ヘッダー行作成 ===');
  
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    // シートが存在しない場合は作成
    if (!sheet) {
      Logger.log('シートを新規作成: ' + CONFIG.SHEET_NAME);
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    }
    
    // ヘッダー行を設定
    const headers = [
      '申請ID',
      '申請日',
      '社員番号',
      '氏名',
      '拠点',
      'ツール',
      '料金',
      '対象年月',
      '使用用途',
      '領収書URL',
      'クレカ明細URL',
      '申請ステータス',
      '承認者',
      '承認日',
      '却下理由',
      '経理確認'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#f3f3f3');
    
    // 列幅を自動調整
    sheet.autoResizeColumns(1, headers.length);
    
    Logger.log('✅ ヘッダー行作成完了');
    
  } catch (error) {
    Logger.log('❌ ヘッダー行作成エラー: ' + error.toString());
    throw error;
  }
}

