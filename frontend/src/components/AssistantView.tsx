import React, { useState } from 'react';
import {
  Bot, Send, Sparkles, BookOpen, ExternalLink, ShieldCheck,
  User, RefreshCw, AlertCircle
} from 'lucide-react';
import { Citation } from '../types';
import { api } from '../services/api';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  timestamp: string;
}

export const AssistantView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Namaste! I am the AICTE SmartFlow Regulatory Compliance Assistant. I can assist you with AICTE Approval Process Handbook (2024-2027) norms, faculty-to-student ratios, land requirements, deadline schedules, and deficiency remediation. Every regulatory answer is backed by verified handbook citations.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickPrompts = [
    "Which compliance requirements are currently incomplete or flagged?",
    "What is the prescribed faculty-to-student cadre ratio for UG Engineering?",
    "What are the contiguous land norms for technical colleges in Urban areas?",
    "What happens if our Fire Safety NOC expires before inspection?",
    "Which deadlines are currently approaching for our institution?"
  ];

  const handleSend = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q.trim() || isLoading) return;

    const userMsg: Message = {
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await api.queryAssistant(q, 1); // Application ID 1
      const assistantMsg: Message = {
        sender: 'assistant',
        text: res.answer,
        citations: res.citations,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Error connecting to RAG assistant: ${e.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Bot className="w-5 h-5 text-sky-400" />
          RAG-Powered AI Compliance Assistant
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Retrieval-Augmented Generation strictly grounded in approved AICTE Approval Process Handbooks & institutional records
        </p>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm min-h-[480px] flex flex-col justify-between">
        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 text-xs ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shrink-0 text-white shadow-md shadow-sky-500/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 space-y-2.5 ${
                  msg.sender === 'user'
                    ? 'bg-primary text-white rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 pb-1 border-b border-white/10">
                  <span className="font-semibold text-slate-300">
                    {msg.sender === 'user' ? 'You (Institutional User)' : 'AICTE SmartFlow Verified Advisor'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                <div className="whitespace-pre-wrap leading-relaxed text-xs">
                  {msg.text}
                </div>

                {/* Citations block */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      Verified Regulatory Source Citations:
                    </span>
                    <div className="space-y-1">
                      {msg.citations.map((cite, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-2 rounded bg-slate-950 border border-slate-800/80 text-[11px] text-slate-300 space-y-0.5"
                        >
                          <div className="font-semibold text-sky-300 flex items-center justify-between">
                            <span>{cite.source_title}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {cite.section_number} (Pg. {cite.page_number})
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 italic">"{cite.snippet}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 text-white">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center shrink-0 text-white animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>Searching approved AICTE Approval Process Handbook (2024-2027) regulatory chunks...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Prompts Bar */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <span className="text-slate-500 font-semibold shrink-0">Quick Queries:</span>
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors shrink-0"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask any regulatory compliance or AICTE approval question..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 text-xs text-slate-200 px-4 py-2.5 rounded-xl focus:outline-none focus:border-sky-500 shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
