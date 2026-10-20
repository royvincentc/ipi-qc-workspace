import React, { useState, useRef, useEffect } from 'react';
import { X, Send, User, Sparkles } from './components/LabIcons';
import { api } from './api';
import { MissMinutesAvatar } from './MissMinutesAvatar';
import { AssistantMarkdown } from './AssistantMarkdown';
import Dialog from './dialog';


const STARTER_PROMPTS = [
  "Summarize this month's receipts",
  "Check pending stability batches",
  "Show latest released FG samples",
  "Review water testing status",
];

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


  const handleSendPrompt = async (promptText: string) => {
    if (loading || !promptText.trim()) return;
    const newMessages = [...messages, { role: 'user' as const, parts: [{ text: promptText }] }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await api('/ai/chat', 'POST', { messages: newMessages });
      setMessages([...newMessages, response]);
    } catch (err: any) {
      setMessages([...newMessages, { role: 'model', parts: [{ text: "Error: " + err.message }] }]);
    } finally {
      setLoading(false);
    }
  };

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
        title="Ask Miss Minutes, QC lab companion"
      >
        <span className="pet-aura" aria-hidden="true"/>
        <MissMinutesAvatar />
        <span className="pet-online-dot" aria-hidden="true"/>
      </button>
    );
  }

  return (
    <Dialog title="Smart assistant" onClose={()=>setOpen(false)} className="assistant-drawer"><div className="floating-chat">
        <div className="chat-header">
          <div className="chat-title">
            <span className="chat-pet"><MissMinutesAvatar /></span>
            <span>
              <strong>Miss Minutes</strong>
              <small><i className="status-dot" aria-hidden="true"/> QC lab companion &middot; Online</small>
            </span>
          </div>
          <button className="icon-button chat-close-btn" onClick={() => setOpen(false)} aria-label="Close assistant">
            <X size={18} />
          </button>
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
          
          {messages.length <= 1 && (
            <div className="floating-starters" role="group" aria-label="Suggested questions">
              <span className="floating-starters-label">Suggestions</span>
              <div className="floating-starters-chips">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="floating-starter-chip"
                    onClick={() => handleSendPrompt(prompt)}
                    disabled={loading}
                  >
                    <Sparkles size={11} aria-hidden="true" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="floating-thinking" role="status" aria-label="Reviewing records">
              <Sparkles size={14} className="thinking-sparkle" /> <span>Reviewing records&hellip;</span>
              <span className="thinking-dots" aria-hidden="true"><i/><i/><i/></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} className="floating-composer">
          <input 
            type="text" 
            className="input floating-input" 
            placeholder="Ask about QC samples, tests, batches&hellip;" 
            aria-label="Ask the assistant"
            value={input} 
            onChange={e => setInput(e.target.value)} 
            disabled={loading}
          />
          <button type="submit" className="button primary floating-send" aria-label="Send message" disabled={loading || !input.trim()}>
            <Send size={15} />
          </button>
        </form>
    </div></Dialog>
  );
}
