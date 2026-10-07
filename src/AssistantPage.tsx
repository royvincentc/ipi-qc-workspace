import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Search, RefreshCw, Sparkles, Plus, MessageSquare, Trash2 } from 'lucide-react';
import { api } from './api';
import { MissMinutesAvatar } from './MissMinutesAvatar';
import { AssistantMarkdown } from './AssistantMarkdown';
import { PageTitle } from './ui';

type Message = {role: 'user' | 'model', parts: {text: string}[], error?: boolean};
type Conversation = {id: string; title: string; updatedAt: string; messages: Message[]};
const greeting: Message = { role: 'model', parts: [{ text: 'Hi, I’m Miss Minutes, your QC lab companion. I can help find authorized records, summarize documented results, and review audit history. What are you working on?' }] };
const historyKey = 'ipi.assistant.conversations';

function readHistory(): Conversation[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(historyKey) || '[]');
    if (!Array.isArray(parsed)) return [];
    const usable = parsed.filter((item: Conversation) => item?.id && item?.messages?.some(message => message.role === 'user' && message.parts?.some(part => part.text?.trim())));
    localStorage.setItem(historyKey, JSON.stringify(usable));
    return usable;
  } catch { return []; }
}
function titleFor(messages: Message[]) {
  const first = messages.find(message => message.role === 'user')?.parts.map(part => part.text).join('').trim();
  if (!first) return 'New conversation';
  const cleaned = first.replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim();
  return cleaned.slice(0, 48) + (cleaned.length > 48 ? '…' : '');
}

export function AssistantPage() {
  const [history, setHistory] = useState<Conversation[]>(readHistory);
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([greeting]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if(messages.length>1)messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); }, [messages]);
  useEffect(() => {
    if (!messages.some(message => message.role === 'user' && message.parts.some(part => part.text.trim()))) return;
    setHistory(previous => {
      const next = [{ id: conversationId, title: titleFor(messages), updatedAt: new Date().toISOString(), messages }, ...previous.filter(item => item.id !== conversationId)].slice(0, 12);
      localStorage.setItem(historyKey, JSON.stringify(next));
      return next;
    });
  }, [conversationId, messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault(); if (!input.trim() || loading) return;
    const newMessages = [...messages, { role: 'user' as const, parts: [{ text: input }] }]; setMessages(newMessages); setInput(''); setLoading(true);
    try {
      const response = await api('/ai/chat', 'POST', { messages: newMessages });
      setMessages([...newMessages, response]);
      if (newMessages.filter(message => message.role === 'user').length === 1) {
        try {
          const generated = await api('/ai/title', 'POST', { prompt: input.trim() });
          if (generated.title) setHistory(previous => {
            const next = previous.map(item => item.id === conversationId ? {...item, title: generated.title} : item);
            localStorage.setItem(historyKey, JSON.stringify(next));
            return next;
          });
        } catch { /* The first-request title remains a useful local fallback. */ }
      }
    }
    catch (err: any) { setMessages([...newMessages, { role: 'model', error: true, parts: [{ text: err.message || 'Smart Assistant could not process this request because of a server problem. Please try again.' }] }]); }
    finally { setLoading(false); }
  };
  const newConversation = () => { setConversationId(crypto.randomUUID()); setMessages([greeting]); setInput(''); };
  const openConversation = (conversation: Conversation) => { setConversationId(conversation.id); setMessages(conversation.messages); setInput(''); };
  const deleteConversation = (id: string) => {
    setHistory(previous => {
      const next = previous.filter(item => item.id !== id);
      localStorage.setItem(historyKey, JSON.stringify(next));
      return next;
    });
    if (id === conversationId) newConversation();
  };

  return <><PageTitle title="Smart Assistant" description="Search authorized QC records and audit history."/><div className="assistant-shell">
    <aside className="assistant-history" aria-label="Conversation history">
      <div className="assistant-history-heading"><div><span className="eyebrow"><MessageSquare size={12}/> Workspace memory</span><h2>Conversations</h2></div><button className="icon-button" onClick={newConversation} aria-label="Start a new conversation" title="Start a new conversation"><Plus size={17}/></button></div>
      <button className="assistant-new-chat" onClick={newConversation}><Plus size={15}/> New conversation</button>
      <div className="assistant-history-list">{history.length ? history.map(item => <div key={item.id} className={`assistant-history-row ${item.id === conversationId ? 'active' : ''}`}><button className="assistant-history-item" onClick={() => openConversation(item)}><strong>{item.title}</strong><small>{new Date(item.updatedAt).toLocaleDateString([], {month:'short', day:'numeric'})}</small></button><button className="icon-button assistant-delete-chat" onClick={() => deleteConversation(item.id)} aria-label={`Delete ${item.title}`} title="Delete conversation"><Trash2 size={14}/></button></div>) : <p className="assistant-history-empty">Your previous conversations will appear here.</p>}</div>
    </aside>
    <div className="assistant-page">
      <div className="assistant-header"><div className="assistant-heading"><div className="assistant-avatar"><MissMinutesAvatar /></div><div><div className="eyebrow"><Sparkles size={12}/> QC lab companion</div><h2>Miss Minutes</h2><small>Searches authorized QC records and audit history</small></div></div><button className="button secondary" onClick={newConversation}><RefreshCw size={14}/> New chat</button></div>
      <div className="assistant-messages">{messages.map((m, i) => <div key={i} className={`assistant-message ${m.role}${m.error ? ' is-error' : ''}`}><div className="assistant-message-avatar">{m.role === 'user' ? <User size={18}/> : <MissMinutesAvatar className="assistant-message-mark"/>}</div><div className="assistant-bubble" role={m.error ? 'alert' : undefined}>{m.parts.map((p, partIndex) => <AssistantMarkdown key={partIndex} text={p.text}/>)}</div></div>)}{loading ? <div className="assistant-message model"><div className="assistant-message-avatar"><MissMinutesAvatar className="assistant-message-mark"/></div><div className="assistant-bubble assistant-thinking"><i/><i/><i/><span>Searching records</span></div></div> : null}<div ref={messagesEndRef}/></div>
      <div className="assistant-composer"><form onSubmit={handleSend}><div className="assistant-input-wrap"><Search size={18}/><input type="text" className="input" placeholder="Ask about QC samples, results, or audit history…" value={input} onChange={e => setInput(e.target.value)} disabled={loading} aria-label="Ask about QC records" /></div><button type="submit" className="button primary assistant-send" disabled={loading || !input.trim()}><Send size={16}/> Send</button></form></div>
    </div>
  </div></>;
}
