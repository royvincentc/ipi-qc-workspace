import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Search, RefreshCw } from 'lucide-react';
import { api } from './api';

export function AssistantPage() {
  const [messages, setMessages] = useState<{role: 'user' | 'model', parts: {text: string}[]}[]>([{ role: 'model', parts: [{ text: 'Hello! I am your AI assistant. You can ask me to search for historical QC records, summarize recent out-of-specification results, or query audit logs.' }] }]);
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
    setMessages([{ role: 'model', parts: [{ text: 'Chat cleared. How can I help you?' }] }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: '900px', margin: '0 auto', backgroundColor: 'var(--color-bg)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '8px', borderRadius: '8px', display: 'flex' }}>
            <Bot size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Smart Assistant</h2>
            <div style={{ fontSize: '13px', color: 'var(--color-text-dim)' }}>Powered by Google Gemini</div>
          </div>
        </div>
        <button className="button" onClick={clearChat}>
          <RefreshCw size={14} /> Clear Chat
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: m.role === 'user' ? 'var(--accent)' : 'var(--color-bg-secondary)', color: m.role === 'user' ? 'white' : 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {m.role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
            <div style={{ backgroundColor: m.role === 'user' ? 'var(--color-bg)' : 'var(--color-bg-secondary)', border: m.role === 'user' ? '1px solid var(--accent)' : '1px solid transparent', color: 'var(--color-text)', padding: '16px 20px', borderRadius: '16px', borderTopRightRadius: m.role === 'user' ? '4px' : '16px', borderTopLeftRadius: m.role === 'model' ? '4px' : '16px', maxWidth: '75%', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {m.parts.map(p => p.text).join('')}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '16px' }}>
             <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} />
            </div>
            <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '16px 20px', borderRadius: '16px', borderTopLeftRadius: '4px', color: 'var(--color-text-dim)', fontSize: '14px', fontStyle: 'italic' }}>
              Searching records and thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '20px 24px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
            <input 
              type="text" 
              className="input" 
              style={{ width: '100%', borderRadius: '24px', padding: '12px 16px 12px 44px', fontSize: '15px' }} 
              placeholder="E.g. What were the out of specification results last month?" 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              disabled={loading}
              autoFocus
            />
          </div>
          <button type="submit" className="button primary" style={{ borderRadius: '24px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }} disabled={loading || !input.trim()}>
            <Send size={16} /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
