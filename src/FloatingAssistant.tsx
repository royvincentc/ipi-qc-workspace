import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { api } from './api';

export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', parts: {text: string}[]}[]>([{ role: 'model', parts: [{ text: 'Hello! I am your AI assistant. How can I help you with QC records today?' }] }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, open]);

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

  if (!open) {
    return (
      <Draggable bounds="parent">
        <button 
          className="button primary" 
          style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, borderRadius: '50%', width: '56px', height: '56px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          onClick={() => setOpen(true)}
          aria-label="Open AI Assistant"
        >
          <Bot size={28} />
        </button>
      </Draggable>
    );
  }

  return (
    <Draggable bounds="parent" handle=".chat-header">
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', width: '380px', height: '500px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        <div className="chat-header" style={{ padding: '12px 16px', backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'grab' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <Bot size={18} /> Smart Assistant
          </div>
          <button className="icon-button" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '11px', color: 'var(--color-text-dim)' }}>
                {m.role === 'user' ? <><User size={12}/> You</> : <><Bot size={12}/> Assistant</>}
              </div>
              <div style={{ backgroundColor: m.role === 'user' ? 'var(--accent)' : 'var(--color-bg-secondary)', color: m.role === 'user' ? 'white' : 'var(--color-text)', padding: '10px 14px', borderRadius: '12px', borderTopRightRadius: m.role === 'user' ? '2px' : '12px', borderTopLeftRadius: m.role === 'model' ? '2px' : '12px', maxWidth: '85%', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {m.parts.map(p => p.text).join('')}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-dim)' }}>
              <Bot size={14} /> <em>Thinking...</em>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} style={{ padding: '12px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '8px', backgroundColor: 'var(--color-bg)' }}>
          <input 
            type="text" 
            className="input" 
            style={{ flex: 1, borderRadius: '20px', padding: '8px 16px' }} 
            placeholder="Ask about QC samples..." 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            disabled={loading}
          />
          <button type="submit" className="button primary" style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={loading || !input.trim()}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </Draggable>
  );
}
