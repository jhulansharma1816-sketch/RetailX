import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  MessageSquare,
  Mail,
  RefreshCw,
  X,
  Loader2,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';
import { RecoveryTask, Customer, Invoice } from '../types';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<RecoveryTask[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Task Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('call');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Complete / Update Modal
  const [selectedTask, setSelectedTask] = useState<RecoveryTask | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, cRes, iRes] = await Promise.all([
        api.getTasks({ status: statusFilter === 'all' ? undefined : statusFilter }),
        api.getCustomers(),
        api.getInvoices({ status: 'all' }),
      ]);
      setTasks(tRes);
      setCustomers(cRes);
      setInvoices(iRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const openCreateModal = () => {
    const firstCust = customers[0]?.id || '';
    setCustomerId(firstCust);
    const custInvs = invoices.filter((i) => i.customer_id === firstCust && i.remaining_amount > 0);
    if (custInvs[0]) setInvoiceId(custInvs[0].id);
    setTitle('Phone follow-up regarding overdue payment');
    setTaskType('call');
    setPriority('high');
    setDueDate(new Date().toISOString().split('T')[0]);
    setNotes('Follow up with accounts director regarding pending RTGS clearance.');
    setIsModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!customerId || !title || !dueDate) {
      alert('Please fill mandatory fields.');
      return;
    }
    setSaving(true);
    try {
      await api.createTask({
        customer_id: customerId,
        invoice_id: invoiceId || undefined,
        title,
        task_type: taskType,
        priority,
        due_date: dueDate,
        notes,
      });
      setNotification('Follow-up task created!');
      setIsModalOpen(false);
      loadData();
      setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;
    setUpdating(true);
    try {
      await api.updateTask(selectedTask.id, {
        status: 'completed',
        outcome_notes: outcomeNotes || 'Follow-up executed successfully.',
      });
      setNotification('Task marked as completed!');
      setSelectedTask(null);
      loadData();
      setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-medium">{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recovery Follow-up Tasks</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign and track phone calls, verification items, and personal visits across your collection staff.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `All Tasks (${tasks.length})` },
          { id: 'pending', label: `Pending (${tasks.filter((t) => t.status === 'pending').length})` },
          { id: 'completed', label: `Completed (${tasks.filter((t) => t.status === 'completed').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === tab.id
                ? 'bg-navy-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-600 mb-2" />
            <span>Loading follow-up tasks...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
            No recovery tasks found for this filter.
          </div>
        ) : (
          tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isUrgent = task.priority === 'urgent' || task.priority === 'high';

            return (
              <div
                key={task.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-card hover:shadow-card-hover transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                        isUrgent ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200 uppercase">
                      {task.task_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Due: <span className="text-slate-800">{task.due_date}</span>
                    </span>
                  </div>

                  <h3 className={`text-sm font-bold text-slate-900 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                    {task.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Target: <span className="font-semibold text-slate-800">{task.company_name}</span> ({task.contact_person})
                    {task.invoice_number && <span> • Invoice: {task.invoice_number}</span>}
                  </p>

                  {task.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {task.notes}
                    </p>
                  )}

                  {task.outcome_notes && (
                    <p className="text-xs text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200 font-medium">
                      ✓ Outcome: {task.outcome_notes}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0 flex items-center gap-2">
                  {!isCompleted ? (
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setOutcomeNotes('');
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Done</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl">
                      Completed
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Complete Task Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-md p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Record Follow-up Outcome</h3>
              <button onClick={() => setSelectedTask(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <strong>Task:</strong> {selectedTask.title} ({selectedTask.company_name})
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Outcome Notes
              </label>
              <textarea
                rows={3}
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="e.g. Spoke to Director, agreed to release payment tomorrow via RTGS"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteTask}
                disabled={updating}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                Save & Mark Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-elevated w-full max-w-lg p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Create Follow-up Task</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.contact_person})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Task Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp Follow-up</option>
                    <option value="email">Email Notice</option>
                    <option value="verification">Bank Verification</option>
                    <option value="dispute_resolution">Dispute Resolution</option>
                    <option value="visit">Personal Visit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Instructions / Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white rounded-xl"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
