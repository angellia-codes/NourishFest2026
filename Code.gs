/**
 * ============================================================================
 * NourishFest 2026 — Backend API (Google Apps Script)
 * ============================================================================
 *
 * DEPLOYMENT (Apps Script editor > Deploy > New deployment):
 *   Type:            Web app
 *   Execute as:      User accessing the web app   <-- required for role checks
 *   Who has access:  Anyone within [your Workspace domain]
 *
 * ARCHITECTURE:
 *   One generic REST-ish layer over named sheet tabs. No per-module endpoints.
 *   GET  ?action=list&sheet=Ideas&Status=New
 *   GET  ?action=get&sheet=Ideas&id=<uuid>
 *   POST { action:'create', sheet:'Ideas', data:{...} }
 *   POST { action:'update', sheet:'Ideas', id:'<uuid>', data:{...} }
 *   POST { action:'delete', sheet:'Ideas', id:'<uuid>' }
 *   GET  ?action=whoami        -> current user email + permissions
 *   GET  ?action=listModules   -> all sheet/module names
 *
 * Run setupSheets() once manually from the editor to initialize all tabs.
 * ============================================================================
 */

// ====== SHEET SCHEMA (tab name -> header row, in order) ======

const SHEET_SCHEMAS = {
  Permissions:       ['Id', 'Email', 'Module', 'Role', 'Name'],
  Ideas:             ['Id', 'Title', 'Description', 'SubmittedBy', 'Category', 'Votes', 'Status', 'CreatedAt', 'UpdatedAt'],
  Committee:         ['Id', 'Name', 'Role', 'Team', 'Phone', 'Email', 'Responsibilities', 'Notes'],
  Budget:            ['Id', 'Phase', 'EventName', 'Module', 'ItemName', 'Category', 'EstimatedCost', 'ActualCost', 'ApprovalStatus', 'Vendor', 'PIC', 'Notes', 'CreatedAt', 'UpdatedAt'],
  Proposal:          ['Id', 'Type', 'Title', 'Description', 'Price', 'Benefits', 'DisplayOrder'],
  Checklist:         ['Id', 'Phase', 'Module', 'Task', 'Assignee', 'Deadline', 'Priority', 'Status', 'Notes', 'CreatedAt', 'UpdatedAt'],
  EventInfo:         ['Id', 'Field', 'Value', 'Notes'],
  Venue:             ['Id', 'Name', 'Address', 'Capacity', 'Status', 'Cost', 'PIC', 'Notes'],
  Roster:            ['Id', 'Module', 'Name', 'Category', 'PIC', 'Vendor', 'EstimatedCost', 'ActualCost', 'Status', 'Notes', 'CreatedAt', 'UpdatedAt'],
  Rundown:           ['Id', 'TimeStart', 'TimeEnd', 'Segment', 'PIC', 'Location', 'Notes', 'Order'],
  NourishGotTalent:  ['Id', 'ParticipantName', 'Outlet', 'Category', 'PerformanceOrder', 'Score', 'JudgeNotes', 'Status'],
  ParticipantDetail: ['Id', 'Name', 'Outlet', 'RoleCategory', 'Contact', 'RSVPStatus', 'Attendance', 'Notes'],
  Documents:         ['Id', 'DocType', 'Title', 'ReferenceNo', 'LinkedModule', 'LinkedRecordId', 'FileUrl', 'FileId', 'FileName', 'UploadedBy', 'UploadedAt', 'Notes'],
};

