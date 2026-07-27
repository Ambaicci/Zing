import { useState, useMemo } from 'react';
import { 
  CalendarIcon, XMarkIcon, ViewColumnsIcon, ListBulletIcon,
  PencilSquareIcon, TrashIcon, ArrowPathIcon, SparklesIcon,
  ChevronDownIcon, AdjustmentsHorizontalIcon, CheckCircleIcon
} from '@heroicons/react/24/solid';
import { 
  DndContext, 
  DragOverlay, 
  useDraggable, 
  useDroppable,
  pointerWithin,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { API_BASE_URL } from '../config';

// ============ SIMPLIFIED DRAGGABLE SHIFT ============
const DraggableShift = ({ shift, onEdit }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `shift-${shift.assignment_id}`,
    data: { shift }
  });

  const getDotColor = (branchName) => {
    if (branchName?.includes('Sabatia')) return 'bg-z-green';
    if (branchName?.includes('Navakholo')) return 'bg-z-purple';
    if (branchName?.includes('Wholesale')) return 'bg-z-orange';
    return 'bg-z-blue';
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onEdit(shift); }}
      className={`w-full h-full bg-z-surface border border-z-border rounded-lg p-2 flex flex-col items-center justify-center gap-1.5 hover:border-z-purple/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-40 scale-95' : ''
      }`}
      title="Click to edit • Drag to move"
    >
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(shift.branch_name)}`}></span>
        <span className="text-[11px] font-semibold text-z-text truncate">{shift.branch_name}</span>
      </div>
      <span className="text-[10px] font-mono text-z-text-dim bg-z-page/50 px-1.5 py-0.5 rounded">
        {shift.start_time.substring(0,5)}-{shift.end_time.substring(0,5)}
      </span>
    </div>
  );
};

// ============ DROPPABLE CELL ============
const DroppableCell = ({ id, children, isOver, dayIndex }) => {
  const { setNodeRef } = useDroppable({ id });
  const dayTints = ['bg-z-blue/[0.03]', 'bg-z-green/[0.03]', 'bg-z-purple/[0.03]', 'bg-z-orange/[0.03]', 'bg-z-red/[0.03]', 'bg-z-blue/[0.03]'];
  
  return (
    <td ref={setNodeRef} className={`px-1 py-2 text-center align-top ${dayTints[dayIndex] || ''} group-hover/row:bg-z-surface-hi/30 transition-colors duration-200`}>
      <div className={`min-h-[72px] rounded-lg transition-all duration-200 flex items-center justify-center p-1 ${
        isOver ? 'bg-z-purple/10 border-2 border-dashed border-z-purple' : 'border border-transparent'
      }`}>
        {children}
      </div>
    </td>
  );
};

// ============ FLOATING COMPLIANCE PILL ============
const CompliancePill = ({ message, type }) => {
  if (!message) return null;
  const isOk = type === 'ok';
  const isErr = type === 'err';
  
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-2.5 rounded-full border backdrop-blur-xl shadow-2xl animate-[slideDown_0.3s_ease-out] ${
      isOk ? 'bg-z-bg border-z-green/30 text-z-green' : 
      isErr ? 'bg-z-bg border-z-red/30 text-z-red' : 
      'bg-z-bg border-z-purple/30 text-z-purple'
    }`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOk ? 'bg-z-green' : isErr ? 'bg-z-red' : 'bg-z-purple animate-pulse'}`}></span>
      <span className="text-xs font-semibold font-body">{message}</span>
    </div>
  );
};

// ============ MAIN SCHEDULE QUERY COMPONENT ============
const ScheduleQuery = ({ roster, employees, branches }) => {
  // FIX: Default to 'all' so we see all generated shifts immediately
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [naturalQuery, setNaturalQuery] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [activeId, setActiveId] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [overId, setOverId] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  
  const [complianceStatus, setComplianceStatus] = useState({ message: '', type: 'checking' });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const getDateRange = () => {
    // FIX: Handle 'all' to show everything
    if (dateRange === 'all') {
      return { start: null, end: null };
    }

    const today = new Date();
    let start, end;
    if (dateRange === 'thisWeek') {
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start = new Date(today); start.setDate(diff);
      end = new Date(start); end.setDate(start.getDate() + 6);
    } else if (dateRange === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (dateRange === 'nextWeek') {
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + 7;
      start = new Date(today); start.setDate(diff);
      end = new Date(start); end.setDate(start.getDate() + 6);
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      start = new Date(customStartDate); end = new Date(customEndDate);
    } else {
      return { start: null, end: null };
    }
    return { start, end };
  };

  const matchesTimeOfDay = (startTime) => {
    if (selectedTimeOfDay === 'all') return true;
    const hour = parseInt(startTime.substring(0, 2), 10);
    if (selectedTimeOfDay === 'morning') return hour >= 6 && hour < 12;
    if (selectedTimeOfDay === 'afternoon') return hour >= 12 && hour < 17;
    if (selectedTimeOfDay === 'evening') return hour >= 17 && hour < 22;
    if (selectedTimeOfDay === 'night') return hour >= 22 || hour < 6;
    return true;
  };

  const filteredResults = useMemo(() => {
    const { start, end } = getDateRange();
    return roster.filter(shift => {
      if (start && end) {
        const shiftDate = new Date(shift.date);
        if (shiftDate < start || shiftDate > end) return false;
      }
      if (selectedEmployee !== 'all') {
        const emp = employees.find(e => e.id === shift.user_id);
        if (!emp || emp.name !== selectedEmployee) return false;
      }
      if (selectedBranch !== 'all' && shift.branch_name !== selectedBranch) return false;
      if (selectedDays.length > 0 && !selectedDays.includes(shift.day)) return false;
      if (!matchesTimeOfDay(shift.start_time)) return false;
      return true;
    });
  }, [roster, dateRange, customStartDate, customEndDate, selectedEmployee, selectedBranch, selectedDays, selectedTimeOfDay, employees]);

  const handleDragStart = (event) => { setActiveId(event.active.id); setActiveShift(event.active.data.current.shift); };
  const handleDragOver = (event) => setOverId(event.over?.id || null);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null); setActiveShift(null); setOverId(null);
    if (!over) return;

    const shift = active.data.current.shift;
    const overIdStr = over.id.toString();
    if (!overIdStr.startsWith('cell-')) return;
    const parts = overIdStr.split('-');
    if (parts.length !== 3) return;

    const newEmpId = parseInt(parts[1]);
    const newDay = parts[2];
    if (newEmpId === shift.user_id && newDay === shift.day) return;

    const shiftDate = new Date(shift.date);
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = daysOfWeek.indexOf(newDay);
    const newDate = new Date(shiftDate);
    newDate.setDate(shiftDate.getDate() + (targetDayIndex - shiftDate.getDay()));
    const newDateStr = newDate.toISOString().split('T')[0];

    setComplianceStatus({ message: 'Zing is checking compliance...', type: 'checking' });
    try {
      const aiRes = await fetch(`${API_BASE_URL}/api/ai-check-swap?user_a_id=${shift.user_id}&user_b_id=${newEmpId}&assignment_id=${shift.assignment_id}`);
      const aiData = await aiRes.json();
      if (aiData.verdict === 'CLEAR' || aiData.verdict === 'UNKNOWN') {
        const res = await fetch(`${API_BASE_URL}/api/assignment/${shift.assignment_id}?user_id=${newEmpId}&date=${newDateStr}`, { method: 'PUT' });
        const data = await res.json();
        if (data.success) {
          setComplianceStatus({ message: 'Shift moved · compliance clear', type: 'ok' });
          setTimeout(() => setComplianceStatus({ message: '', type: 'checking' }), 2500);
          setTimeout(() => window.location.reload(), 800);
        } else {
          setComplianceStatus({ message: `Failed: ${data.detail}`, type: 'err' });
          setTimeout(() => setComplianceStatus({ message: '', type: 'checking' }), 3000);
        }
      } else {
        setComplianceStatus({ message: `Blocked: ${aiData.reason}`, type: 'err' });
        setTimeout(() => setComplianceStatus({ message: '', type: 'checking' }), 3000);
      }
    } catch (err) {
      setComplianceStatus({ message: 'Error connecting to Zing', type: 'err' });
      setTimeout(() => setComplianceStatus({ message: '', type: 'checking' }), 3000);
    }
  };

  const openEditModal = (shift) => {
    setEditingShift(shift);
    setEditForm({
      user_id: shift.user_id, date: shift.date,
      start_time: shift.start_time.substring(0, 5), end_time: shift.end_time.substring(0, 5),
      branch_id: branches.find(b => b.name === shift.branch_name)?.id || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingShift) return;
    setSaving(true);
    try {
      const params = new URLSearchParams();
      if (editForm.user_id) params.append('user_id', editForm.user_id);
      if (editForm.date) params.append('date', editForm.date);
      if (editForm.start_time) params.append('start_time', editForm.start_time + ':00');
      if (editForm.end_time) params.append('end_time', editForm.end_time + ':00');
      if (editForm.branch_id) params.append('branch_id', editForm.branch_id);

      const res = await fetch(`${API_BASE_URL}/api/assignment/${editingShift.assignment_id}?${params.toString()}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        setComplianceStatus({ message: 'Shift updated successfully', type: 'ok' });
        setTimeout(() => setComplianceStatus({ message: '', type: 'checking' }), 2500);
        setShowEditModal(false); setEditingShift(null);
        setTimeout(() => window.location.reload(), 800);
      } else {
        setComplianceStatus({ message: `Failed: ${data.detail}`, type: 'err' });
        setTimeout(() => setComplianceStatus({ message: '', type: 'checking' }), 3000);
      }
    } catch (err) {
      setComplianceStatus({ message: 'Error updating shift', type: 'err' });
      setTimeout(() => setComplianceStatus({ message: '', type: 'checking' }), 3000);
    } finally { setSaving(false); }
  };

  const handleDeleteShift = async () => {
    if (!editingShift || !confirm('Delete this shift? This cannot be undone.')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/assignment/${editingShift.assignment_id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setComplianceStatus({ message: 'Shift deleted', type: 'ok' });
        setTimeout(() => setComplianceStatus({ message: '', type: 'checking' }), 2500);
        setShowEditModal(false); setEditingShift(null);
        setTimeout(() => window.location.reload(), 800);
      } else {
        setComplianceStatus({ message: `Failed: ${data.detail}`, type: 'err' });
        setTimeout(() => setComplianceStatus({ message: '', type: 'checking' }), 3000);
      }
    } catch (err) {
      setComplianceStatus({ message: 'Error deleting shift', type: 'err' });
      setTimeout(() => setComplianceStatus({ message: '', type: 'checking' }), 3000);
    } finally { setSaving(false); }
  };

  const handleNaturalQuery = async (query) => {
    if (!query.trim()) return;
    setIsParsing(true); setParseError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/zing-parse-query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query })
      });
      const data = await response.json();
      if (data.success && data.filters) {
        const f = data.filters;
        setSelectedEmployee(f.employee || 'all'); setSelectedBranch(f.branch || 'all');
        setSelectedDays(f.days || []); setSelectedTimeOfDay(f.timeOfDay || 'all');
        setDateRange(f.dateRange || 'all'); setCustomStartDate(''); setCustomEndDate('');
        setNaturalQuery('');
      } else {
        setParseError(data.error || 'Could not parse query.');
      }
    } catch (err) { setParseError('Error connecting to AI.'); } finally { setIsParsing(false); }
  };

  const toggleDay = (day) => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const clearAllFilters = () => {
    // FIX: Reset to 'all'
    setDateRange('all'); setCustomStartDate(''); setCustomEndDate('');
    setSelectedEmployee('all'); setSelectedBranch('all'); setSelectedDays([]);
    setSelectedTimeOfDay('all'); setParseError('');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (dateRange !== 'all') count++;
    if (selectedEmployee !== 'all') count++;
    if (selectedBranch !== 'all') count++;
    if (selectedDays.length > 0) count++;
    if (selectedTimeOfDay !== 'all') count++;
    return count;
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <>
      <CompliancePill message={complianceStatus.message} type={complianceStatus.type} />

      <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
        
        {/* 1. GLOWING AI COMMAND BAR */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-z-purple to-z-blue rounded-2xl opacity-20 group-focus-within:opacity-100 transition duration-500 blur"></div>
          <div className="relative bg-z-surface rounded-2xl border border-z-border p-1 shadow-xl">
            <div className="flex items-center gap-3 px-4 py-3">
              <SparklesIcon className="w-5 h-5 text-z-purple flex-shrink-0" />
              <input
                type="text" value={naturalQuery} onChange={(e) => setNaturalQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isParsing && handleNaturalQuery(naturalQuery)}
                disabled={isParsing} placeholder="Ask Zing: 'Show me Kevin's schedule for Wednesday evening...'"
                className="flex-1 bg-transparent border-none outline-none text-sm text-z-text placeholder-z-text-faint disabled:opacity-50 font-body"
              />
              {isParsing ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-z-purple/10 text-z-purple text-xs font-bold rounded-xl">
                  <ArrowPathIcon className="w-3 h-3 animate-spin" /> Parsing...
                </div>
              ) : naturalQuery ? (
                <button onClick={() => handleNaturalQuery(naturalQuery)} className="px-5 py-2 bg-z-purple text-white text-xs font-bold rounded-xl hover:bg-z-purple/90 active:scale-95 transition-all shadow-lg shadow-z-purple/20">
                  Search
                </button>
              ) : null}
            </div>
            {parseError && (
              <div className="mx-4 mb-4 px-3 py-2 bg-z-red/10 border border-z-red/20 rounded-xl text-xs text-z-red flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-z-red"></span> {parseError}
              </div>
            )}
          </div>
        </div>

        {/* 2. UNIFIED CONTROLS */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-semibold ${
                  showFilters || getActiveFiltersCount() > 0 
                    ? 'bg-z-surface-hi border-z-purple text-z-purple' 
                    : 'bg-z-surface border-z-border text-z-text-dim hover:text-z-text'
                }`}
              >
                <AdjustmentsHorizontalIcon className="w-4 h-4" />
                Filters
                {getActiveFiltersCount() > 0 && (
                  <span className="w-5 h-5 rounded-full bg-z-purple text-white text-[10px] flex items-center justify-center font-bold">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>
              
              <div className="hidden md:flex items-center gap-1 bg-z-surface p-1 rounded-xl border border-z-border">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-z-purple text-white shadow-md' : 'text-z-text-dim hover:text-z-text'}`}>
                  <ViewColumnsIcon className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-z-purple text-white shadow-md' : 'text-z-text-dim hover:text-z-text'}`}>
                  <ListBulletIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <span className="text-xs text-z-text-faint font-mono bg-z-surface px-2.5 py-1 rounded-lg border border-z-border">
              {filteredResults.length} shifts
            </span>
          </div>

          {/* Active Filter Chips */}
          {getActiveFiltersCount() > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {selectedEmployee !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-z-surface border border-z-border text-xs text-z-blue">
                  {employees.find(e => e.name === selectedEmployee)?.name || selectedEmployee}
                  <button onClick={() => setSelectedEmployee('all')} className="hover:text-z-red"><XMarkIcon className="w-3 h-3" /></button>
                </span>
              )}
              {selectedBranch !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-z-surface border border-z-border text-xs text-z-orange">
                  {selectedBranch}
                  <button onClick={() => setSelectedBranch('all')} className="hover:text-z-red"><XMarkIcon className="w-3 h-3" /></button>
                </span>
              )}
              {selectedTimeOfDay !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-z-surface border border-z-border text-xs text-z-green capitalize">
                  {selectedTimeOfDay}
                  <button onClick={() => setSelectedTimeOfDay('all')} className="hover:text-z-red"><XMarkIcon className="w-3 h-3" /></button>
                </span>
              )}
              {selectedDays.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-z-surface border border-z-border text-xs text-z-purple">
                  {selectedDays.length} day{selectedDays.length > 1 ? 's' : ''}
                  <button onClick={() => setSelectedDays([])} className="hover:text-z-red"><XMarkIcon className="w-3 h-3" /></button>
                </span>
              )}
              <button onClick={clearAllFilters} className="text-xs text-z-text-faint hover:text-z-red font-semibold transition-colors ml-1">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* 3. COMPACT FILTER PANEL */}
        {showFilters && (
          <div className="bg-z-surface rounded-2xl border border-z-border p-4 md:p-5 shadow-sm animate-[slideDown_0.2s_ease-out]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Date Range', value: dateRange, onChange: setDateRange, options: ['all', 'thisWeek', 'thisMonth', 'nextWeek', 'custom'] },
                { label: 'Employee', value: selectedEmployee, onChange: setSelectedEmployee, options: ['all', ...employees.filter(e => e.is_active).map(e => e.name)] },
                { label: 'Branch', value: selectedBranch, onChange: setSelectedBranch, options: ['all', ...branches.map(b => b.name)] },
                { label: 'Time of Day', value: selectedTimeOfDay, onChange: setSelectedTimeOfDay, options: ['all', 'morning', 'afternoon', 'evening', 'night'] }
              ].map((filter, idx) => (
                <div key={idx}>
                  <label className="block text-[10px] font-mono font-bold text-z-text-faint uppercase tracking-widest mb-1.5">{filter.label}</label>
                  <div className="relative">
                    <select value={filter.value} onChange={(e) => filter.onChange(e.target.value)} className="w-full appearance-none px-3 py-2.5 bg-z-page border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple focus:ring-1 focus:ring-z-purple/20 transition-all cursor-pointer">
                      {filter.options.map(opt => (
                        <option key={opt} value={opt}>
                          {opt === 'all' ? (filter.label === 'Date Range' ? 'All Time' : `All ${filter.label}s`) : opt === 'thisWeek' ? 'This Week' : opt === 'thisMonth' ? 'This Month' : opt === 'nextWeek' ? 'Next Week' : opt === 'custom' ? 'Custom Range' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="w-4 h-4 text-z-text-faint absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {filter.label === 'Date Range' && filter.value === 'custom' && (
                    <div className="mt-2 space-y-2">
                      <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full px-3 py-2 bg-z-page border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple transition-all" />
                      <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full px-3 py-2 bg-z-page border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple transition-all" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-z-border">
              <label className="block text-[10px] font-mono font-bold text-z-text-faint uppercase tracking-widest mb-2">Day of Week</label>
              <div className="flex flex-wrap gap-2">
                {days.map(day => (
                  <button key={day} onClick={() => toggleDay(day)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    selectedDays.includes(day) ? 'bg-z-purple text-white shadow-lg shadow-z-purple/30' : 'bg-z-page text-z-text-dim border border-z-border hover:border-z-purple/50 hover:text-z-text'
                  }`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. RESULTS DISPLAY */}
        {filteredResults.length === 0 ? (
          <div className="bg-z-surface rounded-2xl border border-z-border p-16 text-center">
            <div className="w-16 h-16 bg-z-page rounded-full flex items-center justify-center mx-auto mb-4 border border-z-border">
              <CalendarIcon className="w-8 h-8 text-z-text-faint" />
            </div>
            <h3 className="text-lg font-display font-bold text-z-text mb-1">No shifts found</h3>
            <p className="text-sm text-z-text-faint font-mono">Try adjusting your filters or ask Zing a different question.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="bg-z-surface rounded-2xl border border-z-border shadow-sm overflow-hidden">
              <div className="p-3 md:p-4 border-b border-z-border bg-z-surface-hi/30 flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-z-purple flex-shrink-0" />
                <p className="text-xs text-z-text-dim font-mono">Drag any shift to move it. Zing will auto-check compliance.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[700px] md:min-w-[800px]">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left font-mono font-bold text-z-text-faint sticky left-0 bg-z-surface z-20 w-[160px] md:w-[180px] border-b border-z-border shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]">Employee</th>
                      {days.map((day, idx) => (
                        <th key={day} className="px-1.5 py-3 text-center font-mono font-bold text-z-text-faint w-[100px] md:w-[120px] border-b border-z-border">{day.substring(0, 3)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.filter(emp => emp.is_active !== false).map((emp) => {
                      const employeeShifts = {};
                      days.forEach(day => { employeeShifts[day] = filteredResults.find(s => s.user_id === emp.id && s.day === day); });
                      return (
                        <tr key={emp.id} className="group/row">
                          <td className="px-4 py-2 sticky left-0 bg-z-surface group-hover/row:bg-z-surface-hi/50 z-10 transition-colors duration-200 border-r border-z-border shadow-[4px_0_12px_-4px_rgba(0,0,0,0.5)]">
                            <div className="font-bold text-z-text text-sm">{emp.name}</div>
                            <div className="text-[10px] text-z-text-faint font-mono mt-0.5">{emp.job_title}</div>
                          </td>
                          {days.map((day, dayIdx) => {
                            const shift = employeeShifts[day];
                            const cellId = `cell-${emp.id}-${day}`;
                            return (
                              <DroppableCell key={`${emp.id}-${day}`} id={cellId} isOver={overId === cellId} dayIndex={dayIdx}>
                                {shift ? (
                                  <DraggableShift shift={shift} onEdit={openEditModal} />
                                ) : (
                                  <div className="flex items-center justify-center min-h-[72px]">
                                    <span className="text-[10px] text-z-text-faint italic font-mono">Off</span>
                                  </div>
                                )}
                              </DroppableCell>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <DragOverlay dropAnimation={null}>
              {activeShift ? (
                <div className="bg-z-purple text-white rounded-xl p-3 shadow-2xl shadow-z-purple/40 cursor-grabbing min-w-[130px] border border-z-purple/30">
                  <div className="text-[10px] font-mono opacity-80 mb-1 uppercase tracking-wider">Moving Shift</div>
                  <div className="text-sm font-bold truncate">{activeShift.branch_name}</div>
                  <div className="text-xs opacity-90 font-mono mt-1.5 bg-z-purple/50 px-2 py-0.5 rounded inline-block">
                    {activeShift.start_time.substring(0,5)}-{activeShift.end_time.substring(0,5)}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="space-y-3">
            {filteredResults.map((shift, idx) => {
              const emp = employees.find(e => e.id === shift.user_id);
              const getDotColor = (branchName) => {
                if (branchName?.includes('Sabatia')) return 'bg-z-green';
                if (branchName?.includes('Navakholo')) return 'bg-z-purple';
                if (branchName?.includes('Wholesale')) return 'bg-z-orange';
                return 'bg-z-blue';
              };
              return (
                <div key={idx} onClick={() => openEditModal(shift)} className="bg-z-surface rounded-xl border border-z-border p-4 flex items-center gap-4 hover:border-z-purple/30 hover:bg-z-surface-hi/50 transition-all cursor-pointer group">
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm text-white shadow-lg bg-z-page border border-z-border relative`}>
                    {emp ? emp.name.split(' ').map(n => n[0]).join('').substring(0, 2) : '??'}
                    <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getDotColor(shift.branch_name)} border-2 border-z-surface`}></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-z-text">{emp?.name || 'Unassigned'}</span>
                      <span className="text-[10px] text-z-text-faint font-mono bg-z-page px-1.5 py-0.5 rounded border border-z-border">{shift.day}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-z-text-dim">
                      <span className="font-mono text-z-purple bg-z-purple/10 px-2 py-0.5 rounded">{shift.start_time.substring(0,5)} - {shift.end_time.substring(0,5)}</span>
                      <span>{shift.branch_name}</span>
                      <span className="text-z-text-faint">{emp?.job_title}</span>
                    </div>
                  </div>
                  <PencilSquareIcon className="w-5 h-5 text-z-text-faint group-hover:text-z-purple transition-colors" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. PREMIUM EDIT MODAL */}
      {showEditModal && editingShift && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-z-bg rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-z-border">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-display font-bold text-z-text">Edit Shift</h3>
                <p className="text-xs text-z-text-faint font-mono mt-1">Modify assignment details</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-z-text-faint hover:text-z-text transition-colors bg-z-surface p-1.5 rounded-xl hover:bg-z-surface-hi">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-z-text-faint uppercase tracking-widest mb-1.5">Employee</label>
                <select value={editForm.user_id || ''} onChange={(e) => setEditForm({...editForm, user_id: parseInt(e.target.value)})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple focus:ring-1 focus:ring-z-purple/20 transition-all">
                  {employees.filter(e => e.is_active).map(emp => (<option key={emp.id} value={emp.id}>{emp.name} ({emp.job_title})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold text-z-text-faint uppercase tracking-widest mb-1.5">Date</label>
                <input type="date" value={editForm.date || ''} onChange={(e) => setEditForm({...editForm, date: e.target.value})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple focus:ring-1 focus:ring-z-purple/20 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-z-text-faint uppercase tracking-widest mb-1.5">Start</label>
                  <input type="time" value={editForm.start_time || ''} onChange={(e) => setEditForm({...editForm, start_time: e.target.value})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple focus:ring-1 focus:ring-z-purple/20 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-z-text-faint uppercase tracking-widest mb-1.5">End</label>
                  <input type="time" value={editForm.end_time || ''} onChange={(e) => setEditForm({...editForm, end_time: e.target.value})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple focus:ring-1 focus:ring-z-purple/20 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold text-z-text-faint uppercase tracking-widest mb-1.5">Branch</label>
                <select value={editForm.branch_id || ''} onChange={(e) => setEditForm({...editForm, branch_id: parseInt(e.target.value)})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple focus:ring-1 focus:ring-z-purple/20 transition-all">
                  {branches.map(branch => (<option key={branch.id} value={branch.id}>{branch.name}</option>))}
                </select>
              </div>

              <div className="flex gap-3 pt-5 mt-2 border-t border-z-border">
                <button onClick={handleDeleteShift} disabled={saving} className="px-4 py-2.5 bg-z-red/10 text-z-red border border-z-red/20 rounded-xl text-sm font-bold hover:bg-z-red/20 transition-all flex items-center gap-2 disabled:opacity-50">
                  <TrashIcon className="w-4 h-4" /> Delete
                </button>
                <button onClick={handleSaveEdit} disabled={saving} className="flex-1 py-2.5 bg-z-purple text-white rounded-xl text-sm font-bold hover:bg-z-purple/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-z-purple/20">
                  {saving ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScheduleQuery;