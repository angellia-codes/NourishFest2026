/**
 * ============================================================
 * NourishFest 2026 — Backend (Google Apps Script Web App)
 * ============================================================
 * SETUP
 * 1. Bind this script to your NourishFest 2026 Google Sheet
 *    (Extensions > Apps Script from inside the Sheet).
 * 2. Select `setupSheets` in the function dropdown and click Run. Creates
 *    every SCHEMA tab that doesn't already exist (never touches one that
 *    does), seeds default `Roles`, and adds you as a Chairperson `Committee`
 *    row so you have Admin access from the first request. Safe to re-run.
 *    If you're updating an existing Sheet whose tabs already existed before
 *    a SCHEMA change (new columns added to an entity), also run
 *    `migrateAddColumns_` once — setupSheets() only creates missing tabs,
 *    it never backfills columns onto ones that already exist.
 * 3. Set DRIVE_FOLDER_ID below to a Drive folder you own.
 * 4. Set a Gemini API key for the Ideas AI-suggestions box: Project Settings
 *    > Script Properties > add GEMINI_API_KEY = <your key> (create one at
 *    https://aistudio.google.com/apikey). Skip this if you don't need AI
 *    generation — every other feature works without it.
 * 5. Deploy > New deployment > Web app
 *      Execute as: Me
 *      Who has access: Anyone within [your Workspace domain]
 * 6. Every code change needs a new deployment version
 *    (Manage deployments > Edit > New version) to go live.
 *
 * FRONTEND CONTRACT
 * GET  ?action=me
 * GET  ?action=list&entity=Events[&eventId=...]
 * GET  ?action=dashboard
 * GET  ?action=financeDashboard
 * POST body (JSON): { action: 'create'|'update'|'delete'|'uploadFile'|'aiGenerate',
 *                      entity, id, data }
 *
 * CORS NOTE: Apps Script Web Apps don't reliably handle OPTIONS
 * preflight. Send POST requests from the frontend with
 * Content-Type: text/plain;charset=utf-8 (NOT application/json) —
 * this avoids the preflight entirely. The body is still parsed
 * here as JSON regardless of the declared content type.
 * ============================================================
 */

// ---------- CONFIG ----------

const DRIVE_FOLDER_ID = '14SvD4c1Q2AxZ79p2CUmz_XM29nxxf9LA';
const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';

// entity -> ordered column headers. CONVENTION: column [0] is always
// the unique ID field the generic CRUD helpers key off of.
const SCHEMA = {
  Events: ['EventID', 'EventType', 'Month', 'EventName', 'CategoryOrTheme', 'Category', 'Purpose', 'Tagline', 'Date', 'Location', 'Status', 'SourceIdeaID'],
  Ideas: ['IdeaID', 'Scope', 'Title', 'Description', 'Category', 'Theme', 'Tagline', 'SubmittedBy', 'Status', 'DateSubmitted'],
  Committee: ['MemberID', 'Name', 'Email', 'Department', 'Role', 'Responsibility', 'Status'],
  Roles: ['RoleName', 'DefaultResponsibility', 'PermissionTier', 'Notes'],
  BudgetBreakdown: ['BudgetID', 'EventID', 'ItemName', 'CategoryExpense', 'EstimationCost', 'Description', 'VendorName', 'VendorPhone', 'QuotationFileLink', 'ApprovalStatus', 'ActualCost', 'Variance', 'InvoiceFileLink', 'PaymentStatus', 'SourceModule', 'SourceRecordID'],
  Participants: ['EventID', 'EstimationParticipant', 'ActualParticipant', 'AttendanceFormRef'], // EventID doubles as ID: 1 row per event
  Checklist: ['TaskID', 'EventID', 'ToDo', 'Assignee', 'DueDate', 'Status', 'Remark'],
  VenueComparison: ['VenueID', 'EventID', 'VenueName', 'Location', 'ContactName', 'ContactPhone', 'Quantity', 'Unit', 'Price', 'TotalEstimationCost', 'EstimationCost', 'LayoutImageLink', 'BenefitsInclude', 'BenefitsExclude', 'ApprovalStatus'],
  DecorationComparison: ['DecorID', 'EventID', 'DecorationName', 'Vendor', 'ContactName', 'ContactPhone', 'Quantity', 'Unit', 'Price', 'TotalEstimationCost', 'EstimationCost', 'DesignImageLink', 'BenefitsInclude', 'BenefitsExclude', 'ApprovalStatus'],
  SouvenirComparison: ['SouvenirID', 'EventID', 'ItemName', 'VendorName', 'ContactName', 'ContactPhone', 'Quantity', 'Unit', 'Price', 'TotalEstimationCost', 'EstimationCost', 'DesignImageLink', 'BenefitsInclude', 'BenefitsExclude', 'ApprovalStatus'],
  Entertainment: ['EntertainmentID', 'EventID', 'Activity', 'Description', 'ContactName', 'ContactPhone', 'Quantity', 'Unit', 'Price', 'TotalEstimationCost', 'EstimationCost', 'ApprovalStatus'],
  Awards: ['AwardID', 'EventID', 'Category', 'Description', 'Prize', 'Value', 'EstimationCost', 'ApprovalStatus'],
  DoorPrize: ['DoorPrizeID', 'EventID', 'Item', 'Category', 'DetailSpec', 'ImageLink', 'Quantity', 'Unit', 'Price', 'TotalEstimationCost', 'EstimationCost', 'ApprovalStatus'],
  Rundown: ['RundownID', 'EventID', 'Description', 'TimeStart', 'TimeFinish', 'CommitteeInCharge', 'Remark'],
  Finance_Incoming: ['IncomingID', 'Type', 'SupplierName', 'SupplierCategory', 'LetterFileLink', 'PaymentType', 'NonCashItemName', 'AmountIDR', 'DateReceived', 'ReceiptFileLink', 'Description'],
  NourishGotTalent: ['TalentID', 'EventID', 'Category', 'Prize', 'Value', 'ApprovalStatus'],
};