const COMMITTEE_STARTER_ROLES = [
  { role: 'Chairperson', responsibilities: 'Final decision-making, stakeholder alignment, and overall team leadership.', notes: 'Oversees the entire event and leads the organizing team.' },
  { role: 'Vice Chairperson', responsibilities: 'Cross-functional coordination, milestone tracking, and dispute resolution.', notes: 'Assists the Chairperson and acts as backup when needed.' },
  { role: 'Secretary', responsibilities: 'Meeting minutes, permit applications, scheduling, and official correspondence.', notes: 'Handles all administrative tasks & documentation.' },
  { role: 'Treasurer', responsibilities: 'Budget tracking, vendor payments, receipt management, and financial audits.', notes: 'Manages the event budget, expenses, and financial reporting.' },
  { role: 'Program Coordinator', responsibilities: 'Run-of-show execution, speaker/performer management, and activity timing.', notes: 'Plans the event rundown, manages MC, games, and entertainment.' },
  { role: 'F&B Coordinator', responsibilities: 'Menu curation, managing dietary requirements, and ensuring strict food safety compliance.', notes: 'Organizes food and beverage for guests and the committee.' },
  { role: 'Logistics, Decoration & Merch Coordinator', responsibilities: 'Venue setup, A/V equipment coordination, stage design, and swag bag distribution.', notes: 'Prepares equipment, decor, merchandise, and technical needs.' },
  { role: 'Security Coordinator', responsibilities: 'Access control, emergency response planning, and on-site health protocols.', notes: 'Ensures safety, crowd control, and risk management.' },
  { role: 'Documentation Coordinator', responsibilities: 'Graphic design (banners, digital assets), event photography, and videography.', notes: 'Designs merch & backdrop. Captures Photos & Videos.' },
  { role: 'Sponsorship Coordinator', responsibilities: 'Pitching proposal packages, sponsor relationship management, and contract negotiation.', notes: 'Secures sponsorship from vendors and suppliers.' },
];

const DOCUMENTS_FOLDER_ID = '1IcC-SVyb1u6SHA9B3r_nDWCON7yIjEnh';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB limit

// ====== AI GENERATION (Gemini) ======
const AI_MODULE = 'AI';
const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

const ROLE_RANK = { Viewer: 1, Editor: 2, Admin: 3 };
const WRITE_ACTIONS = ['create', 'update', 'delete', 'uploadDocument'];

// ====== ENTRY POINTS ======

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const body = parseBody(e);
    const params = Object.assign({}, e.parameter, body);
    const action = params.action;
    const sheetName = params.sheet;
    const email = getUserEmail();

    if (!action) return jsonOut({ success: false, error: 'Missing action' });

    if (action === 'whoami') {
      return jsonOut({ success: true, data: { email: email, permissions: getPermissionsForUser(email) } });
    }
    if (action === 'listModules') {
      return jsonOut({ success: true, data: Object.keys(SHEET_SCHEMAS) });
    }

    if (action === 'aiGenerateText') {
      if (!hasPermission(email, AI_MODULE, 'Admin')) {
        return jsonOut({ success: false, error: 'Forbidden: AI generation requires Admin' });
      }
      return jsonOut({ success: true, data: aiGenerateText(params.data || {}) });
    }
    if (action === 'aiGenerateImage') {
      if (!hasPermission(email, AI_MODULE, 'Admin')) {
        return jsonOut({ success: false, error: 'Forbidden: AI generation requires Admin' });
      }
      return jsonOut({ success: true, data: aiGenerateImage(params.data || {}) });
    }

    if (!sheetName || !SHEET_SCHEMAS[sheetName]) {
      return jsonOut({ success: false, error: 'Unknown sheet: ' + sheetName });
    }

    const isWrite = WRITE_ACTIONS.indexOf(action) !== -1;
    let requiredRole = isWrite ? 'Editor' : 'Viewer';

    // FIX 3: Privilege Escalation Safeguard
    // Prevent Editors from editing the Permissions tab to grant themselves Admin rights.
    if (sheetName === 'Permissions' && isWrite) {
      requiredRole = 'Admin';
    }

    if (!hasPermission(email, sheetName, requiredRole)) {
      return jsonOut({ success: false, error: 'Forbidden: ' + email + ' needs ' + requiredRole + ' on ' + sheetName });
    }

    switch (action) {
      case 'list':
        return jsonOut({ success: true, data: listRows(sheetName, params) });
      case 'get':
        return jsonOut({ success: true, data: getRowById(sheetName, params.id) });
      case 'create':
        return withLock(function () {
          return jsonOut({ success: true, data: createRow(sheetName, params.data || {}) });
        });
      case 'update':
        return withLock(function () {
          return jsonOut({ success: true, data: updateRow(sheetName, params.id, params.data || {}) });
        });
      case 'delete':
        return withLock(function () {
          return jsonOut({ success: true, data: deleteRow(sheetName, params.id) });
        });
      case 'uploadDocument':
        return withLock(function () {
          return jsonOut({ success: true, data: uploadDocument(params, email) });
        });
      default:
        return jsonOut({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonOut({ success: false, error: err.message });
  }
}

// FIX 4: Explicit JSON handling (fail quickly with clear error if bad JSON is posted)
function parseBody(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      throw new Error('Invalid JSON payload sent in request body.');
    }
  }
  return {};
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ====== AUTH & PERMISSIONS ======

