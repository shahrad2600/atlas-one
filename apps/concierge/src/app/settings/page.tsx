'use client';

import { useState } from 'react';
import { Save, Pencil, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface NotificationPref {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface ResponseTemplate {
  id: string;
  name: string;
  content: string;
}

export default function SettingsPage() {
  const { agent } = useAuth();
  const [saved, setSaved] = useState(false);

  // Notification preferences
  const [notifications, setNotifications] = useState<NotificationPref[]>([
    { key: 'new_assignments', label: 'New Assignments', description: 'Get notified when a request is assigned to you', enabled: true },
    { key: 'escalations', label: 'Escalations', description: 'Get notified about escalated requests', enabled: true },
    { key: 'chat_messages', label: 'Chat Messages', description: 'Get notified when travelers send new messages', enabled: true },
    { key: 'queue_alerts', label: 'Queue Alerts', description: 'Get notified when queue exceeds 10 unassigned requests', enabled: false },
    { key: 'moderation_flags', label: 'Moderation Flags', description: 'Get notified about new flagged content', enabled: false },
    { key: 'shift_reminders', label: 'Shift Reminders', description: 'Get a reminder 15 minutes before shift starts', enabled: true },
  ]);

  const toggleNotification = (key: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.key === key ? { ...n, enabled: !n.enabled } : n)),
    );
  };

  // Response templates
  const [templates, setTemplates] = useState<ResponseTemplate[]>([
    {
      id: 'tpl-1',
      name: 'Greeting',
      content: 'Hello {traveler_name}, thank you for reaching out to Atlas One Concierge! My name is {agent_name} and I will be assisting you today. How can I help you?',
    },
    {
      id: 'tpl-2',
      name: 'Booking Confirmation',
      content: 'Great news, {traveler_name}! Your booking has been confirmed. Here are the details:\n\n{booking_details}\n\nPlease let me know if you need anything else or have any questions about your upcoming trip.',
    },
    {
      id: 'tpl-3',
      name: 'Escalation Notice',
      content: '{traveler_name}, I understand your concern and I want to make sure this is resolved to your complete satisfaction. I am escalating this to our senior team who will follow up with you within {timeframe}. Thank you for your patience.',
    },
    {
      id: 'tpl-4',
      name: 'Cancellation Processed',
      content: 'Hi {traveler_name}, your cancellation has been processed. A refund of {amount} will be returned to your original payment method within 5-7 business days. Is there anything else I can help you with?',
    },
  ]);

  const [editingTemplate, setEditingTemplate] = useState<ResponseTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');

  const openEditTemplate = (tpl: ResponseTemplate) => {
    setEditingTemplate(tpl);
    setEditName(tpl.name);
    setEditContent(tpl.content);
  };

  const saveTemplate = () => {
    if (!editingTemplate) return;
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === editingTemplate.id ? { ...t, name: editName, content: editContent } : t,
      ),
    );
    setEditingTemplate(null);
  };

  // Shift preferences
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [timezone, setTimezone] = useState('America/New_York');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const timezoneOptions = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
    { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
    { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <Button onClick={handleSave}>
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Profile</h2>
            <div className="flex items-start gap-6">
              <Avatar name={agent?.displayName ?? 'Agent'} size="xl" />
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Full Name" value={agent?.displayName ?? ''} readOnly className="bg-slate-50" />
                  <Input label="Email" value={agent?.email ?? ''} readOnly className="bg-slate-50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Agent ID" value={agent?.agentId ?? ''} readOnly className="bg-slate-50 font-mono" />
                  <Input label="Role" value={agent?.role?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? ''} readOnly className="bg-slate-50" />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Contact your supervisor to update profile information.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Notification Preferences</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {notifications.map((pref) => (
                <div key={pref.key} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{pref.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{pref.description}</p>
                  </div>
                  <button
                    onClick={() => toggleNotification(pref.key)}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      pref.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
                        pref.enabled ? 'translate-x-6' : 'translate-x-1',
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Auto-Response Templates */}
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Auto-Response Templates</h2>
            <div className="space-y-3">
              {templates.map((tpl) => (
                <div key={tpl.id} className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{tpl.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">{tpl.content}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEditTemplate(tpl)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Shift Preferences */}
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Shift Preferences</h2>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Preferred Start Time"
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
              />
              <Input
                label="Preferred End Time"
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
              />
              <Select
                label="Timezone"
                options={timezoneOptions}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              Shift preferences are used for scheduling and notification timing. Actual shifts are assigned by your supervisor.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Template Modal */}
      <Modal
        open={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        title="Edit Template"
        size="lg"
      >
        {editingTemplate && (
          <div className="space-y-4">
            <Input
              label="Template Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <Textarea
              label="Template Content"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[160px]"
            />
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Available Variables</p>
              <div className="flex flex-wrap gap-2">
                {['{traveler_name}', '{agent_name}', '{booking_details}', '{amount}', '{timeframe}', '{date}'].map((v) => (
                  <span key={v} className="inline-flex items-center rounded bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-mono text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {v}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button onClick={saveTemplate}>
                <Check className="h-4 w-4" /> Save Template
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