// entity -> { Admin, Advisor, Member } access level:
// 'write' | 'read' | 'none' | 'special' (special = custom logic below)
const PERMISSIONS = {
  Events: { Admin: 'write', Advisor: 'read', Member: 'read' },
  Ideas: { Admin: 'write', Advisor: 'read', Member: 'special' },
  Committee: { Admin: 'write', Advisor: 'read', Member: 'read' },
  Roles: { Admin: 'write', Advisor: 'read', Member: 'read' },
  BudgetBreakdown: { Admin: 'write', Advisor: 'read', Member: 'read' },
  Participants: { Admin: 'write', Advisor: 'read', Member: 'read' },
  Checklist: { Admin: 'write', Advisor: 'read', Member: 'special' },
  VenueComparison: { Admin: 'write', Advisor: 'read', Member: 'read' },
  DecorationComparison: { Admin: 'write', Advisor: 'read', Member: 'read' },
  SouvenirComparison: { Admin: 'write', Advisor: 'read', Member: 'read' },
  Entertainment: { Admin: 'write', Advisor: 'read', Member: 'read' },
  Awards: { Admin: 'write', Advisor: 'read', Member: 'read' },
  DoorPrize: { Admin: 'write', Advisor: 'read', Member: 'read' },
  Rundown: { Admin: 'write', Advisor: 'read', Member: 'read' },
  Finance_Incoming: { Admin: 'write', Advisor: 'read', Member: 'none' },
  NourishGotTalent: { Admin: 'write', Advisor: 'read', Member: 'read' },
};

const ADMIN_ROLES = ['Chairperson', 'Vice Chairperson', 'Treasurer', 'Secretary'];

// ---------- SETUP ----------

