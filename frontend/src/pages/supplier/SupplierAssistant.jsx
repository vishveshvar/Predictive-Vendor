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
  Globe2,
} from 'lucide-react';

const DEFAULT_SUPPLIER_SUGGESTIONS = [
  { query_id: 'top_stores', title: 'Top 3 High-Volume Stores' },
  { query_id: 'open_rmas', title: 'Current Open RMA Count' },
  { query_id: 'stockout_risk', title: 'Critical Stockout Forecast (<7 Days)' },
  { query_id: 'category_revenue', title: 'Network Revenue by Category' },
];

export default function SupplierAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Welcome to your analytics assistant. Select a quick action below or ask a question about your stores' inventory, orders, and sales performance.`,
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
        console.error('Failed to load supplier chat suggestions:', err);
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
          text: `Query execution failed: ${err?.message || 'Database aggregation error'}.`,
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

    const lower = text.toLowerCase();
    let matched = suggestedQueries.find((q) => {
      const qLower = q.title.toLowerCase();
      if (lower.includes('client') || lower.includes('store') || lower.includes('volume'))
        return q.id === 'top_client_volume';
      if (lower.includes('rma') || lower.includes('grievance') || lower.includes('queue'))
        return q.id === 'total_open_rmas';
      if (lower.includes('grow') || lower.includes('fast') || lower.includes('accelerat'))
        return q.id === 'fastest_growing_category';
      if (lower.includes('resolution') || lower.includes('turnaround') || lower.includes('time'))
        return q.id === 'average_resolution_time';
      if (lower.includes('region') || lower.includes('territory') || lower.includes('geography'))
        return q.id === 'regional_demand';
      if (lower.includes('deadstock') || lower.includes('slow') || lower.includes('drag'))
        return q.id === 'low_performing_skus';
      if (lower.includes('transit') || lower.includes('ship') || lower.includes('carrier'))
        return q.id === 'delayed_shipments';
      if (lower.includes('forecast') || lower.includes('demand') || lower.includes('project'))
        return q.id === 'forecast_demand_30d';
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
            <Globe2 className="w-5 h-5 text-brand-400" />
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">
              Analytics Assistant
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ask questions about your network inventory, orders, and sales.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-brand-400">
          <Database className="w-4 h-4 text-brand-400" />
          <span>Multi-Store Analytics</span>
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
                      ? 'bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold'
                      : 'bg-slate-800 border border-slate-700 text-cyan-400'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div
                  className={`p-4 rounded-2xl space-y-3 ${
                    isUser
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-medium text-xs shadow-md shadow-brand-500/20'
                      : 'bg-slate-800/80 border border-slate-700/80 text-white text-xs'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

                  {/* Summary Metric KPI Callout */}
                  {m.kpi && (
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-brand-500/30 flex items-center justify-between">
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
                              <th key={col || idx} className="px-3 py-2 font-mono">
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
                      isUser ? 'text-slate-200 text-right' : 'text-slate-400'
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
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-brand-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
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
              : DEFAULT_SUPPLIER_SUGGESTIONS
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
              placeholder="Ask a question about sales, returns, or store inventory..."
              className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-brand-500/20"
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
