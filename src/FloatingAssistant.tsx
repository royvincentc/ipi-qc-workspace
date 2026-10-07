import React, { useState, useRef, useEffect } from 'react';
import { X, Send, User, Sparkles } from 'lucide-react';
import { api } from './api';
import { MissMinutesAvatar } from './MissMinutesAvatar';
import { AssistantMarkdown } from './AssistantMarkdown';
import Dialog from './dialog';

export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', parts: {text: string}[]}[]>([{ role: 'model', parts: [{ text: 'Hi, I’m Miss Minutes, your QC lab companion. I can help find authorized records, summarize documented results, and review audit history. What are you working on?' }] }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if(messages.length>1)messagesEndRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth' });
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
      <button
        className="lab-pet miss-minutes"
        onClick={() => setOpen(true)}
        aria-label="Open Miss Minutes Assistant"
      >
        <MissMinutesAvatar />
      </button>
    );
  }

  return (
    <Dialog title="Smart assistant" onClose={()=>setOpen(false)} className="assistant-drawer"><div className="floating-chat">
        <div className="chat-header">
          <div className="chat-title">
            <span className="chat-pet"><MissMinutesAvatar /></span><span><strong>Miss Minutes</strong><small><i/> QC lab companion</small></span>
          </div>
          <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close assistant"><X size={18} /></button>
        </div>
        <div className="floating-messages">
          {messages.map((m, i) => (
            <div key={i} className={`floating-message ${m.role}`}>
              <div className="floating-message-label">
                {m.role === 'user' ? <><User size={12}/> You</> : <><MissMinutesAvatar className="floating-message-mark"/> Miss Minutes</>}
              </div>
              <div className="floating-bubble">
                {m.role === 'model'
                  ? m.parts.map((p, partIndex) => <AssistantMarkdown key={partIndex} text={p.text}/>)
                  : m.parts.map(p => p.text).join('')}
              </div>
            </div>
          ))}
          {loading && (
            <div className="floating-thinking">
              <Sparkles size={14} /> <span>Reviewing records</span><i/><i/><i/>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} className="floating-composer">
          <input 
            type="text" 
            className="input" 
            placeholder="Ask about QC samples..." 
            aria-label="Ask the assistant"
            value={input} 
            onChange={e => setInput(e.target.value)} 
            disabled={loading}
          />
          <button type="submit" className="button primary floating-send" aria-label="Send message" disabled={loading || !input.trim()}>
            <Send size={16} />
          </button>
        </form>
    </div></Dialog>
  );
}