// Seed rows for the `Roles` lookup tab — RoleName, DefaultResponsibility,
// PermissionTier (informational only; the real Admin/Advisor/Member check
// is ADMIN_ROLES / 'Advisor' above, not this column), Notes.
const DEFAULT_ROLES = [
  ['Chairperson', 'Overall event leadership and final sign-off', 'Admin', 'Derives Admin via ADMIN_ROLES'],
  ['Vice Chairperson', 'Deputizes for the Chairperson', 'Admin', 'Derives Admin via ADMIN_ROLES'],
  ['Treasurer', 'Owns Budget and Finance', 'Admin', 'Derives Admin via ADMIN_ROLES'],
  ['Secretary', 'Owns Committee records and documentation', 'Admin', 'Derives Admin via ADMIN_ROLES'],
  ['Advisor', 'Read-only oversight across all modules', 'Advisor', "Derives Advisor via getCurrentUser_()'s exact-match check"],
  ['Program Coordinator', 'Runs pre-event program planning', 'Member', ''],
  ['F&B Coordinator', 'Food & beverage sourcing and vendors', 'Member', ''],
  ['Logistics/Decoration/Merch Coordinator', 'Venue logistics, decoration, and souvenirs', 'Member', ''],
  ['Security Coordinator', 'Security and safety planning', 'Member', ''],
  ['Documentation Coordinator', 'Photos, video, and event records', 'Member', ''],
  ['Sponsorship Coordinator', 'Sponsor outreach and fulfillment', 'Member', ''],
];

/**
 * Run once, manually, from the Apps Script editor's function dropdown after
 * binding this script to the Sheet. Creates every SCHEMA tab that doesn't
 * already exist (header row only — never touches a tab that's already
 * there, so re-running later is harmless), seeds `Roles` if empty, and adds
 * the user running this as a Chairperson `Committee` row so there's an
 * Admin from the very first request.
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.keys(SCHEMA).forEach(function (entity) {
    if (ss.getSheetByName(entity)) return;
    const sheet = ss.insertSheet(entity);
    sheet.getRange(1, 1, 1, SCHEMA[entity].length).setValues([SCHEMA[entity]]);
    sheet.setFrozenRows(1);
  });

  seedRoles_();
  SpreadsheetApp.flush();
  seedSelfAsAdmin_();
}

function seedRoles_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Roles');
  if (sheet.getLastRow() > 1) return; // already seeded — don't duplicate
  DEFAULT_ROLES.forEach(function (row) { sheet.appendRow(row); });
}

/**
 * Run once, manually, from the Apps Script editor after adding new columns to
 * SCHEMA for an entity whose sheet tab already exists — setupSheets() only
 * creates tabs that don't exist yet, it never backfills columns onto one
 * that's already there. writeRow_/updateRow_ write values positionally in
 * SCHEMA[entity]'s declared order, so new columns must be inserted at their
 * exact SCHEMA position (not just appended at the end) or every write
 * misaligns with the sheet's actual header row. Existing headers are assumed
 * to be a subsequence of SCHEMA[entity] in the same relative order (columns
 * are only ever added here, never reordered/renamed) — walk both in
 * lockstep, inserting a blank column wherever SCHEMA has a header the sheet
 * doesn't have yet. insertColumnBefore() shifts existing data (and
 * not-yet-matched headers) right, keeping every old column aligned with its
 * original header.
 */
function migrateAddColumns_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (entity) {
    const sheet = ss.getSheetByName(entity);
    if (!sheet) return; // net-new entity — setupSheets() will create it instead
    const lastCol = sheet.getLastColumn();
    let remaining = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

    SCHEMA[entity].forEach(function (header, i) {
      const col = i + 1;
      if (remaining[0] === header) {
        remaining = remaining.slice(1);
        return;
      }
      sheet.insertColumnBefore(col);
      sheet.getRange(1, col).setValue(header);
    });
  });
}

function seedSelfAsAdmin_() {
  const email = Session.getActiveUser().getEmail();
  if (!email) return; // can't detect the running user outside a Workspace-domain deployment

  const already = readSheet_('Committee').some(function (m) {
    return String(m.Email).toLowerCase() === email.toLowerCase();
  });
  if (already) return;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Committee');
  sheet.appendRow([
    generateId_('MEM'),
    email.split('@')[0],
    email,
    'Committee',
    'Chairperson',
    lookupResponsibility_('Chairperson'),
    'Active',
  ]);
}

// ---------- ENTRY POINTS ----------

