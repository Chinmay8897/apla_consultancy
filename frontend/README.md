# APLA Consultancy • Frontend Invoice Studio

The frontend interface for **APLA Consultancy Billing & Invoice Studio**, built with React 19, Vite, and Tailwind CSS.

---

## 🎨 Visual Identity & Design Guidelines

- **Typography**: Universal **Helvetica** (`'Helvetica Neue', Helvetica, Arial, sans-serif`) strictly configured across all pages, forms, and cards.
- **Palette**: Clean light theme with deep teal `#18687D` primary accents, neutral slate borders (`#E2E8F0`), and soft elevated card backgrounds.
- **Component Styling**: Styled using utility classes and reusable component card tokens in `src/index.css`.
- **Micro-Animations**: Layout transitions and spring counters powered by `framer-motion`.

---

## 📂 Key Components & Architecture

- **`src/components/LoginPage.jsx`**:
  - Secure authentication portal.
  - Interactive email and password input fields with toggleable visibility.
  - "Remember me" option (`localStorage` vs. `sessionStorage`).
  - Session verification against backend endpoint with offline safety fallback.
- **`src/components/AnimatedTicker.jsx`**:
  - Dynamic number rolling animation for real-time subtotal, GST (CGST/SGST 9%), and grand total updates.
- **`src/App.jsx`**:
  - Main workspace containing the navigation sidebar, invoice creation forms, line item management, and invoice history modal.

---

## 🚀 Running the Frontend

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```
Runs locally at **`http://localhost:5173`**.

### 3. Production Build
```bash
npm run build
```
Generates production-ready compiled assets in the `dist/` directory.

### 4. Code Quality & Linting
```bash
npm run lint
# or using oxlint:
npx oxlint
```

---

## 🔗 Connected Services
- Backend API default URL: `http://localhost:5000`
- Invoice API routes: `/api/invoices`
- Auth route: `/api/auth/login`
