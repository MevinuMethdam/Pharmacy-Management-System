import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Archive, ArrowRightLeft, Banknote, Flame, CheckCircle, Clock, Printer } from 'lucide-react';
import axios from '../../api/axiosInstance';
import toast from 'react-hot-toast';

export default function ReturnsDisposalsPage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');

    const fetchData = async (controller = null) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = {
                ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
                ...(controller ? { signal: controller.signal } : {})
            };

            const res = await axios.get('http://localhost:5000/api/returns/history', config);
            setHistory(res.data || []);
        } catch (err) {
            if (!axios.isCancel(err)) {
                toast.error('Failed to load Returns & Disposals data');
                console.error("Fetch Data Error:", err);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const load = async () => {
            if(isMounted) {
                await fetchData(controller);
            }
        };
        load();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, []);

    const handleAction = async (id, type) => {
        const confirmMsg = type === 'replace'
            ? 'Receive replacement stock and clear Debit Note?'
            : 'Accept Cash Refund and clear Debit Note?';

        if (!window.confirm(confirmMsg)) return;

        try {
            const token = localStorage.getItem('token');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            await axios.post(`http://localhost:5000/api/returns/${type}/${id}`, {}, config);

            toast.success(type === 'replace' ? 'Replacement Stock Added! ✅' : 'Cash Refund Processed! 💵');

            await fetchData();
        } catch (err) {
            if(!axios.isCancel(err)) {
                toast.error('Action failed. Please check backend connection.');
            }
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const totalPending = Number(history.filter(h => h.actionType === 'Return to Supplier' && h.status === 'Pending').reduce((acc, curr) => acc + Number(curr.totalValue), 0));
    const totalDisposals = Number(history.filter(h => h.actionType === 'Dispose/Write-off').reduce((acc, curr) => acc + Number(curr.totalValue), 0));
    const totalRecovered = Number(history.filter(h => h.status === 'Replaced' || h.status === 'Refunded').reduce((acc, curr) => acc + Number(curr.totalValue), 0));

    const displayedHistory = history.filter(h => {
        if (activeTab === 'Returns') return h.actionType === 'Return to Supplier';
        if (activeTab === 'Disposals') return h.actionType === 'Dispose/Write-off';
        return true;
    });

    return (
        <AdminLayout>
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                /* Scoped presentation only: Returns & Disposals. */
                .rd-page .rd-summary { gap: 24px; }
                .rd-page .rd-stat {
                    --rd-color: #d97706; --rd-glow: 245, 158, 11;
                    position: relative; display: flex; flex-direction: column;
                    min-width: 0; min-height: 264px; padding: 24px;
                    background: rgba(255,255,255,.4); backdrop-filter: blur(24px);
                    border: 1px solid rgba(255,255,255,.65); border-radius: 28px;
                    box-shadow: 0 8px 32px rgba(31,38,135,.05);
                    transition: transform .3s ease, box-shadow .3s ease;
                }
                .rd-page .rd-stat:hover { transform: translateY(-4px); box-shadow: 0 16px 36px rgba(31,38,135,.08); }
                .rd-page .rd-stat-recovered { --rd-color: #059669; --rd-glow: 16,185,129; }
                .rd-page .rd-stat-disposals { --rd-color: #f43f5e; --rd-glow: 244,63,94; }
                .rd-page .rd-stat > div { display: contents; }
                .rd-page .rd-stat > div > span {
                    order: 0; color: #1e293b; font-size: 14px; font-weight: 700;
                    text-transform: none; letter-spacing: -.025em; line-height: 1.4;
                }
                .rd-page .rd-stat > div > div {
                    order: 1; position: relative; display: flex; align-items: center; justify-content: center;
                    align-self: center; width: 112px; height: 116px; padding: 0; margin: 8px 0 10px;
                    background: transparent; border-radius: 50%; pointer-events: none;
                }
                .rd-page .rd-stat > div > div::before {
                    content: ''; position: absolute; width: 72px; height: 72px;
                    background: rgba(var(--rd-glow),.18); border-radius: 50%; filter: blur(18px);
                }
                .rd-page .rd-stat svg {
                    position: relative; width: 80px; height: 80px; stroke-width: 1.5;
                    color: var(--rd-color); filter: drop-shadow(0 0 8px rgba(var(--rd-glow),.4));
                }
                .rd-page .rd-stat > p:first-of-type {
                    order: 2; margin-top: auto; text-align: center; color: var(--rd-color);
                    font-size: clamp(20px, 2vw, 28px); font-weight: 500;
                    letter-spacing: -.04em; line-height: 1.3; overflow-wrap: anywhere;
                    font-variant-numeric: tabular-nums;
                }
                .rd-page .rd-stat > p:last-of-type {
                    order: 3; margin-top: 6px; text-align: center; font-size: 11px;
                    font-weight: 500; line-height: 1.5; color: #64748b;
                }
                @keyframes rd-fire-sway {
                    0%, 100% { transform: rotate(-9deg) scale(1); }
                    50% { transform: rotate(9deg) scale(1.05); }
                }
                @keyframes rd-icon-float {
                    0%, 100% { transform: translateY(2px); }
                    50% { transform: translateY(-4px); }
                }
                .rd-page .rd-stat-pending svg { animation: rd-icon-float 3.6s ease-in-out infinite; }
                .rd-page .rd-stat-recovered svg { animation: rd-icon-float 4s ease-in-out infinite; }
                .rd-page .rd-stat-disposals svg {
                    width: 88px; height: 88px; transform-origin: 50% 90%;
                    animation: rd-fire-sway 1.8s ease-in-out infinite;
                }
                .rd-page .rd-table-panel {
                    background: rgba(255,255,255,.3); border: 1px solid rgba(255,255,255,.6);
                    box-shadow: 0 8px 32px rgba(31,38,135,.05);
                }
                .rd-page .rd-tabs {
                    display: flex; flex-wrap: wrap; width: fit-content; max-width: 100%; gap: 4px;
                    padding: 5px; border-radius: 22px; background: rgba(241,245,249,.7);
                    border: 1px solid rgba(255,255,255,.8);
                }
                .rd-page .rd-tabs button { border-radius: 999px; padding: 9px 18px; font-weight: 600; }
                .rd-page .rd-tabs button:hover { background: rgba(255,255,255,.65); }
                .rd-page .rd-print {
                    border-radius: 999px; background: rgba(255,255,255,.65);
                    border-color: rgba(226,232,240,.8); font-weight: 600; flex-shrink: 0;
                    box-shadow: 0 4px 14px rgba(31,38,135,.04);
                }
                .rd-page .rd-badge {
                    display: inline-flex; align-items: center; justify-content: center;
                    border-radius: 999px; padding: 5px 10px; line-height: 1.2;
                    font-size: 10px; font-weight: 600; white-space: nowrap;
                    box-shadow: none; border-color: transparent;
                }
                .rd-page .rd-note { letter-spacing: .025em; }
                .rd-page .rd-action {
                    min-height: 34px; width: 116px; padding: 8px 12px; border-radius: 999px;
                    font-size: 11px; font-weight: 600; line-height: 1.2;
                    backdrop-filter: blur(12px); box-shadow: 0 3px 10px rgba(31,38,135,.04);
                    transition: background .2s ease, box-shadow .2s ease, transform .2s ease;
                }
                .rd-page .rd-replace { color: #047857; background: rgba(209,250,229,.5); border-color: rgba(167,243,208,.5); }
                .rd-page .rd-refund { color: #0284c7; background: rgba(224,242,254,.65); border-color: rgba(186,230,253,.6); }
                .rd-page .rd-replace:hover { background: rgba(167,243,208,.65); }
                .rd-page .rd-refund:hover { background: rgba(186,230,253,.75); }
                .rd-page .rd-action:hover { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(31,38,135,.08); }
                .rd-page button:focus-visible { outline: 2px solid #0ea5e9; outline-offset: 3px; }
                .rd-page .rd-table { min-width: 880px; }
                @media (max-width: 640px) {
                    .rd-page .rd-header { flex-wrap: wrap; gap: 16px; }
                    .rd-page .rd-tabs button { padding: 8px 12px; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .rd-page .rd-stat svg { animation: none; }
                    .rd-page .rd-stat, .rd-page .rd-action { transition: none; }
                    .rd-page .rd-stat:hover, .rd-page .rd-action:hover { transform: none; }
                }
                @media print { .rd-page .rd-table { min-width: 0; } }

                /* Print Styles */
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
                    .no-print { display: none !important; }
                    .print-area table { width: 100% !important; }
                }
            `}</style>

            <div className="rd-page relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4 flex flex-col hide-scrollbar print-area">

                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply no-print" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}></div>
                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-indigo-200/20 to-slate-300/20 blur-[120px] pointer-events-none z-[-2] no-print"></div>

                <div className="relative z-10 w-full flex-1 flex flex-col gap-6">

                    <div className="rd-header flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/40 backdrop-blur-md shadow-sm flex items-center justify-center border border-white/60 no-print">
                                <Archive size={20} strokeWidth={2.5} className="text-indigo-600" />
                            </div>
                            <div>
                                <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">Returns & Disposals</h1>
                                <p className="text-[13px] font-medium text-slate-500 mt-1.5 no-print">Manage expired stock, supplier debit notes, and financial write-offs</p>
                            </div>
                        </div>
                        <button onClick={handlePrint} className="rd-print no-print flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-[13px] hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm cursor-pointer">
                            <Printer size={16} strokeWidth={2.5} /> Print / PDF
                        </button>
                    </div>

                    <div className="rd-summary grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
                        <div className="rd-stat rd-stat-pending bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-amber-50 rounded-xl"><Clock size={20} className="text-amber-500"/></div>
                                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Pending Supplier Credit</span>
                            </div>
                            <p className="text-[32px] font-black text-slate-800">LKR {totalPending.toLocaleString('en-US', {minimumFractionDigits:2})}</p>
                            <p className="text-[11px] font-bold text-amber-600 mt-1">Awaiting replacement or cash refund</p>
                        </div>
                        <div className="rd-stat rd-stat-recovered bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-emerald-50 rounded-xl"><CheckCircle size={20} className="text-emerald-500"/></div>
                                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Successfully Recovered</span>
                            </div>
                            <p className="text-[32px] font-black text-slate-800">LKR {totalRecovered.toLocaleString('en-US', {minimumFractionDigits:2})}</p>
                            <p className="text-[11px] font-bold text-emerald-600 mt-1">Total value returned via replace/cash</p>
                        </div>
                        <div className="rd-stat rd-stat-disposals bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-rose-50 rounded-xl"><Flame size={20} className="text-rose-500"/></div>
                                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Total Disposals (Loss)</span>
                            </div>
                            <p className="text-[32px] font-black text-slate-800">LKR {totalDisposals.toLocaleString('en-US', {minimumFractionDigits:2})}</p>
                            <p className="text-[11px] font-bold text-rose-500 mt-1">Written off as business expense</p>
                        </div>
                    </div>

                    <div className="rd-table-panel flex-1 w-full bg-white/40 backdrop-blur-3xl rounded-[32px] border border-white/80 shadow-[inset_0_0_80px_rgba(203,213,225,0.4)] overflow-hidden flex flex-col">

                        <div className="px-6 pt-5 pb-2 no-print border-b border-white/40">
                            <div className="rd-tabs flex bg-slate-100/50 p-1 rounded-xl w-max border border-slate-200/50 backdrop-blur-sm">
                                <button onClick={() => setActiveTab('All')} className={`px-5 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${activeTab === 'All' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>All Logs</button>
                                <button onClick={() => setActiveTab('Returns')} className={`px-5 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${activeTab === 'Returns' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Supplier Returns</button>
                                <button onClick={() => setActiveTab('Disposals')} className={`px-5 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${activeTab === 'Disposals' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>Disposals</button>
                            </div>
                        </div>

                        <div className="overflow-x-auto px-6 py-4">
                            <table className="rd-table w-full text-left border-collapse table-fixed">
                                <thead>
                                <tr>
                                    <th className="w-[13%] pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight">Action Date<br/>& Ref</th>
                                    <th className="w-[22%] pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight">Medicine<br/>Details</th>
                                    <th className="w-[12%] pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight">Supplier</th>
                                    <th className="w-[15%] pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight">Action &<br/>Reason</th>
                                    <th className="w-[13%] pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight">Total<br/>Value (LKR)</th>
                                    <th className="w-[10%] pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight">Status</th>
                                    <th className="w-[15%] pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight text-right pr-4 no-print">Settlement<br/>Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="text-center py-16 text-slate-500 font-medium text-sm">Loading logs...</td></tr>
                                ) : displayedHistory.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center py-16 text-slate-500 font-medium text-sm">No records found.</td></tr>
                                ) : (
                                    displayedHistory.map((record) => {
                                        const isDisposal = record.actionType === 'Dispose/Write-off';
                                        const isPendingReturn = !isDisposal && record.status === 'Pending';
                                        const refPrefix = isDisposal ? 'DISP' : 'DN';

                                        const displayStatus = isDisposal ? 'Completed' : record.status;

                                        return (
                                            <tr key={record.id} className="group transition-colors border-b border-white/20 hover:bg-white/20 last:border-0">

                                                <td className="py-4 align-top pt-5">
                                                    <span className="text-[13px] font-bold text-slate-700">{new Date(record.createdAt).toLocaleDateString()}</span><br/>
                                                    <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase mt-0.5 inline-block">#{refPrefix}-{String(record.id).padStart(4, '0')}</span>
                                                </td>

                                                <td className="py-4 align-top pt-5 pr-2">
                                                    <p className="font-bold text-[14px] text-slate-800 truncate">{record.medicineName}</p>
                                                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">Batch: {record.batchNumber || 'N/A'} <span className="mx-1">|</span> <span className="font-bold text-slate-600">Qty: {record.quantity}</span></p>
                                                    <p className="text-[10px] font-bold text-rose-500 mt-0.5">Exp: {record.expiryDate ? new Date(record.expiryDate).toLocaleDateString() : 'N/A'}</p>
                                                </td>

                                                <td className="py-4 align-top pt-5">
                                                    <p className="text-[13px] font-bold text-slate-700 truncate">{record.supplierName || 'N/A'}</p>
                                                </td>

                                                <td className="py-4 align-top pt-5">
                                                    <span className={`rd-badge rd-note px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${!isDisposal ? 'bg-indigo-100/80 text-indigo-700 border border-indigo-200' : 'bg-rose-100/80 text-rose-700 border border-rose-200'}`}>
                                                        {!isDisposal ? 'DEBIT NOTE' : 'WRITE-OFF'}
                                                    </span><br/>
                                                    <p className="text-[10px] font-medium text-slate-500 mt-1.5 truncate" title={record.reason}>{record.reason}</p>
                                                    <p className="text-[9px] font-semibold text-slate-400 mt-0.5">By: Admin</p>
                                                </td>

                                                <td className="py-4 align-top pt-5">
                                                    <p className="text-[14px] font-black text-slate-800">
                                                        {Number(record.totalValue).toLocaleString('en-US', {minimumFractionDigits: 2})}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">@ LKR {Number(record.unitPrice).toFixed(2)}</p>
                                                </td>

                                                <td className="py-4 align-top pt-5">
                                                    {displayStatus === 'Pending' && <span className="rd-badge text-[11px] font-bold text-amber-600 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200/50 shadow-sm">Pending</span>}
                                                    {displayStatus === 'Replaced' && <span className="rd-badge text-[11px] font-bold text-emerald-600 bg-emerald-100/80 px-2.5 py-1 rounded-lg flex items-center w-max gap-1 border border-emerald-200/50 shadow-sm"><CheckCircle size={10} strokeWidth={3}/> Replaced</span>}
                                                    {displayStatus === 'Refunded' && <span className="rd-badge text-[11px] font-bold text-blue-600 bg-blue-100/80 px-2.5 py-1 rounded-lg flex items-center w-max gap-1 border border-blue-200/50 shadow-sm"><Banknote size={10} strokeWidth={3}/> Refunded</span>}
                                                    {displayStatus === 'Completed' && <span className="rd-badge text-[11px] font-bold text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-lg border border-slate-300/50 shadow-sm">Disposed</span>}
                                                </td>

                                                <td className="py-4 align-top pt-4 pr-4 text-right no-print">
                                                    {isPendingReturn ? (
                                                        <div className="flex flex-col gap-1.5 items-end">
                                                            <button onClick={() => handleAction(record.id, 'replace')} className="rd-action rd-replace flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 rounded-lg text-[11px] font-bold transition-all shadow-sm w-[110px] cursor-pointer">
                                                                <ArrowRightLeft size={12}/> Replace
                                                            </button>
                                                            <button onClick={() => handleAction(record.id, 'refund')} className="rd-action rd-refund flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-lg text-[11px] font-bold transition-all shadow-sm w-[110px] cursor-pointer">
                                                                <Banknote size={12}/> Cash Refund
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] font-semibold text-slate-400 mt-2 block">Settled</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}