function getUserEmail() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch (err) {
    return '';
  }
}

function getPermissionsForUser(email) {
  if (!email) return [];
  const values = getSheet('Permissions').getDataRange().getValues();
  const headers = values[0];
  const emailIdx = headers.indexOf('Email');
  const moduleIdx = headers.indexOf('Module');
  const roleIdx = headers.indexOf('Role');
  return values.slice(1)
    .filter(function (r) { return String(r[emailIdx]).toLowerCase() === email.toLowerCase(); })
    .map(function (r) { return { module: r[moduleIdx], role: r[roleIdx] }; });
}

function hasPermission(email, moduleName, minRole) {
  if (!email) return false;
  const perms = getPermissionsForUser(email);
  const minRank = ROLE_RANK[minRole] || 99;
  return perms.some(function (p) {
    return (p.module === moduleName || p.module === '*') && (ROLE_RANK[p.role] || 0) >= minRank;
  });
}

// ====== GENERIC SHEET CRUD ======

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function rowsToObjects(values) {
  const headers = values[0];
  return values.slice(1)
    .filter(function (r) { return r.some(function (cell) { return cell !== '' && cell !== null; }); })
    .map(function (r) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = r[i]; });
      return obj;
    });
}

function listRows(sheetName, params) {
  const values = getSheet(sheetName).getDataRange().getValues();
  let rows = rowsToObjects(values);
  const reserved = ['action', 'sheet', 'id', 'data'];
  Object.keys(params).forEach(function (key) {
    if (reserved.indexOf(key) === -1 && params[key] !== '' && params[key] !== undefined) {
      rows = rows.filter(function (r) { return String(r[key]).toLowerCase() === String(params[key]).toLowerCase(); });
    }
  });
  return rows;
}

function getRowById(sheetName, id) {
  const rows = listRows(sheetName, {});
  const match = rows.find(function (r) { return String(r.Id) === String(id); });
  return match || null;
}

function createRow(sheetName, data) {
  const sheet = getSheet(sheetName);
  const headers = SHEET_SCHEMAS[sheetName];
  const id = Utilities.getUuid();
  const now = new Date().toISOString();
  const record = Object.assign({}, data, { Id: id });
  if (headers.indexOf('CreatedAt') !== -1) record.CreatedAt = now;
  if (headers.indexOf('UpdatedAt') !== -1) record.UpdatedAt = now;
  const row = headers.map(function (h) { return record[h] !== undefined ? record[h] : ''; });
  sheet.appendRow(row);
  return record;
}

function updateRow(sheetName, id, data) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIdx = headers.indexOf('Id');
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) === String(id)) {
      const current = rowsToObjects([headers, values[i]])[0];
      const updated = Object.assign({}, current, data);
      if (headers.indexOf('UpdatedAt') !== -1) updated.UpdatedAt = new Date().toISOString();
      const row = headers.map(function (h) { return updated[h] !== undefined ? updated[h] : ''; });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      return updated;
    }
  }
  throw new Error('Row not found: ' + id);
}

function deleteRow(sheetName, id) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const idIdx = values[0].indexOf('Id');
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { deleted: id };
    }
  }
  throw new Error('Row not found: ' + id);
}

// ====== DOCUMENT UPLOAD (Drive) ======

