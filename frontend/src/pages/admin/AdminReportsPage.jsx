import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axiosInstance';
import { reportTables, downloadReport, htmlDocument } from './reportExport';
import './AdminReportsPage.css';
const API = `${(api.defaults.baseURL || 'http://localhost:5000/api').replace(/\/$/, '')}/reports`;
const SOCKET = API.replace(/\/api\/reports$/, '');
const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const message = e => e.response?.data?.error || e.response?.data?.message || 'Connection failed. Check the backend and retry.';
const freshEntry = () => ({ entryDate: localToday(), category: 'customer_receipts', amount: '', reference: '', description: '', confirmed: false });
const tabs = [['cash', 'Cash flow'], ['sales', 'Sales'], ['payables', 'Supplier balances'], ['inventory', 'Stock value'], ['ledger', 'Cashbook & sources']];
export default function AdminReportsPage() {
    const [range, setRange] = useState(() => ({ start: localToday().slice(0, 7) + '-01', end: localToday() }));
    const [filter, setFilter] = useState(range);
    const [tab, setTab] = useState('sales');
    const [exporting, setExporting] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [entry, setEntry] = useState(freshEntry);
    const [opening, setOpening] = useState({ openingDate: localToday().slice(0, 7) + '-01', openingAmount: '', evidence: '', confirmed: false });
    const [correction, setCorrection] = useState(null);
    const [reason, setReason] = useState('');
    const [revision, setRevision] = useState(0);
    const exportLock = useRef(false);
    const refreshRef = useRef(() => {});
    const mutationLock = useRef(false);
    useEffect(() => {
        let disposed = false, running = false, pending = false;
        const controller = new AbortController();
        setData(null); setError('');
        const refresh = async () => {
            if (disposed) return;
            if (running) { pending = true; return; }
            running = true; setLoading(true);
            try {
                const requestToken = localStorage.getItem('token');
                const r = await axios.get(`${API}/snapshot`, { params: range, headers: auth(), signal: controller.signal, timeout: 20000 });
                if (requestToken !== localStorage.getItem('token')) { pending = true; setData(null); return; }
                if (!disposed) { setData(r.data); setError(''); }
            } catch (e) {
                if (!disposed && !axios.isCancel(e)) { setError(message(e)); setData(null); }
            } finally {
                running = false;
                if (!disposed) { setLoading(false); if (pending) { pending = false; refresh(); } }
            }
        };
        refreshRef.current = refresh; refresh();
        const timer = setInterval(refresh, 15000);
        const onStorage = e => { if (e.key === 'token' || e.key === null) { setData(null); refresh(); } };
        window.addEventListener('storage', onStorage);
        const onFocus = () => refresh(); window.addEventListener('focus', onFocus);
        const socket = io(SOCKET);
        socket.on('connect', refresh);
        ['reports_updated', 'receive_notification', 'purchase_updated', 'restock_updated'].forEach(event => socket.on(event, refresh));
        return () => { disposed = true; controller.abort(); clearInterval(timer); window.removeEventListener('focus', onFocus); window.removeEventListener('storage', onStorage); socket.disconnect(); refreshRef.current = () => {}; };
    }, [range, revision]);
    const post = async (path, body, success) => {
        if (mutationLock.current) return;
        mutationLock.current = true; setBusy(true); setNotice('');
        try {
            await axios.post(`${API}${path}`, body, { headers: auth(), timeout: 20000 });
            success(); setNotice('Saved. Refreshing verified server data.');
            setRevision(v => v + 1);
        } catch (e) { setNotice(`${message(e)} If the request timed out, refresh the cashbook before retrying.`); }
        finally { mutationLock.current = false; setBusy(false); }
    };
    const canExport = data && !error && !loading && !exporting && (tab !== 'cash' || data.cash.available);
    const exportReport = async (type, selectedTab = tab) => {
        if (exportLock.current) return;
        exportLock.current = true; setExporting(true); setNotice('');

        const popup = type === 'preview' ? window.open('', '_blank') : null;
        if (popup) { popup.opener = null; popup.document.body.textContent = 'Loading current database report…'; }
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API}/snapshot`, { params: range, headers: auth(), timeout: 20000 });
            if (token !== localStorage.getItem('token')) throw new Error('Session changed. Refresh and try again.');
            const snapshot = response.data;
            if (selectedTab === 'cash' && !snapshot.cash.available) throw new Error('Record an opening balance on or before the report start date first.');
            if (type === 'preview') {
                if (!popup || popup.closed) throw new Error('Allow pop-ups to preview, or use Download HTML.');
                popup.document.open(); popup.document.write(htmlDocument(snapshot, selectedTab)); popup.document.close(); popup.focus();
            } else downloadReport(snapshot, selectedTab, type);
            setNotice('Report generated from a fresh database snapshot.');
        } catch (e) {
            if (popup && !popup.closed) popup.close();
            setNotice(e.response ? message(e) : e.message || 'Report export failed.');
        } finally { exportLock.current = false; setExporting(false); }
    };
    const tableViews = data ? reportTables(data, tab) : [];
    return <AdminLayout><main className="pharmacy-reports">
        <header className="rp-header"><div><span className="rp-eyebrow">ADMIN / FINANCIAL REPORTS</span><h1>Reports</h1><p>Kegalle Ph4Life · Company management reports</p></div><span className="rp-badge">LKR · Asia/Colombo</span></header>
        <section className="rp-toolbar" aria-label="Report controls">
            <form onSubmit={e => { e.preventDefault(); setRange({ ...filter }); }}>
                <label>From<input required type="date" max={filter.end} value={filter.start} onChange={e => setFilter({ ...filter, start: e.target.value })} /></label>
                <label>To<input required type="date" min={filter.start} max={localToday()} value={filter.end} onChange={e => setFilter({ ...filter, end: e.target.value })} /></label>
                <button type="submit">Apply period</button>
            </form><button className="rp-secondary" disabled={loading} onClick={() => refreshRef.current()}>Refresh</button>
            <div className="rp-status" role="status">{exporting ? 'Generating report…' : loading ? 'Updating…' : error ? 'Data unavailable' : `Updated ${new Date(data?.generatedAt).toLocaleTimeString()}`}<small>Refreshes every 15 seconds and on report changes</small></div>
        </section>
        <aside className="rp-note"><strong>Management reports — reconciliation required.</strong> Cash flow uses confirmed cashbook movements. Sales are not automatically cash receipts. Stock and supplier balances show the current snapshot, independently of your chosen period.</aside>
        <nav className="rp-tabs" aria-label="Report type">{tabs.map(([key, label]) => <button key={key} aria-pressed={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>
        {error && <div className="rp-error" role="alert">{error} No stale or estimated figures are displayed. If another portal was opened in this browser, sign out and sign back in as Admin, then refresh this page.</div>}
        {notice && <div className="rp-note" role="status">{notice}</div>}
        {data && <>
            <div className="rp-cards">{[['Cashbook closing', data.cash.closing ?? 'Not available'], ['Completed sales · line totals', data.sales.completed], ['Current invoice outstanding', data.payables.outstanding], ['Current recorded stock value', data.inventory.total]].map(([label, value]) => <div className="rp-card" key={label}><small>{label}</small><strong>{value}</strong><span>LKR</span></div>)}</div>
            {data.issues.length > 0 && <aside className="rp-warning"><strong>Items to reconcile</strong><ul>{data.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></aside>}
            <div className="rp-export"><span>Period: {data.start} → {data.end}</span><button disabled={!canExport} className="rp-secondary" onClick={() => exportReport('csv')}>Download CSV</button><button disabled={!canExport} className="rp-secondary" onClick={() => exportReport('html')}>Download HTML</button><button disabled={!canExport} onClick={() => exportReport('preview')}>Preview / Save PDF</button><button disabled={!data || !!error || loading || exporting} className="rp-secondary" onClick={() => exportReport('preview', 'all')}>Preview all reports</button></div>
            {tab === 'cash' && !data.cash.available ? <section className="rp-panel"><h2>Opening cash balance required</h2><p>Open “Cashbook & sources” and record a reconciled opening balance on or before {data.start}. Cash-flow balances are not estimated from sales.</p></section> : tableViews.map(t => <section className="rp-panel" key={t.title}><h2>{t.title}</h2><div className="rp-table-scroll"><table><thead><tr>{t.headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{t.rows.length ? t.rows.map((row, i) => <tr key={i}>{row.map((value, j) => <td key={j}>{String(value ?? '—')}</td>)}</tr>) : <tr><td colSpan={t.headers.length}>No recorded entries for this view.</td></tr>}</tbody></table></div></section>)}
            {tab === 'ledger' && <>
                {!data.setup ? <section className="rp-panel"><h2>1. Establish opening cash</h2><p>Combined reconciled cash and qualifying bank balances at the START of this date, before that day’s movements. This opening is fixed once recorded; verify it carefully.</p><form className="rp-form" onSubmit={e => { e.preventDefault(); post('/cash-opening', opening, () => {}); }}>
                    <label>Opening date<input required type="date" max={localToday()} value={opening.openingDate} onChange={e => setOpening({ ...opening, openingDate: e.target.value })} /></label>
                    <label>Opening balance (LKR)<input required inputMode="decimal" pattern="[0-9]{1,12}(\.[0-9]{1,2})?" value={opening.openingAmount} onChange={e => setOpening({ ...opening, openingAmount: e.target.value })} /></label>
                    <label className="rp-wide">Reconciliation reference / included accounts<input required maxLength={500} value={opening.evidence} onChange={e => setOpening({ ...opening, evidence: e.target.value })} /></label>
                    <label className="rp-check rp-wide"><input required type="checkbox" checked={opening.confirmed} onChange={e => setOpening({ ...opening, confirmed: e.target.checked })} />I verified this opening against cash counts and bank records.</label><button disabled={busy}>Record opening balance</button>
                </form></section> : <section className="rp-panel"><h2>Opening recorded</h2><p>{data.setup.openingDate} · LKR {data.setup.openingAmount} · {data.setup.evidence}</p><p>Record every settled external movement once. Exclude transfers between included cash/bank accounts. Use sales and payment references to reconcile; “Accepted” alone does not prove settlement.</p>
                    <form className="rp-form" onSubmit={e => { e.preventDefault(); const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; post('/cash-entries', { ...entry, requestId }, () => setEntry(freshEntry())); }}>
                        <label>Settlement date<input required type="date" min={data.setup.openingDate} max={localToday()} value={entry.entryDate} onChange={e => setEntry({ ...entry, entryDate: e.target.value })} /></label>
                        <label>Activity / category<select value={entry.category} onChange={e => setEntry({ ...entry, category: e.target.value })}>{Object.entries(data.categories).map(([key, c]) => <option value={key} key={key}>{c.activity} · {c.label}</option>)}</select></label>
                        <label>Actual amount (LKR, positive)<input required inputMode="decimal" pattern="[0-9]{1,12}(\.[0-9]{1,2})?" value={entry.amount} onChange={e => setEntry({ ...entry, amount: e.target.value })} /></label>
                        <label>Unique evidence reference<input required maxLength={120} value={entry.reference} onChange={e => setEntry({ ...entry, reference: e.target.value })} placeholder="e.g. BANK-20261015-001" /></label>
                        <label className="rp-wide">Description / source references<input required maxLength={500} value={entry.description} onChange={e => setEntry({ ...entry, description: e.target.value })} /></label>
                        <label className="rp-check rp-wide"><input required type="checkbox" checked={entry.confirmed} onChange={e => setEntry({ ...entry, confirmed: e.target.checked })} />I verified settlement, amount, category and that this movement is not already recorded.</label><button disabled={busy}>Record cash movement</button>
                    </form>
                </section>}
                <section className="rp-panel"><h2>Correct a cashbook entry</h2><p>A reversal keeps the audit trail and restates the original effective date. Record a replacement separately if needed.</p>
                    <select aria-label="Entry to reverse" value={correction || ''} onChange={e => setCorrection(e.target.value || null)}><option value="">Choose an entry in the selected period</option>{data.cash.entries.filter(r => !r.reversalOf && !r.reversed).map(r => <option value={r.id} key={r.id}>{r.reference} · {r.entryDate} · LKR {r.amount}</option>)}</select>
                    {correction && <form className="rp-form" onSubmit={e => { e.preventDefault(); post(`/cash-entries/${correction}/reverse`, { reason, confirmed: true }, () => { setCorrection(null); setReason(''); }); }}><label className="rp-wide">Correction reason<input required maxLength={350} value={reason} onChange={e => setReason(e.target.value)} /></label><label className="rp-check rp-wide"><input required type="checkbox" />I confirm this entry should be reversed.</label><button disabled={busy}>Confirm reversal</button></form>}
                </section>
            </>}
            <details className="rp-panel"><summary>Accounting basis and limitations</summary><ul>{data.basis.map(s => <li key={s}>{s}</li>)}</ul></details>
        </>}
    </main></AdminLayout>;
}