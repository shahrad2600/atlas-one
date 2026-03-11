'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Search,
  Send,
  Paperclip,
  Sparkles,
  ArrowRightLeft,
  Calendar,
  FileSearch,
  AlertTriangle,
  Check,
  Copy,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Conversation {
  id: string;
  travelerName: string;
  travelerTier: 'Standard' | 'Premium' | 'Luxury';
  lastMessage: string;
  timestamp: string;
  unread: number;
  tripInfo?: string;
}

interface ChatMessage {
  id: string;
  sender: 'traveler' | 'concierge' | 'ai-suggestion';
  senderName: string;
  text: string;
  timestamp: string;
}

const conversations: Conversation[] = [
  { id: 'c1', travelerName: 'James Morrison', travelerTier: 'Luxury', lastMessage: 'Is there any update on the rebooking?', timestamp: '2 min ago', unread: 3, tripInfo: 'London to New York' },
  { id: 'c2', travelerName: 'Mei Lin Wu', travelerTier: 'Premium', lastMessage: 'Thank you for looking into the suite upgrade', timestamp: '8 min ago', unread: 1, tripInfo: 'Paris Anniversary' },
  { id: 'c3', travelerName: 'Alessandro Ricci', travelerTier: 'Luxury', lastMessage: 'Perfect, 2 extra nights confirmed then?', timestamp: '15 min ago', unread: 0, tripInfo: 'Florence' },
  { id: 'c4', travelerName: 'Emma Thompson', travelerTier: 'Premium', lastMessage: 'The group is actually 10 now, not 8', timestamp: '22 min ago', unread: 2, tripInfo: 'Barcelona' },
  { id: 'c5', travelerName: 'Sofia Martinez', travelerTier: 'Luxury', lastMessage: 'Do they have a yacht with a hot tub?', timestamp: '45 min ago', unread: 0, tripInfo: 'Santorini' },
  { id: 'c6', travelerName: 'Priya Sharma', travelerTier: 'Standard', lastMessage: 'Sent the passport copy you requested', timestamp: '1h ago', unread: 1, tripInfo: 'Japan-Korea-Thailand' },
  { id: 'c7', travelerName: 'Robert Kim', travelerTier: 'Premium', lastMessage: 'How many points for a villa in Bali?', timestamp: '2h ago', unread: 0, tripInfo: 'Bali' },
  { id: 'c8', travelerName: 'Hannah Weber', travelerTier: 'Standard', lastMessage: 'Here are the photos of the room condition', timestamp: '3h ago', unread: 0, tripInfo: 'Singapore' },
];

const mockMessages: ChatMessage[] = [
  {
    id: 'm1',
    sender: 'traveler',
    senderName: 'James Morrison',
    text: 'Hi, I just found out my BA flight from London Heathrow to JFK tomorrow morning has been cancelled. I have a critical business meeting at 2pm Eastern and absolutely need to be in New York.',
    timestamp: '10:23 AM',
  },
  {
    id: 'm2',
    sender: 'concierge',
    senderName: 'Sarah Chen',
    text: 'I am so sorry to hear about the cancellation, Mr. Morrison. Let me immediately look into rebooking options for you. I understand how time-sensitive this is.',
    timestamp: '10:24 AM',
  },
  {
    id: 'm3',
    sender: 'concierge',
    senderName: 'Sarah Chen',
    text: 'I am checking all available flights from LHR, LGW, and STN to JFK, EWR, and LGA for early morning departures. Give me just a few minutes.',
    timestamp: '10:25 AM',
  },
  {
    id: 'm4',
    sender: 'traveler',
    senderName: 'James Morrison',
    text: 'Thank you, Sarah. I am also open to business class on any carrier. My company will cover the cost difference. Just need to get there in time.',
    timestamp: '10:27 AM',
  },
  {
    id: 'm5',
    sender: 'ai-suggestion',
    senderName: 'AI Assistant',
    text: 'Based on real-time availability, here are the top 3 options:\n\n1. Virgin Atlantic VS003 - LHR 08:30 -> JFK 11:15 (Business) - $4,200\n2. American Airlines AA101 - LHR 09:00 -> JFK 11:55 (Business) - $3,890\n3. Delta DL2 - LHR 10:15 -> JFK 13:05 (Business) - $3,650\n\nOption 1 gives the most buffer time for the 2pm meeting. Shall I proceed with booking?',
    timestamp: '10:28 AM',
  },
  {
    id: 'm6',
    sender: 'concierge',
    senderName: 'Sarah Chen',
    text: 'Great news, Mr. Morrison! I have found several options. The Virgin Atlantic VS003 departing at 8:30 AM would get you to JFK by 11:15 AM with plenty of time for your meeting. Business class is available at $4,200. Shall I book that for you?',
    timestamp: '10:29 AM',
  },
  {
    id: 'm7',
    sender: 'traveler',
    senderName: 'James Morrison',
    text: 'Yes, please book the Virgin Atlantic flight. That gives me the best buffer. Can you also arrange a car from JFK to Midtown Manhattan?',
    timestamp: '10:30 AM',
  },
  {
    id: 'm8',
    sender: 'concierge',
    senderName: 'Sarah Chen',
    text: 'Absolutely! I will book VS003 right now and arrange a private black car transfer from JFK to Midtown. You should receive the confirmation within a few minutes. Is there anything else you need?',
    timestamp: '10:31 AM',
  },
  {
    id: 'm9',
    sender: 'traveler',
    senderName: 'James Morrison',
    text: 'Is there any update on the rebooking?',
    timestamp: '10:35 AM',
  },
];