function doGet(e) {
  try {
    const action = e.parameter.action;
    const user = getCurrentUser_();

    if (action === 'me') return jsonOut_({ ok: true, data: user });
    if (action === 'list') return jsonOut_({ ok: true, data: listEntity_(e.parameter.entity, user, e.parameter) });
    if (action === 'dashboard') return jsonOut_({ ok: true, data: getDashboard_(user) });
    if (action === 'financeDashboard') return jsonOut_({ ok: true, data: getFinanceDashboard_(user) });

    return jsonOut_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const user = getCurrentUser_();
    const action = body.action, entity = body.entity, id = body.id, data = body.data;

    let result;
    switch (action) {
      case 'create': result = createRecord_(entity, data, user); break;
      case 'update': result = updateRecord_(entity, id, data, user); break;
      case 'delete': result = deleteRecord_(entity, id, user); break;
      case 'uploadFile': result = uploadFile_(data); break;
      case 'aiGenerate': result = aiGenerate_(data, user); break;
      default: throw new Error('Unknown action: ' + action);
    }
    return jsonOut_({ ok: true, data: result });
  } catch (err) {
    return jsonOut_({ ok: false, error: err.message });
  }
}

// ---------- AUTH / PERMISSIONS ----------

function getCurrentUser_() {
  const email = Session.getActiveUser().getEmail();
  if (!email) return { email: '', name: '', role: '', permission: 'none' };

  const committee = readSheet_('Committee');
  const member = committee.find(function (m) {
    return String(m.Email).toLowerCase() === email.toLowerCase() && m.Status === 'Active';
  });

  if (!member) return { email: email, name: '', role: '', permission: 'none' };

  const permission = ADMIN_ROLES.indexOf(member.Role) !== -1 ? 'Admin'
    : member.Role === 'Advisor' ? 'Advisor'
    : 'Member';

  return { email: email, name: member.Name, role: member.Role, permission: permission, memberId: member.MemberID };
}

// needWrite=false -> just check the entity isn't fully blocked (read check)
// needWrite=true  -> must be 'write' or 'special' (special = custom rules apply downstream)
function checkAccess_(entity, user, needWrite) {
  const rule = PERMISSIONS[entity];
  if (!rule) throw new Error('Unknown entity: ' + entity);
  const level = rule[user.permission] || 'none';
  if (level === 'none') throw new Error('Access denied to ' + entity);
  if (needWrite && level !== 'write' && level !== 'special') throw new Error('Read-only access to ' + entity);
  return level;
}

// ---------- GENERIC SHEET CRUD ----------

function getSheet_(entity) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(entity);
  if (!sheet) throw new Error('Sheet not found: ' + entity);
  return sheet;
}

function readSheet_(entity) {
  const sheet = getSheet_(entity);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    })
    .filter(function (obj) {
      return Object.keys(obj).some(function (k) { return obj[k] !== '' && obj[k] !== null; });
    });
}

function writeRow_(entity, rowObj) {
  const sheet = getSheet_(entity);
  const headers = SCHEMA[entity];
  const row = headers.map(function (h) { return rowObj[h] !== undefined ? rowObj[h] : ''; });
  sheet.appendRow(row);
}

function findRowIndex_(entity, id) {
  const idField = SCHEMA[entity][0];
  const sheet = getSheet_(entity);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf(idField);
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(id)) return r + 1; // 1-indexed sheet row
  }
  return -1;
}

function updateRow_(entity, id, patch) {
  const headers = SCHEMA[entity];
  const sheet = getSheet_(entity);
  const rowIndex = findRowIndex_(entity, id);
  if (rowIndex === -1) throw new Error(entity + ' not found: ' + id);

  const current = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const currentObj = {};
  headers.forEach(function (h, i) { currentObj[h] = current[i]; });
  const merged = Object.assign({}, currentObj, patch);
  const newRow = headers.map(function (h) { return merged[h] !== undefined ? merged[h] : ''; });
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([newRow]);
  return merged;
}

function deleteRow_(entity, id) {
  const rowIndex = findRowIndex_(entity, id);
  if (rowIndex === -1) throw new Error(entity + ' not found: ' + id);
  getSheet_(entity).deleteRow(rowIndex);
  return { deleted: id };
}

function generateId_(prefix) {
  return prefix + '-' + Utilities.getUuid().split('-')[0];
}

// ---------- ENTITY OPERATIONS ----------

function listEntity_(entity, user, params) {
  checkAccess_(entity, user, false);
  let rows = readSheet_(entity);
  if (params.eventId) {
    rows = rows.filter(function (r) { return String(r.EventID) === String(params.eventId); });
  }
  return rows;
}

