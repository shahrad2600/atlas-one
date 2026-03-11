'use client';

import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Send,
  Bot,
  User,
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  date: string;
}

const pastConversations: Conversation[] = [
  { id: 'c1', title: 'Trip to Barcelona', lastMessage: 'I recommend staying in the Gothic Quarter...', date: '2026-03-07' },
  { id: 'c2', title: 'Tokyo restaurants', lastMessage: 'For authentic ramen, try Fuunji near...', date: '2026-03-05' },
  { id: 'c3', title: 'Budget Europe trip', lastMessage: 'Here is a 2-week budget itinerary...', date: '2026-03-01' },
  { id: 'c4', title: 'Hawaii honeymoon', lastMessage: 'Maui and Kauai are both excellent for...', date: '2026-02-25' },
  { id: 'c5', title: 'Ski resort comparison', lastMessage: 'Comparing Whistler, Chamonix, and Niseko...', date: '2026-02-20' },
];

const welcomeMessage: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm Atlas, your AI travel concierge. Ask me anything about destinations, itineraries, or bookings. I can help you plan trips, find hotels, recommend restaurants, and much more.",
  timestamp: new Date(),
};

function getMockResponse(userMessage: string): string {
  const lowerMsg = userMessage.toLowerCase();

  if (lowerMsg.includes('hotel') || lowerMsg.includes('stay') || lowerMsg.includes('accommodation')) {
    return "Great question about accommodations! Based on current traveler reviews, I'd recommend looking at these options:\n\n**Luxury:** The Ritz Paris or Aman Tokyo are exceptional choices with world-class service.\n\n**Mid-Range:** Hotel Negresco in Nice or The Hoxton in London offer great value with boutique character.\n\n**Budget-Friendly:** Generator Hostels across Europe or MOXY Hotels provide modern comfort at accessible prices.\n\nWould you like me to narrow this down for a specific destination or date range?";
  }

  if (lowerMsg.includes('flight') || lowerMsg.includes('fly') || lowerMsg.includes('airline')) {
    return "Here's what I can share about flights:\n\nFor the best deals, I recommend booking 6-8 weeks in advance for domestic flights and 2-3 months for international routes. Tuesdays and Wednesdays typically offer the lowest fares.\n\n**Current trending routes with good deals:**\n- NYC to London from $389 roundtrip\n- LAX to Tokyo from $612 roundtrip\n- Chicago to Paris from $445 roundtrip\n\nShall I search for specific routes or dates? I can also compare airlines for your preferred route.";
  }

  if (lowerMsg.includes('restaurant') || lowerMsg.includes('food') || lowerMsg.includes('eat') || lowerMsg.includes('dining')) {
    return "I love helping with dining recommendations! Here are some top-rated spots that travelers rave about:\n\n**Fine Dining:**\n- Osteria Francescana, Modena - Chef Massimo Bottura's 3-Michelin-star masterpiece\n- Noma, Copenhagen - Innovative Nordic cuisine\n\n**Local Favorites:**\n- Trattoria da Mario, Florence - Authentic Tuscan home cooking\n- Ichiran Ramen, Tokyo - The quintessential solo ramen experience\n\nTell me which city you're visiting and I'll give you personalized suggestions based on your cuisine preferences and budget!";
  }

  if (lowerMsg.includes('itinerary') || lowerMsg.includes('plan') || lowerMsg.includes('trip')) {
    return "I'd be happy to help you plan a trip! To create the perfect itinerary, I'll need a few details:\n\n1. **Destination(s)** - Where are you thinking of going?\n2. **Duration** - How many days do you have?\n3. **Travel style** - Adventure, relaxation, culture, foodie, or a mix?\n4. **Budget** - Luxury, mid-range, or budget?\n5. **Interests** - Any must-see attractions or experiences?\n\nOnce I know these, I can create a day-by-day itinerary with restaurant recommendations, activity suggestions, and transportation tips!";
  }

  return "That's a great travel question! Here are some general tips that might help:\n\n**Top Travel Tips for 2026:**\n- Consider shoulder season travel (April-May, September-October) for fewer crowds and better prices\n- Travel insurance is increasingly important - look for policies covering trip interruption\n- Download offline maps before your trip for navigation without data\n- Local SIM cards or eSIMs are usually more affordable than international roaming\n\nCould you tell me more about what you're planning? I can give you much more specific and helpful advice if I know your destination, dates, or any particular concerns!";
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function handleSend() {
    const text = inputText.trim();
    if (!text || isTyping) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setTimeout(() => {
      const responseText = getMockResponse(text);
      const aiMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  }

  function handleNewChat() {
    setMessages([welcomeMessage]);
    setInputText('');
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="h-screen flex bg-slate-50 dark:bg-slate-950"
    >
      {/* Sidebar */}
      <div
        className={cn(
          'bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-200',
          sidebarOpen ? 'w-72' : 'w-0 overflow-hidden',
        )}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <Button onClick={handleNewChat} className="w-full" variant="outline">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase px-2 mb-2">Recent Conversations</p>
          {pastConversations.map((conv) => (
            <button
              key={conv.id}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors group"
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{conv.title}</p>
                  <p className="text-xs text-slate-400 truncate">{conv.lastMessage}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-5 w-5 text-slate-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-slate-500" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-white">Atlas AI Concierge</h1>
              <p className="text-xs text-green-500">Online</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-3 text-sm',
                    msg.role === 'user'
                      ? 'bg-sky-500 text-white rounded-br-md'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm',
                  )}
                >
                  <div className="whitespace-pre-line">{msg.content}</div>
                  <p
                    className={cn(
                      'text-[10px] mt-1.5',
                      msg.role === 'user' ? 'text-sky-100' : 'text-slate-400',
                    )}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0">
                    {user ? (
                      <Avatar name={user.displayName} size="sm" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-sky-600" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-200 px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about destinations, hotels, flights, restaurants..."
                  rows={1}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors resize-none"
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!inputText.trim() || isTyping}
                className="rounded-xl h-[46px] w-[46px] p-0 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Atlas AI may produce inaccurate information. Verify important details before booking.
            </p>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