const aiSuggestion = 'Mr. Morrison, I have completed both bookings. Your Virgin Atlantic VS003 confirmation number is VS-78291K and your private car transfer is booked with Manhattan Executive Cars, confirmation #MEC-4412. The driver will meet you at the arrivals hall with a name sign. Total charges: $4,200 (flight) + $185 (transfer). Both receipts have been sent to your email. Is there anything else I can help with for your trip?';

const tierColors: Record<string, string> = {
  Standard: 'bg-slate-100 text-slate-700',
  Premium: 'bg-amber-100 text-amber-800',
  Luxury: 'bg-purple-100 text-purple-800',
};

export default function ChatPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation>(conversations[0]);
  const [conversationSearch, setConversationSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showAiSuggestion]);

  const filteredConversations = conversations.filter((c) =>
    c.travelerName.toLowerCase().includes(conversationSearch.toLowerCase()),
  );

  const handleSend = () => {
    if (!messageText.trim()) return;
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: 'concierge',
      senderName: 'Sarah Chen',
      text: messageText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setMessageText('');
    setShowAiSuggestion(false);
  };

  const handleUseAiSuggestion = () => {
    setMessageText(aiSuggestion);
    setShowAiSuggestion(false);
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Conversation List */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Messages</h2>
          <Input
            placeholder="Search conversations..."
            value={conversationSearch}
            onChange={(e) => setConversationSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => {
            const isActive = selectedConversation.id === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50',
                  isActive && 'bg-emerald-50 hover:bg-emerald-50 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/20',
                )}
              >
                <div className="relative shrink-0">
                  <Avatar name={conv.travelerName} size="sm" />
                  {conv.unread > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                      {conv.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn('text-sm font-medium truncate', conv.unread > 0 ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300')}>
                      {conv.travelerName}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-2">{conv.timestamp}</span>
                  </div>
                  <p className={cn('text-xs truncate', conv.unread > 0 ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-400')}>
                    {conv.lastMessage}
                  </p>
                  {conv.tripInfo && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{conv.tripInfo}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Panel - Active Conversation */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Avatar name={selectedConversation.travelerName} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{selectedConversation.travelerName}</h3>
                <Badge className={tierColors[selectedConversation.travelerTier]}>{selectedConversation.travelerTier}</Badge>
              </div>
              {selectedConversation.tripInfo && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedConversation.tripInfo}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            AI Assist
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg) => {
            if (msg.sender === 'ai-suggestion') {
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex justify-center">
                  <div className="max-w-lg border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">AI Suggestion</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{msg.text}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">{msg.timestamp}</p>
                  </div>
                </motion.div>
              );
            }

            const isConcierge = msg.sender === 'concierge';
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, x: isConcierge ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className={cn('flex', isConcierge ? 'justify-end' : 'justify-start')}>
                <div className={cn('flex items-end gap-2 max-w-lg', isConcierge && 'flex-row-reverse')}>
                  <Avatar name={msg.senderName} size="sm" className="shrink-0 mb-1" />
                  <div>
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm',
                        isConcierge
                          ? 'bg-emerald-600 text-white rounded-br-md'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-md',
                      )}
                    >
                      {msg.text}
                    </div>
                    <p className={cn('text-[10px] text-slate-400 dark:text-slate-500 mt-1', isConcierge ? 'text-right' : 'text-left')}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* AI Suggestion Card */}
          {showAiSuggestion && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex justify-center">
              <div className="max-w-lg border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Suggested Response</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{aiSuggestion}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" onClick={handleUseAiSuggestion}>
                    <Check className="h-3.5 w-3.5" /> Use This
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleUseAiSuggestion}>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAiSuggestion(false)} className="text-slate-400">
                    Dismiss
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions Bar */}
        <div className="px-6 py-2 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <Button variant="outline" size="sm">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer to Agent
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-3.5 w-3.5" /> Create Booking
          </Button>
          <Button variant="outline" size="sm">
            <FileSearch className="h-3.5 w-3.5" /> Look Up Reservation
          </Button>
          <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/30">
            <AlertTriangle className="h-3.5 w-3.5" /> Escalate
          </Button>
        </div>

        {/* Message Input */}
        <div className="px-6 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message..."
                rows={2}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              />
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={() => setShowAiSuggestion(true)}
              >
                <Sparkles className="h-4 w-4" /> AI Suggest
              </Button>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <Paperclip className="h-5 w-5" />
                </button>
                <Button size="sm" onClick={handleSend} disabled={!messageText.trim()}>
                  <Send className="h-4 w-4" /> Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