function createRecord_(entity, data, user) {
  const level = checkAccess_(entity, user, true);

  if (entity === 'Ideas') return createIdea_(data, user); // special: submission-cap enforcement
  if (level !== 'write') throw new Error('Not permitted to create ' + entity);

  const idField = SCHEMA[entity][0];
  data[idField] = data[idField] || generateId_(entity.substring(0, 3).toUpperCase());

  if (entity === 'Committee') data.Responsibility = lookupResponsibility_(data.Role);
  if (entity === 'BudgetBreakdown') data.Variance = computeVariance_(data);
  if (QTY_PRICE_ENTITIES.indexOf(entity) !== -1) data.TotalEstimationCost = computeTotalEstimationCost_(data);

  writeRow_(entity, data);
  return data;
}

function updateRecord_(entity, id, data, user) {
  const level = checkAccess_(entity, user, true);

  if (entity === 'Checklist' && level === 'special') {
    return updateOwnChecklistTask_(id, data, user);
  }
  if (level !== 'write') throw new Error('Not permitted to update ' + entity);

  if (entity === 'Committee' && data.Role) data.Responsibility = lookupResponsibility_(data.Role);
  if (entity === 'BudgetBreakdown') {
    const current = readSheet_('BudgetBreakdown').find(function (r) { return String(r.BudgetID) === String(id); });
    const merged = Object.assign({}, current, data);
    data.Variance = computeVariance_(merged);
  }
  if (QTY_PRICE_ENTITIES.indexOf(entity) !== -1) {
    const idField = SCHEMA[entity][0];
    const current = readSheet_(entity).find(function (r) { return String(r[idField]) === String(id); });
    const merged = Object.assign({}, current, data);
    data.TotalEstimationCost = computeTotalEstimationCost_(merged);
  }

  return updateRow_(entity, id, data);
}

function deleteRecord_(entity, id, user) {
  const level = checkAccess_(entity, user, true);
  if (level !== 'write') throw new Error('Not permitted to delete ' + entity);
  return deleteRow_(entity, id);
}

// ---------- BUSINESS LOGIC ----------

function computeVariance_(row) {
  const est = Number(row.EstimationCost) || 0;
  const act = Number(row.ActualCost) || 0;
  return (row.ApprovalStatus === 'Approved' && row.ActualCost !== '' && row.ActualCost !== undefined)
    ? act - est
    : '';
}

// Entities with a Quantity/Price -> TotalEstimationCost auto-calculation.
const QTY_PRICE_ENTITIES = ['DoorPrize', 'SouvenirComparison', 'VenueComparison', 'DecorationComparison', 'Entertainment'];

function computeTotalEstimationCost_(row) {
  return (Number(row.Quantity) || 0) * (Number(row.Price) || 0);
}

// ---------- AI GENERATION (Gemini) ----------

function getGeminiApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('Gemini API key not set. Set GEMINI_API_KEY in Project Settings > Script Properties.');
  return key;
}

// No backing sheet entity for AI generation, so there's no checkAccess_()
// call here — gate directly on the user's permission tier instead.
function aiGenerate_(data, user) {
  if (user.permission !== 'Admin') throw new Error('AI generation is Admin-only');

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_TEXT_MODEL + ':generateContent';
  const payload = {
    contents: [{ role: 'user', parts: [{ text: buildTextPrompt_(data.kind, data.prompt) }] }],
    generationConfig: {
      temperature: 0.9,
      responseMimeType: 'application/json',
      responseSchema: { type: 'ARRAY', items: { type: 'STRING' } },
    },
  };
  const json = callGemini_(url, payload);
  const text = (json.candidates[0].content.parts || []).map(function (p) { return p.text || ''; }).join('');
  let suggestions;
  try {
    suggestions = JSON.parse(text);
  } catch (err) {
    suggestions = [text];
  }
  return { suggestions: suggestions };
}

function callGemini_(url, payload) {
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': getGeminiApiKey() },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const statusCode = res.getResponseCode();
  const rawText = res.getContentText();

  if (statusCode >= 400) throw new Error('Gemini API HTTP Error ' + statusCode + ': ' + rawText);

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

function buildTextPrompt_(kind, userPrompt) {
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
    default:
      return base;
  }
}

