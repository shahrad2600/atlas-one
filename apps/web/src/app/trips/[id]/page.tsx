"use client";

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ChevronDown, ChevronRight, Plus, Clock, MapPin,
  Hotel, Plane, UtensilsCrossed, Camera, Users, StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { TabGroup, TabList, Tab, TabPanel } from "@/components/ui/tabs";
import { cn, formatCurrency } from "@/lib/utils";

const trip = {
  name: "Paris Spring Getaway",
  destination: "Paris, France",
  dates: "Mar 15 - 22, 2026",
  status: "upcoming" as const,
  budget: { total: 4500, spent: 2850, remaining: 1650 },
  image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80",
};

const itinerary = [
  {
    day: 1,
    date: "Mar 15",
    items: [
      { time: "10:00 AM", type: "flight", name: "SFO to CDG (Air France AF083)", location: "San Francisco Airport", status: "confirmed" },
    ],
  },
  {
    day: 2,
    date: "Mar 16",
    items: [
      { time: "9:00 AM", type: "hotel", name: "Check-in: Le Marais Boutique Hotel", location: "Le Marais, Paris", status: "confirmed" },
      { time: "12:00 PM", type: "dining", name: "Lunch at Cafe de Flore", location: "Saint-Germain-des-Pres", status: "pending" },
      { time: "3:00 PM", type: "experience", name: "Louvre Museum Tour", location: "1st Arrondissement", status: "confirmed" },
    ],
  },
  {
    day: 3,
    date: "Mar 17",
    items: [
      { time: "10:00 AM", type: "experience", name: "Eiffel Tower Visit", location: "Champ de Mars", status: "confirmed" },
      { time: "1:00 PM", type: "dining", name: "Le Petit Cler", location: "Rue Cler", status: "pending" },
      { time: "4:00 PM", type: "experience", name: "Seine River Cruise", location: "Pont Neuf", status: "confirmed" },
    ],
  },
];

const reservations = [
  { type: "flight", name: "SFO to CDG - Air France", ref: "AF-2840291", status: "confirmed", price: "$1,240" },
  { type: "hotel", name: "Le Marais Boutique Hotel (7 nights)", ref: "HT-9918234", status: "confirmed", price: "$1,190" },
  { type: "experience", name: "Louvre Museum Skip-the-Line", ref: "EX-0082716", status: "confirmed", price: "$85" },
  { type: "experience", name: "Seine River Cruise", ref: "EX-0091823", status: "confirmed", price: "$45" },
  { type: "dining", name: "Le Jules Verne (Eiffel Tower)", ref: "DN-1029384", status: "pending", price: "$290" },
];

const collaborators = [
  { name: "Sarah Mitchell", role: "Co-planner" },
  { name: "James Chen", role: "Viewer" },
];

const typeIcon: Record<string, React.ReactNode> = {
  flight: <Plane className="h-4 w-4" />,
  hotel: <Hotel className="h-4 w-4" />,
  dining: <UtensilsCrossed className="h-4 w-4" />,
  experience: <Camera className="h-4 w-4" />,
};

function DaySection({ day, date, items }: { day: number; date: string; items: typeof itinerary[0]["items"] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-sky-600">Day {day}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">{date}</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>
      {open && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <span className="text-xs text-slate-400 w-16 shrink-0">{item.time}</span>
              <span className={cn("flex items-center justify-center h-8 w-8 rounded-lg shrink-0", item.type === "flight" ? "bg-blue-100 text-blue-600" : item.type === "hotel" ? "bg-purple-100 text-purple-600" : item.type === "dining" ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600")}>
                {typeIcon[item.type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</p>
              </div>
              <Badge variant={item.status === "confirmed" ? "success" : "warning"}>{item.status}</Badge>
            </div>
          ))}
          <button className="flex items-center gap-2 px-5 py-3 text-sm text-sky-600 hover:bg-sky-50 w-full transition-colors">
            <Plus className="h-4 w-4" />Add Item
          </button>
        </div>
      )}
    </div>
  );
}

export default function TripDetailPage() {
  const [notes, setNotes] = useState("Remember to pack light! Check weather forecast a week before departure. Confirm restaurant reservations 48 hours in advance.");
  const budgetPercent = Math.round((trip.budget.spent / trip.budget.total) * 100);

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="relative h-48 sm:h-64 bg-slate-200">
        <Image src={trip.image} alt={trip.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 max-w-5xl mx-auto">
          <Link href="/trips" className="text-white/80 hover:text-white text-sm flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" />Back to Trips</Link>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{trip.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-white/80">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{trip.destination}</span>
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{trip.dates}</span>
              </div>
            </div>
            <Badge variant="default" className="text-sm">{trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-500 dark:text-slate-400">Budget</span>
              <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(trip.budget.spent)} of {formatCurrency(trip.budget.total)}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", budgetPercent > 90 ? "bg-red-500" : budgetPercent > 70 ? "bg-amber-500" : "bg-sky-500")} style={{ width: `${budgetPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Spent: {formatCurrency(trip.budget.spent)}</span>
              <span>Remaining: {formatCurrency(trip.budget.remaining)}</span>
            </div>
          </CardContent>
        </Card>

        <TabGroup>
          <TabList>
            <Tab index={0}>Itinerary</Tab>
            <Tab index={1}>Reservations</Tab>
            <Tab index={2}>Collaborators</Tab>
            <Tab index={3}>Notes</Tab>
          </TabList>

          <TabPanel index={0}>
            <div className="space-y-4">
              {itinerary.map((day) => (<DaySection key={day.day} {...day} />))}
            </div>
          </TabPanel>

          <TabPanel index={1}>
            <div className="space-y-3">
              {reservations.map((res) => (
                <Card key={res.ref}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <span className={cn("flex items-center justify-center h-10 w-10 rounded-lg shrink-0", res.type === "flight" ? "bg-blue-100 text-blue-600" : res.type === "hotel" ? "bg-purple-100 text-purple-600" : res.type === "dining" ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600")}>
                        {typeIcon[res.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white">{res.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Ref: {res.ref}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white">{res.price}</p>
                        <Badge variant={res.status === "confirmed" ? "success" : "warning"} className="mt-1">{res.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabPanel>

          <TabPanel index={2}>
            <div className="space-y-3">
              {collaborators.map((collab) => (
                <Card key={collab.name}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={collab.name} size="md" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">{collab.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{collab.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full"><Plus className="h-4 w-4 mr-1" />Add Collaborator</Button>
            </div>
          </TabPanel>

          <TabPanel index={3}>
            <Card>
              <CardContent>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} placeholder="Add notes for your trip..." />
                <div className="flex justify-end mt-4"><Button>Save Notes</Button></div>
              </CardContent>
            </Card>
          </TabPanel>
        </TabGroup>
      </div>
    </motion.main>
  );
}
