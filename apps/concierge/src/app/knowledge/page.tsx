'use client';

import { useState } from 'react';
import {
  Search,
  BookOpen,
  CreditCard,
  XCircle,
  Award,
  HelpCircle,
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface FAQItem {
  question: string;
  answer: string;
}

interface KnowledgeCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  faqs: FAQItem[];
}

const categories: KnowledgeCategory[] = [
  {
    id: 'booking-policies',
    title: 'Booking Policies',
    description: 'Standard booking procedures, guarantees, and policies',
    icon: BookOpen,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    faqs: [
      {
        question: 'What is the standard booking confirmation time?',
        answer: 'Standard bookings are confirmed within 2 hours during business hours (9 AM - 9 PM local time). Luxury tier requests are prioritized and typically confirmed within 30 minutes. Instant confirmation is available for partner properties marked with the lightning bolt icon in the system.',
      },
      {
        question: 'How do we handle overbooking situations?',
        answer: 'If a property is overbooked, immediately escalate to the partnerships team. For Luxury tier travelers, we guarantee a same-category or higher upgrade at a nearby property at no additional cost. For Premium tier, offer a 15% credit toward their next booking. For Standard tier, provide alternative options within the same price range and a 10% future booking credit.',
      },
      {
        question: 'What is the price match policy?',
        answer: 'Atlas One offers a Best Price Guarantee on all hotel bookings. If a traveler finds a lower publicly available rate within 24 hours of booking, we will match it and provide an additional 5% discount. The competing rate must be for the same room type, dates, and cancellation policy. Screenshot evidence is required.',
      },
      {
        question: 'Can travelers book on behalf of someone else?',
        answer: 'Yes, travelers can book on behalf of third parties. The booking must include the actual guest name and contact information. The payment responsibility remains with the booking account holder. Group bookings (5+ rooms or 10+ guests) require supervisor approval before confirmation.',
      },
    ],
  },
  {
    id: 'cancellation-rules',
    title: 'Cancellation Rules',
    description: 'Cancellation windows, refund policies, and exceptions',
    icon: XCircle,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-50',
    faqs: [
      {
        question: 'What is the standard cancellation window?',
        answer: 'Hotels: Free cancellation up to 48 hours before check-in (72 hours for peak season). Flights: Free cancellation within 24 hours of booking; after that, airline cancellation policies apply. Experiences: Free cancellation up to 24 hours in advance. Dining: Free cancellation up to 2 hours before reservation time. All times are based on the destination local time zone.',
      },
      {
        question: 'How are refunds processed?',
        answer: 'Refunds are processed to the original payment method within 5-7 business days. If the original card is expired or cancelled, refunds are issued as Trip Cash to the traveler account. Luxury tier members receive priority refund processing (2-3 business days). Partial refunds are calculated based on the number of unused nights/services.',
      },
      {
        question: 'Are there exceptions to cancellation fees?',
        answer: 'Yes, cancellation fees are waived for: (1) Medical emergencies with documentation, (2) Natural disasters or government travel advisories, (3) Flight cancellations by the airline, (4) Death in the immediate family with documentation. Concierge agents with Senior or Supervisor level can approve emergency waivers up to $500. Amounts above $500 require manager approval.',
      },
    ],
  },
  {
    id: 'loyalty-program',
    title: 'Loyalty Program',
    description: 'Trip Cash, tier benefits, and reward redemptions',
    icon: Award,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    faqs: [
      {
        question: 'How does the Trip Cash system work?',
        answer: 'Trip Cash is earned at the following rates: Standard tier: 1 point per $1 spent. Premium tier: 1.5 points per $1 spent. Luxury tier: 2 points per $1 spent. Points can be redeemed at a rate of 100 points = $1 toward any booking. Points expire after 24 months of account inactivity. Bonus earning opportunities include review writing (50 points), photo uploads (25 points), and referrals (500 points per successful referral).',
      },
      {
        question: 'How do tier upgrades work?',
        answer: 'Tier thresholds: Standard (0-4,999 points lifetime), Premium (5,000-24,999 points), Luxury (25,000+ points). Tier status is evaluated quarterly. Travelers maintain their tier for a minimum of 12 months after qualifying. Downgrade protection: if a traveler misses the threshold by less than 10%, they receive a 90-day grace period to requalify.',
      },
      {
        question: 'Can Trip Cash be transferred between accounts?',
        answer: 'Trip Cash can be transferred between family members who are linked in the system (up to 4 linked accounts). Each transfer has a minimum of 500 points and a maximum of 10,000 points per transaction. There is a limit of 3 transfers per calendar month. Point transfers between unlinked accounts are not permitted.',
      },
      {
        question: 'What are the Luxury tier exclusive benefits?',
        answer: 'Luxury tier members receive: Priority concierge response (guaranteed within 15 minutes), complimentary room upgrades when available, airport lounge access at 1,200+ lounges globally, late checkout until 4 PM at partner hotels, dedicated phone line (bypass queue), annual travel credit of $200, and exclusive access to Atlas One curated experiences.',
      },
    ],
  },
  {
    id: 'partner-faq',
    title: 'Partner FAQ',
    description: 'Partner property policies and contact procedures',
    icon: HelpCircle,
    iconColor: 'text-sky-600',
    iconBg: 'bg-sky-50',
    faqs: [
      {
        question: 'How do I contact a partner property directly?',
        answer: 'All partner property contacts are available in the CRM system under the "Partners" tab. For urgent requests during non-business hours, use the 24/7 partner hotline numbers listed in the Emergency Contacts section. Do not share partner direct contact information with travelers; all communication should be routed through the concierge.',
      },
      {
        question: 'What is the commission structure with partners?',
        answer: 'Standard commission rates: Hotels 12-18% (varies by chain), Flights 3-5% (via GDS), Experiences 15-20%, Dining 8-12%. Commission disputes should be escalated to the partnerships team. Never discuss commission rates with travelers or in any customer-facing communication.',
      },
      {
        question: 'How do I handle partner property complaints?',
        answer: 'Document the complaint with photos/evidence from the traveler. Contact the property partner relations desk (not the front desk). Log the complaint in the CRM with severity rating (1-5). For severity 4-5 complaints, escalate to the partnerships team immediately. Follow up with the traveler within 24 hours with a resolution update.',
      },
    ],
  },
  {
    id: 'emergency-procedures',
    title: 'Emergency Procedures',
    description: 'Emergency protocols and escalation paths',
    icon: AlertTriangle,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-50',
    faqs: [
      {
        question: 'What qualifies as a concierge emergency?',
        answer: 'Emergencies include: (1) Traveler medical emergency abroad, (2) Natural disaster affecting active travelers, (3) Political unrest or security threats at destination, (4) Traveler stranded due to carrier bankruptcy, (5) Missing traveler who has not checked in. All emergencies require immediate supervisor notification and entry into the Emergency Response Log.',
      },
      {
        question: 'What is the emergency contact chain?',
        answer: 'First contact: On-duty Supervisor (Slack #emergency-response). Second: Regional Operations Manager (phone tree in the Emergency Contacts section). Third: VP of Operations (for company-wide events). Fourth: External emergency services if traveler safety is at risk. All emergency actions must be documented in real-time in the incident log.',
      },
      {
        question: 'How do we handle medical emergencies for travelers abroad?',
        answer: 'Immediately connect the traveler with our 24/7 medical assistance partner (GlobalMed Assist: +1-800-555-0199). Verify the traveler insurance coverage in their profile. Coordinate with the nearest embassy/consulate if hospitalization is required. Notify the traveler emergency contact on file. Log all actions in the Emergency Response system with timestamps.',
      },
    ],
  },
  {
    id: 'escalation-guide',
    title: 'Escalation Guide',
    description: 'When and how to escalate issues',
    icon: ArrowUpRight,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
    faqs: [
      {
        question: 'When should I escalate a request?',
        answer: 'Escalate when: (1) Resolution requires authorization above your level (refunds >$500, policy exceptions), (2) Traveler has requested to speak with a supervisor, (3) Issue has been unresolved for more than 4 hours, (4) Complaint involves legal threats or potential media exposure, (5) System-wide issues affecting multiple travelers, (6) VIP/Luxury tier traveler with CSAT below 3.',
      },
      {
        question: 'What information should I include in an escalation?',
        answer: 'Every escalation must include: Traveler name, ID, and tier. Complete request history and actions taken so far. Specific reason for escalation. Recommended resolution with cost estimate. Urgency level (Critical/High/Medium). All relevant booking IDs and communication logs. Time elapsed since original request.',
      },
      {
        question: 'What are the escalation response time SLAs?',
        answer: 'Critical (safety/legal): Immediate response, resolution within 1 hour. High (VIP dissatisfaction, potential churn): Response within 30 minutes, resolution within 4 hours. Medium (policy exception, complex request): Response within 2 hours, resolution within 24 hours. Low (general feedback, process improvement): Response within 24 hours, resolution within 72 hours.',
      },
      {
        question: 'How do I de-escalate an upset traveler?',
        answer: 'Follow the HEART framework: Hear (listen actively, do not interrupt), Empathize (acknowledge their frustration), Apologize (take ownership regardless of fault), Resolve (offer concrete solutions, give options when possible), Thank (express gratitude for their patience and loyalty). Always use the traveler name. Never say "that is our policy." Instead, explain what you can do for them.',
      },
    ],
  },
];

