import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Send, X } from 'lucide-react';
import TrackingChatbot from './TrackingChatbot';

export default function LandingChatbot() {
    const [open, setOpen] = useState(false);
    const [opening, setOpening] = useState(false);
    const [bubbleStep, setBubbleStep] = useState(0);
    const openingTimerRef = useRef(null);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'model', text: 'Hi! I am the Ph4Life assistant. How can I help you? You can chat in English or Sinhala.' }
    ]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const launcherRef = useRef(null);
    const inputRef = useRef(null);
    const endRef = useRef(null);
    const requestRef = useRef(null);
    const panelId = useId();
    const headingId = useId();

    useEffect(() => {
        const button = launcherRef.current?.querySelector('button');
        if (!button) return;
        button.setAttribute('aria-label', open ? 'Close pharmacy chat' : 'Open pharmacy chat');
        button.setAttribute('aria-expanded', String(open));
        button.setAttribute('aria-controls', panelId);
        if (open) inputRef.current?.focus();
    }, [open, panelId]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [messages, busy, error, open]);

    useEffect(() => () => requestRef.current?.abort(), []);

    useEffect(() => () => window.clearTimeout(openingTimerRef.current), []);

    const closeChat = () => {
        window.clearTimeout(openingTimerRef.current);
        openingTimerRef.current = null;
        setOpening(false);
        setBubbleStep(0);
        setOpen(false);
        launcherRef.current?.querySelector('button')?.focus();
    };

    const handleLauncherClick = (event) => {
        if (!event.target.closest('button.pharmacist-bot')) return;
        event.preventDefault();
        event.stopPropagation();
        if (open || openingTimerRef.current !== null) {
            closeChat();
            return;
        }
        setOpening(true);
        setBubbleStep(1);
        const revealBubble = (step) => {
            openingTimerRef.current = window.setTimeout(() => {
                setBubbleStep(step);
                if (step < 4) {
                    revealBubble(step + 1);
                } else {
                    openingTimerRef.current = window.setTimeout(() => {
                        openingTimerRef.current = null;
                        setOpening(false);
                        setOpen(true);
                    }, 600);
                }
            }, 240);
        };
        revealBubble(2);
    };

    const sendMessage = async (event) => {
        event.preventDefault();
        const text = input.trim();
        if (!text || requestRef.current) return;
        const controller = new AbortController();
        requestRef.current = controller;
        // The initial greeting is UI copy, not conversation history.
        const history = messages.slice(1).slice(-12);
        setMessages(current => [...current, { role: 'user', text }]);
        setInput('');
        setError('');
        setBusy(true);
        try {
            const response = await axios.post('http://localhost:5000/api/chatbot/message',
                { message: text, history },
                { signal: controller.signal, timeout: 45000 });
            if (typeof response.data.reply !== 'string' || !response.data.reply.trim()) {
                throw new Error('Empty chatbot reply');
            }
            setMessages(current => [...current, { role: 'model', text: response.data.reply }]);
        } catch (err) {
            if (controller.signal.aborted) return;
            setMessages(current => current.slice(0, -1));
            setInput(text);
            setError(err.response?.data?.error || 'Could not get a reply. Please try again.');
        } finally {
            if (requestRef.current === controller) requestRef.current = null;
            if (!controller.signal.aborted) setBusy(false);
        }
    };

    return (
        <>
            <style>{`
                @keyframes ph4life-chat-appear {
                    from { opacity: 0; transform: translateY(18px) scale(0.94); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .ph4life-chat-appear {
                    transform-origin: bottom right;
                    animation: ph4life-chat-appear 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @media (prefers-reduced-motion: reduce) {
                    .ph4life-chat-appear { animation: none; opacity: 1; }
                }
            `}</style>
            {(opening || open) && createPortal(
                <svg aria-hidden="true" focusable="false" viewBox="0 0 150 88"
                     width="150" height="88"
                     style={{ position: 'fixed', right: 95, bottom: 105,
                         width: 150, height: 88, overflow: 'visible',
                         pointerEvents: 'none', zIndex: 2147483647,
                         filter: 'drop-shadow(0 3px 5px rgba(30, 41, 59, 0.28))' }}>
                    {[
                        { cx: 136, cy: 75, r: 7 },
                        { cx: 110, cy: 58, r: 11 },
                        { cx: 76, cy: 40, r: 15 },
                        { cx: 33, cy: 30, r: 19 }
                    ].map((bubble, index) => (
                        (open || bubbleStep > index) && (
                            <circle key={index} cx={bubble.cx} cy={bubble.cy} r={bubble.r}
                                    fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                        )
                    ))}
                </svg>,
                document.body
            )}
            {open && (
                <section id={panelId} role="dialog" aria-labelledby={headingId}
                         onKeyDown={event => {
                             if (event.key === 'Escape') { event.stopPropagation(); closeChat(); }
                         }}
                         className="ph4life-chat-appear fixed right-4 sm:right-8 z-[10000] flex flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl"
                         style={{ bottom: 184, width: 'min(380px, calc(100vw - 32px))', height: 'min(480px, calc(100dvh - 208px))' }}>
                    <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-white">
                        <div>
                            <h2 id={headingId} className="text-base font-semibold">Ph4Life Assistant</h2>
                            <p className="text-xs text-blue-50">AI assistant · General guidance</p>
                        </div>
                        <button type="button" onClick={closeChat} aria-label="Close chat"
                                className="rounded-lg p-2 hover:bg-white/20 focus-visible:outline focus-visible:outline-2">
                            <X size={18} />
                        </button>
                    </header>
                    <div role="log" aria-live="polite" aria-label="Chat messages"
                         className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                        {messages.map((message, index) => (
                            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <p className={`max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed ${message.role === 'user' ? 'bg-blue-600 text-white' : 'border border-slate-100 bg-white text-slate-700'}`}>
                                    <span className="sr-only">{message.role === 'user' ? 'You: ' : 'Assistant: '}</span>
                                    {message.text}
                                </p>
                            </div>
                        ))}
                        {busy && <p className="text-sm text-slate-500">Thinking…</p>}
                        <div ref={endRef} />
                    </div>
                    {error && <p role="alert" className="px-4 py-2 text-sm text-red-600">{error}</p>}
                    <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-100 p-3">
                        <input ref={inputRef} value={input} onChange={event => setInput(event.target.value)}
                               aria-label="Your message" placeholder="Type your message…" maxLength={2000}
                               readOnly={busy} autoComplete="off"
                               className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                        <button type="submit" disabled={busy || !input.trim()} aria-label="Send message"
                                className="rounded-xl bg-blue-600 px-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                            <Send size={18} />
                        </button>
                    </form>
                </section>
            )}
            <div ref={launcherRef} onClickCapture={handleLauncherClick}
                 className="fixed bottom-8 right-8 z-[9999]">
                <TrackingChatbot />
            </div>
        </>
    );
}