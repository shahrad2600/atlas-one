'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { formatDate, getInitials } from '@/lib/utils';
import { motion } from 'framer-motion';
import { UserPlus, Trash2, Send } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Manager' | 'Viewer';
  joinedAt: string;
  lastActive: string;
  avatarUrl?: string;
}

const mockMembers: TeamMember[] = [
  {
    id: 'mem_001',
    name: 'Sarah Mitchell',
    email: 'sarah@grandplazahotel.com',
    role: 'Owner',
    joinedAt: '2024-06-15T10:00:00Z',
    lastActive: '2026-03-08T09:30:00Z',
  },
  {
    id: 'mem_002',
    name: 'David Rodriguez',
    email: 'david@grandplazahotel.com',
    role: 'Admin',
    joinedAt: '2024-08-20T14:00:00Z',
    lastActive: '2026-03-07T17:45:00Z',
  },
  {
    id: 'mem_003',
    name: 'Lisa Chen',
    email: 'lisa@grandplazahotel.com',
    role: 'Manager',
    joinedAt: '2025-01-10T09:00:00Z',
    lastActive: '2026-03-08T08:15:00Z',
  },
  {
    id: 'mem_004',
    name: 'Marcus Brown',
    email: 'marcus@grandplazahotel.com',
    role: 'Viewer',
    joinedAt: '2025-06-01T11:30:00Z',
    lastActive: '2026-03-05T12:00:00Z',
  },
];

const roleBadgeMap: Record<string, BadgeVariant> = {
  Owner: 'default',
  Admin: 'success',
  Manager: 'warning',
  Viewer: 'outline',
};

export default function TeamPage() {
  const [members, setMembers] = useState(mockMembers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Viewer');
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setSending(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSending(false);
    setInviteEmail('');
    setInviteRole('Viewer');
    setInviteOpen(false);
  };

  const handleRemove = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setRemoveConfirmId(null);
  };

  const handleRoleChange = (id: string, role: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role: role as TeamMember['role'] } : m)),
    );
  };

  const memberToRemove = members.find((m) => m.id === removeConfirmId);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Team Members</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">{members.length} members in your team</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} icon={<UserPlus className="h-4 w-4" />}>
          Invite Member
        </Button>
      </div>

      {/* Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="py-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0 h-12 w-12 bg-brand-100 dark:bg-brand-900/40 rounded-full flex items-center justify-center text-sm font-bold text-brand-700 dark:text-brand-300">
                  {getInitials(member.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{member.name}</h3>
                    <Badge variant={roleBadgeMap[member.role]}>{member.role}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{member.email}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 dark:text-slate-500">
                    <span>Joined {formatDate(member.joinedAt)}</span>
                    <span>Last active {formatDate(member.lastActive)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 mt-4">
                    <Select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      options={[
                        { value: 'Owner', label: 'Owner' },
                        { value: 'Admin', label: 'Admin' },
                        { value: 'Manager', label: 'Manager' },
                        { value: 'Viewer', label: 'Viewer' },
                      ]}
                      disabled={member.role === 'Owner'}
                      className="!w-32 !text-xs"
                    />
                    {member.role !== 'Owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemoveConfirmId(member.id)}
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Invite Modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Team Member" size="sm">
        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={[
              { value: 'Admin', label: 'Admin - Full access' },
              { value: 'Manager', label: 'Manager - Edit listings & respond to reviews' },
              { value: 'Viewer', label: 'Viewer - Read-only access' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              loading={sending}
              disabled={!inviteEmail}
              icon={<Send className="h-4 w-4" />}
            >
              Send Invite
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal
        open={!!removeConfirmId}
        onClose={() => setRemoveConfirmId(null)}
        title="Remove Team Member"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from the team?
            They will lose access to the Partner Dashboard immediately.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRemoveConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => removeConfirmId && handleRemove(removeConfirmId)}
              icon={<Trash2 className="h-4 w-4" />}
            >
              Remove Member
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