export default function KnowledgePage() {
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredCategories = categories.map((cat) => ({
    ...cat,
    faqs: cat.faqs.filter((faq) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q);
    }),
  })).filter((cat) => cat.faqs.length > 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Knowledge Base</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Find answers, policies, and procedures</p>
        <div className="max-w-xl mx-auto">
          <Input
            placeholder="Search knowledge base..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-5 w-5" />}
            className="text-base py-3"
          />
        </div>
      </div>

      {/* Category Cards (when no search) */}
      {!search && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card
                key={cat.id}
                className="cursor-pointer hover:shadow-md transition-all hover:border-emerald-200"
                onClick={() => {
                  const el = document.getElementById(cat.id);
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <CardContent className="flex items-start gap-3">
                  <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg shrink-0', cat.iconBg)}>
                    <Icon className={cn('h-5 w-5', cat.iconColor)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{cat.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cat.description}</p>
                    <p className="text-xs text-emerald-600 font-medium mt-1">{cat.faqs.length} articles</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* FAQ Sections */}
      <div className="space-y-8">
        {filteredCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.id} id={cat.id}>
              <div className="flex items-center gap-2 mb-4">
                <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg', cat.iconBg)}>
                  <Icon className={cn('h-4 w-4', cat.iconColor)} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{cat.title}</h2>
              </div>
              <div className="space-y-2">
                {cat.faqs.map((faq, i) => {
                  const key = `${cat.id}-${i}`;
                  const isOpen = openItems[key] ?? (search.length > 0);
                  return (
                    <div key={key} className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 overflow-hidden">
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 pr-4">{faq.question}</span>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 border-t border-slate-100 dark:border-slate-700">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-3">{faq.answer}</p>
                          <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-emerald-600">
                              <Pencil className="h-3.5 w-3.5" /> Suggest Edit
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredCategories.length === 0 && search && (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No results found for &ldquo;{search}&rdquo;</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
