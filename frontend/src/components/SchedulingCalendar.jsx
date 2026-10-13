import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Building,
  Briefcase
} from 'lucide-react';

// --- Initial Mock Data for Client Auditing & Scheduling ---
const INITIAL_AUDIT_SCHEDULE = [
  // October 2026 Mock Records
  { date: '2026-10-02', status: 'holiday', title: 'Gandhi Jayanti', note: 'National Holiday' },
  { date: '2026-10-06', status: 'booked', client: 'Acme Robotics International', auditType: 'Statutory GST Audit', time: '10:00 AM - 04:00 PM' },
  { date: '2026-10-08', status: 'booked', client: 'Apex Aerospace Corp', auditType: 'Financial Systems Review', time: '11:00 AM - 05:00 PM' },
  { date: '2026-10-14', status: 'available', title: 'Open Slot', time: 'Full Day Available' },
  { date: '2026-10-15', status: 'booked', client: 'Lloyds Offshore Services', auditType: 'Tax Compliance & Ledger Audit', time: '09:30 AM - 03:30 PM' },
  { date: '2026-10-16', status: 'available', title: 'Open Slot', time: 'Full Day Available' },
  { date: '2026-10-19', status: 'pending', client: 'Reliance Industries Ltd', auditType: 'Annual Retainer Review', note: 'Awaiting client confirmation' },
  { date: '2026-10-20', status: 'available', title: 'Open Slot', time: 'Morning & Afternoon Slots' },
  { date: '2026-10-21', status: 'available', title: 'Open Slot', time: 'Full Day Available' },
  { date: '2026-10-22', status: 'booked', client: 'Zenith Biotech Labs', auditType: 'Transfer Pricing Assessment', time: '10:00 AM - 02:00 PM' },
  { date: '2026-10-23', status: 'available', title: 'Open Slot', time: 'Full Day Available' },
  { date: '2026-10-26', status: 'pending', client: 'Horizon Digital Media', auditType: 'Internal Controls Audit', note: 'Agent verification pending' },
  { date: '2026-10-27', status: 'available', title: 'Open Slot', time: 'Full Day Available' },
  { date: '2026-10-28', status: 'available', title: 'Open Slot', time: 'Full Day Available' },
  { date: '2026-10-29', status: 'booked', client: 'Alpha Logistics Tech', auditType: 'Statutory Audit Phase 1', time: '10:00 AM - 05:00 PM' },
  { date: '2026-10-30', status: 'available', title: 'Open Slot', time: 'Full Day Available' }
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEAR_OPTIONS = [
  2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035
];

export function SchedulingCalendar({ onBackToInvoice }) {
  // Current view month & year (default October 2026)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 1));
  const [scheduleData, setScheduleData] = useState(INITIAL_AUDIT_SCHEDULE);
  
  // Slide-out modal state for booking an available date
  const [selectedDate, setSelectedDate] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  
  // Status check tooltip/details modal for pending or booked dates
  const [inspectDate, setInspectDate] = useState(null);

  // Exact date selection and jump state
  const [highlightedDate, setHighlightedDate] = useState(null);
  const [jumpDate, setJumpDate] = useState('');

  // Minimalist Booking Form State
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [auditType, setAuditType] = useState('Statutory & GST Compliance Audit');
  const [leadAuditor, setLeadAuditor] = useState('Senior Managing Consultant');
  const [specialNotes, setSpecialNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState(null);

  // Navigation & Selection Handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date(2026, 9, 13);
    setCurrentDate(today);
    const todayKey = '2026-10-13';
    setHighlightedDate(todayKey);
    setJumpDate(todayKey);
  };

  const handleMonthChange = (monthIdx) => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), monthIdx, 1));
  };

  const handleYearChange = (yearNum) => {
    setCurrentDate((prev) => new Date(yearNum, prev.getMonth(), 1));
  };

  const handleExactDateChange = (e) => {
    const val = e.target.value;
    setJumpDate(val);
    if (!val) {
      setHighlightedDate(null);
      return;
    }
    const [y, m, d] = val.split('-').map(Number);
    if (y && m && d) {
      setCurrentDate(new Date(y, m - 1, 1));
      setHighlightedDate(val);
    }
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const yearOptions = YEAR_OPTIONS.includes(currentYear)
    ? YEAR_OPTIONS
    : [...YEAR_OPTIONS, currentYear].sort((a, b) => a - b);

  // Calendar Grid Computations
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Helper to format date string YYYY-MM-DD
  const formatDateKey = (year, month, day) => {
    const y = year;
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Build grid days array
  const gridCells = [];

  // Trailing days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateKey = formatDateKey(currentMonth === 0 ? currentYear - 1 : currentYear, (currentMonth + 11) % 12, dayNum);
    gridCells.push({
      day: dayNum,
      dateKey,
      isCurrentMonth: false,
      status: 'holiday'
    });
  }

  // Days in current month
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateKey = formatDateKey(currentYear, currentMonth, d);
    const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
    const match = scheduleData.find((item) => item.date === dateKey);
    let cellStatus = 'available';
    let cellData = null;

    // Check if it's weekend (Saturday = 6, Sunday = 0)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      // Mark all Saturdays and Sundays as gray (Weekend / Non-working)
      cellStatus = 'holiday';
      cellData = {
        title: dayOfWeek === 0 ? 'Sunday' : 'Saturday',
        note: 'Weekend • Office Closed'
      };
    } else if (match) {
      cellStatus = match.status;
      cellData = match;
    }

    gridCells.push({
      day: d,
      dateKey,
      isCurrentMonth: true,
      status: cellStatus,
      data: cellData
    });
  }

  // Leading days from next month to fill grid
  const remainingCells = 42 - gridCells.length;
  for (let d = 1; d <= remainingCells; d++) {
    const dateKey = formatDateKey(currentMonth === 11 ? currentYear + 1 : currentYear, (currentMonth + 1) % 12, d);
    gridCells.push({
      day: d,
      dateKey,
      isCurrentMonth: false,
      status: 'holiday'
    });
  }

  // --- Interaction Handler for Cell Click ---
  const handleCellClick = (cell) => {
    if (!cell.isCurrentMonth) {
      const [y, m] = cell.dateKey.split('-').map(Number);
      setCurrentDate(new Date(y, m - 1, 1));
      setHighlightedDate(cell.dateKey);
      setJumpDate(cell.dateKey);
      return;
    }

    setHighlightedDate(cell.dateKey);
    setJumpDate(cell.dateKey);

    if (cell.status === 'available') {
      setSelectedDate(cell.dateKey);
      setClientName('');
      setClientEmail('');
      setSpecialNotes('');
      setSubmitFeedback(null);
      setIsBookingOpen(true);
    } else if (cell.status === 'pending' || cell.status === 'booked' || cell.status === 'holiday') {
      setInspectDate(cell);
    }
  };

  // --- Async Submission Hook for Scheduling an Audit ---
  const handleScheduleAudit = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    setIsSubmitting(true);

    try {
      // =====================================================================
      // INTEGRATION HOOK FOR MUNDER DIFFLIN AUTOMATION AGENT
      // When the backend endpoint is wired, replace with:
      // await axios.post(`${API_BASE_URL}/api/scheduling/audit`, {
      //   date: selectedDate,
      //   clientName,
      //   clientEmail,
      //   auditType,
      //   leadAuditor,
      //   notes: specialNotes
      // });
      // =====================================================================
      await new Promise((res) => setTimeout(res, 800)); // Simulated async execution

      // Update local state: mark date as booked with client details
      setScheduleData((prev) => [
        ...prev.filter((item) => item.date !== selectedDate),
        {
          date: selectedDate,
          status: 'booked',
          client: clientName.trim(),
          auditType,
          time: '10:00 AM - 04:00 PM',
          note: specialNotes.trim() || undefined
        }
      ]);

      setSubmitFeedback({
        type: 'success',
        message: `Audit successfully scheduled for ${clientName} on ${selectedDate}!`
      });

      setTimeout(() => {
        setIsBookingOpen(false);
        setSubmitFeedback(null);
      }, 1400);
    } catch {
      setSubmitFeedback({
        type: 'error',
        message: 'Failed to schedule audit. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Color Mapping Classes aligned with the light aesthetic
  const getStatusClasses = (status, isCurrentMonth) => {
    if (!isCurrentMonth) {
      return 'bg-slate-50/30 text-slate-300 border-slate-100 cursor-not-allowed opacity-40';
    }

    switch (status) {
      case 'available':
        // 🟢 Green (Available): Clean bookable card with interactive hover glow and cursor-pointer
        return 'bg-emerald-50/50 hover:bg-emerald-50 text-emerald-950 border-emerald-200/90 hover:border-emerald-400 shadow-2xs hover:shadow-md hover:shadow-emerald-500/10 cursor-pointer transition-all duration-200';

      case 'booked':
        // 🔴 Red (Booked): Confirmed and scheduled card in soft rose tint
        return 'bg-rose-50/45 hover:bg-rose-50/70 text-rose-950 border-rose-200/80 hover:border-rose-300 cursor-pointer transition-all duration-200';

      case 'pending':
        // 🟡 Yellow (Pending): Soft amber card indicating awaiting confirmation
        return 'bg-amber-50/45 hover:bg-amber-50/70 text-amber-950 border-amber-200/80 hover:border-amber-300 cursor-pointer transition-all duration-200';

      case 'holiday':
      default:
        // ⚪ Gray (Holidays/Unavailable): Subtle muted slate
        return 'bg-slate-50/80 text-slate-500 border-slate-200/60 cursor-not-allowed';
    }
  };

  return (
    <div 
      className="w-full space-y-6 antialiased"
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      {/* Top Header / View Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200/80">
              Audit Operations
            </span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mt-1 m-0">
            Scheduling & Audit Calendar
          </h2>
          <p className="text-xs text-slate-500 mt-1 m-0">
            Real-time client availability grid, automated audit slot bookings, and agent status checks.
          </p>
        </div>

        {/* View Switcher / Quick Action */}
        <div className="mt-2 sm:mt-0 flex items-center space-x-3">
          <button
            type="button"
            onClick={onBackToInvoice}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition"
          >
            ← Return to Invoice Studio
          </button>
        </div>
      </div>

      {/* =========================================================================
          MAIN CALENDAR CONTAINER: Elevated Clean Card matching App Aesthetic
          ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06),0_2px_8px_-2px_rgba(15,23,42,0.04)] p-6 sm:p-7 space-y-6"
      >
        {/* Month Navigation & Legend Control Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-4 border-b border-slate-100">
          
          {/* Navigation, Month, Year & Exact Date Selection Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200/80 p-1 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white shadow-2xs transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg transition"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next Month"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white shadow-2xs transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Month & Year Selectors */}
            <div className="flex items-center gap-2">
              {/* Month Dropdown */}
              <div className="relative inline-flex items-center">
                <select
                  id="calendar-month-select"
                  aria-label="Select month"
                  value={currentMonth}
                  onChange={(e) => handleMonthChange(Number(e.target.value))}
                  className="appearance-none bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 rounded-xl pl-3 pr-8 py-1.5 text-sm sm:text-base font-bold text-slate-900 cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#18687D]/20 focus:border-[#18687D] transition"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>

              {/* Year Dropdown */}
              <div className="relative inline-flex items-center">
                <select
                  id="calendar-year-select"
                  aria-label="Select year"
                  value={currentYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="appearance-none bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 rounded-xl pl-3 pr-8 py-1.5 text-sm sm:text-base font-bold text-[#18687D] cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#18687D]/20 focus:border-[#18687D] transition"
                >
                  {yearOptions.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#18687D]/70 absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Direct Exact Date Jump Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1 shadow-2xs">
              <CalendarIcon className="w-3.5 h-3.5 text-[#18687D]" />
              <label htmlFor="calendar-exact-date" className="text-xs font-bold text-slate-600 hidden sm:inline whitespace-nowrap">
                Exact Date:
              </label>
              <input
                id="calendar-exact-date"
                type="date"
                aria-label="Select exact date"
                value={jumpDate}
                onChange={handleExactDateChange}
                className="bg-white border border-slate-200 text-xs font-semibold text-slate-800 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#18687D]/30 focus:border-[#18687D] cursor-pointer shadow-2xs"
              />
              {jumpDate && (
                <button
                  type="button"
                  onClick={() => {
                    setJumpDate('');
                    setHighlightedDate(null);
                  }}
                  title="Clear date selection"
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Availability Status Indicators / Legend */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/90 text-emerald-800 font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Available ({scheduleData.filter((s) => s.status === 'available').length})</span>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200/90 text-rose-800 font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Booked ({scheduleData.filter((s) => s.status === 'booked').length})</span>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-800 font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Pending ({scheduleData.filter((s) => s.status === 'pending').length})</span>
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Unavailable / Weekend</span>
            </div>
          </div>

        </div>

        {/* Selected Date Notification / Quick Action Banner */}
        {highlightedDate && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-teal-50/70 border border-teal-200/90 rounded-xl px-4 py-2 text-xs text-teal-950 shadow-2xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#18687D]" />
              <span>
                Selected Date: <strong className="text-teal-900 font-bold">{highlightedDate}</strong>
              </span>
              {(() => {
                const cell = gridCells.find((c) => c.dateKey === highlightedDate && c.isCurrentMonth);
                if (!cell) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const [y, m] = highlightedDate.split('-').map(Number);
                        setCurrentDate(new Date(y, m - 1, 1));
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-teal-300 text-teal-800 hover:bg-teal-50 transition ml-1"
                    >
                      Switch to this month
                    </button>
                  );
                }
                const statusLabels = {
                  available: 'Available Slot',
                  booked: 'Booked / Confirmed',
                  pending: 'Pending Confirmation',
                  holiday: 'Weekend / Non-working'
                };
                return (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white border border-teal-200 text-teal-800 ml-1">
                    {statusLabels[cell.status] || cell.status}
                  </span>
                );
              })()}
            </div>

            <div className="flex items-center space-x-2">
              {(() => {
                const cell = gridCells.find((c) => c.dateKey === highlightedDate && c.isCurrentMonth);
                if (cell && cell.status === 'available') {
                  return (
                    <button
                      type="button"
                      onClick={() => handleCellClick(cell)}
                      className="px-3 py-1 rounded-lg bg-[#18687D] hover:bg-[#145667] text-white font-bold text-xs shadow-2xs transition"
                    >
                      Book Slot
                    </button>
                  );
                }
                if (cell && (cell.status === 'booked' || cell.status === 'pending' || cell.status === 'holiday')) {
                  return (
                    <button
                      type="button"
                      onClick={() => handleCellClick(cell)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs shadow-2xs transition"
                    >
                      View Details
                    </button>
                  );
                }
                return null;
              })()}

              <button
                type="button"
                onClick={() => {
                  setHighlightedDate(null);
                  setJumpDate('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
                title="Deselect date"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Weekday Column Headers */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 text-center">
          {WEEKDAYS.map((wd, idx) => (
            <div
              key={wd}
              className={`text-[11px] font-bold uppercase tracking-wider py-1 ${
                idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* 7-Column Responsive Date Grid */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {gridCells.map((cell, index) => {
            const statusClasses = getStatusClasses(cell.status, cell.isCurrentMonth);
            const isToday = cell.dateKey === '2026-10-13';
            const isSelected = cell.dateKey === highlightedDate;

            return (
              <motion.div
                key={`${cell.dateKey}-${index}`}
                whileHover={cell.isCurrentMonth && cell.status === 'available' ? { y: -2 } : {}}
                onClick={() => handleCellClick(cell)}
                className={`min-h-[84px] sm:min-h-[102px] p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between select-none relative overflow-hidden transition ${statusClasses} ${
                  isSelected ? 'ring-2 ring-[#18687D] ring-offset-2 shadow-md z-10' : ''
                }`}
              >
                {/* Top Row: Date Number & Badges */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className={`text-xs sm:text-sm font-bold ${
                      isToday
                        ? 'w-6 h-6 rounded-full bg-[#18687D] text-white flex items-center justify-center -ml-0.5 shadow-2xs'
                        : cell.status === 'holiday'
                          ? 'text-slate-400'
                          : 'text-slate-900'
                    }`}>
                      {cell.day}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] font-bold text-teal-800 bg-teal-100/90 px-1.5 py-0.2 rounded border border-teal-300">
                        Selected
                      </span>
                    )}
                  </div>

                  {/* Status Indicator Pip */}
                  {cell.isCurrentMonth && (
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      {cell.status === 'available' && (
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                      )}
                      {cell.status === 'booked' && (
                        <span className="inline-block w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200" />
                      )}
                      {cell.status === 'pending' && (
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-200" />
                      )}
                    </span>
                  )}
                </div>

                {/* Body Content / Event Metadata */}
                <div className="mt-1 flex-1 flex flex-col justify-end">
                  {cell.isCurrentMonth && cell.data && (
                    <div className="text-[10px] leading-tight truncate">
                      {cell.status === 'booked' && (
                        <div>
                          <p className="font-bold text-rose-950 truncate m-0">
                            {cell.data.client || 'Client Audit'}
                          </p>
                          <p className="text-rose-700 truncate m-0 text-[9px] hidden sm:block font-medium">
                            {cell.data.auditType}
                          </p>
                        </div>
                      )}

                      {cell.status === 'pending' && (
                        <div>
                          <p className="font-bold text-amber-950 truncate m-0">
                            {cell.data.client || 'Pending Slot'}
                          </p>
                          <p className="text-amber-700 truncate m-0 text-[9px] hidden sm:block font-medium">
                            Awaiting Confirm
                          </p>
                        </div>
                      )}

                      {cell.status === 'holiday' && (
                        <p className="text-slate-400 truncate m-0 text-[9px] font-medium">
                          {cell.data.title || 'Closed'}
                        </p>
                      )}
                    </div>
                  )}

                  {cell.isCurrentMonth && cell.status === 'available' && (
                    <div className="text-[10px] font-semibold text-emerald-800 flex items-center space-x-1">
                      <span className="hidden sm:inline bg-emerald-100/80 px-1.5 py-0.5 rounded text-emerald-800 font-bold">+ Book Slot</span>
                      <span className="sm:hidden text-center w-full font-bold text-emerald-700">Open</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* =========================================================================
          SLIDE-OUT / MODAL PANEL: Book Available Audit Slot
          ========================================================================= */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-lg w-full overflow-hidden text-slate-800"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 m-0">
                      Schedule Client Audit
                    </h3>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">
                      Selected Slot: <strong className="text-teal-800">{selectedDate}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBookingOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleScheduleAudit} className="p-6 space-y-4 text-xs">

                {submitFeedback && (
                  <div className={`p-3 rounded-xl border flex items-center space-x-2.5 ${
                    submitFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    {submitFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span className="font-medium">{submitFeedback.message}</span>
                  </div>
                )}

                {/* Client Name */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Client or Entity Name *
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Robotics International"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 transition shadow-2xs"
                    />
                  </div>
                </div>

                {/* Client Email */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Client Representative Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. finance@client.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 transition shadow-2xs"
                  />
                </div>

                {/* Audit Type Selection */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Audit Engagement Type *
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={auditType}
                      onChange={(e) => setAuditType(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-teal-700 font-medium shadow-2xs"
                    >
                      <option value="Statutory & GST Compliance Audit">Statutory & GST Compliance Audit</option>
                      <option value="Annual Financial Systems Audit">Annual Financial Systems Audit</option>
                      <option value="Corporate Governance Review">Corporate Governance Review</option>
                      <option value="Transfer Pricing & Cross-Border Audit">Transfer Pricing & Cross-Border Audit</option>
                      <option value="Forensic Data & Internal Controls">Forensic Data & Internal Controls</option>
                    </select>
                  </div>
                </div>

                {/* Lead Auditor Assignment */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Assigned Lead Auditor
                  </label>
                  <input
                    type="text"
                    value={leadAuditor}
                    onChange={(e) => setLeadAuditor(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-teal-700 transition shadow-2xs"
                  />
                </div>

                {/* Special Instructions */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Engagement Scope / Special Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter key compliance items, audit venue or documents required..."
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-700 transition resize-none shadow-2xs"
                  />
                </div>

                {/* Submit Actions */}
                <div className="pt-2 flex items-center justify-end space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setIsBookingOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-lg bg-[#18687D] hover:bg-[#145667] text-white font-bold text-xs tracking-wide shadow-sm flex items-center space-x-1.5 transition active:scale-98 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <span>Reserving Slot...</span>
                    ) : (
                      <>
                        <span>Confirm & Schedule Audit</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          STATUS INSPECTION MODAL (For Booked / Pending / Holiday dates)
          ========================================================================= */}
      <AnimatePresence>
        {inspectDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-5 text-slate-800 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    inspectDate.status === 'booked'
                      ? 'bg-rose-100 text-rose-800 font-bold'
                      : inspectDate.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 font-bold'
                        : 'bg-slate-100 text-slate-700 font-bold'
                  }`}>
                    {inspectDate.status}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-1 m-0">
                    {inspectDate.dateKey}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectDate(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {inspectDate.data && (
                <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  {inspectDate.data.client && (
                    <p className="m-0">
                      <strong className="text-slate-900">Client:</strong> {inspectDate.data.client}
                    </p>
                  )}
                  {inspectDate.data.auditType && (
                    <p className="m-0">
                      <strong className="text-slate-900">Type:</strong> {inspectDate.data.auditType}
                    </p>
                  )}
                  {inspectDate.data.time && (
                    <p className="m-0">
                      <strong className="text-slate-900">Time:</strong> {inspectDate.data.time}
                    </p>
                  )}
                  {inspectDate.data.note && (
                    <p className="m-0 text-slate-500 italic">
                      Note: {inspectDate.data.note}
                    </p>
                  )}
                  {inspectDate.data.title && (
                    <p className="m-0 font-medium text-slate-800">
                      {inspectDate.data.title}
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setInspectDate(null)}
                className="w-full py-2 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SchedulingCalendar;
