# NourishFest 2026 — Google Sheet Schema

One spreadsheet, 12 tabs (11 data tabs + Permissions). Created automatically by
running `setupSheets()` once in the Apps Script editor. Do not rename tabs or
reorder columns — `Code.gs` maps to these exactly.

## Module → Tab Map

| App Module (frontend) | Tab(s) used | Phase tagging |
|---|---|---|
| Pre-Event / Ideas | `Ideas` | — |
| Pre-Event / Committee | `Committee` | — |
| Pre-Event / Budget | `Budget` | row-level `Phase` column |
| Pre-Event / Proposal | `Proposal` | — |
| Pre-Event or Main Event / Checklist | `Checklist` | row-level `Phase` column |
| Main Event / Theme, Tagline | `EventInfo` | — |
| Main Event / Venue | `Venue` | — |
| Main Event / Entertainment, Door Prize, Award, Souvenir, Decoration, Mini Games, Others | `Roster` | row-level `Module` column |
| Main Event / Rundown Event | `Rundown` | — |
| Main Event / Nourish Got Talent | `NourishGotTalent` | — |
| Main Event / Participant Detail | `ParticipantDetail` | — |
| Documents (incoming Quotations, Invoices, Contracts, Permits, Receipts, Other) | `Documents` | optionally linked to any Budget/Roster/Committee row |

Budget and Checklist are shared across both phases rather than duplicated —
each row carries `Phase` (`Pre-Event` / `Main Event`) and `Module` (which
sub-module it belongs to, e.g. `Entertainment`, `Venue`, or blank for general
Pre-Event items). Filter client-side or via `?Phase=Main Event` query params.

The seven roster-style Main Event items (Entertainment, Door Prize, Award,
Souvenir, Decoration, Mini Games, Others) share one `Roster` tab, disambiguated
by the `Module` column — they're structurally identical (name, PIC/vendor,
cost, status), so one generic table + one generic UI component powers all
seven instead of building seven near-duplicate tabs/screens.

---

## Tab Definitions

### `Permissions`
| Column | Type | Notes |
|---|---|---|
| Id | string (uuid) | |
| Email | string | organizer's Google account email |
| Module | string | sheet name, or `*` for all-module access, or `AI` (a non-sheet permission gating access to the Gemini-powered text/image generation panels — owner/Admin only, by design) |
| Role | `Admin` \| `Editor` \| `Viewer` | |
| Name | string | display name |

### `Ideas`
| Column | Type | Notes |
|---|---|---|
| Id | uuid | |
| Title | string | |
| Description | string | |
| SubmittedBy | string | |
| Category | string | free text or select |
| Votes | number | |
| Status | `New` \| `Under Review` \| `Approved` \| `Rejected` \| `Implemented` | |
| CreatedAt / UpdatedAt | ISO datetime | auto-set by backend |

### `Committee`
| Column | Type |
|---|---|
| Id | uuid |
| Name | string |
| Role | string (e.g. "Ops Lead") |
| Team | string (e.g. "F&B", "Logistics", "Talent") |
| Phone | string |
| Email | string |
| Responsibilities | string |
| Notes | string |

### `Budget`
| Column | Type | Notes |
|---|---|---|
| Id | uuid | |
| Phase | `Pre-Event` \| `Main Event` | |
| Module | string | free text, e.g. "Entertainment", "Marketing" |
| ItemName | string | |
| Category | string | |
| EstimatedCost | number | |
| ActualCost | number | |
| ApprovalStatus | `Pending` \| `Approved` \| `Rejected` | |
| PIC | string | |
| Notes | string | |
| CreatedAt / UpdatedAt | ISO datetime | |

Variance (`ActualCost - EstimatedCost`) is computed client-side, not stored.

### `Proposal`
| Column | Type | Notes |
|---|---|---|
| Id | uuid | |
| Type | `Overview` \| `Sponsorship` | |
| Title | string | |
| Description | string | |
| Price | number | 0 for Overview rows |
| Benefits | string | newline-separated bullet list |
| DisplayOrder | number | for presentation-view ordering |

