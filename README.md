# APLA Consultancy • Modern Billing & Invoice Studio

A modern, full-stack billing and invoice generation platform designed for **APLA Consultancy** (Anand Professionals & Law Advisors). Built with a clean light theme, universal Helvetica typography, secure authentication, real-time GST calculations, automated PDF/Excel document compilation, and persistent SQLite database storage.

---

## 🌟 Highlights & Features

- **🔐 Secure Authentication & Session Management**:
  - Dedicated sign-in portal with validation, visibility toggles, and session persistence (`localStorage` / `sessionStorage`).
  - Owner / Admin profile management with one-click logout.
- **🎨 Brand Design & Pure Typography**:
  - Tailored light aesthetic with deep teal (`#18687D`) accents and subtle border shadows.
  - Strict universal **Helvetica** typography (`'Helvetica Neue', Helvetica, Arial, sans-serif`) across all screens and components.
  - Smooth micro-interactions powered by `framer-motion`.
- **🧾 Complete Invoice & Procurement Data**:
  - **Customer Details**: Name, email, billing address, and Customer GSTIN.
  - **GST & Tax Jurisdictions**: Place of Supply and Reverse Charge tracking.
  - **Procurement & Order References**: P O NO, PO DATE, and GRN (Goods Receipt Note).
  - **Payment & Terms**: Payment mode (Cash, UPI, Bank Transfer, Credit Card), amount paid, terms, due date, shipping address, and product brief.
  - **Dynamic Line Items**: Real-time item additions and removals with custom descriptions, HSN/SAC codes, quantities, and rates.
- **⚡ Exact Mathematical Calculations**:
  - Dynamic taxable subtotal calculation.
  - Automated 9.0% CGST + 9.0% SGST Indian GST calculations.
  - Grand total computation with animated number counters.
- **📄 Instant Dual Document Generation**:
  - **PDF Invoices**: Pixel-perfect printable tax invoices generated on-the-fly with `pdfkit`.
  - **Excel Sheets**: Audit-ready structured `.xlsx` workbooks created with `exceljs`.
  - Instant direct download links and previews upon generation.
- **🗄️ Database & Invoice History**:
  - Backed by SQLite via Prisma ORM for zero-configuration, reliable persistence.
  - Interactive Invoice History viewer displaying issued invoices, metadata, and quick access to generated files.

---

## 🛠️ Architecture & Tech Stack

### Frontend
- **Framework**: React 19 via Vite
- **Styling**: Vanilla CSS + Tailwind CSS utilities
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **HTTP Client**: Axios
- **Design System**: APLA Custom Light Theme (Helvetica typography)

### Backend
- **Runtime**: Node.js (ES Modules) & Express
- **ORM & Database**: Prisma ORM with SQLite
- **PDF Generation**: `pdfkit`
- **Excel Generation**: `exceljs`
- **Security & CORS**: Express CORS middleware, token-based authentication (`x-api-key` / `Authorization`)

---

## 📁 Repository Structure

```
invoice-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma models (Invoice, LineItem)
│   │   └── dev.db              # SQLite database file
│   ├── src/
│   │   ├── index.js            # Express app entry point & auth routes
│   │   ├── prisma.js           # Prisma client singleton
│   │   ├── middleware/
│   │   │   └── auth.js         # API token authentication middleware
│   │   ├── routes/
│   │   │   └── invoiceRoutes.js# REST endpoints for invoice creation & retrieval
│   │   └── utils/
│   │       ├── pdfGenerator.js # PDF compilation engine
│   │       ├── excelGenerator.js# Excel (.xlsx) compilation engine
│   │       └── formatters.js   # Currency, date, and numbers-to-words helpers
│   ├── uploads/                # Static storage for generated PDFs and Excel files
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginPage.jsx   # Authentication and login component
│   │   │   └── AnimatedTicker.jsx# Framer Motion animated number counter
│   │   ├── App.jsx             # Main application layout, sidebar, and invoice studio
│   │   ├── App.css             # Component layout styles
│   │   ├── index.css           # Global design system & Helvetica font rules
│   │   └── main.jsx            # React root mount
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── AGENTS.md                   # Project rules and agent instructions
├── README.md                   # Main project documentation
└── package.json                # Root package scripts
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

---

### 1. Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Synchronize database schema:
   ```bash
   npx prisma db push
   ```

4. Start the backend server:
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```
   The backend server runs on **`http://localhost:5000`**.

---

### 2. Frontend Setup

1. Open a second terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
   Open **`http://localhost:5173`** in your browser to access the application.

---

## 📡 API Reference

### 1. Authentication
- **`POST /api/auth/login`**
  - **Body**: `{ "email": "admin@apla.com", "password": "admin123" }`
  - **Response**: `{ "success": true, "token": "<jwt-token>", "user": { "id": "...", "name": "Admin", "role": "Owner" } }`

### 2. Invoices (Protected)
*Requires `x-api-key` or `Authorization: Bearer <token>` header.*

- **`GET /api/invoices`**
  - Returns a list of all issued invoices ordered by latest date.
- **`GET /api/invoices/:id`**
  - Retrieves a specific invoice by ID or invoice number.
- **`POST /api/invoices`**
  - Creates a new invoice, calculates taxes, generates PDF and Excel files, and saves records to the database.
  - **Payload Structure**:
    ```json
    {
      "invoiceNumber": "INV-2026-101",
      "date": "2026-10-13",
      "customerName": "Client Corporation",
      "customerEmail": "finance@client.com",
      "customerAddress": "123 Commercial Boulevard",
      "customerGstin": "36AAPFA6515M1Z1",
      "placeOfSupply": "TELANGANA (36)",
      "reverseCharge": "No",
      "poNumber": "PO-9921",
      "poDate": "2026-10-10",
      "grn": "GRN-442",
      "remarks": "Professional Advisory Services",
      "items": [
        {
          "description": "System Architecture Review",
          "hseSacCode": "998311",
          "cost": 25000
        }
      ]
    }
    ```

### 3. Static Downloads
- **`GET /uploads/:filename`**
  - Serves generated `.pdf` and `.xlsx` files statically.

### 4. Health Check
- **`GET /api/health`**
  - Returns service status and timestamp.

---

## 🛡️ License

Internal proprietary software developed for **APLA Consultancy**. All rights reserved.
