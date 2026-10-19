import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Bot,
  Send,
  Sparkles,
  User,
  Loader2,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  PieChart,
  RotateCcw,
  Truck,
  Award,
  ShieldCheck,
  ChevronRight,
  Database,
} from 'lucide-react';

const DEFAULT_CLIENT_SUGGESTIONS = [
  { query_id: 'my_top_products', title: 'My Top Selling Gadgets' },
  { query_id: 'my_restock_items', title: 'Items Needing Immediate Restock' },
  { query_id: 'my_rma_summary', title: 'My Defect Rate Summary' },
];

export default function ClientAssistant() {
  const { user, storeClientId } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Welcome to your store assistant. Select a quick action below or ask a question about your inventory, sales, and restock levels.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [suggestedQueries, setSuggestedQueries] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    async function loadSuggested() {
      try {
        const res = await api.getSuggestedChatQueries();
        setSuggestedQueries(res.queries || []);
      } catch (err) {
        console.error('Failed to load chat suggestions:', err);
      }
    }
    loadSuggested();
  }, []);

  const handleExecuteQuery = async (queryId, queryTitle) => {
    if (loading) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: queryTitle,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.executeChatQuery(queryId);

      const assistantMsg = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: res.text || res.explanation || res.summary,
        title: res.title,
        kpi: res.summary_metric,
        tableHeaders: res.table_headers || (res.data?.[0] ? Object.keys(res.data[0]) : []),
        tableRows: res.table_rows || (res.data ? res.data.map(d => Object.values(d)) : []),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `Query failed: ${err?.message || 'Database aggregation error'}.`,
          isError: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const text = inputText.trim();
    setInputText('');

    // Intelligent match to closest suggested query
    const lower = text.toLowerCase();
    let matched = suggestedQueries.find((q) => {
      const qLower = q.title.toLowerCase();
      if (lower.includes('stockout') || lower.includes('urgent') || lower.includes('empty'))
        return q.id === 'stockout_risks';
      if (lower.includes('deadstock') || lower.includes('slow') || lower.includes('stagnant'))
        return q.id === 'deadstock_items';
      if (lower.includes('top') || lower.includes('best') || lower.includes('sell'))
        return q.id === 'top_sellers';
      if (lower.includes('profit') || lower.includes('margin') || lower.includes('revenue'))
        return q.id === 'profit_summary';
      if (lower.includes('loss') || lower.includes('defect') || lower.includes('shrink'))
        return q.id === 'loss_causes';
      if (lower.includes('rma') || lower.includes('ticket') || lower.includes('grievance'))
        return q.id === 'pending_rmas';
      if (lower.includes('order') || lower.includes('ship') || lower.includes('transit'))
        return q.id === 'order_status';
      return qLower.includes(lower);
    });

    if (matched) {
      handleExecuteQuery(matched.id, text);
    } else if (suggestedQueries.length > 0) {
      handleExecuteQuery(suggestedQueries[0].id, text);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8.5rem)]">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-800 backdrop-blur-md shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Store Assistant
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ask questions about inventory, orders, and sales for store {storeClientId}.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-cyan-400">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>Live Store Data</span>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 glass-panel flex flex-col overflow-hidden min-h-0">
        {/* Messages Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-gradient-to-tr from-cyan-500 to-brand-500 text-slate-950 font-bold'
                      : 'bg-slate-800 border border-slate-700 text-cyan-400'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div
                  className={`p-4 rounded-2xl space-y-3 ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 font-medium text-xs'
                      : 'bg-slate-800/80 border border-slate-700/80 text-white text-xs'
                  }`}
                >
                  {/* Narrative Text */}
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

                  {/* Summary Metric KPI Callout */}
                  {m.kpi && (
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 uppercase font-bold">
                        {m.kpi.label}
                      </span>
                      <span className="text-base font-extrabold text-cyan-400 font-mono">
                        {m.kpi.value}
                      </span>
                    </div>
                  )}

                  {/* Structured Result Table */}
                  {m.tableRows && m.tableRows.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/60 mt-2">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-700/60 text-slate-400 uppercase font-bold bg-slate-800/40">
                            {(m.tableHeaders || []).map((col, idx) => (
                              <th key={idx} className="px-3 py-2 font-mono">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {m.tableRows.slice(0, 8).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/30">
                              {row.map((val, cIdx) => (
                                <td key={cIdx} className="px-3 py-1.5 text-slate-200">
                                  {typeof val === 'number' ? val.toLocaleString() : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <span
                    className={`block text-[10px] mt-1 ${
                      isUser ? 'text-slate-800 text-right' : 'text-slate-400'
                    }`}
                  >
                    {m.time}
                  </span>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 max-w-md">
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Analyzing data...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries Pills */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Suggested Questions:</span>
            </span>
            {(suggestedQueries.length > 0
              ? suggestedQueries.map(q => ({ query_id: q.query_id || q.id, title: q.title }))
              : DEFAULT_CLIENT_SUGGESTIONS
            ).map((q) => (
              <button
                key={q.query_id}
                type="button"
                onClick={() => handleExecuteQuery(q.query_id, q.title)}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-800/50 rounded-full transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{q.title}</span>
                <ChevronRight className="w-3 h-3 text-cyan-500" />
              </button>
            ))}
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/90">
          <form onSubmit={handleInputSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question about low stock, margins, or orders..."
              className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-cyan-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
