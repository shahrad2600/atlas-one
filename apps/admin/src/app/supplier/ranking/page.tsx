'use client';

import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Trophy,
  MapPin,
  Award,
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Lightbulb,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

/* ---------- Mock Data ---------- */

const rankings = [
  { scope: 'City', label: 'Paris', rank: 3, total: 142, prevRank: 4, icon: MapPin },
  { scope: 'Region', label: 'Ile-de-France', rank: 3, total: 198, prevRank: 4, icon: MapPin },
  { scope: 'Country', label: 'France', rank: 7, total: 890, prevRank: 8, icon: Award },
  { scope: 'Europe', label: 'Europe', rank: 18, total: 4230, prevRank: 19, icon: Globe },
  { scope: 'World', label: 'World', rank: 42, total: 12450, prevRank: 45, icon: Globe },
];

const explanationFactors = [
  {
    factor: 'Service Excellence',
    score: 96,
    weight: 25,
    contribution: 24.0,
    vs_top: -2,
    status: 'strength' as const,
  },
  {
    factor: 'Physical Product',
    score: 93,
    weight: 20,
    contribution: 18.6,
    vs_top: -4,
    status: 'neutral' as const,
  },
  {
    factor: 'Dining & Beverage',
    score: 91,
    weight: 15,
    contribution: 13.7,
    vs_top: -5,
    status: 'weakness' as const,
  },
  {
    factor: 'Location & Access',
    score: 97,
    weight: 10,
    contribution: 9.7,
    vs_top: 0,
    status: 'strength' as const,
  },
  {
    factor: 'Consistency',
    score: 89,
    weight: 15,
    contribution: 13.4,
    vs_top: -7,
    status: 'weakness' as const,
  },
  {
    factor: 'Emotional Impact',
    score: 95,
    weight: 15,
    contribution: 14.3,
    vs_top: -2,
    status: 'strength' as const,
  },
];

const strengths = [
  { label: 'Location & Access', detail: 'Score of 97 matches the #1 property. Your Tuileries position is unassailable.' },
  { label: 'Service Excellence', detail: 'Score of 96 is within 2 points of #1. Butler and concierge teams consistently praised.' },
  { label: 'Emotional Impact', detail: 'Score of 95. Guests frequently describe stays as transformative and deeply personal.' },
];

const weaknesses = [
  { label: 'Consistency', detail: 'Score of 89 is 7 points below #1. HVAC and turndown timing cited. Biggest improvement opportunity.' },
  { label: 'Dining & Beverage', detail: 'Score of 91 is 5 points below #1. Breakfast buffet and product range mentioned.' },
];

const improvements = [
  {
    target: 'From #3 to #1 in Paris',
    actions: [
      { dimension: 'Consistency', points: '+7', detail: 'Address HVAC issues in 12 flagged rooms. Standardize turndown timing to 18:00-19:00 window.' },
      { dimension: 'Dining', points: '+5', detail: 'Upgrade breakfast to bespoke menu. Replace generic bath products with house-brand collection.' },
      { dimension: 'Physical', points: '+4', detail: 'Complete bathroom fixture refresh in west wing. Add bespoke amenity kits.' },
    ],
    estimated: '6-9 months with focused investment',
  },
  {
    target: 'From #3 to #2 in Paris',
    actions: [
      { dimension: 'Consistency', points: '+3', detail: 'Fix HVAC in most-cited rooms. Implement automated turndown scheduling.' },
      { dimension: 'Dining', points: '+2', detail: 'Introduce seasonal breakfast menu rotation. Upgrade buffet presentation.' },
    ],
    estimated: '3-4 months',
  },
];

const rankingHistory = [
  { month: 'Apr \'25', city: 6, country: 12, world: 58 },
  { month: 'May', city: 5, country: 11, world: 55 },
  { month: 'Jun', city: 5, country: 10, world: 52 },
  { month: 'Jul', city: 4, country: 9, world: 48 },
  { month: 'Aug', city: 4, country: 8, world: 46 },
  { month: 'Sep', city: 4, country: 8, world: 45 },
  { month: 'Oct', city: 3, country: 8, world: 44 },
  { month: 'Nov', city: 3, country: 7, world: 43 },
  { month: 'Dec', city: 3, country: 7, world: 43 },
  { month: 'Jan \'26', city: 3, country: 7, world: 42 },
  { month: 'Feb', city: 3, country: 7, world: 42 },
  { month: 'Mar', city: 3, country: 7, world: 42 },
];

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '13px',
};

/* ---------- Component ---------- */