### `Checklist`
| Column | Type | Notes |
|---|---|---|
| Id | uuid | |
| Phase | `Pre-Event` \| `Main Event` | |
| Module | string | which sub-module this task supports |
| Task | string | |
| Assignee | string | |
| Deadline | date string | |
| Priority | `Low` \| `Medium` \| `High` \| `Urgent` | |
| Status | `To Do` \| `In Progress` \| `Done` \| `Blocked` | |
| UpdatedBy | email | who last changed `Status` |
| Notes | string | |
| CreatedAt / UpdatedAt | ISO datetime | CreatedAt = when the task was added |

### `EventInfo`
Key/value settings table for single-value fields.
| Column | Type |
|---|---|
| Id | uuid |
| Field | string, e.g. `Theme`, `Tagline` |
| Value | string |
| Notes | string |

### `Venue`
Supports multiple candidate venues, not just the confirmed one.
| Column | Type |
|---|---|
| Id | uuid |
| Name | string |
| Address | string |
| Capacity | number |
| Status | `Candidate` \| `Confirmed` |
| Cost | number |
| PIC | string |
| Notes | string |

### `Roster` (Entertainment / Door Prize / Award / Souvenir / Decoration / Mini Games / Others)
| Column | Type | Notes |
|---|---|---|
| Id | uuid | |
| Module | string | one of the 7 roster module names |
| Name | string | act/item/prize name |
| Category | string | |
| PIC | string | |
| Vendor | string | |
| EstimatedCost | number | |
| ActualCost | number | |
| Status | string | e.g. `Confirmed`, `Booked`, `Pending` |
| Notes | string | |
| CreatedAt / UpdatedAt | ISO datetime | |

### `Rundown`
| Column | Type |
|---|---|
| Id | uuid |
| TimeStart | string (HH:mm) |
| TimeEnd | string (HH:mm) |
| Segment | string |
| PIC | string |
| Location | string / stage |
| Notes | string |
| Order | number — sort key |

### `NourishGotTalent`
| Column | Type |
|---|---|
| Id | uuid |
| ParticipantName | string |
| Outlet | string |
| Category | string |
| PerformanceOrder | number |
| Score | number |
| JudgeNotes | string |
| Status | string, e.g. `Registered`, `Performed`, `Eliminated`, `Finalist` |

### `ParticipantDetail`
| Column | Type |
|---|---|
| Id | uuid |
| Name | string |
| Outlet | string |
| RoleCategory | string, e.g. `Staff`, `Guest`, `Vendor`, `VIP` |
| Contact | string |
| RSVPStatus | string |
| Attendance | string |
| Notes | string |

### `Documents`
All PDFs Nourish *receives* (vendor quotations, vendor invoices, contracts,
permits, receipts). Nourish's own outgoing document — the sponsorship
Proposal — is generated and downloaded client-side instead; it doesn't need
a row here.

| Column | Type | Notes |
|---|---|---|
| Id | uuid | |
| DocType | `Quotation` \| `Invoice` \| `Contract` \| `Permit` \| `Receipt` \| `Design` \| `Other` | `Design` = AI-generated concept images saved from the Theme/Decoration AI panels |
| Title | string | |
| ReferenceNo | string | the vendor's own document number, if any — not auto-generated |
| LinkedModule | string | optional, e.g. `Budget`, `Roster` |
| LinkedRecordId | string | optional, the Id of the specific Budget/Roster/etc. row this document supports |
| FileUrl | string | Google Drive view link |
| FileId | string | Drive file ID |
| FileName | string | original filename |
| UploadedBy | string | uploader's email |
| UploadedAt | ISO datetime | |
| Notes | string | |

The actual PDF bytes live in a shared Google Drive folder, not in the sheet
(Sheets can't store binary data). See `DOCUMENTS_FOLDER_ID` setup in
`Code.gs` and step 5 in the root `README.md`.