function lookupResponsibility_(role) {
  const roles = readSheet_('Roles');
  const match = roles.find(function (r) { return r.RoleName === role; });
  return match ? match.DefaultResponsibility : '';
}

// Ideas.Scope convention: 'PreEvent-Aug' | 'PreEvent-Sep' | 'PreEvent-Oct' | 'PreEvent-Nov' | 'MainEvent'
// Enforces: 1 idea submission per user per Scope (per PRD Section 6.1).
function createIdea_(data, user) {
  const ideas = readSheet_('Ideas');
  const scope = data.Scope;
  const already = ideas.some(function (i) { return i.SubmittedBy === user.email && i.Scope === scope; });
  if (already) throw new Error('You already submitted an idea for ' + scope + ' this cycle.');

  data.IdeaID = generateId_('IDEA');
  data.SubmittedBy = user.email;
  data.Status = data.Status || 'New';
  data.DateSubmitted = new Date().toISOString();
  writeRow_('Ideas', data);
  return data;
}

// Members can only touch Status/Remark, and only on tasks assigned to them.
function updateOwnChecklistTask_(taskId, data, user) {
  const task = readSheet_('Checklist').find(function (t) { return t.TaskID === taskId; });
  if (!task) throw new Error('Task not found');
  if (task.Assignee !== user.email) throw new Error('You can only update your own assigned tasks');
  const allowed = { Status: data.Status, Remark: data.Remark };
  return updateRow_('Checklist', taskId, allowed);
}

// ---------- DASHBOARDS ----------

function getDashboard_(user) {
  const events = readSheet_('Events');
  const checklist = readSheet_('Checklist');
  const today = new Date();

  const overdue = checklist.filter(function (t) {
    return t.Status !== 'Done' && t.DueDate && new Date(t.DueDate) < today;
  }).length;

  const upcomingPreEvents = events
    .filter(function (ev) { return ev.EventType === 'PreEvent' && ev.Date && new Date(ev.Date) >= today; })
    .sort(function (a, b) { return new Date(a.Date) - new Date(b.Date); });

  const mainEvent = events.find(function (ev) { return ev.EventType === 'MainEvent'; });

  return {
    daysToNextPreEvent: upcomingPreEvents[0] ? daysBetween_(today, new Date(upcomingPreEvents[0].Date)) : null,
    daysToMainEvent: (mainEvent && mainEvent.Date) ? daysBetween_(today, new Date(mainEvent.Date)) : null,
    overdueChecklistCount: overdue,
  };
}

function getFinanceDashboard_(user) {
  checkAccess_('Finance_Incoming', user, false); // throws for Member — Finance is 'none'

  const incoming = readSheet_('Finance_Incoming');
  const budget = readSheet_('BudgetBreakdown');
  const now = new Date();
  const isThisMonth = function (d) {
    const dt = new Date(d);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  };

  const mtdIncoming = incoming
    .filter(function (i) { return i.DateReceived && isThisMonth(i.DateReceived); })
    .reduce(function (sum, i) { return sum + (Number(i.AmountIDR) || 0); }, 0);

  const mtdExpenses = budget
    .filter(function (b) { return b.PaymentStatus === 'Paid'; })
    .reduce(function (sum, b) { return sum + (Number(b.ActualCost) || 0); }, 0);

  const variance = mtdIncoming - mtdExpenses;
  const pctVariance = mtdIncoming ? (variance / mtdIncoming) * 100 : 0;

  return { mtdIncoming: mtdIncoming, mtdExpenses: mtdExpenses, variance: variance, pctVariance: pctVariance };
}

function daysBetween_(a, b) {
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}

// ---------- FILE UPLOAD (Drive) ----------

// data: { base64, filename, mimeType } — used for quotations, invoices,
// layout/design images, sponsorship letters, receipts, door-prize photos.
function uploadFile_(data) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const bytes = Utilities.base64Decode(data.base64);
  const blob = Utilities.newBlob(bytes, data.mimeType, data.filename);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { url: file.getUrl(), id: file.getId() };
}

// ---------- OUTPUT ----------

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}