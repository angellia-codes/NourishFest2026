# NourishFest 2026 — Event Management App
## Product Requirements Document — v4 (Final)

**Status:** All open items resolved. Backend (`Code.gs`) delivered — see companion file.

---

## 1. What Changed Since v3

- All 6 items in Section 13 (v3) resolved — see Section 12.
- Attendance-form integration **deferred to future dev** — ships in v1 with manual `ActualParticipant` entry; `AttendanceFormRef` stays in the schema so wiring it later is a config change, not a rebuild.
- Ideas submission cap confirmed unchanged: 1 idea/user/month. Voting: 1 vote/idea, repeatable across ideas.
- Visual direction (Section 9, prior draft) confirmed as final, no changes.
- **Two schema additions surfaced while building `Code.gs`, not previously in the PRD:**
  - `Committee.Email` — required to match a signed-in Workspace user to their Committee record for RBAC. Without it, the "no separate login screen" auth approach doesn't work.
  - `IdeaVotes` table (`VoteID`, `IdeaID`, `VoterEmail`, `DateVoted`) — "1 vote per idea, repeatable" needs a record of *which* ideas each user voted on, not just a running count on `Ideas`.

## 2. Purpose, Goals, Non-Goals

**Purpose:** one system for the committee to run NourishFest 2026 end-to-end — ideation, committee, 4 monthly pre-events, the main event, and the money behind all of it.

**Non-Goals:** sponsor pitch deck/proposal document (replaced by Finance → Sponsorship), payment gateway, public ticketing, native mobile app.

## 3. Users & Roles / Permissions

| Permission Level | Maps from Role | Ideas | Checklist | All other modules | Finance |
|---|---|---|---|---|---|
| **Admin** | Chairperson, Vice Chairperson, Treasurer, Secretary | Full CRUD + approve | Full CRUD | Full CRUD | Full CRUD |
| **Advisor** | Advisor | Read-only | Read-only | Read-only | Read-only |
| **Member** | Program Coordinator, F&B Coordinator, Logistics/Decoration/Merch Coordinator, Security Coordinator, Documentation Coordinator, Sponsorship Coordinator | Submit + vote | Update status on own assigned tasks only | Read-only | No access |

Auth confirmed viable: every committee member has a Nourish Group Google Workspace account.

## 4. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript, Tailwind + shadcn/ui + Lucide icons |
| Backend/API | Google Apps Script Web App (`doGet`/`doPost`), Workspace-domain-restricted |
| Database | Google Sheets |
| File storage | Google Drive |
| Hosting | Vercel |
| Auth | `Session.getActiveUser().getEmail()` → matched against `Committee.Email` → Role → PermissionLevel. No separate login screen. |
| State/data-fetching | TanStack Query |

## 5. Information Architecture

```
Overview
├── Dashboard
├── Committee
├── Ideas
└── Event Management     (Admin only — create/edit Event records, multi-year reuse)

Pre-Event × 4 (Aug, Sep, Oct, Nov)
├── Event Details
├── Budget Breakdown
├── Participants
└── Checklist

Main Event (Dec)
├── Event Details
├── Participants
├── Budget Breakdown
├── Venue / Decoration / Souvenir Comparison
├── Entertainment
├── Awards
├── Door Prize
├── Rundown
└── Checklist

Finance                  (Admin only, spans all events)
├── Dashboard
├── Incoming
└── Outgoing              (auto-rolled-up, read-only)
```

## 6. Feature Specs — as v3, with these final field-level confirmations

- **Ideas:** submission 1/user/month (per Scope). Voting: 1/idea, repeatable across ideas. No Category field.
- **Pre-Event Location:** manual text input.
- **Awards:** has Approval Status, same as the other 5 Comparison modules.
- **Comparison → Budget:** manual entry by staff after approval, not auto-generated.
- **Participants:** Estimation entered manually; Actual entered manually in v1 (attendance-form pull-in deferred).
- Full field lists per module: see v3, unchanged except where noted above.

## 7. Cross-Module Workflow Rules

1. Idea → Event: Admin manually creates the record from the winning idea.
2. Comparison → Budget: manual entry, optionally tagged via `SourceModule`/`SourceRecordID` for traceability.
3. Budget → Finance: automatic — any `Paid` Budget row rolls into Finance → Outgoing.
4. Attendance form → Participants: **deferred**. `AttendanceFormRef` reserved in schema.
5. Committee Role → Responsibility: auto-filled from `Roles` lookup, read-only.
6. Committee Role → Permission Level: derived, not stored.
7. Conditional Budget fields: Actual Cost/Variance/Invoice/Payment Status only render once Approved.