export default function SupplierRankingPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Ranking Insights</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Understand your position and how to improve</p>
      </div>

      {/* Current Rankings */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {rankings.map((r) => {
          const Icon = r.icon;
          const change = r.prevRank - r.rank;

          return (
            <motion.div key={r.scope} variants={fadeUp}>
              <Card className="relative overflow-hidden">
                <CardContent className="py-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {r.scope}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{r.label}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                      <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">#{r.rank}</span>
                    <span className="text-xs text-slate-400">/ {formatNumber(r.total)}</span>
                  </div>
                  {change !== 0 && (
                    <div className={cn(
                      'mt-1.5 flex items-center gap-1 text-xs font-medium',
                      change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                    )}>
                      {change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {Math.abs(change)} position{Math.abs(change) > 1 ? 's' : ''} vs last month
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Why You Ranked Here */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Why You Ranked #3 in Paris</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Your Luxury Standard Score of <span className="font-bold text-slate-700 dark:text-slate-200">94.2</span> places you behind Le Bristol (96.1) and Four Seasons George V (95.4).
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {explanationFactors.map((f) => (
              <div key={f.factor} className="flex items-center gap-4">
                <div className="w-36 flex-shrink-0">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{f.factor}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${f.score}%` }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className={cn('h-full rounded-full', {
                          'bg-emerald-500': f.status === 'strength',
                          'bg-amber-500': f.status === 'neutral',
                          'bg-orange-500': f.status === 'weakness',
                        })}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 w-8 text-right">{f.score}</span>
                  </div>
                </div>
                <div className="w-20 text-right flex-shrink-0">
                  <span className={cn('text-xs font-medium', {
                    'text-emerald-600 dark:text-emerald-400': f.vs_top >= 0,
                    'text-amber-600 dark:text-amber-400': f.vs_top > -4 && f.vs_top < 0,
                    'text-orange-600 dark:text-orange-400': f.vs_top <= -4,
                  })}>
                    {f.vs_top >= 0 ? 'Matches #1' : `${f.vs_top} vs #1`}
                  </span>
                </div>
                <div className="w-6 flex-shrink-0">
                  {f.status === 'strength' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {f.status === 'neutral' && <Minus className="h-4 w-4 text-amber-500" />}
                  {f.status === 'weakness' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths vs Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-500" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Strengths vs. Peers</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strengths.map((s, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{s.label}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Areas for Improvement</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weaknesses.map((w, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{w.label}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{w.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Improvement Suggestions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Improvement Roadmap</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Actionable steps to improve your ranking in Paris
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {improvements.map((plan, idx) => (
              <div key={idx}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-bold',
                    idx === 0
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      : 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
                  )}>
                    {plan.target}
                  </div>
                  <span className="text-xs text-slate-400">Est. {plan.estimated}</span>
                </div>

                <div className="space-y-3 ml-4">
                  {plan.actions.map((action, ai) => (
                    <div
                      key={ai}
                      className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{action.dimension}</span>
                          <Badge variant="success">{action.points} pts</Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{action.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ranking History Timeline */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Ranking History (12 Months)</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Lower position number = better ranking</p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rankingHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis reversed tick={{ fontSize: 11 }} stroke="#94a3b8" label={{ value: 'Rank', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#94a3b8' } }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="city" name="Paris" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="country" name="France" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="world" name="World" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Key Milestones */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Ranking Milestones</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700" />

            <div className="space-y-6">
              {[
                { date: 'Mar 2026', event: 'Reached #3 in Paris', detail: 'Surpassed Ritz Paris (+1.4 point score advantage)', type: 'up' },
                { date: 'Oct 2025', event: 'Entered Top 5 in Paris', detail: 'Consistency improvements drove 3-position jump in 2 months', type: 'up' },
                { date: 'Jul 2025', event: 'Broke Top 50 Worldwide', detail: 'Service and emotional impact scores pushed global ranking to #48', type: 'up' },
                { date: 'Jun 2025', event: 'Major renovation completed', detail: 'Physical product score jumped 4 points after west wing refresh', type: 'milestone' },
                { date: 'Apr 2025', event: 'Joined Atlas One Luxury Program', detail: 'Initial baseline ranking: #6 Paris, #12 France, #58 World', type: 'milestone' },
              ].map((milestone, idx) => (
                <div key={idx} className="flex gap-4 relative">
                  <div className={cn(
                    'flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center z-10',
                    milestone.type === 'up'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-amber-100 dark:bg-amber-900/30',
                  )}>
                    {milestone.type === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div className="pb-1">
                    <p className="text-xs font-medium text-slate-400">{milestone.date}</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{milestone.event}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{milestone.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
