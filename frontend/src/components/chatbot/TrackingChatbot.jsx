import React, {
    useEffect,
    useId,
    useRef,
    useState,
} from 'react';

const MONITOR_KEY = Symbol.for('pharmacy-bot.auto-monitor.v1');
const MAX_JSON_BYTES = 65536;

function envelopeMood(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const status = String(value.status || '').toLowerCase();
    const errors = value.errors;
    if (value.success === false || value.ok === false ||
        ['error', 'failed', 'failure'].includes(status) ||
        (typeof value.error === 'string' && value.error.trim()) ||
        (value.error && typeof value.error === 'object') ||
        (Array.isArray(errors) && errors.length > 0) ||
        (errors && typeof errors === 'object' && Object.keys(errors).length > 0)) return 'error';
    if (value.success === true || value.ok === true ||
        ['success', 'succeeded', 'completed'].includes(status)) return 'success';
    return null;
}

async function inspectFetchResponse(response) {
    if (!response.ok && response.type !== 'opaque') return 'error';
    const type = response.headers.get('content-type') || '';
    if (!/\bjson\b/i.test(type) || !response.body || response.bodyUsed ||
        Number(response.headers.get('content-length')) > MAX_JSON_BYTES) return null;
    let reader;
    let timeout;
    try {
        reader = response.clone().body.getReader();
        const read = async () => {
            const decoder = new TextDecoder();
            let text = '';
            let size = 0;
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                size += value.byteLength;
                if (size > MAX_JSON_BYTES) return null;
                text += decoder.decode(value, { stream: true });
            }
            text += decoder.decode();
            return envelopeMood(JSON.parse(text));
        };
        return await Promise.race([
            read(),
            new Promise(resolve => { timeout = window.setTimeout(() => resolve(null), 1200); }),
        ]);
    } catch {
        return null;
    } finally {
        window.clearTimeout(timeout);
        if (reader) {
            try { reader.cancel().catch(() => {}); } catch { /* Observer only. */ }
        }
    }
}

function subscribeAutomaticBot(listener) {
    let monitor = window[MONITOR_KEY];
    if (!monitor) {
        monitor = createAutomaticBotMonitor();
        window[MONITOR_KEY] = monitor;
    }
    monitor.listeners.add(listener);
    listener(monitor.snapshot());
    return () => {
        monitor.listeners.delete(listener);
        if (!monitor.listeners.size) {
            monitor.dispose();
            if (window[MONITOR_KEY] === monitor) delete window[MONITOR_KEY];
        }
    };
}

