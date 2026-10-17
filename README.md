# Kegalle Ph4Life — Pharmacy Management System

**An integrated pharmacy platform for inventory, prescriptions, point-of-sale billing, customer relationships, supplier operations, and AI-assisted insights.**

Kegalle Ph4Life connects daily pharmacy workflows through dedicated **Admin, Cashier, Pharmacist, and Supplier** portals. Medicine records, prescription processing, sales, purchases, restock requests, and supplier payments work together through a React frontend and a Node.js/Express backend.

The system combines operational tools with visual dashboards, email notifications, Socket.IO updates, and Google Gemini integrations. Its focus is practical: help staff locate medicines, process prescriptions, maintain stock, coordinate with suppliers, and review business records from one application.

## Contents

- [Portals and responsibilities](#portals-and-responsibilities)
- [Features and functions](#features-and-functions)
- [Connected workflows](#connected-workflows)
- [Technology stack](#technology-stack)
- [Application architecture](#application-architecture)
- [API overview](#api-overview)
- [Configuration](#configuration)
- [Implementation notes](#implementation-notes)

## Portals and responsibilities

| Portal | Main capabilities |
| --- | --- |
| **Admin** | Business dashboard, inventory, rack locator, supplier management, purchases and GRNs, prescriptions, controlled-drug logs, CRM, POS, returns and disposals, outbreak analysis, and management reports. |
| **Cashier** | Sales dashboard, POS checkout, customer registration and loyalty records, prescription entry and verification, sales history, receipts, and operational reports. |
| **Pharmacist** | Operational dashboard, inventory, purchases and GRNs, rack location, returns and disposals, and AI outbreak analysis. The route configuration also permits access to the shared CRM page. |
| **Supplier** | Invitation-based onboarding, dedicated login, dashboard, supplied products, orders and GRNs, payments, debit notes, stock requests, company information, and password changes. |

Staff portals use shared authentication state and role-aware frontend routes. Suppliers have a separate login and invitation setup flow.

## Features and functions

### 1. Authentication and portal access

- Staff login with email and password for Admin, Pharmacist, and Cashier accounts.
- Two-step staff login using a six-digit email OTP with a ten-minute expiry.
- JWT sessions and bcrypt password hashing.
- Inactive staff-account checks during login.
- Role-based frontend navigation and protected page routes.
- Supplier login using supplier account credentials and portal activation status.
- Supplier invitations with randomly generated tokens and a 24-hour validity period.
- Supplier password changes with current-password verification, confirmation matching, and password-length validation.
- Persistent login state through React Context and browser storage.

The current staff OTP implementation sends codes to the pharmacy mailbox configured in the authentication controller. Supplier invitations are sent to the supplier's recorded email address.

### 2. Medicine inventory management

Maintain medicine records with the details needed for purchasing, storage, and dispensing:

- Medicine name, generic name, dosage, category, and manufacturer.
- Batch number, barcode, expiry date, and supplier association.
- Available quantity, cost price, selling price, and minimum stock level.
- Controlled-drug flag, rack location, and restock rejection information.

Staff can add, edit, search, and remove medicine records through the inventory interface. Purchase records support the stock-registration workflow, while low-stock and expiry indicators help staff identify items requiring attention.

The Admin inventory page includes category analytics and refreshes stock information through event-driven and periodic updates. The Pharmacist inventory page provides the operational stock tools in its own portal layout.

### 3. Rack, shelf, and bin location

The rack locator turns stored location codes into a visual pharmacy storage view.

- Search for medicines and navigate to their recorded rack.
- Display the selected medicine and highlight its storage location.
- Navigate between racks using a visual carousel.
- Interpret location codes such as `R01-S02-B03`.
- Show medicine quantities spanning multiple bins.

The Admin inventory form implements a storage model of **20 racks, 5 shelves per rack, and 10 bins per shelf**, with **100 units per bin**. It validates location format, checks overlapping occupied ranges, and calculates the number of bins required by a quantity.

Its automatic suggestion places the next location after the highest occupied bin range. Location validation prevents saving overlapping or out-of-capacity allocations through that form.

### 4. Prescription management and AI scanning

Create and maintain prescriptions linked to CRM customer records.

- Search and select patients by name or ID.
- Record patient identification and doctor details, including specialization and contact information.
- Add multiple medicine items, quantities, and dosage instructions.
- Enter morning, noon, and night instructions in the manual prescription form.
- Retain a digital prescription image and supporting notes.
- Search prescriptions by patient or prescription ID and filter by status.
- Edit, delete, preview, and print prescription records.
- Display prescription-status analytics in the Admin interface.

**AI-assisted image extraction** uses Google Gemini to extract patient information, doctor information, medicine names, and dosage text from an uploaded prescription image. The frontend can match an existing CRM patient or create a customer record before saving the extracted prescription.

The Cashier interface includes a verification and approval workflow for preparing prescription items for POS. Successful checkout marks a linked prescription as **Dispensed**.

AI extraction is an input aid. Extracted patient identities, medicine matches, quantities, and instructions require staff review before dispensing.

### 5. Point of sale and billing

The Admin and Cashier POS pages connect medicine selection, prescriptions, customer details, and sales recording.

- Search the medicine catalogue by name or batch.
- Add medicines to a cart, adjust quantities, and remove items.
- Load prescription items and associated patient and doctor information.
- Attempt medicine matching by inventory ID and flexible name matching.
- Flag unmatched prescription items and block checkout until they are resolved.
- Check stock availability and calculate line totals using recorded selling prices.
- Reduce medicine stock as part of the checkout transaction.
- Update the linked prescription's dispensing status.
- Browse sales history, edit invoice metadata, and preview or print receipts.
- Void a sale while restoring its medicine quantities and updating associated controlled-drug logs.

The POS catalogue filters out medicines without stock, expired medicines, and medicines without an assigned rack location. The backend also checks available stock during checkout.

Sales records support payment-method metadata. The supplied POS checkout handlers submit cash sales; other method labels in invoice-editing screens are record classifications, not payment-gateway integrations.

### 6. Customer management and loyalty

The CRM module maintains patient/customer information used by prescription and sales workflows.

- Customer creation, editing, deletion, and search.
- Name, age, gender, NIC, contact number, email, and address fields.
- Frontend validation for age, contact numbers, NIC format, and duplicate identifiers.
- Loyalty-point balances displayed alongside customer information.
- Customer analytics in the Admin CRM interface.
- Backend endpoints for medicine refill reminders, including dates, status, and notes.
- A separate AI-insights endpoint for suggested health-profile labels, perks, and loyalty bonuses.

For a matched customer, checkout calculates earned points as:

```text
Earned points = floor(sale total / 100) + 10
```

Checkout also deducts existing points up to the sale total before adding newly earned points. The POS displays the corresponding loyalty reduction. Stored sales totals remain the original medicine line totals, so they should not be interpreted as reconciled net cash receipts.

### 7. Supplier management and onboarding

Maintain supplier information needed for procurement and financial coordination:

- Company and representative names.
- Contact details, email, address, and office phone.
- Business-registration information.
- Bank name, account name, and account number.
- Credit period, account status, portal status, and outstanding balance.

Administrators can create and update suppliers, send portal invitations, and identify suppliers with unpaid invoices due within five days or already overdue.

The Supplier portal presents company information, supplied products, purchase records, payment records, return/debit-note information, stock requests, and summary charts. Suppliers can set their initial password through an invitation and change it later from their profile area.

### 8. Purchases and goods received notes

Record incoming stock through purchase invoices and **Goods Received Notes (GRNs)**.

- Capture invoice and GRN numbers, supplier, invoice date, due date, and notes.
- Add multiple medicine lines with batch, expiry, quantity, unit, cost, and selling price.
- Create a medicine record when receiving a new item.
- Increase stock for an existing medicine and update its recorded prices.
- Store invoice headers and purchase line items.
- Track unpaid, partially paid, and paid invoice states.
- Update supplier outstanding balances.
- Allow suppliers to retrieve their purchase records through a supplier-scoped endpoint.

Purchase creation groups inventory, invoice, and supplier-balance changes in a database transaction. Invoices due soon can generate immediate payment alerts.

### 9. Restock requests and supplier decisions

The linked restock workflow connects a medicine to a specific purchase invoice item.

1. Staff select the medicine, requested quantity, and related invoice item.
2. The backend validates the medicine, batch, supplier, and purchase-item relationship.
3. A restock request and supplier notification are recorded.
4. The supplier accepts or rejects the request in the portal.
5. Acceptance updates medicine quantity, the selected purchase item, invoice totals, and supplier outstanding balance.
6. Rejection records a required reason and makes it available to the inventory workflow.

For acceptance, the selected item's revised subtotal is calculated from **updated medicine quantity × current cost price**. The invoice total changes by the difference between the old and revised item subtotals.

Supplier ownership checks, transaction locks, and request-status checks are implemented for this linked decision workflow. Socket.IO events refresh related views after processing.

### 10. Supplier payments

- Record payment number, supplier, amount, date, method, and notes.
- Store cheque details and receipt-image information where provided.
- Track pending, accepted, and rejected payment states.
- Allow acceptance or rejection from the Supplier portal.
- Require a reason when rejecting a payment.
- Reduce supplier outstanding balance when a payment is accepted.
- Allocate accepted amounts to unpaid invoices in invoice-date order, updating partial or paid status.

These features record and allocate payments; they do not transfer money through a bank or payment gateway.

### 11. Returns, disposals, and replacement tracking

Manage stock removed from normal dispensing through a separate adjustment history.

- Initiate a return to supplier or a disposal/write-off.
- Record medicine, batch, supplier, quantity, value, reason, and status.
- Set the affected medicine's quantity to zero while retaining the medicine record.
- Create pending return records and completed disposal records.
- Process replacement outcomes that create replacement stock.
- Record refund outcomes and associated supplier-balance adjustments.
- Review and print adjustment history.

The current adjustment operation acts on the medicine record's **entire recorded quantity**. It is not a partial-quantity return workflow.

### 12. Controlled-drug transaction logs

Controlled medicine sales require patient name, doctor name, and a prescription reference at checkout.

The backend creates a transaction log for each controlled medicine sold, including medicine, quantity, patient, doctor, sale reference, and status. Voiding a sale updates the associated log status.

The application provides an NMRA-labelled log screen for reviewing these records. This is internal recordkeeping functionality; it does not submit records to an external NMRA service or establish regulatory certification.

### 13. Dashboards and management reports

Role-specific dashboards present sales activity, stock information, procurement information, payment summaries, and operational records using charts and summary cards.

The Admin reports module provides:

- Date-filtered sales registers with completed and voided totals.
- Current supplier invoice balances and ageing buckets.
- Supplier-master versus invoice-balance reconciliation.
- Current inventory quantities and valuation at recorded cost.
- Stock-adjustment and supplier-payment source registers.
- A separate cashbook with a confirmed opening balance.
- Operating, investing, and financing cash-flow categories.
- Referenced cash entries and reversal-based corrections that retain original records.
- CSV exports and printable HTML reports with browser **Save as PDF** support.
- Export metadata including reporting period, generation time, currency, and report basis.

The reporting backend checks for an active Admin account. It uses integer-cent arithmetic for cashbook calculations and consistent database snapshots when assembling reports.

**Report basis:** cash flow comes from administrator-confirmed cashbook entries. Sales and accepted supplier payments are not automatically treated as settled cash. Inventory and supplier balances are current snapshots, even when a historical reporting period is selected. Reports are management reports, not audited financial statements.

### 14. AI Outbreak Radar

The outbreak module combines recent Sri Lankan health-news headlines with current medicine inventory.

- Retrieve Google News RSS results for health-related reporting from the last 14 days.
- Filter unrelated sports content and select up to ten articles for analysis.
- Use Google Gemini to generate a risk summary, identified trends, and stock suggestions.
- Associate trends with article identifiers from the retrieved sources.
- Retrieve article images from feed data or publisher metadata when available.
- Present a news-image slideshow, trend details, charts, and a Sri Lanka map.
- Store analysis history and retrieve previous results.

The module provides **news-based planning assistance**. Suggested quantities and AI confidence labels are model-generated estimates, not validated epidemiological measurements or confirmed outbreak surveillance.

### 15. Public chatbot and animated assistant

**Public pharmacy chatbot**

- Gemini-powered conversations in Sinhala, English, or Singlish.
- General explanations of pharmacy concepts and platform features.
- Limited conversation history, input validation, request throttling, and service-error handling.
- Opens from the landing-page chat interface.

The chatbot has no live access to stock, prices, customer records, prescriptions, or orders.

**Animated interface assistant**

A separate tracking component reacts visually to loading, success, error, and idle states. It observes request outcomes and interface activity to provide feedback. It is distinct from the conversational AI service.

### 16. Notifications and scheduled reminders

- In-app notification dropdowns, unread counts, and mark-as-read actions.
- Socket.IO notifications for supported medicine, sales, and restock operations.
- Email workflows for expiry alerts, low stock, returns, stock requests, supplier invitations, and staff OTPs.
- A daily scheduled job for unpaid purchase invoices due within five days or already overdue.
- Recorded reminder state to avoid repeating the same scheduled invoice reminder.

Expiry, low-stock, and return emails are triggered through application endpoints. The supplied scheduled job specifically handles supplier-payment due reminders.

## Connected workflows

| Workflow | Connected records and effects |
| --- | --- |
| **Receive stock** | Supplier → purchase invoice and GRN → purchase items → medicine quantity/prices → supplier balance. |
| **Dispense a prescription** | CRM patient → prescription → POS medicine matching → checkout → stock reduction → dispensing status → controlled-drug log where applicable. |
| **Replenish stock** | Inventory item → selected purchase item → restock request → supplier decision → quantity and invoice adjustments. |
| **Accept a supplier payment** | Pending payment → acceptance → supplier balance reduction → oldest unpaid invoice allocation. |
| **Correct a sale** | Recorded sale → void action → stock restoration → associated log status update. |
| **Prepare cash-flow reports** | Confirmed opening balance → settled cash entries → operating/investing/financing totals → export with report basis. |

## Technology stack

| Layer | Technologies | Purpose |
| --- | --- | --- |
| Frontend | React, React DOM, JavaScript/JSX | Component-based portal interfaces. |
| Routing and state | React Router, React Context, React Hooks | Navigation, role-aware page access, authentication state, and local UI state. |
| UI and styling | Utility-class styling, custom CSS, Lucide React, React Icons | Portal layouts, forms, icons, and responsive presentation. |
| Animation and feedback | Framer Motion, React Hot Toast | Interface transitions, notifications, and user feedback. |
| Charts and maps | Highcharts, Highcharts React, Highcharts map/3D modules, Recharts | Dashboard charts, prescription analytics, and geographic presentation. |
| HTTP client | Axios, Fetch API | Frontend API requests and external data retrieval. |
| Backend | Node.js, Express, CORS, dotenv | REST endpoints, request handling, and configuration. |
| Data layer | Sequelize; MySQL-backed project design | Models, relationships, queries, and transactional updates. |
| Authentication | bcrypt, JSON Web Tokens, Node.js crypto | Password hashes, sessions, and supplier invitation tokens. |
| Real-time events | Socket.IO, Socket.IO Client | Notifications and refresh signals. |
| AI | Google Gemini through `@google/generative-ai` | Prescription extraction, outbreak analysis, CRM insights, and public chat. |
| Email and scheduling | Nodemailer, node-cron | Email delivery and scheduled invoice reminders. |
| Upload handling | Multer | In-memory prescription-image uploads. |
| News processing | rss-parser, Cheerio, google-news-url-decoder | RSS parsing, publisher-link resolution, and article-image metadata extraction. |
| Exports | Browser Blob APIs, CSV, HTML, browser printing | Downloadable reports and printable receipts. |

Dependency versions and the build-tool configuration should be taken from the repository's package manifests and lockfiles.

## Application architecture

The application uses a client–server structure:

- **Pages and components** render portal screens and collect user input.
- **API helpers** send HTTP requests and attach JWT credentials where configured.
- **Express routes** map requests to controller functions.
- **Controllers** implement workflows, validation, model operations, and external-service calls.
- **Sequelize models** describe stored entities and relationships.
- **Socket.IO** sends update signals to connected interfaces.
- **Scheduled utilities** run invoice-reminder checks.

Important stored entities include medicines, customers, prescriptions, sale items, suppliers, purchase invoices, purchase items, supplier payments, stock adjustments, restock requests, notifications, AI outbreak logs, and report cashbook entries.

The checkout implementation groups `SaleItem` records by `saleId` to reconstruct sales history. Prescription items are currently serialized into fields on the prescription record and reconstructed for API responses. Separate `Sale` and `PrescriptionItem` models also exist; their presence should not be confused with the active controller persistence paths.

## API overview

Default local API base: `http://localhost:5000/api`

| Area | Representative endpoints |
| --- | --- |
| Authentication | `POST /auth/login`, `POST /auth/verify-otp`, `POST /auth/supplier-login` |
| Account setup | `POST /auth/setup-admin`, `POST /auth/setup-cashier`, `POST /auth/setup-pharmacist` |
| Medicines | `GET/POST /medicines`, `PUT/DELETE /medicines/:id` |
| Customers | `GET/POST /crm/customers`, `PUT/DELETE /crm/customers/:id` |
| CRM insights | `GET /crm/customers/:id/ai-insights` |
| Refill reminders | `GET/POST /crm/reminders`, `PUT/DELETE /crm/reminders/:id` |
| Prescriptions | `GET/POST /prescriptions`, `PUT/DELETE /prescriptions/:id` |
| Prescription scanning | `POST /prescriptions/scan`, `POST /prescriptions/upload-ai` |
| Sales | `GET /sales`, `POST /sales/checkout`, `PUT/DELETE /sales/:id` |
| Suppliers | `GET/POST /suppliers`, `PUT/DELETE /suppliers/:id` |
| Supplier onboarding | `POST /suppliers/:id/invite`, `GET /suppliers/verify-token/:token`, `POST /suppliers/setup-password` |
| Supplier password | `PUT /suppliers/change-password` |
| Purchases | `GET/POST /purchases`, `GET /purchases/my-purchases` |
| Supplier payments | `GET/POST /supplier-payments`, `PUT /supplier-payments/:id/accept`, `PUT /supplier-payments/:id/reject` |
| Returns and disposals | `POST /returns/adjust`, `GET /returns/history`, `POST /returns/replace/:id`, `POST /returns/refund/:id` |
| Controlled-drug logs | `GET /nmra-logs` |
| Notifications | `GET /notifications/unread`, `PUT /notifications/:id/read` |
| Restock requests | `POST /notifications/trigger-stock-request`, `GET /notifications/restock-requests`, `PUT /notifications/restock-requests/:id/accept`, `PUT /notifications/restock-requests/:id/reject` |
| Outbreak analysis | `GET /ai-outbreak/analyze`, `GET /ai-outbreak/history` |
| Public chatbot | `POST /chatbot/message` |
| Admin reports | `GET /reports/snapshot`, `POST /reports/cash-opening`, `POST /reports/cash-entries`, `POST /reports/cash-entries/:id/reverse` |

For multipart prescription scanning, `/scan` accepts the field `prescription`; `/upload-ai` accepts the field `image`.

## Configuration

The supplied backend references these environment variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend listening port; defaults to `5000`. |
| `JWT_SECRET` | JWT signing and verification secret. |
| `EMAIL_USER` | Gmail account used by Nodemailer. |
| `EMAIL_PASS` | Email authentication credential. |
| `FRONTEND_URL` | Supplier invitation-link origin; defaults to `http://localhost:3000`. |
| `GEMINI_API_KEY` | Prescription scanning; also the public chatbot's fallback key. |
| `CRM_GEMINI_API_KEY` | CRM AI insights. |
| `AI_ANALYSIS_GEMINI_API_KEY` | Outbreak analysis. |
| `CHATBOT_GEMINI_API_KEY` | Dedicated public-chatbot key. |
| `CHATBOT_GEMINI_MODEL` | Optional public-chatbot model override. |

Database connection settings belong in the project's `backend/config/db.js` configuration. The supplied source defaults to a frontend at `http://localhost:3000` and a backend at `http://localhost:5000`; several pages also contain absolute API URLs.

To run the complete repository, use its frontend and backend package manifests to install dependencies and select the defined start scripts, configure the database connection and required services, and start both applications. Exact package-manager commands and database variable names are intentionally not assumed here: package manifests, lockfiles, database configuration, and some imported support files were not part of the source set used to prepare this README.

## Implementation notes

- **Access control:** role-aware frontend routes and selected JWT-protected backend routes are implemented. Backend authentication and role checks are not applied uniformly across every route; frontend protection alone does not secure an API.
- **Refresh behaviour:** the application combines Socket.IO, polling, browser focus events, and storage signals. Refresh behaviour varies by screen.
- **AI integrations:** prescription extraction and outbreak analysis use the model identifier `gemini-3-flash-preview` in the supplied code. External-service availability and model access depend on the configured account.
- **CRM insights:** the separate AI-insights controller queries the `Sale` model, while active checkout writes `SaleItem` records. It should not be described as a fully reconciled purchase-history analysis without aligning those data paths.
- **Database startup:** the supplied server uses `sequelize.sync({ alter: true })`. Deployment should use a reviewed schema-change process appropriate to the target database.
- **Validation scope:** this README describes the supplied implementation. The complete application was not built or executed during documentation preparation, and this documentation does not assert production readiness or regulatory certification.
