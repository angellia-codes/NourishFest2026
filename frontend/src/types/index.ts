// NourishFest 2026 — shared TypeScript models
// Mirrors backend/SCHEMA.md exactly. Field names match sheet headers 1:1
// so objects can be sent straight to the API without remapping.

export type Role = 'Admin' | 'Editor' | 'Viewer';

export interface Permission {
  Id: string;
  Email: string;
  Module: string; // sheet/module name, or '*'
  Role: Role;
  Name: string;
}

// ---------- Pre-Event ----------

export type IdeaStatus = 'New' | 'Under Review' | 'Approved' | 'Rejected' | 'Implemented';

export interface Idea {
  Id: string;
  Title: string;
  Description: string;
  SubmittedBy: string;
  Category: string;
  Votes: number;
  Status: IdeaStatus;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CommitteeMember {
  Id: string;
  Name: string;
  Role: string;
  Team: string;
  Phone: string;
  Email: string;
  Responsibilities: string;
  Notes: string;
}

export type Phase = 'Pre-Event' | 'Main Event';
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export interface BudgetItem {
  Id: string;
  Phase: Phase;
  Module: string;
  ItemName: string;
  Category: string;
  EstimatedCost: number;
  ActualCost: number;
  ApprovalStatus: ApprovalStatus;
  PIC: string;
  Notes: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export type ProposalType = 'Overview' | 'Sponsorship';

export interface ProposalItem {
  Id: string;
  Type: ProposalType;
  Title: string;
  Description: string;
  Price: number;
  Benefits: string; // newline-separated
  DisplayOrder: number;
}

// ---------- Checklist (shared across phases) ----------

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'To Do' | 'In Progress' | 'Done' | 'Blocked';

export interface ChecklistTask {
  Id: string;
  Phase: Phase;
  Module: string;
  Task: string;
  Assignee: string;
  Deadline: string;
  Priority: Priority;
  Status: TaskStatus;
  Notes: string;
  CreatedAt: string;
  UpdatedAt: string;
}

// ---------- Main Event ----------

export interface EventInfoField {
  Id: string;
  Field: string; // 'Theme' | 'Tagline'
  Value: string;
  Notes: string;
}

export type VenueStatus = 'Candidate' | 'Confirmed';

export interface Venue {
  Id: string;
  Name: string;
  Address: string;
  Capacity: number;
  Status: VenueStatus;
  Cost: number;
  PIC: string;
  Notes: string;
}

export const ROSTER_MODULES = [
  'Entertainment',
  'Door Prize',
  'Award',
  'Souvenir',
  'Decoration',
  'Mini Games',
  'Others',
] as const;
export type RosterModule = (typeof ROSTER_MODULES)[number];

export interface RosterItem {
  Id: string;
  Module: RosterModule;
  Name: string;
  Category: string;
  PIC: string;
  Vendor: string;
  EstimatedCost: number;
  ActualCost: number;
  Status: string;
  Notes: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface RundownItem {
  Id: string;
  TimeStart: string;
  TimeEnd: string;
  Segment: string;
  PIC: string;
  Location: string;
  Notes: string;
  Order: number;
}

export interface TalentEntry {
  Id: string;
  ParticipantName: string;
  Outlet: string;
  Category: string;
  PerformanceOrder: number;
  Score: number;
  JudgeNotes: string;
  Status: string;
}

export interface Participant {
  Id: string;
  Name: string;
  Outlet: string;
  RoleCategory: string;
  Contact: string;
  RSVPStatus: string;
  Attendance: string;
  Notes: string;
}

// ---------- Documents (incoming: quotations, invoices, contracts, etc.) ----------

export const DOC_TYPES = ['Quotation', 'Invoice', 'Contract', 'Permit', 'Receipt', 'Design', 'Other'] as const;
export type DocType = (typeof DOC_TYPES)[number];

export interface DocumentRecord {
  Id: string;
  DocType: DocType;
  Title: string;
  ReferenceNo: string;
  LinkedModule: string; // e.g. 'Budget' | 'Roster' | ''
  LinkedRecordId: string; // Id of the linked row, or ''
  FileUrl: string;
  FileId: string;
  FileName: string;
  UploadedBy: string;
  UploadedAt: string;
  Notes: string;
}

export type AIKind = 'idea' | 'theme' | 'tagline' | 'decoration';

// ---------- Sheet/module registry ----------

export type SheetName =
  | 'Permissions'
  | 'Ideas'
  | 'Committee'
  | 'Budget'
  | 'Proposal'
  | 'Checklist'
  | 'EventInfo'
  | 'Venue'
  | 'Roster'
  | 'Rundown'
  | 'NourishGotTalent'
  | 'ParticipantDetail'
  | 'Documents';
