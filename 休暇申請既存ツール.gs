// 休暇申請用スプレッドシートID（申請履歴・従業員マスタ・有給残数）
var LEAVE_SPREADSHEET_ID = '1dqrG85tGQrE0-nBfBf2lBQV8AdbPGlfE4DOpqIO2f7k';

// 有給休暇用 Google カレンダーID（拠点長 or 役員承認時に登録）
var PAID_LEAVE_CALENDAR_ID = 'f16c2df2c9fb337cd15a989ec8b034bc3a25a62563a8d4dd89ab98d42d5a6738@group.calendar.google.com';

// フォーム表示（Webアプリ入口）
function doGet(e) {
    try {
      // actionパラメータで従業員リスト取得APIを呼び出す
      // e.parameterはオブジェクトで、パラメータ名がキーになる
      // 既存のHTMLフォームには影響しない（actionパラメータがない場合は通常通りHTMLフォームを返す）
      const action = e && e.parameter && e.parameter.action;
      
      // action=employeesの場合のみJSONを返す（Next.js API用）
      if (action === 'employees') {
        const employees = getEmployeeList();
        return ContentService.createTextOutput(JSON.stringify(employees))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      // 休暇申請承認API（Next.jsから呼び出し。申請一覧・有給残数一覧の取得）
      if (action === 'leave_approval') {
        const method = e.parameter.method;
        if (method === 'getLeaveApplications') {
          const result = getLeaveApplicationsForApi();
          return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);
        }
        if (method === 'getPaidLeaveList') {
          const result = getPaidLeaveListForApi();
          return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);
        }
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: '不明なmethod: ' + method
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // 既存のHTMLフォーム表示（actionパラメータがない場合、またはactionがemployees以外の場合）
      // この処理は既存の動作を維持する
      return HtmlService.createHtmlOutputFromFile('form')
        .setTitle('休暇申請フォーム')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (error) {
      Logger.log('Error in doGet: ' + error.message);
      // エラー時もactionパラメータで分岐
      if (e && e.parameter && e.parameter.action === 'employees') {
        // API呼び出しの場合はJSON形式でエラーを返す
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: 'エラーが発生しました: ' + error.message,
          employees: []
        })).setMimeType(ContentService.MimeType.JSON);
      }
      if (e && e.parameter && e.parameter.action === 'leave_approval') {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: 'エラーが発生しました: ' + error.message
        })).setMimeType(ContentService.MimeType.JSON);
      }
      // 既存のHTMLフォームの場合はHTML形式でエラーを返す（既存の動作を維持）
      return HtmlService.createHtmlOutput('エラーが発生しました: ' + error.message);
    }
  }