function createAutomaticBotMonitor() {
    const listeners = new Set();
    let disposed = false;
    let pending = 0;
    let uiBusy = false;
    let failed = false;
    let succeeded = false;
    let lastInteraction = 0;
    let scanTimer = null;
    const seen = new WeakMap();
    const removers = new Set();
    const xhrMeta = new WeakMap();
    const snapshot = () => ({ type: pending || uiBusy ? 'loading' : 'idle', pending: pending + Number(uiBusy) });
    const emit = type => {
        if (disposed) return;
        const state = { type, pending: pending + Number(uiBusy) };
        listeners.forEach(fn => { try { fn(state); } catch { /* Do not affect app. */ } });
    };
    const result = type => {
        if (type === 'error') failed = true;
        if (type === 'success') succeeded = true;
    };
    const begin = () => {
        if (!pending && !uiBusy) { failed = false; succeeded = false; }
        pending += 1;
        emit('loading');
        let finished = false;
        return type => {
            if (finished || disposed) return;
            finished = true;
            result(type);
            pending = Math.max(0, pending - 1);
            if (!pending && !uiBusy) emit(failed ? 'error' : succeeded ? 'success' : 'idle');
        };
    };
    const interact = event => {
        if (!(event.target instanceof Element) || event.target.closest('.pharmacist-bot')) return;
        lastInteraction = Date.now();
    };
    document.addEventListener('click', interact, true);
    document.addEventListener('input', interact, true);
    document.addEventListener('submit', interact, true);

    const requestInfo = (input, init) => {
        try {
            const isRequest = typeof Request !== 'undefined' && input instanceof Request;
            const method = String(init?.method || (isRequest ? input.method : 'GET')).toUpperCase();
            const raw = isRequest ? input.url : input;
            const url = new URL(String(raw), window.location.href);
            const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
            const ignored = /\.(?:js|css|png|jpg|jpeg|svg|gif|woff2?|ico|map)(?:$)/i.test(url.pathname) ||
                /(?:^|\/)(?:analytics|telemetry|metrics|heartbeat)(?:\/|$)/i.test(url.pathname);
            return { mutation, track: /^https?:$/.test(url.protocol) && !ignored &&
                    (mutation || Date.now() - lastInteraction < 2500) };
        } catch { return { track: false, mutation: false }; }
    };

    const originalFetch = window.fetch;
    function wrappedFetch(...args) {
        if (disposed) return Reflect.apply(originalFetch, this, args);
        const info = requestInfo(args[0], args[1]);
        const finish = info.track ? begin() : null;
        let promise;
        try { promise = Reflect.apply(originalFetch, this, args); }
        catch (error) { finish?.('error'); throw error; }
        if (finish) {
            promise.then(response => {
                inspectFetchResponse(response).then(mood => {
                    finish(mood || (info.mutation && response.ok && response.status !== 202 ? 'success' : null));
                }, () => finish(null));
            }, error => finish(error?.name === 'AbortError' ? null : 'error')).catch(() => {});
        }
        return promise;
    }
    if (typeof originalFetch === 'function') window.fetch = wrappedFetch;

    const proto = window.XMLHttpRequest?.prototype;
    const originalOpen = proto?.open;
    const originalSend = proto?.send;
    function wrappedOpen(method, url, ...rest) {
        const value = Reflect.apply(originalOpen, this, [method, url, ...rest]);
        if (!disposed) xhrMeta.set(this, { method, url });
        return value;
    }
    function wrappedSend(...args) {
        if (disposed) return Reflect.apply(originalSend, this, args);
        const meta = xhrMeta.get(this);
        const info = meta ? requestInfo(meta.url, { method: meta.method }) : { track: false };
        if (!info.track) return Reflect.apply(originalSend, this, args);
        const finish = begin();
        const xhr = this;
        let aborted = false;
        const onAbort = () => { aborted = true; };
        const remove = () => {
            xhr.removeEventListener('abort', onAbort);
            xhr.removeEventListener('loadend', onEnd);
            removers.delete(remove);
        };
        const onEnd = () => {
            remove();
            if (aborted) { finish(null); return; }
            let mood = xhr.status === 0 || xhr.status >= 400 ? 'error' : null;
            try {
                let data = null;
                if (xhr.responseType === 'json') data = xhr.response;
                else if ((!xhr.responseType || xhr.responseType === 'text') &&
                    /\bjson\b/i.test(xhr.getResponseHeader('content-type') || '') &&
                    xhr.responseText.length <= MAX_JSON_BYTES) data = JSON.parse(xhr.responseText);
                mood = mood || envelopeMood(data);
            } catch { /* Empty/non-JSON responses are valid. */ }
            finish(mood || (info.mutation && xhr.status >= 200 && xhr.status < 300 && xhr.status !== 202 ? 'success' : null));
        };
        xhr.addEventListener('abort', onAbort);
        xhr.addEventListener('loadend', onEnd);
        removers.add(remove);
        try { return Reflect.apply(originalSend, this, args); }
        catch (error) { remove(); finish('error'); throw error; }
    }
    if (proto) { proto.open = wrappedOpen; proto.send = wrappedSend; }

    const notices = '[role="alert"],[role="status"],[data-sonner-toast],.Toastify__toast,.ant-message-notice-content,.ant-notification-notice,.swal2-popup,.MuiAlert-root';
    const visible = element => element.isConnected && !element.closest('[hidden],[aria-hidden="true"]') &&
        element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden' &&
        getComputedStyle(element).display !== 'none';
    const scan = () => {
        scanTimer = null;
        if (disposed) return;
        let noticeResult = null;
        document.querySelectorAll(notices).forEach(element => {
            if (element.closest('.pharmacist-bot')) return;
            if (!visible(element)) { seen.delete(element); return; }
            const signature = (element.className || '') + ' ' + (element.getAttribute('data-type') || '');
            const text = (element.textContent || '').slice(0, 600).trim();
            const fingerprint = signature + '|' + text;
            if (seen.get(element) === fingerprint) return;
            seen.set(element, fingerprint);
            const classes = signature + ' ' + [...element.querySelectorAll('[class]')].slice(0, 20).map(e => e.getAttribute('class')).join(' ');
            let type = null;
            if (/\b(error|danger|failure)\b|MuiAlert-\w*Error/i.test(classes)) type = 'error';
            else if (/\bsuccess\b|MuiAlert-\w*Success/i.test(classes)) type = 'success';
            else if (/\b(failed|failure|unable|invalid|something went wrong|could not|cannot|not saved|not successful)\b/i.test(text)) type = 'error';
            else if (/\b(successfully|saved successfully|completed successfully)\b/i.test(text)) type = 'success';
            if (type === 'error' || (!noticeResult && type)) noticeResult = type;
        });
        const busy = [...document.querySelectorAll('[aria-busy="true"],[role="progressbar"],.MuiCircularProgress-root,.ant-spin-spinning,.swal2-loading')]
            .some(e => !e.closest('.pharmacist-bot') && visible(e) &&
                (e.getAttribute('role') !== 'progressbar' || !e.hasAttribute('aria-valuenow')));
        const wasBusy = uiBusy;
        uiBusy = busy;
        if (noticeResult) { result(noticeResult); emit(noticeResult); }
        else if (busy && !wasBusy) { if (!pending) { failed = false; succeeded = false; } emit('loading'); }
        else if (!busy && wasBusy && !pending) emit(failed ? 'error' : succeeded ? 'success' : 'idle');
    };
    const scheduleScan = records => {
        if (records && records.every(record => {
            const e = record.target instanceof Element ? record.target : record.target.parentElement;
            return e?.closest('.pharmacist-bot');
        })) return;
        if (scanTimer === null) scanTimer = window.setTimeout(scan, 100);
    };
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true,
        attributes: true, attributeFilter: ['class', 'data-type', 'aria-busy', 'aria-hidden', 'hidden', 'role'] });
    scheduleScan();

    return {
        listeners, snapshot,
        dispose() {
            disposed = true;
            observer.disconnect();
            window.clearTimeout(scanTimer);
            document.removeEventListener('click', interact, true);
            document.removeEventListener('input', interact, true);
            document.removeEventListener('submit', interact, true);
            removers.forEach(remove => remove());
            if (window.fetch === wrappedFetch) window.fetch = originalFetch;
            if (proto?.open === wrappedOpen) proto.open = originalOpen;
            if (proto?.send === wrappedSend) proto.send = originalSend;
        },
    };
}

