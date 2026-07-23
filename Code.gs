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
 * NOTE: "Execute as: User accessing the web app" + domain-restricted access
 * requires Google Workspace. If NourishFest organizers are on plain @gmail
 * accounts, Session.getActiveUser().getEmail() will return an empty string
 * for "Anyone" access, and role checks will always fail closed. In that case,
 * switch getUserEmail() below to read an email passed from the frontend
 * (validated via a shared secret) instead of relying on Session.
 *
 * ARCHITECTURE:
 *   One generic REST-ish layer over named sheet tabs. No per-module endpoints.
 *   GET  ?action=list&sheet=Ideas&Status=New
 *   GET  ?action=get&sheet=Ideas&id=<uuid>
 *   POST { action:'create', sheet:'Ideas', data:{...} }
 *   POST { action:'update', sheet:'Ideas', id:'<uuid>', data:{...} }
 *   POST { action:'delete', sheet:'Ideas', id:'<uuid>' }
 *   GET  ?action=whoami          -> current user email + permissions
 *   GET  ?action=listModules     -> all sheet/module names
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

// Starter rows for the Committee tab, seeded by setupSheets() — from the
// core structure in docs/module/COMMITTEE.md. Name/Team/Phone/Email are left
// blank for organizers to fill in as roles are assigned.
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

// All uploaded documents (vendor quotations, invoices, contracts, permits,
// receipts, etc.) are saved into this single Drive folder so every
// organizer's uploads land in one shared place regardless of whose Google
// account executes the request.
//
// SETUP (one-time, manual):
//   1. Create a Drive folder, e.g. "NourishFest 2026 Documents".
//   2. Share it with Editor access to every organizer email (or to your
//      Workspace domain, "Anyone in [domain] with the link can edit").
//   3. Open the folder, copy the ID from its URL
//      (https://drive.google.com/drive/folders/<THIS_PART>).
//   4. Paste it below.
const DOCUMENTS_FOLDER_ID = 'PASTE_YOUR_DRIVE_FOLDER_ID_HERE';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB — keep uploads well under GAS's execution/payload limits

// ====== AI GENERATION (Gemini) ======
// Owner/Admin only (see AI_MODULE permission checks in handleRequest).
// The API key is NOT stored here in source — set it once via the
// "NourishFest Admin > Set Gemini API Key" menu (see onOpen() below), which
// saves it to this project's Script Properties. Get a key at
// https://aistudio.google.com/apikey
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

    // AI generation is not tied to any sheet — gated on its own 'AI' permission
    // module instead. Grant it via a Permissions row with Module='AI' (or the
    // global Module='*' Admin already has it). Owner/Admin only, per design.
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
    const requiredRole = isWrite ? 'Editor' : 'Viewer';
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

// Frontend sends POST bodies as text/plain (see api.ts) to avoid a CORS
// preflight OPTIONS request, which GAS Web Apps do not handle. We parse it
// as JSON regardless of the declared content type.
function parseBody(e) {
  try {
    if (e && e.postData && e.postData.contents) {
      return JSON.parse(e.postData.contents);
    }
  } catch (err) {
    // not JSON / no body — fine for GET requests
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

// module = '*' in the Permissions sheet grants that role across every sheet.
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
      rows = rows.filter(function (r) { return String(r[key]) === String(params[key]); });
    }
  });
  return rows;
}

function getRowById(sheetName, id) {
  const rows = listRows(sheetName, {});
  const match = rows.find(function (r) { return r.Id === id; });
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
    if (values[i][idIdx] === id) {
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
    if (values[i][idIdx] === id) {
      sheet.deleteRow(i + 1);
      return { deleted: id };
    }
  }
  throw new Error('Row not found: ' + id);
}

// ====== DOCUMENT UPLOAD (Drive) ======

// params.data must include: DocType, Title, FileName, FileBase64, MimeType,
// and optionally ReferenceNo, LinkedModule, LinkedRecordId, Notes.
function uploadDocument(params, email) {
  const data = params.data || {};
  if (!data.FileBase64) throw new Error('Missing FileBase64');
  if (!data.FileName) throw new Error('Missing FileName');

  const bytes = Utilities.base64Decode(data.FileBase64);
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
    throw new Error('DOCUMENTS_FOLDER_ID is not configured — see setup instructions at the top of Code.gs');
  }
  return DriveApp.getFolderById(DOCUMENTS_FOLDER_ID);
}

// ====== AI GENERATION (Gemini) ======

// Adds a menu so the sheet owner can paste the Gemini key without ever
// putting it in source code. Runs automatically when the Sheet is opened.
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

// data: { kind: 'idea'|'theme'|'tagline'|'decoration', prompt: string }
// returns: { suggestions: string[] }
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
    suggestions = [text]; // fall back to raw text if the model didn't return clean JSON
  }
  return { suggestions: suggestions };
}

// data: { kind: 'theme'|'decoration', prompt: string }
// returns: { imageBase64: string, mimeType: string } — NOT saved to Drive yet;
// the frontend previews it and calls uploadDocument() itself if the
// organizer chooses to keep it (see useAIGenerate.ts).
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

function callGemini(url, payload) {
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': getGeminiApiKey() },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const json = JSON.parse(res.getContentText());
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
// Run manually from the Apps Script editor (select this function, click Run)
// against a blank spreadsheet. Re-running wipes and rebuilds headers only —
// it will NOT touch existing data rows in tabs that already exist... actually
// it clears the whole sheet, so only run this once before you start entering data.
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEET_SCHEMAS).forEach(function (name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    sheet.clear();
    sheet.appendRow(SHEET_SCHEMAS[name]);
    sheet.setFrozenRows(1);
  });
  // Seed the person running setup as global Admin so nobody gets locked out.
  const permSheet = ss.getSheetByName('Permissions');
  const myEmail = Session.getActiveUser().getEmail();
  permSheet.appendRow([Utilities.getUuid(), myEmail, '*', 'Admin', 'Setup Admin']);
  // Seed the core committee positions so organizers just fill in who's who.
  const committeeSheet = ss.getSheetByName('Committee');
  COMMITTEE_STARTER_ROLES.forEach(function (r) {
    committeeSheet.appendRow([Utilities.getUuid(), '', r.role, '', '', '', r.responsibilities, r.notes]);
  });
  SpreadsheetApp.getUi().alert('NourishFest sheets initialized. Global Admin: ' + myEmail);
}
