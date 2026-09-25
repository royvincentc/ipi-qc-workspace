import React, { useState, useRef, useEffect } from 'react';
import { Send, Clock, User, Search, RefreshCw, Sparkles } from 'lucide-react';
import { api } from './api';

export function AssistantPage() {
  const [messages, setMessages] = useState<{role: 'user' | 'model', parts: {text: string}[]}[]>([{ role: 'model', parts: [{ text: 'Hey y\'all! I\'m Miss Minutes! You can ask me to search for historical QC records, summarize recent out-of-specification results, or query audit logs. How can I help you keep the Timeline in order?' }] }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const newMessages = [...messages, { role: 'user' as const, parts: [{ text: input }] }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await api('/ai/chat', 'POST', { messages: newMessages });
      setMessages([...newMessages, response]);
    } catch (err: any) {
      setMessages([...newMessages, { role: 'model', parts: [{ text: `Error: ${err.message}` }] }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'model', parts: [{ text: 'Chat cleared. We are back to a fresh Timeline! How can I help you?' }] }]);
  };

  return (
    <div className="assistant-page">
      <div className="assistant-header">
        <div className="assistant-heading">
          <div className="assistant-avatar">
            <Clock size={22} />
          </div>
          <div>
            <div className="eyebrow"><Sparkles size={12}/> Research companion</div>
            <h2>Miss Minutes</h2>
            <small>Searches authorized QC records and audit history</small>
          </div>
        </div>
        <button className="button secondary" onClick={clearChat}>
          <RefreshCw size={14} /> Clear Chat
        </button>
      </div>

      <div className="assistant-messages">
        {messages.map((m, i) => (
          <div key={i} className={`assistant-message ${m.role}`}>
            <div className="assistant-message-avatar">
              {m.role === 'user' ? <User size={18} /> : <Clock size={18} />}
            </div>
            <div className="assistant-bubble">
              {m.parts.map(p => p.text).join('')}
            </div>
          </div>
        ))}
        {loading && (
          <div className="assistant-message model">
             <div className="assistant-message-avatar">
              <Clock size={18} />
            </div>
            <div className="assistant-bubble assistant-thinking">
              <i/><i/><i/><span>Searching records</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="assistant-composer">
        <form onSubmit={handleSend}>
          <div className="assistant-input-wrap">
            <Search size={18}/>
            <input 
              type="text" 
              className="input" 
              placeholder="E.g. What were the out of specification results last month?" 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              disabled={loading}
              autoFocus
            />
          </div>
          <button type="submit" className="button primary assistant-send" disabled={loading || !input.trim()}>
            <Send size={16} /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