const RADAR_URL = '../pages/admin/AIOutbreakRadar';

const BOT_EVENT = 'pharmacy-bot';

const MOODS = new Set([
    'idle',
    'happy',
    'curious',
    'thinking',
    'loading',
    'success',
    'error',
]);

const PRIORITY = {
    idle: 0,
    happy: 1,
    curious: 1,
    thinking: 1,
    loading: 3,
    success: 4,
    error: 4,
};

export function pharmacyBot(type, duration) {
    if (typeof window === 'undefined' || !MOODS.has(type)) return;

    window.dispatchEvent(
        new CustomEvent(BOT_EVENT, {
            detail: { type, duration },
        })
    );
}

const TrackingChatbot = ({
                             size = 128,
                             className = '',
                         }) => {
    const containerRef = useRef(null);
    const activeMoodRef = useRef('idle');
    const pendingRef = useRef(0);
    const resetTimerRef = useRef(null);

    const [activity, setActivity] = useState('idle');
    const [hovered, setHovered] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [blinking, setBlinking] = useState(false);
    const [look, setLook] = useState({ x: 0, y: 0 });

    const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');

    const shell = `pharmacist-shell-${id}`;
    const screen = `pharmacist-screen-${id}`;
    const pink = `pharmacist-pink-${id}`;
    const coat = `pharmacist-coat-${id}`;

    const mood = isTyping && !['error', 'success'].includes(activity)
        ? 'thinking'
        : activity === 'idle' && hovered ? 'happy' : activity;

    const isHappy = mood === 'happy' || mood === 'success';
    const isThinking = mood === 'thinking' || mood === 'loading';
    const isError = mood === 'error';
    const isCurious = mood === 'curious';

    useEffect(() => {
        let frame = null;
        let typingTimer;
        let gazeLockedUntil = 0;

        const reactToActivity = (
            type,
            duration,
            explicit = false
        ) => {
            if (!MOODS.has(type)) return;

            if (
                !explicit &&
                PRIORITY[activeMoodRef.current] > PRIORITY[type]
            ) {
                return;
            }

            window.clearTimeout(resetTimerRef.current);

            activeMoodRef.current = type;
            setActivity(type);

            if (type === 'loading' || type === 'idle') return;

            const defaultDuration =
                type === 'error'
                    ? 2800
                    : type === 'success'
                        ? 2400
                        : 1200;

            const delay = Number.isFinite(duration)
                ? Math.max(300, Math.min(duration, 15000))
                : defaultDuration;

            resetTimerRef.current = window.setTimeout(() => {
                const next = pendingRef.current > 0 ? 'loading' : 'idle';
                activeMoodRef.current = next;
                setActivity(next);
            }, delay);
        };

        const unsubscribeAutomatic = subscribeAutomaticBot(({ type, pending }) => {
            pendingRef.current = pending;
            if (type === 'idle' && ['success', 'error'].includes(activeMoodRef.current)) return;
            if (type === 'loading' && ['success', 'error'].includes(activeMoodRef.current)) return;
            reactToActivity(type, undefined, true);
        });

        const getElement = (event) =>
            event.target instanceof Element ? event.target : null;

        const shouldIgnore = (event) => {
            const target = getElement(event);

            return (
                !target ||
                containerRef.current?.contains(target) ||
                Boolean(target.closest('[data-bot-ignore]'))
            );
        };

        const aimAt = (clientX, clientY) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setLook({
                x: Math.max(-1, Math.min(1, (clientX - rect.left - rect.width / 2) / 280)),
                y: Math.max(-1, Math.min(1, (clientY - rect.top - rect.height / 3) / 240)),
            });
        };

        const watchControl = (target, duration = 1500) => {
            if (!target) return;
            if (frame !== null) window.cancelAnimationFrame(frame);
            frame = null;
            const rect = target.getBoundingClientRect();
            gazeLockedUntil = Date.now() + duration;
            aimAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
        };

        const handlePointerMove = (event) => {
            if (event.pointerType === 'touch' || Date.now() < gazeLockedUntil) return;
            const { clientX, clientY } = event;
            if (frame !== null) window.cancelAnimationFrame(frame);
            frame = window.requestAnimationFrame(() => {
                frame = null;
                if (Date.now() >= gazeLockedUntil) aimAt(clientX, clientY);
            });
        };

        const handleClick = (event) => {
            if (shouldIgnore(event)) return;

            const target = getElement(event);
            const control = target.closest(
                'button, a, input, select, textarea, [role="button"]'
            );

            if (
                control?.matches(
                    ':disabled, [aria-disabled="true"]'
                )
            ) {
                return;
            }

            if (control) watchControl(control, 1700);

            const requestedMood = target
                .closest('[data-bot-emotion]')
                ?.getAttribute('data-bot-emotion');

            if (
                ['happy', 'curious', 'thinking'].includes(
                    requestedMood
                )
            ) {
                reactToActivity(requestedMood);
            } else if (control) {
                reactToActivity('curious', 900);
            }
        };

        const handleInput = (event) => {
            if (shouldIgnore(event)) return;

            const target = getElement(event);
            if (!target?.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable]:not([contenteditable="false"])')) return;
            setIsTyping(true);
            window.clearTimeout(typingTimer);
            typingTimer = window.setTimeout(() => setIsTyping(false), 1500);
            watchControl(target, 1200);
            reactToActivity('thinking', 1500);
        };

        const handleInvalid = (event) => {
            if (shouldIgnore(event)) return;
            reactToActivity('error', 2600);
        };

        const handleBotEvent = (event) => {
            const { type, duration } = event.detail || {};
            reactToActivity(type, duration, true);
        };

        const resetPointer = () => {
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
                frame = null;
            }

            gazeLockedUntil = 0;
            window.clearTimeout(typingTimer);
            setIsTyping(false);
            setLook({ x: 0, y: 0 });
            setHovered(false);
        };

        window.addEventListener(
            'pointermove',
            handlePointerMove,
            { passive: true }
        );
        window.addEventListener('blur', resetPointer);
        window.addEventListener(BOT_EVENT, handleBotEvent);

        document.addEventListener('click', handleClick, true);
        document.addEventListener('input', handleInput);
        document.addEventListener('invalid', handleInvalid, true);
        document.addEventListener(
            'pointerleave',
            resetPointer
        );

        return () => {
            unsubscribeAutomatic();
            window.clearTimeout(typingTimer);
            window.clearTimeout(resetTimerRef.current);

            if (frame !== null) {
                window.cancelAnimationFrame(frame);
            }

            window.removeEventListener(
                'pointermove',
                handlePointerMove
            );
            window.removeEventListener('blur', resetPointer);
            window.removeEventListener(
                BOT_EVENT,
                handleBotEvent
            );

            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('input', handleInput);
            document.removeEventListener(
                'invalid',
                handleInvalid,
                true
            );
            document.removeEventListener(
                'pointerleave',
                resetPointer
            );
        };
    }, []);

    useEffect(() => {
        let closeTimer;
        let openTimer;

        const scheduleBlink = () => {
            closeTimer = window.setTimeout(() => {
                setBlinking(true);

                openTimer = window.setTimeout(() => {
                    setBlinking(false);
                    scheduleBlink();
                }, 130);
            }, 2500 + Math.random() * 3000);
        };

        scheduleBlink();

        return () => {
            window.clearTimeout(closeTimer);
            window.clearTimeout(openTimer);
        };
    }, []);

    const width = Number.isFinite(size)
        ? Math.max(64, size)
        : 128;

    return (
        <>
            <button
                ref={containerRef}
                type="button"
                className={`pharmacist-bot ${className}`}
                data-mood={mood}
                aria-label="Open AI Outbreak Radar"
                onClick={() => window.location.assign(RADAR_URL)}
                onPointerEnter={(event) => {
                    if (event.pointerType !== 'touch') {
                        setHovered(true);
                    }
                }}
                onPointerLeave={() => setHovered(false)}
                onPointerCancel={() => setHovered(false)}
                style={{
                    width,
                    height: (width * 140) / 128,
                    '--pb-x': `${look.x * 5}px`,
                    '--pb-y': `${look.y * 2}px`,
                    '--pb-turn': `${look.x * 18}deg`,
                    '--pb-head-turn': `${look.x * 5}deg`,
                    '--pb-nod': `${-look.y * 5}deg`,
                }}
            >
                <span className="pb-float">
                    <span className="pb-follow">
                        <svg
                            viewBox="0 0 128 140"
                            className="pb-art"
                            fill="none"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <defs>
                                <linearGradient
                                    id={shell}
                                    x1="39"
                                    y1="20"
                                    x2="91"
                                    y2="119"
                                    gradientUnits="userSpaceOnUse"
                                >
                                    <stop stopColor="#F3E7FF" />
                                    <stop
                                        offset="0.48"
                                        stopColor="#DED0FA"
                                    />
                                    <stop
                                        offset="1"
                                        stopColor="#BCA5E8"
                                    />
                                </linearGradient>

                                <linearGradient
                                    id={screen}
                                    x1="64"
                                    y1="13"
                                    x2="64"
                                    y2="56"
                                    gradientUnits="userSpaceOnUse"
                                >
                                    <stop stopColor="#172B79" />
                                    <stop
                                        offset="1"
                                        stopColor="#075DA3"
                                    />
                                </linearGradient>

                                <linearGradient
                                    id={pink}
                                    x1="43"
                                    y1="17"
                                    x2="85"
                                    y2="47"
                                    gradientUnits="userSpaceOnUse"
                                >
                                    <stop stopColor="#FF8BCF" />
                                    <stop
                                        offset="1"
                                        stopColor="#EB59AE"
                                    />
                                </linearGradient>

                                <linearGradient
                                    id={coat}
                                    x1="45"
                                    y1="70"
                                    x2="85"
                                    y2="115"
                                    gradientUnits="userSpaceOnUse"
                                >
                                    <stop stopColor="#FFFFFF" />
                                    <stop
                                        offset="0.6"
                                        stopColor="#F8FCFF"
                                    />
                                    <stop
                                        offset="1"
                                        stopColor="#DFEAF5"
                                    />
                                </linearGradient>
                            </defs>

                            <g className="pb-pose">
                                <g className="pb-left-arm">
                                    <path
                                        d="M47 67C40 67 31 78 27 87
                                           L34 94C41 88 48 79 50 72Z"
                                        fill={`url(#${coat})`}
                                        stroke="#CAD8E8"
                                        strokeWidth="1.3"
                                    />
                                    <path
                                        d="M28 88C23 89 17 96 16 101
                                           C15 105 19 106 23 103L34 94Z"
                                        fill={`url(#${shell})`}
                                        stroke="#C4ABEC"
                                        strokeWidth="1.5"
                                    />
                                    <path
                                        d="M26 88L34 94"
                                        stroke="#C6D9E8"
                                        strokeWidth="2.5"
                                    />
                                </g>

                                <g className="pb-right-arm">
                                    <path
                                        d="M80 68C88 70 96 81 100 89
                                           L93 96C86 89 80 79 78 73Z"
                                        fill={`url(#${coat})`}
                                        stroke="#CAD8E8"
                                        strokeWidth="1.3"
                                    />
                                    <path
                                        d="M98 89C103 91 110 99 109 104
                                           C108 108 104 106 101 103L92 95Z"
                                        fill={`url(#${shell})`}
                                        stroke="#C4ABEC"
                                        strokeWidth="1.5"
                                    />
                                    <path
                                        d="M93 95L100 89"
                                        stroke="#C6D9E8"
                                        strokeWidth="2.5"
                                    />
                                </g>

                                <path d="M54 56H74L77 72H51Z" fill="#112D62" />

                                <path
                                    d="M50 65Q64 59 78 65
                                       C85 76 87 94 88 109
                                       Q90 120 98 128
                                       Q91 133 82 131
                                       Q63 135 44 131
                                       Q34 133 29 128
                                       Q39 120 40 108
                                       C41 90 43 74 50 65Z"
                                    fill={`url(#${coat})`}
                                    stroke="#C5D5E6" strokeWidth="1.4"
                                />
                                <path
                                    d="M53 64Q64 61 75 64L78 84L73 103
                                       H55L50 84Z"
                                    fill="#153A77" stroke="#102C60" strokeWidth="1"
                                />
                                <path d="M54 62L64 67L58 77L51 68Z"
                                      fill="#214B8B" stroke="#5274A8" strokeWidth=".8" />
                                <path d="M74 62L64 67L70 77L77 68Z"
                                      fill="#214B8B" stroke="#5274A8" strokeWidth=".8" />
                                <path d="M64 69V99" stroke="#0C2758" strokeWidth="1.4" />
                                <circle cx="64" cy="79" r=".9" fill="#9EBCDF" />
                                <circle cx="64" cy="88" r=".9" fill="#9EBCDF" />

                                <path
                                    d="M51 65L56 71L60 87L65 100L64 131
                                       Q45 134 29 128Q39 120 40 108
                                       C41 90 43 74 51 65Z"
                                    fill={`url(#${coat})`} stroke="#CFDCEB" strokeWidth="1"
                                />
                                <path
                                    d="M77 65L72 71L68 87L64 100L64 131
                                       Q82 135 98 128Q89 120 88 108
                                       C87 90 84 74 77 65Z"
                                    fill={`url(#${coat})`} stroke="#CFDCEB" strokeWidth="1"
                                />
                                <path d="M45 111Q44 121 39 127M83 111Q85 122 90 127
                                         M57 117L55 129M73 117L76 130"
                                      stroke="#D7E2EF" strokeWidth="1.2" strokeLinecap="round" />
                                <path d="M33 128Q45 131 55 130M73 131Q86 132 94 128"
                                      stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />

                                <path
                                    d="M53 65L61 69L58 86L50 77
                                       L54 74L50 71Z"
                                    fill="#FFFFFF"
                                    stroke="#D1DFED"
                                />
                                <path
                                    d="M74 65L67 69L70 86L78 77
                                       L74 74L78 71Z"
                                    fill="#FFFFFF"
                                    stroke="#D1DFED"
                                />

                                <path
                                    d="M46 97H55V103Q50.5 107 46 103Z"
                                    fill="#EFF6FC"
                                    stroke="#CDDBE9"
                                />
                                <path
                                    d="M73 97H82V103Q77.5 107 73 103Z"
                                    fill="#EFF6FC"
                                    stroke="#CDDBE9"
                                />

                                <rect
                                    x="74"
                                    y="81"
                                    width="8"
                                    height="8"
                                    rx="1.8"
                                    fill="#DFF7FF"
                                    stroke="#BFE5EF"
                                    strokeWidth="0.7"
                                />
                                <path
                                    d="M78 83V87M76 85H80"
                                    stroke="#1DABC2"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                />

                                <circle
                                    cx="69.5"
                                    cy="97"
                                    r="1"
                                    fill="#A8BCD0"
                                />
                                <circle
                                    cx="70"
                                    cy="105"
                                    r="1"
                                    fill="#A8BCD0"
                                />

                                <path
                                    d="M55 66C52 69 51 74 52 80
                                       M72 66C75 69 75 74 74 80"
                                    stroke="#547B91"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M52 79V84
                                       C52 92 64 93 65 85L66 78"
                                    stroke="#258FA9"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M74 79V87
                                       C74 90 72 93 69 94"
                                    stroke="#258FA9"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M52 79V82M66 78L65.6 82"
                                    stroke="#BDD6E5"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                />
                                <circle
                                    cx="68"
                                    cy="95"
                                    r="3.8"
                                    fill="#E4F3FA"
                                    stroke="#597E93"
                                    strokeWidth="1.2"
                                />
                                <circle
                                    cx="68"
                                    cy="95"
                                    r="2"
                                    fill="#5ABBD1"
                                />

                                {/* Head */}
                                <g className="pb-head">
                                    <ellipse
                                        cx="38"
                                        cy="30"
                                        rx="7"
                                        ry="14"
                                        transform="rotate(14 38 30)"
                                        fill={`url(#${pink})`}
                                        stroke="#EDD7FF"
                                        strokeWidth="1.6"
                                    />
                                    <ellipse
                                        cx="91"
                                        cy="30"
                                        rx="8"
                                        ry="14"
                                        transform="rotate(-12 91 30)"
                                        fill={`url(#${pink})`}
                                        stroke="#EDD7FF"
                                        strokeWidth="1.6"
                                    />

                                    <path
                                        d="M33 43C34 29 42 17 51 12
                                           C59 8 69 8 77 13
                                           C87 19 94 34 95 46
                                           C96 57 87 63 65 64
                                           C44 64 31 58 33 43Z"
                                        fill={`url(#${shell})`}
                                        stroke="#F1DFFF"
                                        strokeWidth="1.5"
                                    />

                                    <path
                                        d="M38 42C40 29 47 20 54 16
                                           C60 13 67 13 74 17
                                           C82 22 89 35 90 45
                                           C91 53 82 57 65 58
                                           C48 58 36 53 38 42Z"
                                        fill={`url(#${screen})`}
                                    />

                                    {/* Expressions */}
                                    <g
                                        className="pb-expression"
                                        style={{
                                            transform: `translate(
                                                ${look.x * 2.5}px,
                                                ${look.y * 2}px
                                            )`,
                                        }}
                                    >
                                        {isHappy ? (
                                            <>
                                                <path
                                                    d="M45 34Q51 27 57 34
                                                       Q51 32 45 34Z
                                                       M71 34Q77 27 83 34
                                                       Q77 32 71 34Z"
                                                    fill="#12EAF2"
                                                />
                                                <path
                                                    d="M56 42Q64 44 73 41
                                                       C70 54 59 54 56 42Z"
                                                    fill="#39BDE0"
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <g
                                                    className="pb-eyes"
                                                    style={{
                                                        transform: `
                                                            translateY(31px)
                                                            scaleY(${
                                                            blinking
                                                                ? 0.12
                                                                : isThinking
                                                                    ? 0.42
                                                                    : 1
                                                        })
                                                            translateY(-31px)
                                                        `,
                                                    }}
                                                >
                                                    <path
                                                        d="M46 33
                                                           C46 22 56 21 57 32
                                                           C57 37 46 37 46 33Z"
                                                        fill="#11EDF3"
                                                    />

                                                    {isCurious ? (
                                                        <ellipse
                                                            cx="77"
                                                            cy="31"
                                                            rx="5.5"
                                                            ry="8"
                                                            fill="#11EDF3"
                                                        />
                                                    ) : (
                                                        <path
                                                            d="M71 32
                                                               C72 21 82 22 82 33
                                                               C82 37 71 37 71 32Z"
                                                            fill="#11EDF3"
                                                        />
                                                    )}
                                                </g>

                                                {isError && (
                                                    <path
                                                        d="M45 23L56 20
                                                           M72 20L83 23"
                                                        stroke="#57E7F3"
                                                        strokeWidth="1.7"
                                                        strokeLinecap="round"
                                                    />
                                                )}

                                                {isError ? (
                                                    <path
                                                        d="M59 47Q64 42 70 47"
                                                        stroke="#39C3E2"
                                                        strokeWidth="1.8"
                                                        strokeLinecap="round"
                                                    />
                                                ) : isCurious ? (
                                                    <ellipse
                                                        cx="65"
                                                        cy="46"
                                                        rx="2.6"
                                                        ry="3.2"
                                                        fill="#39C3E2"
                                                    />
                                                ) : (
                                                    <path
                                                        d="M61 45H68"
                                                        stroke="#32BBDD"
                                                        strokeWidth="1.7"
                                                        strokeLinecap="round"
                                                    />
                                                )}
                                            </>
                                        )}
                                    </g>

                                    <path
                                        d="M31 33C23 38 23 49 29 53
                                           C33 55 38 55 43 54"
                                        stroke="#D7B8EF"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M31 33C24 39 25 48 30 51"
                                        stroke="#FFF0FF"
                                        strokeWidth="1.2"
                                        strokeLinecap="round"
                                    />
                                    <circle
                                        cx="31"
                                        cy="33"
                                        r="2"
                                        fill="#FFFFFF"
                                    />
                                    <ellipse
                                        cx="43"
                                        cy="54"
                                        rx="7"
                                        ry="3.4"
                                        transform="rotate(-8 43 54)"
                                        fill={`url(#${pink})`}
                                        stroke="#ECCCF4"
                                        strokeWidth="1"
                                    />
                                </g>
                            </g>

                            {mood === 'loading' && (
                                <g
                                    className="pb-loading-dots"
                                    fill="#27B5D0"
                                >
                                    <circle cx="56" cy="136" r="1.5" />
                                    <circle cx="64" cy="136" r="1.5" />
                                    <circle cx="72" cy="136" r="1.5" />
                                </g>
                            )}

                            {mood === 'success' && (
                                <g
                                    stroke="#37B8C7"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                >
                                    <path
                                        d="M104 16V22M101 19H107
                                           M20 64V70M17 67H23"
                                    />
                                </g>
                            )}
                        </svg>
                    </span>
                </span>
            </button>

            <style>{`
                .pharmacist-bot {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex: 0 0 auto;
                    padding: 0;
                    border: 0;
                    background: transparent;
                    cursor: pointer;
                    appearance: none;
                    overflow: visible;
                    vertical-align: middle;
                    -webkit-tap-highlight-color: transparent;
                }

                .pharmacist-bot:focus-visible {
                    outline: 2px solid #22DDEB;
                    outline-offset: 3px;
                    border-radius: 24px;
                }

                .pharmacist-bot .pb-float,
                .pharmacist-bot .pb-follow {
                    display: block;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }

                .pharmacist-bot .pb-float {
                    animation: pharmacist-float 4s ease-in-out infinite;
                }

                .pharmacist-bot .pb-follow {
                    transform:
                        translate(var(--pb-x), var(--pb-y))
                        perspective(450px)
                        rotateY(var(--pb-turn))
                        rotateX(var(--pb-nod));
                    transition: transform 220ms ease-out;
                }

                .pharmacist-bot .pb-art {
                    display: block;
                    width: 100%;
                    height: 100%;
                    overflow: visible;
                    filter:
                        drop-shadow(0 0 1.5px rgba(255, 231, 255, 0.95))
                        drop-shadow(0 0 4px rgba(218, 176, 250, 0.65));
                }

                .pharmacist-bot .pb-pose {
                    transform-origin: 64px 80px;
                    transition: transform 350ms ease;
                }

                .pharmacist-bot .pb-head {
                    transform-origin: 64px 58px;
                    transform: rotate(var(--pb-head-turn));
                    transition: transform 350ms ease;
                }

                .pharmacist-bot .pb-left-arm {
                    transform-origin: 47px 70px;
                    transition: transform 350ms ease;
                }

                .pharmacist-bot .pb-right-arm {
                    transform-origin: 81px 70px;
                    transition: transform 350ms ease;
                }

                .pharmacist-bot .pb-expression {
                    transition: transform 100ms ease-out;
                }

                .pharmacist-bot .pb-eyes {
                    transition: transform 90ms ease;
                }

                .pharmacist-bot[data-mood="happy"] .pb-head {
                    transform: rotate(-7deg);
                }

                .pharmacist-bot[data-mood="happy"] .pb-pose {
                    transform: translateY(-2px) rotate(-7deg);
                }

                .pharmacist-bot[data-mood="happy"] .pb-left-arm {
                    transform: rotate(25deg);
                }

                .pharmacist-bot[data-mood="happy"] .pb-right-arm {
                    transform: rotate(-25deg);
                }

                .pharmacist-bot[data-mood="curious"] .pb-head {
                    transform: rotate(8deg);
                }

                .pharmacist-bot[data-mood="thinking"] .pb-head,
                .pharmacist-bot[data-mood="loading"] .pb-head {
                    transform: rotate(-5deg) translateY(1px);
                }

                .pharmacist-bot[data-mood="success"] .pb-pose {
                    animation: pharmacist-celebrate 600ms ease-in-out 2;
                }

                .pharmacist-bot[data-mood="success"] .pb-right-arm {
                    transform: rotate(-65deg);
                }

                .pharmacist-bot[data-mood="success"] .pb-left-arm {
                    transform: rotate(35deg);
                }

                .pharmacist-bot[data-mood="error"] .pb-head {
                    animation: pharmacist-shake 450ms ease-in-out 1;
                }

                .pharmacist-bot .pb-loading-dots circle {
                    animation: pharmacist-dot 1.2s ease-in-out infinite;
                }

                .pharmacist-bot .pb-loading-dots circle:nth-child(2) {
                    animation-delay: 150ms;
                }

                .pharmacist-bot .pb-loading-dots circle:nth-child(3) {
                    animation-delay: 300ms;
                }

                @keyframes pharmacist-float {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-1.5px);
                    }
                }

                @keyframes pharmacist-celebrate {
                    0%, 100% {
                        transform: translateY(0) rotate(0);
                    }
                    50% {
                        transform: translateY(-5px) rotate(-5deg);
                    }
                }

                @keyframes pharmacist-shake {
                    0%, 100% {
                        transform: rotate(0);
                    }
                    25% {
                        transform: rotate(-5deg);
                    }
                    75% {
                        transform: rotate(5deg);
                    }
                }

                @keyframes pharmacist-dot {
                    0%, 100% {
                        opacity: 0.3;
                    }
                    50% {
                        opacity: 1;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .pharmacist-bot * {
                        animation: none !important;
                        transition: none !important;
                    }

                    .pharmacist-bot .pb-follow {
                        transform: none;
                    }
                }
            `}</style>
        </>
    );
};

export default TrackingChatbot;