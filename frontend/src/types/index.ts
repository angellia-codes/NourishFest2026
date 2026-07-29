// NourishFest 2026 — shared TypeScript models
// Mirrors supabase/schema.sql exactly. Field names match the Postgres column
// names 1:1 so objects can be sent straight to the API without remapping —
// which is why those columns are quoted PascalCase rather than snake_case.

export type PermissionTier = 'Admin' | 'Advisor' | 'Member' | 'none';
export type AccessLevel = 'write' | 'read' | 'none' | 'special';

export interface CurrentUser {
  email: string;
  name: string;
  role: string; // raw Committee.Role value, '' if no match
  permission: PermissionTier;
  memberId?: string;
}

// ---------- Events ----------

export type EventTypeValue = 'PreEvent' | 'MainEvent';

export type EventCategory =
  | '🍽️ Culinary & F&B Core'
  | '🏃 Health & Active Lifestyle'
  | '📚 Professional Development & Education'
  | '🌍 Community & CSR'
  | '🎉 Entertainment & Networking';

export const EVENT_CATEGORIES: EventCategory[] = [
  '🍽️ Culinary & F&B Core',
  '🏃 Health & Active Lifestyle',
  '📚 Professional Development & Education',
  '🌍 Community & CSR',
  '🎉 Entertainment & Networking',
];

export interface Event {
  EventID: string;
  EventType: EventTypeValue;
  Month: string;
  EventName: string;
  CategoryOrTheme: string;
  Category: EventCategory | '';
  Purpose: string;
  Tagline: string;
  Date: string;
  Location: string;
  Status: string;
  SourceIdeaID: string;
  PhotoLinks: string[]; // public URLs in the attachments bucket
}

// ---------- Ideas ----------

export type IdeaScope = 'PreEvent-Aug' | 'PreEvent-Sep' | 'PreEvent-Oct' | 'PreEvent-Nov' | 'MainEvent';

export const IDEA_SCOPES: { value: IdeaScope; label: string }[] = [
  { value: 'PreEvent-Aug', label: 'Pre-Event · August' },
  { value: 'PreEvent-Sep', label: 'Pre-Event · September' },
  { value: 'PreEvent-Oct', label: 'Pre-Event · October' },
  { value: 'PreEvent-Nov', label: 'Pre-Event · November' },
  { value: 'MainEvent', label: 'Main Event' },
];

export type IdeaStatus = 'New' | 'Under Review' | 'Approved' | 'Rejected' | 'Implemented';

export interface Idea {
  IdeaID: string;
  Scope: IdeaScope;
  Title: string;
  Description: string;
  Category: EventCategory | '';
  Theme: string;
  Tagline: string;
  SubmittedBy: string; // server-set
  Status: IdeaStatus; // server-set, default 'New'
  DateSubmitted: string; // server-set
}

// ---------- Committee ----------

export interface Committee {
  MemberID: string;
  Name: string;
  Email: string;
  Department: string;
  Role: string;
  Responsibility: string; // server-derived from Roles lookup whenever Role is set — read-only in forms
  Status: string;
}

export interface RoleDef {
  RoleName: string;
  DefaultResponsibility: string;
  PermissionTier: string;
  Notes: string;
}

// ---------- Budget ----------

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';
export type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid';

export interface BudgetBreakdown {
  BudgetID: string;
  EventID: string;
  ItemName: string;
  CategoryExpense: string;
  EstimationCost: number;
  Description: string;
  VendorName: string;
  VendorPhone: string;
  QuotationFileLink: string;
  ApprovalStatus: ApprovalStatus;
  ActualCost: number | '';
  Variance: number | ''; // server-computed, always read-only, never sent by the client
  InvoiceFileLink: string;
  PaymentStatus: PaymentStatus;
  SourceModule: string;
  SourceRecordID: string;
}

// ---------- Participants ----------

export interface Participants {
  EventID: string; // doubles as this entity's ID field — 1 row per event
  EstimationParticipant: number;
  ActualParticipant: number;
  AttendanceFormRef: string;
}

// ---------- Checklist ----------

export interface Checklist {
  TaskID: string;
  EventID: string;
  ToDo: string;
  Assignee: string; // email
  DueDate: string;
  Status: string;
  Remark: string;
}

export const CHECKLIST_STATUSES = ['To Do', 'In Progress', 'Done', 'Blocked'];

// ---------- Main Event comparison/booking entities ----------

export type PrizeType = 'Cash' | 'Voucher';

export interface VenueComparison {
  VenueID: string;
  EventID: string;
  VenueName: string;
  Location: string;
  ContactName: string;
  ContactPhone: string;
  Quantity: number;
  Unit: string;
  Price: number;
  TotalEstimationCost: number; // server-computed (Quantity * Price), read-only
  EstimationCost: number;
  LayoutImageLink: string;
  BenefitsInclude: string;
  BenefitsExclude: string;
  ApprovalStatus: ApprovalStatus;
}

