# 💰 Feature Detail: Budget Tracker Module

This module manages the financial health of NourishFest 2026. It requires dynamic UI interactions, automatic calculations, and strict data relationships with the "Pre-Event Ideas" module for accurate auditing.
/
## 🗄️ Data Model & Field Specifications

| #      | Field Name               | Input Type / UI Component   | Behavior & Logic                                                                                                                                                                                             |
| :----- | :----------------------- | :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | Event Category           | Radio Button or Toggle      | Options: `Pre-Event` or `Main Event`. This selection dictates the behavior of Field #2.                                                                                                                      |
| **2**  | Event Name               | Dynamic Dropdown            | **Logic Trigger:** If #1 is `Pre-Event`, this dropdown automatically populates with _approved_ events from the **Pre-Event Ideas** module. If #1 is `Main Event`, this defaults to "NourishFest Main Event". |
| **3**  | Item                     | Text Input (String)         | A blank text field for the specific line-item description.                                                                                                                                                   |
| **4**  | Category Expenses        | Select Dropdown             | Fixed categories for easy filtering: `F&B Supplies`, `Venue & Ops`, `Marketing`, `Logistics`, `Permits/Compliance`, `Misc`.                                                                                  |
| **5**  | Est. Cost (IDR)          | Number Input (Currency)     | Must strictly enforce IDR formatting (e.g., Rp 15.000.000).                                                                                                                                                  |
| **6**  | Actual Cost (IDR)        | Number Input (Currency)     | Must strictly enforce IDR formatting. Defaults to `0` until an invoice is processed.                                                                                                                         |
| **7**  | Variance (IDR)           | Auto-Calculated (Read-Only) | **Formula:** `Est. Cost - Actual Cost`. Visually format the text color: <br>• Green = Positive (Under budget)<br>• Red = Negative (Over budget)                                                              |
| **8**  | Vendor/Supplier          | Text Input / Combobox       | Name of the supplier or partner providing the item/service.                                                                                                                                                  |
| **9**  | Approval Status          | Status Badge Dropdown       | Options: `🟡 Pending`, `🔵 Approved`, `🟣 Partial Paid`, `🟢 Fully Paid`. Used to track financial workflows and bottlenecks.                                                                                 |
| **10** | Invoice/Receipt PDF Link | URL Input / File Upload     | A hyperlink to a hosted PDF (e.g., Google Drive link) or an upload button that pushes the file to Google Apps Script storage for clean auditing and record-keeping.                                          |

## 🖥️ UI/UX Implementation Notes (Frontend)

- **The "Trigger" Feature:** Use React state (`useEffect`) to watch the `Event Category` field. When it switches to "Pre-Event", fetch the array of winning ideas to populate the `Event Name` dropdown.
- **Summary Dashboard:** Above the main table, display three large metric cards summarizing the column totals: **Total Estimated**, **Total Actual**, and **Overall Variance**.
- **Row Interactions:** Allow rapid editing of the `Actual Cost` and `Approval Status` directly in the table cell without opening a separate "Edit" modal, ensuring fast data entry for the finance team.
- **Receipt Accessibility:** The `Invoice/Receipt PDF Link` should render as a clickable icon (e.g., a small paperclip or document icon) in the table row to keep the UI clean while providing instant access to the document.