function uploadDocument(params, email) {
  const data = params.data || {};
  if (!data.FileBase64) throw new Error('Missing FileBase64');
  if (!data.FileName) throw new Error('Missing FileName');

  // FIX 2: Data URI prefix stripping prior to decoding
  let rawB64 = data.FileBase64;
  if (rawB64.indexOf(',') !== -1) {
    rawB64 = rawB64.split(',')[1];
  }

  const bytes = Utilities.base64Decode(rawB64);
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new Error('File too large (max ' + (MAX_UPLOAD_BYTES / (1024 * 1024)) + 'MB)');
  }

  const blob = Utilities.newBlob(bytes, data.MimeType || 'application/pdf', data.FileName);
  const folder = getDocumentsFolder();
  const file = folder.createFile(blob);

  const record = createRow('Documents', {
    DocType: data.DocType || 'Other',
    Title: data.Title || data.FileName,
    ReferenceNo: data.ReferenceNo || '',
    LinkedModule: data.LinkedModule || '',
    LinkedRecordId: data.LinkedRecordId || '',
    FileUrl: file.getUrl(),
    FileId: file.getId(),
    FileName: data.FileName,
    UploadedBy: email,
    Notes: data.Notes || '',
  });

  return record;
}

function getDocumentsFolder() {
  if (!DOCUMENTS_FOLDER_ID || DOCUMENTS_FOLDER_ID === 'PASTE_YOUR_DRIVE_FOLDER_ID_HERE') {
    throw new Error('DOCUMENTS_FOLDER_ID is not configured — see setup instructions at top of Code.gs');
  }
  return DriveApp.getFolderById(DOCUMENTS_FOLDER_ID);
}

// ====== AI GENERATION (Gemini) ======

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('NourishFest Admin')
    .addItem('Set Gemini API Key', 'promptForGeminiApiKey')
    .addToUi();
}

function promptForGeminiApiKey() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt(
    'Gemini API Key',
    'Paste your Gemini API key (create one at https://aistudio.google.com/apikey):',
    ui.ButtonSet.OK_CANCEL,
  );
  if (result.getSelectedButton() === ui.Button.OK) {
    const key = result.getResponseText().trim();
    if (key) {
      PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key);
      ui.alert('Gemini API key saved.');
    }
  }
}

function getGeminiApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) {
    throw new Error('Gemini API key not set. In the Sheet, use menu "NourishFest Admin > Set Gemini API Key".');
  }
  return key;
}

function aiGenerateText(data) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_TEXT_MODEL + ':generateContent';
  const payload = {
    contents: [{ role: 'user', parts: [{ text: buildTextPrompt(data.kind, data.prompt) }] }],
    generationConfig: {
      temperature: 0.9,
      responseMimeType: 'application/json',
      responseSchema: { type: 'ARRAY', items: { type: 'STRING' } },
    },
  };
  const json = callGemini(url, payload);
  const text = (json.candidates[0].content.parts || []).map(function (p) { return p.text || ''; }).join('');
  let suggestions;
  try {
    suggestions = JSON.parse(text);
  } catch (err) {
    suggestions = [text];
  }
  return { suggestions: suggestions };
}