export interface DecorationComparison {
  DecorID: string;
  EventID: string;
  DecorationName: string;
  Vendor: string;
  ContactName: string;
  ContactPhone: string;
  Quantity: number;
  Unit: string;
  Price: number;
  TotalEstimationCost: number; // server-computed (Quantity * Price), read-only
  EstimationCost: number;
  DesignImageLink: string;
  BenefitsInclude: string;
  BenefitsExclude: string;
  ApprovalStatus: ApprovalStatus;
}

export interface SouvenirComparison {
  SouvenirID: string;
  EventID: string;
  ItemName: string;
  VendorName: string;
  ContactName: string;
  ContactPhone: string;
  Quantity: number;
  Unit: string;
  Price: number;
  TotalEstimationCost: number; // server-computed (Quantity * Price), read-only
  EstimationCost: number;
  DesignImageLink: string;
  BenefitsInclude: string;
  BenefitsExclude: string;
  ApprovalStatus: ApprovalStatus;
}

export interface Entertainment {
  EntertainmentID: string;
  EventID: string;
  Activity: string;
  Description: string;
  ContactName: string;
  ContactPhone: string;
  Quantity: number;
  Unit: string;
  Price: number;
  TotalEstimationCost: number; // server-computed (Quantity * Price), read-only
  EstimationCost: number;
  ApprovalStatus: ApprovalStatus;
}

export interface Awards {
  AwardID: string;
  EventID: string;
  Category: string;
  Description: string;
  Prize: PrizeType;
  Value: number;
  EstimationCost: number;
  ApprovalStatus: ApprovalStatus;
}

export interface DoorPrize {
  DoorPrizeID: string;
  EventID: string;
  Item: string;
  Category: string;
  DetailSpec: string;
  ImageLink: string;
  Quantity: number;
  Unit: string;
  Price: number;
  TotalEstimationCost: number; // server-computed (Quantity * Price), read-only
  EstimationCost: number;
  ApprovalStatus: ApprovalStatus;
}

export interface NourishGotTalent {
  TalentID: string;
  EventID: string;
  Category: string;
  Prize: PrizeType;
  Value: number;
  ApprovalStatus: ApprovalStatus;
}

export interface Rundown {
  RundownID: string;
  EventID: string;
  Description: string;
  TimeStart: string;
  TimeFinish: string;
  CommitteeInCharge: string;
  Remark: string;
}

// ---------- Finance ----------

export type FinanceType = 'Cash' | 'Non-Cash';
export type FinancePaymentType = 'Bank Transfer' | 'Cash' | 'Cheque' | 'Other';

export interface FinanceIncoming {
  IncomingID: string;
  Type: FinanceType;
  SupplierName: string;
  SupplierCategory: string;
  LetterFileLink: string;
  PaymentType: FinancePaymentType;
  NonCashItemName: string;
  AmountIDR: number;
  DateReceived: string;
  ReceiptFileLink: string;
  Description: string;
}

// ---------- Dashboard response shapes ----------

export interface DashboardData {
  daysToNextPreEvent: number | null;
  daysToMainEvent: number | null;
  overdueChecklistCount: number;
}

export interface FinanceDashboardData {
  mtdIncoming: number;
  mtdExpenses: number;
  variance: number;
  pctVariance: number;
}

// ---------- Entity registry ----------

export type EntityName =
  | 'Events'
  | 'Ideas'
  | 'Committee'
  | 'Roles'
  | 'BudgetBreakdown'
  | 'Participants'
  | 'Checklist'
  | 'VenueComparison'
  | 'DecorationComparison'
  | 'SouvenirComparison'
  | 'Entertainment'
  | 'Awards'
  | 'DoorPrize'
  | 'Rundown'
  | 'Finance_Incoming'
  | 'NourishGotTalent';

// entity -> its primary key column in supabase/schema.sql
export const ID_FIELD: Record<EntityName, string> = {
  Events: 'EventID',
  Ideas: 'IdeaID',
  Committee: 'MemberID',
  Roles: 'RoleName',
  BudgetBreakdown: 'BudgetID',
  Participants: 'EventID',
  Checklist: 'TaskID',
  VenueComparison: 'VenueID',
  DecorationComparison: 'DecorID',
  SouvenirComparison: 'SouvenirID',
  Entertainment: 'EntertainmentID',
  Awards: 'AwardID',
  DoorPrize: 'DoorPrizeID',
  Rundown: 'RundownID',
  Finance_Incoming: 'IncomingID',
  NourishGotTalent: 'TalentID',
};

// UI-only mirror of the RLS policies in supabase/schema.sql — kept in sync by
// hand. This gates affordances; the database is what actually enforces access,
// so a mismatch here shows the wrong buttons, it does not grant anything.
export const ENTITY_ACCESS: Record<EntityName, Record<'Admin' | 'Advisor' | 'Member', AccessLevel>> = {
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
  // Member 'none' except the Sponsorship Coordinator — role, not tier, so
  // PermissionContext special-cases it. Mirrors is_finance_editor().
  Finance_Incoming: { Admin: 'write', Advisor: 'read', Member: 'none' },
  NourishGotTalent: { Admin: 'write', Advisor: 'read', Member: 'read' },
};
