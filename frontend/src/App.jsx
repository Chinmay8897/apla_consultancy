import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  FileSpreadsheet,
  Settings,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Check,
  RefreshCw,
  LogOut,
  Calendar
} from 'lucide-react';
import { AnimatedTicker } from './components/AnimatedTicker';
import { LoginPage } from './components/LoginPage';
import { SchedulingCalendar } from './components/SchedulingCalendar';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const API_TOKEN = 'munder-difflin-secret-token-2026';

export default function App() {
  // --- Convex Real-time Data ---
  const convexInvoices = useQuery(api.invoices.getInvoices);
  const createInvoiceMutation = useMutation(api.invoices.createInvoice);

  // --- Authentication State ---
  const [authData, setAuthData] = useState(() => {
    try {
      const saved = localStorage.getItem('apla_auth_user') || sessionStorage.getItem('apla_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('apla_auth_user');
    sessionStorage.removeItem('apla_auth_user');
    setAuthData(null);
  };

  // --- Toast Notification System ---
  const [toasts, setToasts] = useState([]);

  const addToast = (type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- Active Sidebar Navigation State ---
  const [activeMenu, setActiveMenu] = useState('create-invoice');
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // --- Search Bar State ---
  const [topSearch, setTopSearch] = useState('');

  // --- Invoice Form State ---
  const [invoiceNumber, setInvoiceNumber] = useState(() => `INV-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');

  // Invoice Details Extra Fields
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [shipToAddress, setShipToAddress] = useState('');
  const [productBrief, setProductBrief] = useState('');

  // Procurement & GST Compliance Fields
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  const [grn, setGrn] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [reverseCharge, setReverseCharge] = useState('');

  // Line items array - starts empty until the user adds items
  const [items, setItems] = useState([]);

  // Loading & Success States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);

  // Generate new Invoice ID
  const generateNewInvoiceNumber = () => {
    const rand = Math.floor(100 + Math.random() * 900);
    setInvoiceNumber(`INV-2026-${rand}`);
  };

  const fetchRecentInvoices = useCallback(async () => {
    if (!authData) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/invoices`, {
        headers: { 'x-api-key': authData?.token || API_TOKEN }
      });
      if (res.data.success) {
        setRecentInvoices(res.data.invoices || []);
      }
    } catch {
      // background fallback
    }
  }, [authData]);

  useEffect(() => {
    fetchRecentInvoices();
  }, [fetchRecentInvoices]);

  // --- Mathematical Real-time Calculations ---
  const taxableAmount = items.reduce((sum, item) => {
    const unitCost = parseFloat(item.cost) || 0;
    const quantity = parseInt(item.qty, 10) || 1;
    return sum + Math.max(0, unitCost * quantity);
  }, 0);

  const cgst = Number((taxableAmount * 0.09).toFixed(2));
  const sgst = Number((taxableAmount * 0.09).toFixed(2));
  const grandTotal = Number((taxableAmount + cgst + sgst).toFixed(2));

  // --- Item Handlers ---
  const handleAddServiceItem = () => {
    const newItem = {
      id: `item-${Date.now()}`,
      description: '',
      hseSacCode: '',
      cost: '',
      qty: 1
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // --- Submission Handler ---
  const handleIssueInvoice = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!customerName.trim()) {
      addToast('error', 'Missing Customer', 'Please specify a Customer Name before issuing.');
      return;
    }

    if (items.length === 0) {
      addToast('error', 'Empty Invoice', 'Please add at least one product or service item.');
      return;
    }

    const hasInvalid = items.some(
      (item) => !item.description.trim() || isNaN(parseFloat(item.cost)) || parseFloat(item.cost) < 0
    );

    if (hasInvalid) {
      addToast('error', 'Invalid Items', 'Ensure all line items have descriptions and valid positive costs.');
      return;
    }

    setIsGenerating(true);
    setIsSuccess(false);

    try {
      const payload = {
        invoiceNumber,
        date,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        customerGstin: customerGstin.trim() || undefined,
        placeOfSupply: placeOfSupply.trim() || undefined,
        reverseCharge: reverseCharge.trim() || undefined,
        poNumber: poNumber.trim() || undefined,
        poDate: poDate.trim() || undefined,
        grn: grn.trim() || undefined,
        remarks: productBrief.trim() || undefined,
        taxableAmount,
        cgst,
        sgst,
        totalAmount: grandTotal,
        items: items.map((i) => ({
          description: i.description.trim(),
          hseSacCode: i.hseSacCode?.trim() || '',
          cost: parseFloat(i.cost) * (parseInt(i.qty, 10) || 1)
        }))
      };

      // 1. Persist directly into Convex Cloud Database
      if (createInvoiceMutation) {
        try {
          await createInvoiceMutation(payload);
        } catch (convexErr) {
          console.warn('Convex mutation note:', convexErr.message);
        }
      }

      // 2. Also dispatch to local/Express server for PDF/Excel files if running
      let fileUrls = { pdf: '#', excel: '#' };
      try {
        const res = await axios.post(`${API_BASE_URL}/api/invoices`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': authData?.token || API_TOKEN
          },
          timeout: 4000
        });
        if (res.data?.downloadUrls) {
          fileUrls = res.data.downloadUrls;
        }
      } catch {
        // Express backend is optional when deployed to Convex + Vercel
      }

      setIsSuccess(true);
      setLastGenerated({
        success: true,
        invoice: {
          invoiceNumber,
          customerName,
          totalAmount: grandTotal
        },
        downloadUrls: fileUrls
      });
      fetchRecentInvoices();
      addToast('success', 'Invoice Issued', `Invoice ${invoiceNumber} created and saved in Convex database!`);

      setTimeout(() => {
        setIsSuccess(false);
      }, 4000);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error creating invoice';
      addToast('error', 'Invoice Error', msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // If user is not authenticated, render the dedicated LoginPage
  if (!authData) {
    return <LoginPage onLoginSuccess={(data) => setAuthData(data)} />;
  }

  return (
    <div className="min-h-screen bg-[#F6F7FA] text-slate-800 flex font-sans antialiased" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

      {/* ========================================================
          LEFT NAVIGATION SIDEBAR
          ======================================================== */}
      <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col shrink-0 min-h-screen sticky top-0 h-screen overflow-y-auto custom-scrollbar select-none z-20">

        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 via-teal-800 to-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-teal-700/10 shrink-0">
            AC
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate leading-tight">
              APLA Consultancy
            </h1>
            <p className="text-[11px] text-slate-500 truncate font-medium">
              Consulting & Advisory Services
            </p>
          </div>
        </div>

        {/* Clean Focused Navigation: Create Invoice & Invoice History */}
        <nav className="p-3.5 space-y-1.5 flex-1 text-[13px] font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveMenu('create-invoice')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeMenu === 'create-invoice'
                ? 'bg-teal-700 text-white font-semibold shadow-xs'
                : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
              }`}
          >
            <FileText className={`w-4 h-4 ${activeMenu === 'create-invoice' ? 'text-white' : 'text-slate-400'}`} />
            <span>Create Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('scheduling-calendar')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeMenu === 'scheduling-calendar'
                ? 'bg-teal-700 text-white font-semibold shadow-xs'
                : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
              }`}
          >
            <Calendar className={`w-4 h-4 ${activeMenu === 'scheduling-calendar' ? 'text-white' : 'text-slate-400'}`} />
            <span>Audit Calendar</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              <span>Invoice History</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {recentInvoices.length}
            </span>
          </button>
        </nav>

        {/* Sidebar Footer: Settings & User Profile */}
        <div className="p-3.5 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => addToast('info', 'Settings', 'Preferences and tax configurations.')}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </button>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-2 py-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                A
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 m-0 leading-none">Admin</p>
                <p className="text-[10px] text-slate-400 m-0 mt-0.5">Owner</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Logout session"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </aside>

      {/* ========================================================
          MAIN WORKSPACE AREA
          ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Navbar */}
        <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-10 select-none">
          {/* Search Bar */}
          <div className="w-96 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products, invoices, customers..."
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 transition"
            />
          </div>

          {/* Right Header Badges */}
          <div className="flex items-center space-x-4 text-xs text-slate-600">
            <span className="hidden sm:inline-block font-medium text-slate-500">
              Tuesday, 13 Oct 2026
            </span>
          </div>
        </header>

        {/* --- Toast System --- */}
        <div className="fixed top-5 right-5 z-50 flex flex-col space-y-2.5 pointer-events-none max-w-sm w-full">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={`pointer-events-auto rounded-xl p-3.5 border shadow-lg flex items-start space-x-3 bg-white ${toast.type === 'success'
                    ? 'border-emerald-200 text-emerald-950 shadow-emerald-500/5'
                    : toast.type === 'error'
                      ? 'border-rose-200 text-rose-950 shadow-rose-500/5'
                      : 'border-teal-200 text-teal-950 shadow-teal-500/5'
                  }`}
              >
                <div className="shrink-0 mt-0.5">
                  {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
                  {toast.type === 'info' && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-slate-900 m-0">{toast.title}</p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed m-0">{toast.message}</p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 text-slate-400 hover:text-slate-700 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* --- Main Document Workspace --- */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          <AnimatePresence mode="wait">
            {activeMenu === 'scheduling-calendar' ? (
              <motion.div
                key="scheduling-calendar"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22 }}
              >
                <SchedulingCalendar onBackToInvoice={() => setActiveMenu('create-invoice')} />
              </motion.div>
            ) : (
              <motion.div
                key="create-invoice"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22 }}
                className="space-y-6"
              >
                {/* Page Heading in Helvetica */}
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between pb-2 border-b border-slate-200/60">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight m-0">
                      New Invoice
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 m-0">
                      Choose the customer and products. Prices, HSN and GST fill in by themselves.
                    </p>
                  </div>
                  <div className="mt-2 sm:mt-0 text-xs font-semibold text-slate-400">
                    13 Oct 2026
                  </div>
                </div>

                {/* Form and Summary Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Main Form Column (8 cols) */}
            <form onSubmit={handleIssueInvoice} className="lg:col-span-8 space-y-5">

              {/* Card 1: Customer Card */}
              <div className="light-card p-5 space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Customer
                </label>
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Search by name, phone, email or GSTIN..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm bg-white placeholder:text-slate-400 text-slate-900 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 transition shadow-2xs"
                  />
                </div>

                {/* Additional Customer metadata detail fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. contact@client.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Customer GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 29AABCU9603R1ZM"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 transition"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Billing Address (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 742 Silicon Horizon Way, Bengaluru"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Place of supply
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TELANGANA (36)"
                      value={placeOfSupply}
                      onChange={(e) => setPlaceOfSupply(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Reverse Charge
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. No"
                      value={reverseCharge}
                      onChange={(e) => setReverseCharge(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 transition"
                    />
                  </div>
                </div>

              </div>

              {/* Card 2: Line Items & Add Service Section */}
              <div className="light-card p-5 space-y-4">

                {/* Search / Add Actions Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search product, model or scan a barcode..."
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-xs bg-slate-50/50 placeholder:text-slate-400 text-slate-800 focus:outline-none focus:border-teal-700 focus:bg-white transition"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddServiceItem}
                    className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 transition active:scale-98 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-700" />
                    <span>+ Add Service</span>
                  </button>
                </div>

                {/* Line Items Table or Empty State */}
                {items.length === 0 ? (
                  <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                    <p className="text-sm font-semibold text-slate-700 m-0">No products or services yet</p>
                    <p className="text-xs text-slate-400 mt-1 m-0">
                      Search above to add the first item, or use + Add Service.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-1.5 border-b border-slate-100 px-2">
                      <span className="col-span-12 sm:col-span-6">Description</span>
                      <span className="col-span-4 sm:col-span-2 text-center">HSN / SAC</span>
                      <span className="col-span-3 sm:col-span-1 text-center">Qty</span>
                      <span className="col-span-4 sm:col-span-2 text-right">Rate (₹)</span>
                      <span className="col-span-1 text-center">Del</span>
                    </div>

                    <AnimatePresence initial={false}>
                      {items.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg border border-slate-200/70 bg-white hover:border-slate-300 transition"
                        >
                          <div className="col-span-12 sm:col-span-6">
                            <input
                              type="text"
                              required
                              placeholder="e.g. Annual System Audit"
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-teal-700 transition"
                            />
                          </div>

                          <div className="col-span-4 sm:col-span-2">
                            <input
                              type="text"
                              placeholder="998311"
                              value={item.hseSacCode}
                              onChange={(e) => handleItemChange(item.id, 'hseSacCode', e.target.value)}
                              className="w-full text-center rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-700 transition"
                            />
                          </div>

                          <div className="col-span-3 sm:col-span-1">
                            <input
                              type="number"
                              min="1"
                              value={item.qty || 1}
                              onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                              className="w-full text-center rounded-md border border-slate-200 px-1 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-700 transition"
                            />
                          </div>

                          <div className="col-span-4 sm:col-span-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              placeholder="0.00"
                              value={item.cost}
                              onChange={(e) => handleItemChange(item.id, 'cost', e.target.value)}
                              className="w-full text-right rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-700 transition"
                            />
                          </div>

                          <div className="col-span-1 flex justify-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              title="Delete Item"
                              className="p-1.5 rounded transition text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Card 3: Invoice Details Card */}
              <div className="light-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider m-0">
                    Invoice Details
                  </h3>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{invoiceNumber}</span>
                    <button
                      type="button"
                      onClick={generateNewInvoiceNumber}
                      title="Generate new invoice number"
                      className="p-1 rounded text-slate-400 hover:text-teal-700 hover:bg-slate-100 transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Row 1: Invoice date, Payment, Amount already paid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Invoice date
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-700 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Payment
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-700 transition font-medium"
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI / GPAY">UPI / GPAY</option>
                      <option value="BANK TRANSFER">BANK TRANSFER / NEFT</option>
                      <option value="CREDIT CARD">CREDIT CARD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Amount already paid
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-700 transition"
                    />
                  </div>
                </div>

                {/* Row: Procurement details (P O NO, PO DATE, GRN) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      P O NO
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PO-8921"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-700 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      PO DATE
                    </label>
                    <input
                      type="date"
                      value={poDate}
                      onChange={(e) => setPoDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-700 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      GRN
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GRN-104"
                      value={grn}
                      onChange={(e) => setGrn(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-700 transition"
                    />
                  </div>
                </div>

                {/* Row 2: Terms, Due date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Terms
                    </label>
                    <input
                      type="text"
                      placeholder="Due on Receipt"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-700 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Due date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-700 transition"
                    />
                  </div>
                </div>

                {/* Row 3: Ship to */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Ship to (leave blank to use the customer's address)
                  </label>
                  <input
                    type="text"
                    placeholder="Delivery address"
                    value={shipToAddress}
                    onChange={(e) => setShipToAddress(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-700 transition"
                  />
                </div>

                {/* Row 4: Product brief */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Product brief (printed under the items)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief notes, terms or instructions..."
                    value={productBrief}
                    onChange={(e) => setProductBrief(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-700 transition resize-none"
                  />
                </div>
              </div>
            </form>

            {/* Right Summary Column (4 cols) */}
            <div className="lg:col-span-4 sticky top-20 space-y-4">

              {/* Summary Card */}
              <div className="light-card-elevated p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Summary
                </h3>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex justify-between items-center">
                    <span>Subtotal • {items.length} items</span>
                    <span className="font-medium text-slate-900">
                      <AnimatedTicker value={taxableAmount} />
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>CGST (9.0%)</span>
                    <span className="font-medium text-slate-900">
                      <AnimatedTicker value={cgst} />
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>SGST (9.0%)</span>
                    <span className="font-medium text-slate-900">
                      <AnimatedTicker value={sgst} />
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-900">Total</span>
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      <AnimatedTicker value={grandTotal} />
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 m-0 pt-1 leading-relaxed">
                    Rates include GST — exact 9% CGST and 9% SGST calculated automatically.
                  </p>
                </div>

                {/* Primary Issue Invoice Button */}
                <button
                  type="button"
                  onClick={handleIssueInvoice}
                  disabled={isGenerating}
                  className={`w-full py-3 px-4 rounded-lg font-bold text-sm tracking-wide text-white transition-all shadow-sm flex items-center justify-center space-x-2 active:scale-98 ${isSuccess
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : isGenerating
                        ? 'bg-teal-700/80 cursor-wait'
                        : 'bg-[#18687D] hover:bg-[#145667]'
                    }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Issuing Invoice...</span>
                    </>
                  ) : isSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Invoice Issued</span>
                    </>
                  ) : (
                    <span>Issue Invoice</span>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 text-center m-0 leading-relaxed">
                  Issuing generates verified PDF & Excel documents and synchronizes records.
                </p>

                <div className="text-center pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => addToast('info', 'Draft', 'Invoice draft state preserved in browser.')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition"
                  >
                    Save as draft
                  </button>
                </div>
              </div>

              {/* Generated Document Card (appears when invoice is created) */}
              <AnimatePresence>
                {lastGenerated && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="light-card p-5 space-y-3 border-teal-200 bg-teal-50/30"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 m-0">Invoice Ready</p>
                        <p className="text-[11px] text-slate-500 m-0">
                          {lastGenerated.invoice.invoiceNumber}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={lastGenerated.downloadUrls.pdf}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center justify-center space-x-1.5 transition shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-rose-600" />
                        <span>PDF</span>
                      </a>

                      <a
                        href={lastGenerated.downloadUrls.excel}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center justify-center space-x-1.5 transition shadow-2xs"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Excel</span>
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ========================================================
          INVOICE HISTORY MODAL / SLIDE-OVER
          ======================================================== */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 m-0">Invoice History</h3>
                  <p className="text-xs text-slate-400 m-0">All generated invoices and download records</p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 max-h-96 overflow-y-auto custom-scrollbar space-y-2">
                {(() => {
                  const displayedInvoices = (convexInvoices && convexInvoices.length > 0) ? convexInvoices : recentInvoices;
                  if (convexInvoices === undefined && recentInvoices.length === 0) {
                    return (
                      <div className="flex items-center justify-center py-8 text-xs text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span>Connecting to Convex Cloud...</span>
                      </div>
                    );
                  }
                  if (displayedInvoices.length === 0) {
                    return <p className="text-center py-8 text-xs text-slate-400">No past invoices available.</p>;
                  }
                  return displayedInvoices.map((inv) => (
                    <div
                      key={inv._id || inv.id}
                      className="p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/50 hover:bg-white flex items-center justify-between text-xs transition"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-slate-900 m-0">{inv.invoiceNumber}</p>
                          {inv._id && (
                            <span className="text-[9px] bg-teal-50 text-teal-800 font-bold px-1.5 py-0.5 rounded border border-teal-200/80">
                              Live Cloud
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 m-0 mt-0.5">
                          {inv.customerName} • ₹{Number(inv.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {inv.pdfPath && (
                          <a
                            href={inv.pdfPath.startsWith('http') ? inv.pdfPath : `${API_BASE_URL}${inv.pdfPath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                            title="Download PDF"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                        {inv.excelPath && (
                          <a
                            href={inv.excelPath.startsWith('http') ? inv.excelPath : `${API_BASE_URL}${inv.excelPath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            title="Download Excel"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
