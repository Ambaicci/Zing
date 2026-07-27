import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  UserPlusIcon, CalendarIcon, ArrowRightOnRectangleIcon, ExclamationTriangleIcon,
  PlusIcon, XMarkIcon, ArrowsRightLeftIcon, CalendarDaysIcon, UsersIcon, SparklesIcon,
  HomeIcon, Cog6ToothIcon, ArrowPathIcon
} from '@heroicons/react/24/solid';
import { API_BASE_URL } from '../config';
import ZingChat from '../components/ZingChat';
import ScheduleQuery from '../components/ScheduleQuery';
import OrganizationOnboarding from '../components/OrganizationOnboarding';

const AdminDashboard = ({ user, onLogout }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roster, setRoster] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [generationDuration, setGenerationDuration] = useState('week');
  
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [exceptionType, setExceptionType] = useState('PREGNANCY');
  const [reducedHours, setReducedHours] = useState('');
  const [exceptionNotes, setExceptionNotes] = useState('');
  const [exceptionStartDate, setExceptionStartDate] = useState('');
  const [exceptionEndDate, setExceptionEndDate] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState('');
  const [chatActionId, setChatActionId] = useState(null);
  const [chatActionType, setChatActionType] = useState(null);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef(null);

  // API Fetch Functions
  const fetchEmployees = async () => { try { const res = await fetch(`${API_BASE_URL}/api/admin/employees`); setEmployees(await res.json()); } catch (err) { console.error(err); } };
  const fetchBranches = async () => { try { const res = await fetch(`${API_BASE_URL}/api/branches`); setBranches(await res.json()); } catch (err) { console.error(err); } };
  const fetchRoster = async () => { try { const res = await fetch(`${API_BASE_URL}/api/master-roster`); setRoster(await res.json()); } catch (err) { console.error(err); } };
  const fetchExceptions = async () => { try { const res = await fetch(`${API_BASE_URL}/api/admin/exceptions`); setExceptions(await res.json()); } catch (err) { console.error(err); } };
  const fetchSwapRequests = async () => { try { const res = await fetch(`${API_BASE_URL}/api/swap-requests`); setSwapRequests(await res.json()); } catch (err) { console.error(err); } };
  const fetchTimeOffRequests = async () => { try { const res = await fetch(`${API_BASE_URL}/api/time-off-requests`); setTimeOffRequests(await res.json()); } catch (err) { console.error(err); } };

  useEffect(() => { 
    fetchEmployees(); 
    fetchBranches(); 
    fetchRoster(); 
    fetchExceptions(); 
    fetchSwapRequests(); 
    fetchTimeOffRequests(); 
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isThinking]);

  // AI Insights
  const zingInsights = useMemo(() => {
    const insights = [];
    const pendingTimeOff = timeOffRequests.filter(r => r.status === 'PENDING');
    pendingTimeOff.forEach((req) => {
      insights.push({ id: `timeoff-${req.id}`, type: 'action', title: 'Time Off Request', message: `${req.user_name} requested ${req.start_date} off. Reason: ${req.reason}.`, action: 'Review', requestId: req.id, actionType: 'timeoff', context: `${req.user_name} requested time off on ${req.start_date} due to ${req.reason}. ${req.notes ? `They noted: "${req.notes}".` : ''} Would you like me to approve or reject this request?` });
    });
    const pendingSwaps = swapRequests.filter(r => r.status === 'PENDING');
    pendingSwaps.forEach((req) => {
      insights.push({ id: `swap-${req.id}`, type: 'action', title: 'Swap Request', message: `${req.requesting_user} wants to swap with ${req.target_user} on ${req.assignment_date}.`, action: 'Review', requestId: req.id, actionType: 'swap', context: `${req.requesting_user} wants to swap their shift on ${req.assignment_date} with ${req.target_user}. ${req.notes ? `Note: "${req.notes}".` : ''} Shall I approve this swap?` });
    });
    if (insights.length === 0) {
      insights.push({ id: 'all-clear', type: 'info', title: 'All Clear', message: 'No pending requests. Your schedule is optimized.', action: null, requestId: null, actionType: null, context: null });
    }
    return insights;
  }, [timeOffRequests, swapRequests]);

  // Schedule Generation
  const generateRoster = async () => {
    setLoading(true); setMessage('');
    try {
      const today = new Date();
      let startDate, endDate;

      if (generationDuration === 'day') {
        startDate = new Date(today); endDate = new Date(today);
      } else if (generationDuration === 'week') {
        const nextMonday = new Date(today); nextMonday.setDate(today.getDate() + (1 + 7 - today.getDay()) % 7);
        startDate = nextMonday; endDate = new Date(nextMonday); endDate.setDate(nextMonday.getDate() + 6);
      } else if (generationDuration === 'month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      } else if (generationDuration === 'quarter') {
        startDate = new Date(today); endDate = new Date(today); endDate.setMonth(today.getMonth() + 3);
      }

      const formatDate = (date) => date.toISOString().split('T')[0];
      const response = await fetch(`${API_BASE_URL}/api/smart-scheduler/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: "0c8cf570-ccce-416c-b8ec-0723aab90225", start_date: formatDate(startDate), end_date: formatDate(endDate), rotation_type: "none" })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setMessage(`🧠 AI optimized the schedule! ${data.assignments_created} shifts assigned.`);
        setChatMessages(prev => [...prev, { type: 'ai', text: `✅ Schedule generated! ${data.assignments_created} shifts assigned.` }]);
      } else {
        setMessage(`AI Response: ${data.message}`);
      }
      fetchRoster(); fetchEmployees();
    } catch (err) { setMessage('Error generating schedule.'); } finally { setLoading(false); }
  };

  // Exception Creation
  const createException = async () => {
    if (!selectedEmployee) return alert('Please select an employee');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/exceptions?user_id=${selectedEmployee}&exception_type=${exceptionType}&start_date=${exceptionStartDate}&end_date=${exceptionEndDate}&reduced_hours_per_week=${reducedHours}&notes=${exceptionNotes}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage(`Success: ${data.message}`); fetchExceptions(); fetchEmployees(); setShowExceptionModal(false);
        setSelectedEmployee(''); setExceptionType('PREGNANCY'); setReducedHours(''); setExceptionNotes(''); setExceptionStartDate(''); setExceptionEndDate('');
      }
    } catch (err) { setMessage('Error creating exception'); }
  };

  // Swap Request Handling
  const handleSwapRequest = async (requestId, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/swap-request/${requestId}?status=${status}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) { setMessage(`Success: ${data.message}`); fetchSwapRequests(); fetchRoster(); }
    } catch (err) { setMessage('Error updating swap request'); }
  };

  // Time Off Request Handling
  const handleTimeOffRequest = async (requestId, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/time-off-request/${requestId}?status=${status}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) { setMessage(`Success: ${data.message}`); fetchTimeOffRequests(); }
    } catch (err) { setMessage('Error updating time off request'); }
  };

  // Employee Update
  const updateEmployee = async () => {
    if (!editingEmployee) return;
    try {
      const params = new URLSearchParams();
      Object.keys(editingEmployee).forEach(key => { if (editingEmployee[key] !== undefined && editingEmployee[key] !== null && key !== 'id') params.append(key, editingEmployee[key]); });
      const res = await fetch(`${API_BASE_URL}/api/admin/employees/${editingEmployee.id}?${params.toString()}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) { setMessage(`Success: ${data.message}`); fetchEmployees(); setShowEditModal(false); setEditingEmployee(null); }
    } catch (err) { setMessage('Error updating employee'); }
  };

  // Navigation Handler
  const handleNavigation = (tabName) => {
    setActiveDrawer(tabName);
    if (tabName === 'home' || tabName === 'schedule') {
      setIsDrawerOpen(false);
    } else {
      setIsDrawerOpen(true);
    }
  };

  // Chat Message Handler
  const handleChatMessage = (text) => {
    if (!text.trim()) return;
    setChatMessages(prev => [...prev, { type: 'user', text }]);
    setChatInput('');
    setIsThinking(true);

    setTimeout(() => {
      setIsThinking(false);
      const low = text.toLowerCase();
      if (low.includes('team') || low.includes('staff')) {
        handleNavigation('team');
        setChatMessages(prev => [...prev, { type: 'ai', text: 'Opened the team panel for you.' }]);
      } else if (low.includes('swap')) {
        handleNavigation('swaps');
        setChatMessages(prev => [...prev, { type: 'ai', text: `You have ${swapRequests.filter(r => r.status === 'PENDING').length} pending swap requests.` }]);
      } else if (low.includes('schedule') || low.includes('generate')) {
        handleNavigation('schedule');
        setChatMessages(prev => [...prev, { type: 'ai', text: 'Opened the schedule view. Select a duration and click generate.' }]);
      } else {
        setChatMessages(prev => [...prev, { type: 'ai', text: 'I can help with scheduling, team management, swaps, and time off. Try clicking a suggestion chip or type "show team".' }]);
      }
    }, 1200);
  };

  const getStatusBadge = (status) => {
    const colors = { 'PENDING': 'bg-z-orange/10 text-z-orange', 'APPROVED': 'bg-z-green/10 text-z-green', 'REJECTED': 'bg-z-red/10 text-z-red' };
    return colors[status] || 'bg-z-text-dim/10 text-z-text-dim';
  };

  // Drawer Content Renderer
  const renderDrawerContent = () => {
    if (activeDrawer === 'team') {
      return (
        <>
          <button onClick={() => { setEditingEmployee({ is_active: true, max_hours_per_week: 40 }); setShowEditModal(true); }} className="w-full py-2.5 mb-4 rounded-xl border border-dashed border-z-border text-z-text-dim text-sm font-semibold hover:border-z-purple hover:text-z-purple transition-colors flex items-center justify-center gap-2">
            <PlusIcon className="w-4 h-4" /> Add team member
          </button>
          <div className="space-y-3">
            {employees.length === 0 ? <p className="text-z-text-faint text-center py-12 text-sm font-mono">No team members found.</p> : employees.map(emp => (
              <div key={emp.id} className="bg-z-surface border border-z-border rounded-xl p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${emp.is_active ? 'bg-z-purple' : 'bg-z-text-faint'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {emp.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-z-text">{emp.name}</div>
                  <div className="text-xs text-z-text-dim mt-0.5 flex items-center gap-2">
                    {emp.job_title} · {emp.max_hours_per_week}h/wk
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${emp.is_active ? 'bg-z-green/10 text-z-green' : 'bg-z-red/10 text-z-red'}`}>
                      {emp.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
                <button onClick={() => { setEditingEmployee(emp); setShowEditModal(true); }} className="text-xs font-semibold text-z-blue bg-z-blue/10 px-2.5 py-1 rounded-lg hover:bg-z-blue/20 transition-colors">Edit</button>
              </div>
            ))}
          </div>
        </>
      );
    }
    if (activeDrawer === 'exceptions') {
      return (
        <>
          <button onClick={() => setShowExceptionModal(true)} className="w-full py-2.5 mb-4 rounded-xl border border-dashed border-z-border text-z-text-dim text-sm font-semibold hover:border-z-purple hover:text-z-purple transition-colors flex items-center justify-center gap-2">
            <PlusIcon className="w-4 h-4" /> Add exception
          </button>
          <div className="space-y-3">
            {exceptions.length === 0 ? <p className="text-z-text-faint text-center py-12 text-sm font-mono">No exceptions found.</p> : exceptions.map(ex => (
              <div key={ex.id} className="bg-z-surface border border-z-border rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-semibold text-z-purple bg-z-purple/10 px-1.5 py-0.5 rounded-full">{ex.exception_type}</span>
                  <span className="text-sm font-semibold text-z-text">{ex.user_name}</span>
                </div>
                <div className="text-xs text-z-text-dim font-mono">{ex.start_date} → {ex.end_date || '—'}</div>
                <button onClick={async () => { if (confirm('Deactivate?')) { await fetch(`${API_BASE_URL}/api/admin/exceptions/${ex.id}`, { method: 'DELETE' }); fetchExceptions(); fetchEmployees(); } }} className="text-xs text-z-red bg-z-red/10 px-2.5 py-1 rounded-lg hover:bg-z-red/20 transition-colors self-end">Deactivate</button>
              </div>
            ))}
          </div>
        </>
      );
    }
    if (activeDrawer === 'swaps') {
      return (
        <div className="space-y-3">
          {swapRequests.length === 0 ? <p className="text-z-text-faint text-center py-12 text-sm font-mono">No swap requests.</p> : swapRequests.map(req => (
            <div key={req.id} className="bg-z-surface border border-z-border rounded-xl p-3 flex flex-col gap-2">
              <div className="text-sm font-semibold text-z-text flex items-center gap-2">
                {req.requesting_user} ↔ {req.target_user}
                {req.ai_verified && <span className="text-[10px] font-mono font-semibold text-z-purple bg-z-purple/10 px-1.5 py-0.5 rounded-full">AI-VERIFIED</span>}
              </div>
              <div className="text-xs text-z-text-dim">{req.assignment_date} · <span className={`font-mono font-semibold ${getStatusBadge(req.status)}`}>{req.status}</span></div>
              {req.status === 'PENDING' && (
                <div className="flex gap-2 mt-1">
                  <button onClick={() => handleSwapRequest(req.id, 'APPROVED')} className="flex-1 py-1.5 rounded-lg bg-z-green text-white text-xs font-bold hover:opacity-90 transition-opacity">Approve</button>
                  <button onClick={() => handleSwapRequest(req.id, 'REJECTED')} className="flex-1 py-1.5 rounded-lg bg-z-surface-hi border border-z-border text-z-text-dim text-xs font-bold hover:text-z-text transition-colors">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    if (activeDrawer === 'timeoff') {
      return (
        <div className="space-y-3">
          {timeOffRequests.length === 0 ? <p className="text-z-text-faint text-center py-12 text-sm font-mono">No time off requests.</p> : timeOffRequests.map(req => (
            <div key={req.id} className="bg-z-surface border border-z-border rounded-xl p-3 flex flex-col gap-2">
              <div className="text-sm font-semibold text-z-text">{req.user_name}</div>
              <div className="text-xs text-z-text-dim">{req.start_date} → {req.end_date} · {req.reason}</div>
              <div className="text-xs text-z-text-dim"><span className={`font-mono font-semibold ${getStatusBadge(req.status)}`}>{req.status}</span></div>
              {req.status === 'PENDING' && (
                <div className="flex gap-2 mt-1">
                  <button onClick={() => handleTimeOffRequest(req.id, 'APPROVED')} className="flex-1 py-1.5 rounded-lg bg-z-green text-white text-xs font-bold hover:opacity-90 transition-opacity">Approve</button>
                  <button onClick={() => handleTimeOffRequest(req.id, 'REJECTED')} className="flex-1 py-1.5 rounded-lg bg-z-surface-hi border border-z-border text-z-text-dim text-xs font-bold hover:text-z-text transition-colors">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    return <div className="text-center text-z-text-faint text-sm mt-10 font-mono">Select a category from the left rail.</div>;
  };

  // Main Content Renderer
  const renderMainContent = () => {
    if (activeDrawer === 'schedule') {
      return (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* PREMIUM AI GENERATION BOARD */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-z-purple to-z-blue rounded-3xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
              <div className="relative bg-z-surface rounded-3xl border border-z-border p-8 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-z-purple/20 rounded-2xl flex items-center justify-center flex-shrink-0 border border-z-purple/30">
                      <SparklesIcon className="w-6 h-6 text-z-purple" />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold text-z-text tracking-tight">AI Schedule Generation</h2>
                      <p className="text-sm text-z-text-dim mt-1 font-body max-w-md">
                        Zing will analyze employee availability, branch requirements, and labor constraints to build the perfect optimized roster.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-z-page border border-z-border rounded-2xl p-1.5 shadow-inner">
                    {['day', 'week', 'month', 'quarter'].map((duration) => (
                      <button 
                        key={duration} 
                        onClick={() => setGenerationDuration(duration)} 
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold font-body transition-all duration-200 ${
                          generationDuration === duration 
                            ? 'bg-z-purple text-white shadow-lg shadow-z-purple/30' 
                            : 'text-z-text-dim hover:text-z-text hover:bg-z-surface-hi'
                        }`}
                      >
                        {duration.charAt(0).toUpperCase() + duration.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={generateRoster} 
                  disabled={loading} 
                  className="w-full md:w-auto bg-gradient-to-r from-z-purple to-z-blue text-white px-8 py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all font-bold font-body text-sm flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-z-purple/30 border border-z-purple/20"
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Optimizing Roster...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5" />
                      Generate {generationDuration.charAt(0).toUpperCase() + generationDuration.slice(1)} Schedule
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* SCHEDULE QUERY COMPONENT */}
            <ScheduleQuery roster={roster} employees={employees} branches={branches} />
          </div>
        </div>
      );
    }

    // Default: Home/Chat view
    return (
      <>
        {/* Chat Scroll Area */}
        <div className="flex-1 overflow-y-auto flex justify-center p-6 scroll-smooth">
          <div className="w-full max-w-2xl flex flex-col gap-4">
            {/* Initial AI Briefing */}
            {chatMessages.length === 0 && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-z-purple flex-shrink-0 flex items-center justify-center">
                  <SparklesIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="max-w-[80%]">
                  <div className="text-sm leading-relaxed text-z-text font-body">
                    Morning, {user?.name || 'Manager'}. <span className="text-z-orange font-semibold">{zingInsights.filter(i => i.action).length} item{zingInsights.filter(i => i.action).length !== 1 ? 's' : ''}</span> need your call before the schedule locks in.
                  </div>
                  {zingInsights.filter(i => i.action).map(insight => (
                    <div key={insight.id} className="bg-z-surface border border-z-border rounded-xl p-3 mt-3 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${insight.actionType === 'timeoff' ? 'bg-z-orange' : 'bg-z-purple'}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-z-text">{insight.title}</div>
                        <div className="text-xs text-z-text-dim truncate">{insight.message}</div>
                      </div>
                      <button onClick={() => { setChatContext(insight.context); setChatActionId(insight.requestId); setChatActionType(insight.actionType); setIsChatOpen(true); }} className="text-xs font-mono font-semibold text-z-blue hover:text-z-purple transition-colors whitespace-nowrap">
                        Review →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${msg.type === 'user' ? 'bg-z-surface-hi border border-z-border' : 'bg-z-purple'}`}>
                  {msg.type === 'user' ? (
                    <UsersIcon className="w-3.5 h-3.5 text-z-text-dim" />
                  ) : (
                    <SparklesIcon className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <div className={`max-w-[80%] ${msg.type === 'user' ? 'bg-z-surface-hi rounded-2xl rounded-tr-sm p-3' : ''}`}>
                  <div className="text-sm text-z-text font-body">{msg.text}</div>
                </div>
              </div>
            ))}
            
            {isThinking && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-z-purple flex-shrink-0 flex items-center justify-center">
                  <SparklesIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex items-center gap-1.5 text-z-text-faint font-mono text-xs">
                  <span className="w-1.5 h-1.5 bg-z-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-z-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-z-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  <span>Zing is working on it...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="flex-shrink-0 p-4 bg-gradient-to-t from-z-page via-z-page to-transparent">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {['Generate schedule', 'Show team', 'Show swaps', 'Labor cost'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChatMessage(chip)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full bg-z-surface border border-z-border text-xs font-medium text-z-text-dim hover:border-z-purple/50 hover:text-z-text transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-z-surface border border-z-border rounded-full px-4 py-2.5 focus-within:border-z-purple/50 focus-within:ring-1 focus-within:ring-z-purple/20 transition-all">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChatMessage(chatInput)}
                placeholder="Ask Zing or type a request..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-z-text placeholder-z-text-faint font-body"
              />
              <button 
                onClick={() => handleChatMessage(chatInput)}
                className="w-8 h-8 rounded-full bg-z-purple flex items-center justify-center text-white hover:bg-z-purple/90 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-z-page text-z-text font-body overflow-hidden">
      {/* ONBOARDING WIZARD OVERLAY */}
      {showOnboarding && <OrganizationOnboarding onComplete={() => { setShowOnboarding(false); fetchEmployees(); fetchBranches(); }} />}

      {/* LEFT ICON RAIL */}
      <div className="w-16 flex-shrink-0 bg-z-bg border-r border-z-border flex flex-col items-center py-4 gap-2 z-20">
        <div className="w-8 h-8 bg-z-purple rounded-lg flex items-center justify-center mb-4 shadow-[0_0_16px_rgba(191,90,242,0.45)]">
          <SparklesIcon className="w-4 h-4 text-white" />
        </div>

        {[
          { id: 'home', icon: HomeIcon, label: 'Home' },
          { id: 'schedule', icon: CalendarIcon, label: 'Schedule' },
          { id: 'team', icon: UsersIcon, label: 'Team' },
          { id: 'exceptions', icon: ExclamationTriangleIcon, label: 'Exceptions', badge: exceptions.length },
          { id: 'swaps', icon: ArrowsRightLeftIcon, label: 'Swaps', badge: swapRequests.filter(r => r.status === 'PENDING').length },
          { id: 'timeoff', icon: CalendarDaysIcon, label: 'Time Off', badge: timeOffRequests.filter(r => r.status === 'PENDING').length },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-all duration-200 ${
                activeDrawer === item.id 
                  ? 'bg-z-surface-hi text-z-purple' 
                  : 'text-z-text-dim hover:bg-z-surface hover:text-z-text'
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              {item.badge > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-z-red text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="flex-1" />
        <button onClick={() => setShowOnboarding(true)} className="w-10 h-10 rounded-xl flex items-center justify-center text-z-text-dim hover:bg-z-surface hover:text-z-text transition-colors" title="Setup Organization">
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
        <button onClick={onLogout} className="w-10 h-10 rounded-xl flex items-center justify-center text-z-text-dim hover:bg-z-surface hover:text-z-red transition-colors" title="Sign Out">
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
        </button>
      </div>

      {/* CENTER MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Topbar */}
        <div className="h-16 border-b border-z-border flex items-center justify-between px-6 flex-shrink-0 bg-z-bg/80 backdrop-blur-sm z-10">
          <div>
            <h1 className="font-display font-bold text-sm tracking-tight text-z-text">Zing Command Center</h1>
            <p className="text-[10px] text-z-text-faint uppercase tracking-widest font-mono">AI-Native Workforce Management</p>
          </div>
          {message && (
            <div className={`px-4 py-2 rounded-lg text-xs font-medium ${message.includes('Success') || message.includes('AI optimized') ? 'bg-z-green/10 text-z-green border border-z-green/20' : 'bg-z-orange/10 text-z-orange border border-z-orange/20'}`}>
              {message}
            </div>
          )}
        </div>

        {/* Main Content */}
        {renderMainContent()}
      </div>

      {/* RIGHT SLIDE-OUT DRAWER */}
      {isDrawerOpen && (
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => { setIsDrawerOpen(false); setActiveDrawer('home'); }}
        />
      )}
      
      <div className={`absolute right-0 top-0 bottom-0 w-96 bg-z-bg border-l border-z-border z-40 transform transition-transform duration-300 ease-out flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 border-b border-z-border flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-base text-z-text capitalize">{activeDrawer === 'timeoff' ? 'Time Off' : activeDrawer}</h2>
            <p className="text-[10px] text-z-text-faint uppercase tracking-wider font-mono mt-1">Context Panel</p>
          </div>
          <button 
            onClick={() => { setIsDrawerOpen(false); setActiveDrawer('home'); }}
            className="w-7 h-7 rounded-full bg-z-surface border border-z-border flex items-center justify-center text-z-text-dim hover:text-z-text hover:border-z-text-dim transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {renderDrawerContent()}
        </div>
      </div>

      {/* MODALS */}
      {showExceptionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-z-bg rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-z-border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-display font-bold text-z-text">Add Exception</h3>
              <button onClick={() => setShowExceptionModal(false)} className="text-z-text-dim hover:text-z-text transition-colors bg-z-surface p-1 rounded-full"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Employee</label>
                <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all">
                  <option value="">Select Employee</option>
                  {employees.filter(e => e.is_active).map((emp) => (<option key={emp.id} value={emp.id}>{emp.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Type</label>
                <select value={exceptionType} onChange={(e) => setExceptionType(e.target.value)} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all">
                  <option value="PREGNANCY">Pregnancy</option><option value="SICK">Sick Leave</option><option value="LEAVE">Leave</option><option value="PART_TIME">Part Time</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Reduced Hours/Week</label>
                <input type="number" value={reducedHours} onChange={(e) => setReducedHours(e.target.value)} placeholder="e.g., 25" className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text placeholder-z-text-faint focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Start Date</label><input type="date" value={exceptionStartDate} onChange={(e) => setExceptionStartDate(e.target.value)} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" /></div>
                <div><label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">End Date</label><input type="date" value={exceptionEndDate} onChange={(e) => setExceptionEndDate(e.target.value)} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" /></div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Notes</label>
                <textarea value={exceptionNotes} onChange={(e) => setExceptionNotes(e.target.value)} placeholder="Additional details..." className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text placeholder-z-text-faint focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all resize-none h-20" />
              </div>
              <button onClick={createException} className="w-full bg-z-blue text-white py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all font-semibold text-sm">Create Exception</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-z-bg rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-z-border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-display font-bold text-z-text">{editingEmployee.id ? 'Edit' : 'Add'} Team Member</h3>
              <button onClick={() => { setShowEditModal(false); setEditingEmployee(null); }} className="text-z-text-dim hover:text-z-text transition-colors bg-z-surface p-1 rounded-full"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Name</label><input type="text" value={editingEmployee.name || ''} onChange={(e) => setEditingEmployee({...editingEmployee, name: e.target.value})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" /></div>
              <div><label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Email</label><input type="email" value={editingEmployee.email || ''} onChange={(e) => setEditingEmployee({...editingEmployee, email: e.target.value})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" /></div>
              <div><label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Job Title</label><input type="text" value={editingEmployee.job_title || ''} onChange={(e) => setEditingEmployee({...editingEmployee, job_title: e.target.value})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" /></div>
              <div><label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Phone Number</label><input type="text" value={editingEmployee.phone_number || ''} onChange={(e) => setEditingEmployee({...editingEmployee, phone_number: e.target.value})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" /></div>
              <div><label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Max Hours/Week</label><input type="number" value={editingEmployee.max_hours_per_week || 45} onChange={(e) => setEditingEmployee({...editingEmployee, max_hours_per_week: parseFloat(e.target.value)})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" /></div>
              <div className="flex items-center gap-3 py-1"><label className="text-sm font-semibold text-z-text font-mono">Active Status</label><input type="checkbox" checked={editingEmployee.is_active !== false} onChange={(e) => setEditingEmployee({...editingEmployee, is_active: e.target.checked})} className="w-5 h-5 text-z-purple rounded focus:ring-z-purple/30 bg-z-surface border-z-border" /></div>
              <button onClick={updateEmployee} className="w-full bg-z-blue text-white py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all font-semibold text-sm">{editingEmployee.id ? 'Save Changes' : 'Add Employee'}</button>
            </div>
          </div>
        </div>
      )}

      <ZingChat isOpen={isChatOpen} onClose={() => { setIsChatOpen(false); setChatContext(''); setChatActionId(null); setChatActionType(null); }} initialContext={chatContext} actionId={chatActionId} actionType={chatActionType} onActionComplete={() => { fetchTimeOffRequests(); fetchSwapRequests(); }} />
    </div>
  );
};

export default AdminDashboard;