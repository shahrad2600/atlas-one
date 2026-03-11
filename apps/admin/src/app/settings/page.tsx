'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Copy, Eye, EyeOff, ArrowUpRight } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  // Business Info
  const [businessName, setBusinessName] = useState('Grand Plaza Hotel Group');
  const [businessDescription, setBusinessDescription] = useState(
    'Premium hospitality group operating luxury hotels, restaurants, and experience venues across major US cities.',
  );
  const [contactEmail, setContactEmail] = useState('contact@grandplazahotel.com');
  const [contactPhone, setContactPhone] = useState('+1 (212) 555-0100');
  const [businessWebsite, setBusinessWebsite] = useState('https://grandplazahotel.com');
  const [savingBusiness, setSavingBusiness] = useState(false);

  // Notifications
  const [notifyNewReviews, setNotifyNewReviews] = useState(true);
  const [notifyNewBookings, setNotifyNewBookings] = useState(true);
  const [notifyTeamActivity, setNotifyTeamActivity] = useState(false);
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // API
  const [showApiKey, setShowApiKey] = useState(false);
  const [regenerating, setRegenreating] = useState(false);
  const apiKey = 'atls_pk_7f3a9b2c4e1d6h8i0j5k3l7m9n2o4p6q';
  const maskedKey = 'atls_pk_****************************4p6q';

  const handleSaveBusiness = async () => {
    setSavingBusiness(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSavingBusiness(false);
  };

  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSavingNotifications(false);
  };

  const handleRegenerateKey = async () => {
    setRegenreating(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setRegenreating(false);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage your business profile and preferences</p>
      </div>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Business Information</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Public information about your business</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              label="Business Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
            <Textarea
              label="Description"
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              rows={3}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Contact Email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
              <Input
                label="Phone Number"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <Input
              label="Website"
              value={businessWebsite}
              onChange={(e) => setBusinessWebsite(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveBusiness} loading={savingBusiness} icon={<Save className="h-4 w-4" />}>
            Save Business Info
          </Button>
        </CardFooter>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Subscription</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Your current plan and billing</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Free Plan</h4>
                <Badge variant="outline">Current</Badge>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Basic listing management and analytics</p>
            </div>
            <Button variant="outline" icon={<ArrowUpRight className="h-4 w-4" />}>
              Upgrade to Business Advantage
            </Button>
          </div>

          <div className="mt-4 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-200 dark:border-brand-800">
            <h4 className="text-sm font-semibold text-brand-900">Business Advantage</h4>
            <ul className="mt-2 space-y-1.5 text-sm text-brand-700">
              <li className="flex items-center gap-2">
                <span className="text-brand-500">&#10003;</span> Priority listing placement
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-500">&#10003;</span> Advanced analytics & competitor insights
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-500">&#10003;</span> Review Express with unlimited campaigns
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-500">&#10003;</span> Storyboard & rich media content
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-500">&#10003;</span> Dedicated account manager
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Configure email notification preferences</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                label: 'New Reviews',
                description: 'Get notified when a guest leaves a new review',
                checked: notifyNewReviews,
                onChange: setNotifyNewReviews,
              },
              {
                label: 'New Bookings',
                description: 'Get notified when a new booking is made',
                checked: notifyNewBookings,
                onChange: setNotifyNewBookings,
              },
              {
                label: 'Team Activity',
                description: 'Get notified when team members make changes',
                checked: notifyTeamActivity,
                onChange: setNotifyTeamActivity,
              },
              {
                label: 'Weekly Performance Report',
                description: 'Receive a weekly summary of your performance metrics',
                checked: notifyWeeklyReport,
                onChange: setNotifyWeeklyReport,
              },
            ].map((item) => (
              <label
                key={item.label}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.onChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 dark:bg-slate-600 peer-checked:bg-brand-600 rounded-full transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
                </div>
              </label>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSaveNotifications}
            loading={savingNotifications}
            icon={<Save className="h-4 w-4" />}
          >
            Save Notifications
          </Button>
        </CardFooter>
      </Card>

      {/* API Access */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">API Access</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage your API keys for integrations</p>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">API Key</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                <code className="text-sm text-slate-700 dark:text-slate-300 font-mono flex-1">
                  {showApiKey ? apiKey : maskedKey}
                </code>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyKey} icon={<Copy className="h-4 w-4" />}>
                Copy
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={handleRegenerateKey}
              loading={regenerating}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Regenerate Key
            </Button>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Regenerating your API key will invalidate the existing key. All integrations using the old key will stop working.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