## 8. Data Entities (final — matches `Code.gs` `SCHEMA`)

| Sheet tab | Columns |
|---|---|
| `Events` | EventID, EventType, Month, EventName, CategoryOrTheme, Purpose, Tagline, Date, Location, Status, SourceIdeaID |
| `Ideas` | IdeaID, Scope, Title, Description, Theme, Tagline, SubmittedBy, Votes, Status, DateSubmitted |
| `IdeaVotes` *(new)* | VoteID, IdeaID, VoterEmail, DateVoted |
| `Committee` | MemberID, Name, **Email** *(new)*, Department, Role, Responsibility, Status |
| `Roles` | RoleName, DefaultResponsibility, PermissionTier, Notes |
| `BudgetBreakdown` | BudgetID, EventID, ItemName, CategoryExpense, EstimationCost, Description, VendorName, VendorPhone, QuotationFileLink, ApprovalStatus, ActualCost, Variance, InvoiceFileLink, PaymentStatus, SourceModule, SourceRecordID |
| `Participants` | EventID *(doubles as ID — 1 row/event)*, EstimationParticipant, ActualParticipant, AttendanceFormRef |
| `Checklist` | TaskID, EventID, ToDo, Assignee, DueDate, Status, Remark |
| `VenueComparison` | VenueID, EventID, VenueName, Location, ContactName, ContactPhone, EstimationCost, LayoutImageLink, BenefitsInclude, BenefitsExclude, ApprovalStatus |
| `DecorationComparison` | DecorID, EventID, DecorationName, Vendor, ContactName, ContactPhone, EstimationCost, DesignImageLink, BenefitsInclude, BenefitsExclude, ApprovalStatus |
| `SouvenirComparison` | SouvenirID, EventID, ItemName, VendorName, ContactName, ContactPhone, EstimationCost, DesignImageLink, BenefitsInclude, BenefitsExclude, ApprovalStatus |
| `Entertainment` | EntertainmentID, EventID, Activity, Description, ContactName, ContactPhone, EstimationCost, ApprovalStatus |
| `Awards` | AwardID, EventID, Category, Description, Prize, EstimationCost, ApprovalStatus |
| `DoorPrize` | DoorPrizeID, EventID, Item, Category, DetailSpec, ImageLink, EstimationCost, ApprovalStatus |
| `Rundown` | RundownID, EventID, Description, TimeStart, TimeFinish, CommitteeInCharge, Remark |
| `Finance_Incoming` | IncomingID, Type, SupplierName, SupplierCategory, LetterFileLink, PaymentType, NonCashItemName, AmountIDR, DateReceived, ReceiptFileLink, Description |

## 9. Visual Design Direction (final)

Fraunces (display/headers) + Work Sans or Manrope (body/tables). Warm cream base, charcoal-brown text, terracotta/burnt-orange primary accent, deep forest green secondary. Status colors: amber = pending, terracotta = rejected, forest green = approved/paid. Personality in Dashboard/Ideas/Main Event landing; restraint in Budget/Finance/Checklist tables. Tailwind + shadcn/ui + Lucide.

## 10. Deployment Plan

See `Code.gs` header comment for the full setup sequence (Sheet tabs → Apps Script deploy → Drive folder → Vercel env var). Summary:
1. Build the Sheet (Section 8 tabs), seed `Roles`, seed `Committee` with real emails.
2. Deploy Apps Script as Web App, access restricted to your Workspace domain.
3. Vercel: `VITE_API_BASE_URL` = the `/exec` URL, deploy.

## 11. MoSCoW (final)

| Feature | Priority |
|---|---|
| Committee + Roles + RBAC | Must — **backend done** |
| Ideas (submission + voting) | Must — **backend done** |
| Event Management (Admin) | Must — **backend done** |
| Pre-Event ×4 / Main Event (Details, Budget, Participants, Checklist, Rundown) | Must — **backend done** |
| Comparison modules + manual budget entry | Must — **backend done** |
| Finance (Incoming, Outgoing rollup, Dashboard) | Must — **backend done** |
| Frontend (React/Vite/TS, all modules) | Must — **next** |
| Attendance-form integration | Deferred |

## 12. Resolved

Everything. No open items remain against the backend. Frontend styling/state decisions are locked (Section 4, 9).

## 13. Next Steps

Phase 2, Step 2: Frontend Architecture — folder structure, TypeScript interfaces for all 16 entities, API service layer (`api.ts`) wired to this `Code.gs` deployment, then Step 3: UI components per module.