// APIエンドポイント（Next.jsから呼び出し用）
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    // 休暇申請承認の更新（拠点長・役員・労務確認）
    if (data.action === 'leave_approval') {
      const result = updateLeaveApprovalApi(data);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // 既存: 休暇申請フォームの送信
    const result = submitRequest(data);
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: '申請が完了しました',
      requestId: result
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error in doPost: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'エラーが発生しました: ' + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

  
  // フォーム送信時に呼ばれる
  function submitRequest(data) {
    try {
      const sheet = SpreadsheetApp.openById(LEAVE_SPREADSHEET_ID).getSheetByName('申請履歴');
      if (!sheet) {
        throw new Error('申請履歴シートが見つかりません');
      }
      const now = new Date();
      const startDate = data.startDate;
      const endDate = data.endDate || data.startDate;
      const days = calculateDays(startDate, endDate, data.timeSlot);
      const requestId = 'REQ' + Utilities.formatDate(now, "Asia/Tokyo", "yyyyMMdd") + '-' + Math.floor(Math.random() * 1000);
      let attachmentUrl = '';
      if (data.attachment && data.attachmentName) {
        const folderId = '1K4xl1kRByUoBlhEjv9yrUr--J1HhBkkA';
        const folder = DriveApp.getFolderById(folderId);
        const base64Data = data.attachment.split(',')[1];
        const contentType = data.attachment.split(';')[0].replace('data:', '');
        const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, data.attachmentName);
        const file = folder.createFile(blob);
        attachmentUrl = file.getUrl();
      }
      let timeValue = '';
      if (data.requestType === '早退' || data.requestType === '遅刻') {
        timeValue = data.lateLeaveTime || '';
      }
      
      // 特定のユーザーの社員番号を変換（スプレッドシート書き込み用）
      let employeeNumberForSheet = convertEmployeeNumberForSheet(data.employeeNumber);
      
      const jstDateTime = Utilities.formatDate(now, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
      const rowData = [
        jstDateTime,
        employeeNumberForSheet,
        data.employeeName,
        data.requestType,
        startDate,
        endDate,
        days,
        timeValue,
        data.reason,
        attachmentUrl,
        '未承認',
        '未承認',
        '未確認',
        false
      ];
      writeAfterLastDateRow(sheet, rowData);
      sendChatworkMessage(
        data.managerId,
        data.executiveId,
        data.employeeName,
        data.requestType,
        startDate,
        endDate,
        data.reason,
        requestId,
        data.employeeNumber
      );
      return requestId;
    } catch (e) {
      throw new Error('申請保存中にエラーが発生しました: ' + e.message);
    }
  }
  
  // 社員番号を正規化する関数（TGSプレフィックス、先頭0、アンダースコア以降を除去）
  function normalizeEmployeeNumber(employeeNumber) {
    if (!employeeNumber) {
      return '';
    }
    let normalized = String(employeeNumber);
    // 「TGS」で始まる場合は除去
    if (normalized.toUpperCase().startsWith('TGS')) {
      normalized = normalized.substring(3);
    }
    // アンダースコア以降を除去（例: "220_1" → "220"）
    const underscoreIndex = normalized.indexOf('_');
    if (underscoreIndex !== -1) {
      normalized = normalized.substring(0, underscoreIndex);
    }
    // 先頭の0を除去
    normalized = normalized.replace(/^0+/, '') || '0';
    return normalized;
  }
  
  // 社員番号を変換する関数（スプレッドシート書き込み用）
  // 「203」→「201」、「197」→「196」、「198」→「197」、「210」→「209」、「194」→「192」、「220」→「220」に変換
  function convertEmployeeNumberForSheet(employeeNumber) {
    const normalized = normalizeEmployeeNumber(employeeNumber);
    if (normalized === '203') {
      return '201';
    } else if (normalized === '197') {
      return '196';
    } else if (normalized === '198') {
      return '197';
    } else if (normalized === '210') {
      return '209';
    } else if (normalized === '194') {
      return '192';
    } else if (normalized === '220') {
      return '220';
    }
    return employeeNumber;
  }
  
  // 社員番号を変換する関数（有給日数取得・更新用）
  // 「203」→「201」、「197」→「196」、「198」→「197」、「210」→「209」、「194」→「192」、「220」→「220」に変換
  function convertEmployeeNumberForPaidLeave(employeeNumber) {
    const normalized = normalizeEmployeeNumber(employeeNumber);
    if (normalized === '203') {
      return '201';
    } else if (normalized === '197') {
      return '196';
    } else if (normalized === '198') {
      return '197';
    } else if (normalized === '210') {
      return '209';
    } else if (normalized === '194') {
      return '192';
    } else if (normalized === '220') {
      return '220';
    }
    return employeeNumber;
  }
  
  // スプレッドシートから従業員リストを取得
  function getEmployeeList() {
    const sheet = SpreadsheetApp.openById(LEAVE_SPREADSHEET_ID).getSheetByName('従業員マスタ');
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    return data.map(row => ({
      number: row[0],
      name: row[1],
      managerChatworkId: row[2],
      executiveChatworkId: row[3],
      hrChatworkId: row[4],  // 労務担当者のChatwork ID
      paidLeaveDays: row[5]  // 有給残数（日数）
    }));
  }
  
  // 開始日と終了日から休暇日数を計算（0.5日単位）
  function calculateDays(start, end, timeSlot) {
    // 早退と遅刻の場合は日数を0として返す
    if (timeSlot === 'zero') {
      return 0;
    }
  
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
    // 同じ日付の場合
    if (diffDays === 0) {
      if (timeSlot === 'full') {
        return 1.0;
      } else if (timeSlot === 'morning' || timeSlot === 'afternoon') {
        return 0.5;
      }
    }
  
    return diffDays + 1;
  }
  
  // チャットワークにメッセージを送信
  function sendChatworkMessage(managerId, executiveId, employeeName, requestType, startDate, endDate, reason, requestId, employeeNumber) {
    const apiToken = 'ab4a99202e0905c1f62d4e26acf67bd6'; // あなたのChatwork APIトークン
    const roomId = '298327158'; // チャットワークのルームID
  
    // 日付のフォーマット
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return Utilities.formatDate(date, "Asia/Tokyo", "yyyy年MM月dd日");
    };
  
    // 共通メッセージテンプレート（本番の休暇申請承認画面へ誘導）
    const leaveApprovalUrl = 'https://tmg-settlement.vercel.app/leave-approval';
    const messageTemplate = (recipientId) => `[To:${recipientId}] 申請の確認をお願いします\n\n`
      + `【申請者】${employeeName} さん\n`
      + `【申請種類】${requestType}\n`
      + `【申請期間】${formatDate(startDate)} ～ ${formatDate(endDate)}\n`
      + `【申請理由】${reason}\n\n`
      + `※以下のリンクから承認してください。\n`
      + `${leaveApprovalUrl}\n\n`
      + `※このメッセージは自動送信されています。`;
  
    // 通知を送信する関数
    const sendNotification = (recipientId) => {
      if (recipientId) {
        const options = {
          method: 'post',
          headers: {
            'X-ChatWorkToken': apiToken
          },
          payload: {
            body: messageTemplate(recipientId)
          }
        };
        UrlFetchApp.fetch(`https://api.chatwork.com/v2/rooms/${roomId}/messages`, options);
      }
    };
  
    // マネージャー、役員、労務担当者に通知
    sendNotification(managerId);
    sendNotification(executiveId);
    
    // 労務担当者に通知
    const employeeList = getEmployeeList();
    const employee = employeeList.find(emp => emp.number === employeeNumber);
    if (employee && employee.hrChatworkId) {
      sendNotification(employee.hrChatworkId);
    }
  }
  
  // 有給残日数を更新する関数（onEdit用）
  function updatePaidLeaveDaysForTrigger(employeeNumber, days) {
    try {
      // 社員番号を変換（「203」→「201」、「197」→「196」、「198」→「197」、「210」→「209」、「194」→「192」、「220」→「220」）
      const convertedEmployeeNumber = convertEmployeeNumberForPaidLeave(employeeNumber);
      
      // onEditトリガーではgetActiveSpreadsheet()を使用
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('従業員マスタ');
      const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
      // 変換後の社員番号に一致する行を探す
      const rowIndex = data.findIndex(row => row[0] == convertedEmployeeNumber || String(row[0]) === String(convertedEmployeeNumber));
      if (rowIndex === -1) {
        throw new Error('社員が見つかりません');
      }
      // 現在の有給残日数を取得
      const currentDays = data[rowIndex][5];
      if (currentDays === '') {
        throw new Error('有給残日数が設定されていません');
      }
      // 有給残日数が0の場合（マイナス日数での戻し処理は除く）
      if (days > 0 && currentDays <= 0) {
        throw new Error('有給残日数が0です');
      }
      // 申請日数が残日数を超える場合（マイナス日数での戻し処理は除く）
      if (days > 0 && days > currentDays) {
        throw new Error(`申請日数（${days}日）が残日数（${currentDays}日）を超えています`);
      }
      // 新しい有給残日数を計算（小数点以下2桁まで）
      const newDays = Math.max(0, Math.round((currentDays - days) * 100) / 100);
      // 現在の日時を取得（JST）
      const now = new Date();
      const jstDateTime = Utilities.formatDate(now, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
      // 有給残日数と最終更新日を更新
      sheet.getRange(rowIndex + 2, 6).setValue(newDays);
      sheet.getRange(rowIndex + 2, 7).setValue(jstDateTime);
      return newDays;
    } catch (error) {
      Logger.log('有給残日数の更新に失敗しました: ' + error.message);
      throw error;
    }
  }
  
  // トリガーを設定する関数
  function createEditTrigger() {
    // 既存のトリガーを削除
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onEdit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // 新しいトリガーを作成
    ScriptApp.newTrigger('onEdit')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onEdit()
      .create();
  }
  
  // 申請履歴の更新を監視する関数
  function onEdit(e) {
    // シンプルなトリガー（権限なし）で発火した場合は何もしない
    if (!e || !e.authMode || e.authMode === ScriptApp.AuthMode.NONE) return;
    try {
      const sheet = e.source.getActiveSheet();
      if (sheet.getName() !== '申請履歴') return;
      const range = e.range;
      const row = range.getRow();
      const col = range.getColumn();
      // M列（13）またはN列（14）以外の編集なら何もしない
      if (col !== 13 && col !== 14) return;
      // 労務確認列（M列）が更新された場合
      if (col === 13) {
        const data = sheet.getRange(row, 1, 1, 13).getValues()[0];
        const requestType = data[3];  // D列: 申請種別
        const days = data[6];         // G列: 申請日数
        const employeeNumber = data[1]; // B列: 社員番号
        const hrStatus = data[12];    // M列: 労務確認状態
        // 労務確認が「確認済」の場合のみ処理
        if (hrStatus === '確認済') {
          // 有給休暇の場合のみ有給残日数を更新
          // 振替休日、慶弔休暇、欠勤、早退、遅刻は有給残日数を減らさない
          if (requestType === '有給休暇') {
            try {
              updatePaidLeaveDaysForTrigger(employeeNumber, days);
              // 処理済みとしてマーク
              sheet.getRange(row, 13).setValue('処理済');
            } catch (error) {
              // エラーが発生した場合、労務確認を「未確認」に戻す
              sheet.getRange(row, 13).setValue('未確認');
              // エラーメッセージをログに出力（セルには入れない）
              Logger.log('エラー: ' + error.message);
            }
          } else {
            // 有給休暇以外（振替休日、慶弔休暇、欠勤、早退、遅刻）の場合は単純に処理済みにする
            // 振替休日は有給残日数を減らさない
            sheet.getRange(row, 13).setValue('処理済');
          }
        }
      }
      // 取り消し列（N列）が更新された場合
      if (col === 14) {
        const data = sheet.getRange(row, 1, 1, 14).getValues()[0];
        const requestType = data[3];  // D列: 申請種別
        const days = data[6];         // G列: 申請日数
        const employeeNumber = data[1]; // B列: 社員番号
        const isCancelled = data[13];  // N列: 取り消し状態
        // チェックが入った場合（取り消し）
        if (isCancelled === true) {
          // 行全体に打ち消し線を設定
          const rowRange = sheet.getRange(row, 1, 1, 14);
          rowRange.setFontLine('line-through');
          // 有給休暇の場合のみ、有給残日数を戻す
          // 振替休日は有給残日数を減らしていないため、戻す必要もない
          if (requestType === '有給休暇') {
            try {
              // 有給残日数を戻す（マイナスを掛けて加算）
              updatePaidLeaveDaysForTrigger(employeeNumber, -days);
            } catch (error) {
              Logger.log('有給残日数の戻しに失敗しました: ' + error.message);
            }
          }
        } else {
          // チェックが外れた場合、打ち消し線を解除
          const rowRange = sheet.getRange(row, 1, 1, 14);
          rowRange.setFontLine('none');
          // 有給休暇の場合のみ、有給残日数を再度引く
          // 振替休日は有給残日数を減らさない
          if (requestType === '有給休暇') {
            try {
              updatePaidLeaveDaysForTrigger(employeeNumber, days);
            } catch (error) {
              Logger.log('有給残日数の更新に失敗しました: ' + error.message);
            }
          }
        }
      }
    } catch (error) {
      Logger.log('申請履歴の更新処理に失敗しました: ' + error.message);
    }
  }
  
  /**
   * A列（1列目）の最終データ行を「シート最終行」とみなし、
   * その範囲内で E列（開始日）の最後の値の直下に rowData を書き込む。
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {any[]} rowData
   */
  function writeAfterLastDateRow(sheet, rowData) {
    const lastRowByColA = getLastRowByColumn(sheet, 1); // 1列目(A)基準の最終行
  
    // データがヘッダーのみ or 全く無い場合は2行目に書く
    if (lastRowByColA < 2) {
      sheet.getRange(2, 1, 1, rowData.length).setValues([rowData]);
      return;
    }
  
    // A列基準の範囲内でE列（開始日）を走査（2行目から）
    const height = Math.max(lastRowByColA - 1, 0);
    const startDates = sheet.getRange(2, 5, height, 1).getValues();
  
    // E列で最後に値が入っている行番号（見つからない場合はヘッダー行＝1）
    let targetRow = 1;
    for (let i = 0; i < startDates.length; i++) {
      const v = startDates[i][0];
      if (v !== '' && v != null) {
        targetRow = i + 2; // 実際の行番号
      }
    }
  
    // targetRow の次の行に書き込む（最低でも2行目に）
    const writeRow = Math.max(targetRow + 1, 2);
    sheet.getRange(writeRow, 1, 1, rowData.length).setValues([rowData]);
  }
  
  /**
   * 指定列の「最終データ行」（下から見て最初の非空セルの行番号）を返す。
   * データが無ければ 0。
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {number} col 1始まり（A=1）
   * @return {number}
   */
  function getLastRowByColumn(sheet, col) {
    const globalLastRow = sheet.getLastRow();
    if (globalLastRow === 0) return 0;
  
    const values = sheet.getRange(1, col, globalLastRow, 1).getValues();
    for (let i = values.length - 1; i >= 0; i--) {
      const v = values[i][0];
      if (v !== '' && v != null) return i + 1;
    }
    return 0;
  }

  // --- 休暇申請承認API（Next.js用）---
  // 申請履歴一覧を返す
  function getLeaveApplicationsForApi() {
    try {
      const ss = SpreadsheetApp.openById(LEAVE_SPREADSHEET_ID);
      const sheet = ss.getSheetByName('申請履歴');
      if (!sheet) {
        return { success: false, message: '申請履歴シートが見つかりません' };
      }
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return { success: true, data: [] };
      }
      const data = sheet.getRange(2, 1, lastRow, 14).getValues();
      const list = data.map(function (row, i) {
        const sheetRow = i + 2;
        return {
          rowIndex: sheetRow,
          appliedAt: row[0],
          employeeNumber: row[1],
          employeeName: row[2],
          requestType: row[3],
          startDate: row[4],
          endDate: row[5],
          days: row[6],
          timeValue: row[7],
          reason: row[8],
          attachmentUrl: row[9],
          branchManagerStatus: row[10],
          executiveStatus: row[11],
          hrStatus: row[12],
          isCancelled: row[13] === true
        };
      });
      return { success: true, data: list };
    } catch (e) {
      Logger.log('getLeaveApplicationsForApi: ' + e.message);
      return { success: false, message: e.message };
    }
  }

  // 有給残数一覧を返す（従業員マスタ）
  function getPaidLeaveListForApi() {
    try {
      const ss = SpreadsheetApp.openById(LEAVE_SPREADSHEET_ID);
      const sheet = ss.getSheetByName('従業員マスタ');
      if (!sheet) {
        return { success: false, message: '従業員マスタシートが見つかりません' };
      }
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return { success: true, data: [] };
      }
      const data = sheet.getRange(2, 1, lastRow, 7).getValues();
      const list = data.map(function (row) {
        return {
          number: row[0],
          name: row[1],
          paidLeaveDays: row[5],
          lastUpdated: row[6] || null
        };
      });
      return { success: true, data: list };
    } catch (e) {
      Logger.log('getPaidLeaveListForApi: ' + e.message);
      return { success: false, message: e.message };
    }
  }

  // 氏名から姓のみ抽出（スペース区切りで先頭、なければそのまま）
  function getFamilyName(employeeName) {
    if (!employeeName) return '不明';
    var s = String(employeeName).trim();
    var space = s.indexOf(' ');
    if (space > 0) return s.substring(0, space);
    return s;
  }

  // 有給休暇を Google カレンダーに終日イベントで登録（姓 有給 or 姓 有給(半日)）
  function addPaidLeaveToCalendar(employeeName, startDateVal, endDateVal, days) {
    var calendar = CalendarApp.getCalendarById(PAID_LEAVE_CALENDAR_ID);
    if (!calendar) {
      Logger.log('有給カレンダーが見つかりません: ' + PAID_LEAVE_CALENDAR_ID);
      return;
    }
    var familyName = getFamilyName(employeeName);
    var title = (days !== Math.floor(days))
      ? familyName + ' 有給(半日)'
      : familyName + ' 有給';
    var start = new Date(startDateVal);
    var end = new Date(endDateVal);
    end.setDate(end.getDate() + 1);
    calendar.createAllDayEvent(title, start, end);
  }

  // 有給休暇を Google カレンダーから削除（姓 有給 or 姓 有給(半日) のタイトルで検索）
  function removePaidLeaveFromCalendar(employeeName, startDateVal, endDateVal, days) {
    var calendar = CalendarApp.getCalendarById(PAID_LEAVE_CALENDAR_ID);
    if (!calendar) {
      Logger.log('有給カレンダーが見つかりません: ' + PAID_LEAVE_CALENDAR_ID);
      return;
    }
    var familyName = getFamilyName(employeeName);
    var title = (days !== Math.floor(days))
      ? familyName + ' 有給(半日)'
      : familyName + ' 有給';
    var start = new Date(startDateVal);
    var end = new Date(endDateVal);
    end.setDate(end.getDate() + 1);
    var events = calendar.getEvents(start, end);
    for (var i = 0; i < events.length; i++) {
      if (events[i].getTitle() === title) {
        events[i].deleteEvent();
        break;
      }
    }
  }

  // 拠点長・役員・労務の承認状態を更新。労務「確認済」の場合は有給減算と処理済みまで実行。cancelled で取り消し。cancel_approval で最終承認済を元に戻す。
  function updateLeaveApprovalApi(data) {
    var rowIndex = data.rowIndex;
    var column = data.column; // 'branch_manager' | 'executive' | 'hr' | 'cancelled'
    var value = data.value;
    if (rowIndex == null || !column || value == null) {
      return { success: false, message: 'rowIndex, column, value が必要です' };
    }
    try {
      const ss = SpreadsheetApp.openById(LEAVE_SPREADSHEET_ID);
      const sheet = ss.getSheetByName('申請履歴');
      if (!sheet) {
        return { success: false, message: '申請履歴シートが見つかりません' };
      }
      if (String(column) === 'cancelled' && (value === true || value === 'true')) {
        var rowData = sheet.getRange(rowIndex, 1, rowIndex, 14).getValues()[0];
        var requestType = rowData[3];
        var days = rowData[6];
        var employeeNumber = rowData[1];
        sheet.getRange(rowIndex, 14).setValue(true);
        var rowRange = sheet.getRange(rowIndex, 1, rowIndex, 14);
        rowRange.setFontLine('line-through');
        if (requestType === '有給休暇') {
          try {
            updatePaidLeaveDaysBySpreadsheetId(ss, employeeNumber, -days);
          } catch (err) {
            Logger.log('有給戻しエラー: ' + err.message);
          }
        }
        return { success: true, message: '取り消しました' };
      }
      // 最終承認済の申請を「承認をキャンセル」で元に戻す
      if (String(column) === 'cancel_approval' && (value === true || value === 'true')) {
        var rowDataCancel = sheet.getRange(rowIndex, 1, rowIndex, 15).getValues()[0];
        var requestTypeCancel = rowDataCancel[3];
        var daysCancel = rowDataCancel[6];
        var employeeNumberCancel = rowDataCancel[1];
        var employeeNameCancel = rowDataCancel[2];
        var startDateCancel = rowDataCancel[4];
        var endDateCancel = rowDataCancel[5];
        var hrStatusCancel = rowDataCancel[12];   // M列: 労務確認
        var alreadyAddedCancel = rowDataCancel[14]; // O列: カレンダー登録済
        // 拠点長・役員・労務を未承認・未確認に戻す
        sheet.getRange(rowIndex, 11).setValue('未承認');
        sheet.getRange(rowIndex, 12).setValue('未承認');
        sheet.getRange(rowIndex, 13).setValue('未確認');
        if (requestTypeCancel === '有給休暇') {
          if (hrStatusCancel === '処理済') {
            try {
              updatePaidLeaveDaysBySpreadsheetId(ss, employeeNumberCancel, -daysCancel);
            } catch (err) {
              Logger.log('承認キャンセル時の有給戻しエラー: ' + err.message);
            }
          }
          if (alreadyAddedCancel === '済') {
            try {
              removePaidLeaveFromCalendar(employeeNameCancel, startDateCancel, endDateCancel, daysCancel);
            } catch (err) {
              Logger.log('カレンダー削除エラー: ' + err.message);
            }
            sheet.getRange(rowIndex, 15).setValue('');
          }
        }
        return { success: true, message: '承認をキャンセルし、申請を元に戻しました' };
      }
      var colNum = 0;
      if (column === 'branch_manager') colNum = 11;
      else if (column === 'executive') colNum = 12;
      else if (column === 'hr') colNum = 13;
      else return { success: false, message: '不正なcolumn: ' + column };
      sheet.getRange(rowIndex, colNum).setValue(value);
      if (column === 'branch_manager' && value === '承認') {
        var rowDataCal = sheet.getRange(rowIndex, 1, rowIndex, 15).getValues()[0];
        var requestTypeCal = rowDataCal[3];
        var employeeNameCal = rowDataCal[2];
        var startDateCal = rowDataCal[4];
        var endDateCal = rowDataCal[5];
        var daysCal = rowDataCal[6];
        var alreadyAdded = rowDataCal[14];
        if (requestTypeCal === '有給休暇' && !alreadyAdded) {
          try {
            addPaidLeaveToCalendar(employeeNameCal, startDateCal, endDateCal, daysCal);
            sheet.getRange(rowIndex, 15).setValue('済');
          } catch (err) {
            Logger.log('カレンダー登録エラー: ' + err.message);
          }
        }
      }
      if (column === 'hr' && value === '確認済') {
        var rowDataHr = sheet.getRange(rowIndex, 1, rowIndex, 13).getValues()[0];
        var requestTypeHr = rowDataHr[3];
        var daysHr = rowDataHr[6];
        var employeeNumberHr = rowDataHr[1];
        if (requestTypeHr === '有給休暇') {
          try {
            updatePaidLeaveDaysBySpreadsheetId(ss, employeeNumberHr, daysHr);
            sheet.getRange(rowIndex, 13).setValue('処理済');
          } catch (err) {
            Logger.log('有給更新エラー: ' + err.message);
            sheet.getRange(rowIndex, 13).setValue('未確認');
            return { success: false, message: err.message };
          }
        } else {
          sheet.getRange(rowIndex, 13).setValue('処理済');
        }
      }
      return { success: true, message: '更新しました' };
    } catch (e) {
      Logger.log('updateLeaveApprovalApi: ' + e.message);
      return { success: false, message: e.message };
    }
  }

  // 指定スプレッドシートで有給残日数を更新（API用。onEditではgetActiveSpreadsheetを使用）
  function updatePaidLeaveDaysBySpreadsheetId(ss, employeeNumber, days) {
    var converted = convertEmployeeNumberForPaidLeave(employeeNumber);
    var sheet = ss.getSheetByName('従業員マスタ');
    var data = sheet.getRange(2, 1, sheet.getLastRow(), 7).getValues();
    var rowIndex = data.findIndex(function (row) {
      return row[0] == converted || String(row[0]) === String(converted);
    });
    if (rowIndex === -1) throw new Error('社員が見つかりません');
    var currentDays = data[rowIndex][5];
    if (currentDays === '') throw new Error('有給残日数が設定されていません');
    if (days > 0 && currentDays <= 0) throw new Error('有給残日数が0です');
    if (days > 0 && days > currentDays) {
      throw new Error('申請日数（' + days + '日）が残日数（' + currentDays + '日）を超えています');
    }
    var newDays = Math.max(0, Math.round((currentDays - days) * 100) / 100);
    var now = new Date();
    var jstDateTime = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
    sheet.getRange(rowIndex + 2, 6).setValue(newDays);
    sheet.getRange(rowIndex + 2, 7).setValue(jstDateTime);
    return newDays;
  }
