"use client";

import { motion } from 'framer-motion';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-2">
      <span className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-sky-600" : "bg-slate-200"}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [showTravelMap, setShowTravelMap] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user) {
      setName(user.displayName);
      setEmail(user.email);
      setBio("Avid traveler and food enthusiast. Always looking for the next adventure.");
      setLocation("San Francisco, CA");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <Skeleton variant="text" className="w-48 h-8 mb-8" />
        <Skeleton variant="card" className="mb-6" />
        <Skeleton variant="card" />
      </main>
    );
  }

  if (!user) return null;

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/profile" className="text-slate-400 hover:text-slate-600"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Personal Information</h2></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Display Name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Textarea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
              <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
              <div className="flex justify-end"><Button>Save Changes</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Notifications</h2></CardHeader>
            <CardContent>
              <Toggle checked={emailNotifs} onChange={setEmailNotifs} label="Email notifications" />
              <Toggle checked={pushNotifs} onChange={setPushNotifs} label="Push notifications" />
              <div className="flex justify-end mt-4"><Button>Save Changes</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Privacy</h2></CardHeader>
            <CardContent>
              <Toggle checked={publicProfile} onChange={setPublicProfile} label="Public profile" />
              <Toggle checked={showTravelMap} onChange={setShowTravelMap} label="Show travel map" />
              <div className="flex justify-end mt-4"><Button>Save Changes</Button></div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader><h2 className="text-lg font-semibold text-red-600">Danger Zone</h2></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
              <Button variant="danger" onClick={() => setShowDeleteModal(true)}><Trash2 className="h-4 w-4 mr-1" />Delete Account</Button>
            </CardContent>
          </Card>
        </div>

        <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Account" size="sm">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.</p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger">Delete Account</Button>
          </div>
        </Modal>
      </div>
    </motion.main>
  );
}
