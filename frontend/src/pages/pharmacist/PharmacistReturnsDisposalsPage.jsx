import React, { useState, useEffect, useRef } from 'react';
import PharmacistLayout from '../../components/layout/PharmacistLayout';
import { Archive, ArrowRightLeft, Banknote, Flame, CheckCircle, Clock, Printer } from 'lucide-react';
import axios from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import ReturnEvidence from '../../components/returns/ReturnEvidence';

export default function PharmacistReturnsDisposalsPage() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [settlementForm, setSettlementForm] = useState(null);
    const [settlementReason, setSettlementReason] = useState('');
    const [refundItems, setRefundItems] = useState([]);
    const [refundQuantities, setRefundQuantities] = useState({});
    const [refundItemsLoading, setRefundItemsLoading] = useState(false);
    const [refundItemsError, setRefundItemsError] = useState('');
    const [evidenceImage, setEvidenceImage] = useState(null);
    const [evidenceLoading, setEvidenceLoading] = useState(false);
    const [submittingSettlement, setSubmittingSettlement] = useState(false);
    const settlementBusy = useRef(false);
    const evidenceRead = useRef(0);

    const fetchData = async (controller = null, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = {
                ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
                ...(controller ? { signal: controller.signal } : {})
            };

            const res = await axios.get('http://localhost:5000/api/returns/history', config);
            if (!controller?.signal.aborted) setHistory(res.data || []);
        } catch (err) {
            if (!axios.isCancel(err)) {
                if (!silent) toast.error('Failed to load Returns & Disposals data');
                console.error("Fetch Data Error:", err);
            }
        } finally {
            if (!silent && !controller?.signal.aborted) setLoading(false);
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
        let refreshing = false;
        const refresh = async () => {
            if (!isMounted || document.hidden || refreshing) return;
            refreshing = true;
            await fetchData(controller, true);
            refreshing = false;
        };
        const timer = window.setInterval(refresh, 5000);
        window.addEventListener('focus', refresh);

        return () => {
            window.clearInterval(timer);
            window.removeEventListener('focus', refresh);
            isMounted = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        if (settlementForm?.type !== 'refund') return;
        const controller = new AbortController();
        const record = history.find(row => String(row.id) === String(settlementForm.id));
        setRefundItemsLoading(true);
        setRefundItemsError('');
        setRefundItems([]);
        setRefundQuantities({});
        axios.get('http://localhost:5000/api/purchases', {
            signal: controller.signal, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(response => {
            if (controller.signal.aborted || !record) return;
            const choices = (response.data || []).filter(invoice =>
                String(invoice.supplierId) === String(record.supplierId) &&
                new Date(invoice.createdAt) <= new Date(record.createdAt)
            ).flatMap(invoice => (invoice.items || []).filter(item =>
                String(item.medicineId) === String(record.medicineId) &&
                item.batchNumber === record.batchNumber && Number(item.quantity) > 0 &&
                Math.round(Number(item.costPrice) * 100) === Math.round(Number(record.unitPrice) * 100)
            ).map(item => ({ ...item, invoiceNumber: invoice.invoiceNumber, grnNumber: invoice.grnNumber })));
            setRefundItems(choices);
            if (choices.length === 1) setRefundQuantities({ [choices[0].id]: Math.min(Number(record.quantity), Number(choices[0].quantity)) });
            if (!choices.length) setRefundItemsError('No matching GRN item found for this batch and cost. Check its purchase records before requesting a refund.');
        }).catch(error => {
            if (!axios.isCancel(error)) setRefundItemsError('Unable to load invoice items. Close and reopen this request to retry.');
        }).finally(() => { if (!controller.signal.aborted) setRefundItemsLoading(false); });
        return () => controller.abort();
    }, [settlementForm]);

    const handleAction = (id, type) => {
        if (settlementBusy.current) return;
        evidenceRead.current += 1;
        setRefundItemsLoading(type === 'refund');
        setRefundItemsError('');
        setRefundItems([]);
        setRefundQuantities({});
        setSettlementForm({ id, type });
        setSettlementReason('');
        setEvidenceImage(null);
        setEvidenceLoading(false);
    };

    const closeSettlement = () => {
        if (settlementBusy.current) return;
        evidenceRead.current += 1;
        setSettlementForm(null);
    };

    const selectEvidence = (event) => {
        const file = event.target.files?.[0];
        const version = ++evidenceRead.current;
        setEvidenceImage(null);
        setEvidenceLoading(false);
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            event.target.value = '';
            toast.error('Choose a JPG, PNG or WebP image, up to 5 MB.');
            return;
        }
        setEvidenceLoading(true);
        const reader = new FileReader();
        reader.onload = () => {
            if (version !== evidenceRead.current) return;
            setEvidenceImage(reader.result);
            setEvidenceLoading(false);
        };
        reader.onerror = () => {
            if (version !== evidenceRead.current) return;
            setEvidenceLoading(false);
            toast.error('Unable to read this photo. Please choose it again.');
        };
        reader.readAsDataURL(file);
    };

    const submitSettlement = async (event) => {
        event.preventDefault();
        if (!settlementForm || settlementBusy.current || evidenceLoading) return;
        if (!settlementReason.trim()) return toast.error('Please enter a reason.');
        const refundAllocations = refundItems.map(item => ({ purchaseItemId: item.id, quantity: Number(refundQuantities[item.id] || 0) })).filter(item => item.quantity > 0);
        if (settlementForm.type === 'refund') {
            const record = history.find(row => String(row.id) === String(settlementForm.id));
            if (refundItemsLoading || refundItemsError || !record ||
                refundAllocations.reduce((sum, item) => sum + item.quantity, 0) !== Number(record.quantity)) {
                return toast.error('Allocate the full returned quantity to its matching invoice items.');
            }
        }
        settlementBusy.current = true;
        setSubmittingSettlement(true);
        try {
            await axios.post(`http://localhost:5000/api/returns/${settlementForm.type}/${settlementForm.id}`, {
                reason: settlementReason.trim(), evidenceImage,
                ...(settlementForm.type === 'refund' ? { refundAllocations } : {})
            }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            toast.success('Submitted to supplier. Status: Reviewing.');
            setSettlementForm(null);
            await fetchData(null, true);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Unable to submit the request.');
            await fetchData(null, true);
        } finally {
            settlementBusy.current = false;
            setSubmittingSettlement(false);
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
        <PharmacistLayout>
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                .rd-settlement-scroll { scrollbar-width: none; -ms-overflow-style: none; }
                .rd-settlement-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
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
                                        const isPendingReturn = !isDisposal && record.status === 'Pending' && (!record.reviewStatus || record.reviewStatus === 'Rejected');
                                        const refPrefix = isDisposal ? 'DISP' : 'DN';

                                        const displayStatus = isDisposal ? 'Completed' : ['Reviewing', 'Rejected'].includes(record.reviewStatus) ? record.reviewStatus : record.status;

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
                                                    {record.settlementReason && <p className="text-[11px] text-slate-600 mt-2 whitespace-pre-wrap break-words"><strong>{record.settlementType === 'replace' ? 'Replacement' : 'Cash refund'}:</strong> {record.settlementReason}</p>}
                                                    {record.rejectionReason && <p className="text-[11px] text-rose-600 mt-2 whitespace-pre-wrap break-words"><strong>Rejected:</strong> {record.rejectionReason}</p>}
                                                    <ReturnEvidence adjustmentId={record.id} hasEvidence={record.hasEvidence} reviewVersion={record.reviewVersion} />
                                                    <p className="text-[9px] font-semibold text-slate-400 mt-0.5">By: Admin</p>
                                                </td>

                                                <td className="py-4 align-top pt-5">
                                                    <p className="text-[14px] font-black text-slate-800">
                                                        {Number(record.totalValue).toLocaleString('en-US', {minimumFractionDigits: 2})}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">@ LKR {Number(record.unitPrice).toFixed(2)}</p>
                                                </td>

                                                <td className="py-4 align-top pt-5">
                                                    {displayStatus === 'Reviewing' && <span className="rd-badge text-blue-700 bg-blue-100">Reviewing</span>}
                                                    {displayStatus === 'Rejected' && <span className="rd-badge text-rose-700 bg-rose-100">Rejected</span>}
                                                    {record.reviewStatus === 'Accepted' && <span className="block text-[10px] font-semibold text-emerald-600 mb-1">Accepted</span>}
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
                                                        <span className="text-[11px] font-semibold text-slate-400 mt-2 block">{displayStatus === 'Reviewing' ? 'Awaiting supplier' : 'Settled'}</span>
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
            {settlementForm && (
                <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 no-print">
                    <form onSubmit={submitSettlement} role="dialog" aria-modal="true" aria-labelledby="return-settlement-title" className="rd-settlement-scroll w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 id="return-settlement-title" className="text-xl font-bold text-slate-800">{settlementForm.type === 'replace' ? 'Request Replacement' : 'Request Cash Refund'}</h2>
                                <p className="text-xs text-slate-500 mt-1">Debit Note #{settlementForm.id} · Supplier review required</p>
                            </div>
                            <button type="button" onClick={closeSettlement} disabled={submittingSettlement} aria-label="Close request" className="rounded-full px-3 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50">✕</button>
                        </div>
                        {settlementForm.type === 'refund' && (
                            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                                <p className="text-sm font-bold text-slate-700">Refund invoice quantities</p>
                                <p className="text-xs text-slate-500 mt-1">Allocate all {history.find(row => String(row.id) === String(settlementForm.id))?.quantity} returned units. Only these invoice items will be reduced after supplier acceptance.</p>
                                {refundItemsLoading && <p className="text-xs mt-3">Loading matching GRN items...</p>}
                                {refundItemsError && <p role="alert" className="text-xs text-rose-600 mt-3">{refundItemsError}</p>}
                                {refundItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-emerald-200/60 text-xs text-slate-600">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-[13px] text-slate-800 break-words">{item.invoiceNumber}</p>
                                            <p className="mt-1 text-[11px] text-slate-500 break-words">{item.grnNumber}</p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]">
                                                <span>Batch <span className="font-semibold text-emerald-800">{item.batchNumber}</span></span>
                                                <span>Available <span className="font-semibold text-slate-700">{item.quantity}</span></span>
                                            </div>
                                        </div>
                                        {refundItems.length === 1 ? (
                                            <div aria-label={`Refund quantity for ${item.invoiceNumber}: ${refundQuantities[item.id] ?? 0}`} className="shrink-0 text-right pl-4 border-l border-emerald-200/60">
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Refund qty</p>
                                                <p className="mt-1 text-[28px] leading-none font-bold tabular-nums text-emerald-800">{refundQuantities[item.id] ?? 0}</p>
                                                <p className="mt-1 text-[10px] text-emerald-600">units</p>
                                            </div>
                                        ) : (
                                            <input aria-label={`Refund quantity for ${item.invoiceNumber}, item ${item.id}`} type="number" min="0" max={Number(item.quantity)} step="1" value={refundQuantities[item.id] ?? ''} disabled={submittingSettlement} onChange={event => setRefundQuantities(current => ({ ...current, [item.id]: event.target.value }))} className="w-24 rounded-lg border border-emerald-200 bg-white p-2" placeholder="0" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <label htmlFor="return-reason" className="block mt-6 mb-2 text-sm font-semibold text-slate-700">Reason *</label>
                        <textarea id="return-reason" required maxLength={2000} autoFocus rows={4} value={settlementReason} onChange={e => setSettlementReason(e.target.value)} disabled={submittingSettlement} placeholder="Explain why this stock needs a replacement or refund..." className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
                        <label htmlFor="return-photo" className="block mt-4 mb-2 text-sm font-semibold text-slate-700">Photo (optional)</label>
                        <input id="return-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectEvidence} disabled={submittingSettlement || evidenceLoading} className="w-full text-xs text-slate-500" />
                        <p className="mt-2 text-xs text-slate-400">JPG, PNG or WebP · Maximum 5 MB</p>
                        {evidenceLoading && <p className="mt-2 text-xs text-blue-600">Reading photo...</p>}
                        {evidenceImage && <img src={evidenceImage} alt="Return evidence preview" className="mt-3 max-h-48 w-full rounded-xl object-contain border border-slate-100" />}
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={closeSettlement} disabled={submittingSettlement} className="px-5 py-2.5 rounded-full bg-slate-100 text-sm font-semibold text-slate-600 disabled:opacity-50">Cancel</button>
                            <button type="submit" disabled={submittingSettlement || evidenceLoading || !settlementReason.trim() || (settlementForm.type === 'refund' && (refundItemsLoading || !!refundItemsError))} className="px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">{submittingSettlement ? 'Submitting...' : 'Submit for Review'}</button>
                        </div>
                    </form>
                </div>
            )}
        </PharmacistLayout>
    );
}