function aiGenerateImage(data) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_IMAGE_MODEL + ':generateContent';
  const payload = {
    contents: [{ role: 'user', parts: [{ text: buildImagePrompt(data.kind, data.prompt) }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  };
  const json = callGemini(url, payload);
  const parts = json.candidates[0].content.parts || [];
  const imagePart = parts.find(function (p) { return p.inlineData; });
  if (!imagePart) throw new Error('Gemini did not return an image for this prompt — try rephrasing it.');
  return { imageBase64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
}

// FIX 5: HTTP status and non-JSON error handling for external API calls
function callGemini(url, payload) {
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': getGeminiApiKey() },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const statusCode = res.getResponseCode();
  const rawText = res.getContentText();

  if (statusCode >= 400) {
    throw new Error('Gemini API HTTP Error ' + statusCode + ': ' + rawText);
  }

  let json;
  try {
    json = JSON.parse(rawText);
  } catch (err) {
    throw new Error('Failed to parse Gemini response: ' + rawText);
  }

  if (json.error) throw new Error('Gemini error: ' + json.error.message);
  if (!json.candidates || !json.candidates.length) throw new Error('Gemini returned no candidates (possibly blocked by safety filters).');

  return json;
}

function buildTextPrompt(kind, userPrompt) {
  const context = userPrompt
    ? 'Context/keywords from the organizer: "' + userPrompt + '"'
    : 'No specific keywords given — offer fresh, on-brand options.';
  const base =
    'You are helping plan NourishFest 2026, an internal company festival for Nourish Group Indonesia ' +
    '(an F&B/hospitality company). ' + context + ' ' +
    'Return exactly 5 short, distinct suggestions as a JSON array of strings — no numbering, no markdown, no explanations.';
  switch (kind) {
    case 'theme':
      return base + ' Each item is a catchy EVENT THEME name, 3-6 words, vibrant and festival-appropriate.';
    case 'tagline':
      return base + ' Each item is a short TAGLINE, max 8 words, that could sit under the event theme.';
    case 'idea':
      return base + ' Each item is a one-sentence ACTIVITY OR PROGRAM IDEA for the festival (games, performances, booths, etc.).';
    case 'decoration':
      return base + ' Each item is a short DECORATION CONCEPT, max 12 words, describing a visual theme, prop, or setup idea.';
    default:
      return base;
  }
}

function buildImagePrompt(kind, userPrompt) {
  const brand =
    'Vibrant tropical night-market festival aesthetic — warm mango, hot pink/guava, and deep ink tones. ' +
    'For NourishFest 2026, an internal F&B company festival.';
  const subject = userPrompt || 'a festive concept image';
  if (kind === 'theme') {
    return 'Create a mood/concept image capturing this event theme direction: ' + subject + '. ' + brand + ' No text or logos in the image.';
  }
  if (kind === 'decoration') {
    return 'Create a decoration/set-design concept image: ' + subject + '. ' + brand + ' Show it as a physical event decoration setup, no text or logos in the image.';
  }
  return subject + '. ' + brand;
}

// ====== RESPONSE HELPER ======

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ====== ONE-TIME SETUP ======

// FIX 1: Non-destructive initialization. Existing tabs and row data are preserved.
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(SHEET_SCHEMAS).forEach(function (name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(SHEET_SCHEMAS[name]);
      sheet.setFrozenRows(1);
    }
  });

  // Seed the person running setup as global Admin if not already set
  const permSheet = ss.getSheetByName('Permissions');
  const myEmail = Session.getActiveUser().getEmail();
  
  if (permSheet.getLastRow() <= 1) {
    permSheet.appendRow([Utilities.getUuid(), myEmail, '*', 'Admin', 'Setup Admin']);
  }

  // Seed starter committee roles only if the sheet is completely empty
  const committeeSheet = ss.getSheetByName('Committee');
  if (committeeSheet.getLastRow() <= 1) {
    COMMITTEE_STARTER_ROLES.forEach(function (r) {
      committeeSheet.appendRow([Utilities.getUuid(), '', r.role, '', '', '', r.responsibilities, r.notes]);
    });
  }

  SpreadsheetApp.getUi().alert('NourishFest sheets initialized safely. Global Admin: ' + myEmail);
}

// Run THIS function from the dropdown to test your Gemini integration
function testGeminiAPI() {
  try {
    const data = {
      kind: 'theme',
      prompt: 'neon cyberpunk food market'
    };
    
    Logger.log('Sending request to Gemini...');
    const result = aiGenerateText(data);
    
    Logger.log('SUCCESS! Gemini returned:');
    Logger.log(JSON.stringify(result, null, 2));
  } catch (err) {
    Logger.log('ERROR: ' + err.message);
  }
}

// Run THIS function from the dropdown to test your Gemini Image integration
function testGeminiImageAPI() {
  try {
    const data = {
      kind: 'decoration',
      prompt: 'neon tropical entrance arch'
    };
    
    Logger.log('Sending image generation request to Gemini (this may take 10-20 seconds)...');
    const result = aiGenerateImage(data);
    
    Logger.log('SUCCESS! Gemini generated an image.');
    Logger.log('Format: ' + result.mimeType);
    Logger.log('Base64 Data Length: ' + result.imageBase64.length + ' characters');
    Logger.log('Base64 Preview: ' + result.imageBase64.substring(0, 50) + '...');
    
  } catch (err) {
    Logger.log('ERROR: ' + err.message);
  }
}