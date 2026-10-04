import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CashierLayout from '../../components/layout/CashierLayout';
import { salesApi } from '../../api/salesApi';
import {
    TrendingUp, ShoppingBag, CreditCard, Activity, MoreHorizontal, CheckCircle,
    Eye, Edit, Ban, ChevronLeft, ChevronRight, User, Stethoscope, MessageSquare, X, FileText
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';
import ReceiptModal from '../pos/ReceiptModal';

export default function CashierDashboard() {
    const [recentSales, setRecentSales] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const itemsPerPage = 5;

    const [detail, setDetail] = useState(null);
    const [editingSale, setEditingSale] = useState(null);
    const [editForm, setEditForm] = useState({ customerName: '', paymentMethod: '', doctorName: '', remarks: '' });
    const [updating, setUpdating] = useState(false);

    const fetchSalesHistory = useCallback(async () => {
        try {
            const res = await salesApi.list({ page: 0, size: 500 });
            if (Array.isArray(res.data)) {
                setRecentSales(res.data);
            } else {
                setRecentSales(res.data?.content || []);
            }
        } catch (err) {
            console.error('Failed to load sales for dashboard', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSalesHistory();

        const handleStorageChange = (e) => {
            if (e.key === 'pos_new_sale') {
                fetchSalesHistory();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        const intervalId = setInterval(() => {
            fetchSalesHistory();
        }, 10000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(intervalId);
        };
    }, [fetchSalesHistory]);

    const todayStats = () => {
        const today = new Date().toLocaleDateString();
        let totalRevenue = 0;
        let totalSales = 0;

        recentSales.forEach(sale => {
            if (sale.status === 'Completed') {
                const saleDate = new Date(sale.saleDate || sale.createdAt).toLocaleDateString();
                if (saleDate === today) {
                    totalRevenue += Number(sale.totalAmount);
                    totalSales += 1;
                }
            }
        });

        return { totalRevenue, totalSales };
    };

    const { totalRevenue, totalSales } = todayStats();

    const overallStats = useMemo(() => {
        let overallRev = 0;
        let overallCount = 0;

        recentSales.forEach(sale => {
            if (sale.status === 'Completed') {
                overallRev += Number(sale.totalAmount || 0);
                overallCount += 1;
            }
        });

        return { overallRev, overallCount };
    }, [recentSales]);

    const { overallRev, overallCount } = overallStats;

    const dynamicMainChartData = useMemo(() => {
        const dateMap = {};
        const completedSales = recentSales.filter(s => s.status === 'Completed');

        completedSales.forEach(sale => {
            const dateKey = new Date(sale.saleDate || sale.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            if (!dateMap[dateKey]) {
                dateMap[dateKey] = { name: dateKey, revenue: 0, cost: 0 };
            }
            dateMap[dateKey].revenue += Number(sale.totalAmount || 0);

            let saleCost = 0;
            if (sale.items) {
                sale.items.forEach(item => {
                    saleCost += Number(item.lineTotal || 0) * 0.7;
                });
            } else {
                saleCost = Number(sale.totalAmount || 0) * 0.7;
            }
            dateMap[dateKey].cost += saleCost;
        });

        const chartData = Object.values(dateMap);
        return chartData.length > 0 ? chartData : [
            { name: 'No Data', revenue: 0, cost: 0 }
        ];
    }, [recentSales]);

    const filteredSales = useMemo(() => {
        return recentSales.filter(sale => {
            const saleDate = new Date(sale.saleDate || sale.createdAt);
            saleDate.setHours(0,0,0,0);

            const rm = sale.remarks ? sale.remarks.toUpperCase() : '';
            if (rm.includes('QUOTEPENDING') || rm.includes('ESTIMATE') || rm.includes('QUOTATION')) return false;

            const fromDate = from ? new Date(from) : null;
            if (fromDate) fromDate.setHours(0,0,0,0);
            const toDate = to ? new Date(to) : null;
            if (toDate) toDate.setHours(0,0,0,0);

            if (fromDate && saleDate < fromDate) return false;
            if (toDate && saleDate > toDate) return false;
            return true;
        });
    }, [recentSales, from, to]);

    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const displaySalesList = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    async function handleVoid(sale) {
        if (window.confirm(`Are you sure you want to Void Invoice #${String(sale.saleId || sale.id).slice(0, 8).toUpperCase()}?`)) {
            try {
                if (salesApi.voidSale) {
                    await salesApi.voidSale(sale.saleId || sale.id);
                }
                toast.success('Sale voided successfully!');
                fetchSalesHistory();
                localStorage.setItem('pos_new_sale', Date.now().toString());
            } catch (err) {
                toast.error(err.message || 'Failed to void sale');
            }
        }
    }

    const handleOpenEdit = (sale) => {
        setEditingSale(sale);
        setEditForm({
            customerName: sale.customerName || '',
            paymentMethod: sale.paymentMethod || 'Cash',
            doctorName: sale.doctorName || '',
            remarks: sale.remarks || ''
        });
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            if (salesApi.updateSale) {
                await salesApi.updateSale(editingSale.saleId || editingSale.id, editForm);
            }
            toast.success(`Invoice ${String(editingSale.saleId || editingSale.id).slice(0, 8).toUpperCase()} updated successfully!`);
            setEditingSale(null);
            fetchSalesHistory();
            localStorage.setItem('pos_new_sale', Date.now().toString());
        } catch (err) {
            toast.error(err.message || 'Failed to update sale');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <CashierLayout>
            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4">

                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply"
                     style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}>
                </div>
                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-blue-200/20 to-slate-300/20 blur-[120px] pointer-events-none z-[-2]"></div>

                <div className="relative z-10 w-full h-full flex flex-col gap-6 pb-2">

                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">Cashier Dashboard</h1>
                            <p className="text-[12px] font-medium text-slate-400 mt-1.5">Overview of your daily sales and terminal performance</p>
                        </div>
                        <div className="p-2.5 bg-white/40 backdrop-blur-md rounded-full shadow-sm border border-slate-200 text-slate-500 hover:text-blue-600 cursor-pointer transition-all hover:shadow-md">
                            <MoreHorizontal size={20} />
                        </div>
                    </div>

                    <div className="relative w-full bg-white/60 backdrop-blur-2xl rounded-[28px] border border-white/80 shadow-[0_12px_40px_-12px_rgba(148,163,184,0.45)] p-8 md:p-10 overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-white/70 transition-colors duration-500">

                        <div className="absolute top-0 right-0 w-[55%] h-full pointer-events-none opacity-90"
                             style={{
                                 backgroundImage: "url('https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&q=80&w=1200')",
                                 backgroundSize: 'cover',
                                 backgroundPosition: 'center',
                                 maskImage: 'linear-gradient(to right, transparent, black 60%)',
                                 WebkitMaskImage: 'linear-gradient(to right, transparent, black 60%)'
                             }}>
                        </div>

                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-blue-200/20 blur-[50px] pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-48 h-48 rounded-full bg-emerald-200/20 blur-[40px] pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col gap-2.5">
                            <h2 className="text-2xl md:text-[28px] font-bold text-slate-800 tracking-tight">
                                Ready for a great shift? 👋
                            </h2>
                            <p className="text-slate-500 font-medium text-[14px] max-w-md leading-relaxed">
                                Your terminal is perfectly synced and online. Keep up the great work and let's make today a productive day.
                            </p>
                        </div>

                        <div className="relative z-10 flex items-center gap-4 bg-white/85 backdrop-blur-md px-6 py-4 rounded-[22px] border border-white shadow-sm shrink-0">
                            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100/60 border border-emerald-200/50 text-emerald-600 shadow-inner">
                                <CheckCircle size={24} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-[15px] tracking-tight">Register Open</span>
                                <span className="flex items-center gap-1.5 text-[12px] text-slate-500 font-semibold mt-0.5">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    System Optimal
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/40 backdrop-blur-2xl rounded-[32px] border border-white/70 shadow-[0_12px_40px_-12px_rgba(148,163,184,0.3)] p-8 my-2 flex flex-col md:flex-row items-center justify-around gap-10">

                        <div className="relative w-56 h-56 flex items-center justify-center shrink-0">
                            <div className="absolute inset-0 bg-[#7c83c2]/70 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] animate-[spin_10s_linear_infinite] mix-blend-multiply blur-[1px] transition-all"></div>
                            <div className="absolute inset-0 bg-[#9fb3d4]/80 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] animate-[spin_12s_linear_infinite_reverse] mix-blend-multiply blur-[1px] transition-all"></div>
                            <div className="relative z-10 w-40 h-40 bg-white rounded-full flex flex-col items-center justify-center shadow-xl border-[5px] border-white">
                                <span className="text-[56px] leading-none font-bold text-[#1e293b] tracking-tight">{overallCount}</span>
                                <span className="text-[12px] font-bold text-slate-400 uppercase text-center mt-2 px-4 leading-relaxed tracking-widest border-t border-slate-100 pt-2">Total<br/>Bills</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6 w-full max-w-md justify-center">
                            <div className="flex items-center gap-6">
                                <span className="text-[28px] font-black italic text-[#7c83c2] w-24 text-right tracking-tight">LKR</span>
                                <div className="flex-1">
                                    <h4 className="text-[14px] font-black italic text-[#1e293b] tracking-widest uppercase">Total Revenue</h4>
                                    <p className="text-[11px] font-bold italic text-slate-400 uppercase mt-1">{overallRev.toFixed(2)} Total Earned</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className="text-[28px] font-black italic text-[#e48bb5] w-24 text-right tracking-tight">AVG</span>
                                <div className="flex-1">
                                    <h4 className="text-[14px] font-black italic text-[#1e293b] tracking-widest uppercase">Bill Value</h4>
                                    <p className="text-[11px] font-bold italic text-slate-400 uppercase mt-1">LKR {(overallCount > 0 ? (overallRev / overallCount) : 0).toFixed(2)} Per Bill</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className="text-[28px] font-black italic text-[#8799c7] w-24 text-right tracking-tight">{recentSales.length}</span>
                                <div className="flex-1">
                                    <h4 className="text-[14px] font-black italic text-[#1e293b] tracking-widest uppercase">Records</h4>
                                    <p className="text-[11px] font-bold italic text-slate-400 uppercase mt-1">Total Sales Synced</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className="text-[28px] font-black italic text-[#e48bb5] w-24 text-right tracking-tight">100%</span>
                                <div className="flex-1">
                                    <h4 className="text-[14px] font-black italic text-[#1e293b] tracking-widest uppercase">Uptime</h4>
                                    <p className="text-[11px] font-bold italic text-slate-400 uppercase mt-1">System Active</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-[28px] p-6 shadow-[0_4px_20px_-4px_rgba(148,163,184,0.15)] flex flex-col justify-between gap-4 transition-transform hover:-translate-y-1 min-h-[130px]">
                            <div className="flex items-center justify-between w-full">
                                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Today's Revenue</span>
                                <CreditCard size={18} className="text-emerald-500" />
                            </div>
                            <span className="text-[28px] font-black text-[#1e293b] tracking-tight">LKR {totalRevenue.toFixed(2)}</span>
                        </div>

                        <div className="bg-white rounded-[28px] p-6 shadow-[0_4px_20px_-4px_rgba(148,163,184,0.15)] flex flex-col justify-between gap-4 transition-transform hover:-translate-y-1 min-h-[130px]">
                            <div className="flex items-center justify-between w-full">
                                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Bills Processed</span>
                                <ShoppingBag size={18} className="text-blue-500" />
                            </div>
                            <span className="text-[28px] font-black text-[#1e293b] tracking-tight">{totalSales} <span className="text-[14px] font-bold text-slate-400">Bills</span></span>
                        </div>

                        <div className="bg-white rounded-[28px] p-6 shadow-[0_4px_20px_-4px_rgba(148,163,184,0.15)] flex flex-col justify-between gap-4 transition-transform hover:-translate-y-1 min-h-[130px]">
                            <div className="flex items-center justify-between w-full">
                                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Terminal Status</span>
                                <Activity size={18} className="text-indigo-500" />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                <span className="text-[16px] font-black text-emerald-600 tracking-tight">Active & Syncing</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/30 backdrop-blur-2xl p-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex flex-col gap-2 mt-2">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-[17px] font-bold text-[#1e293b] tracking-tight">Payment Analytics</h2>
                                <p className="text-[13px] text-slate-500 mt-0.5 font-medium">Real-time daily revenue and expenditure breakdown</p>
                            </div>
                            <div className="flex items-center gap-4 text-[12px] font-medium text-slate-500">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0ea5e9]"></div>Revenue</div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#99f6e4]"></div>Cost</div>
                            </div>
                        </div>

                        <div className="h-[300px] w-full mt-4">
                            {loading ? (
                                <div className="h-full flex items-center justify-center text-slate-500 font-medium">Loading chart data...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dynamicMainChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }} barGap={6}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff" opacity={0.4} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={15} />
                                        <YAxis width={65} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dx={-5} />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.2)' }} contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255,255,255,0.6)', boxShadow: '0 12px 32px -8px rgba(0,0,0,0.08)', fontSize: '13px', fontWeight: '600', color: '#1e293b', padding: '10px 14px' }} />
                                        <Bar dataKey="revenue" fill="#0ea5e9" radius={[8, 8, 8, 8]} barSize={12} animationDuration={1500} />
                                        <Bar dataKey="cost" fill="#99f6e4" radius={[8, 8, 8, 8]} barSize={12} animationDuration={1500} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 overflow-hidden flex flex-col mt-4">

                        <div className="p-8 pb-6 border-b border-white/30 flex flex-wrap gap-6 items-end justify-between">
                            <div>
                                <h2 className="text-[18px] font-bold text-[#1e293b] tracking-tight">Recent Sales History</h2>
                                <p className="text-[13px] text-slate-500 mt-0.5 font-medium">Live transactions directly from database</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">From</label>
                                    <input
                                        type="date"
                                        value={from}
                                        onChange={(e) => { setFrom(e.target.value); setCurrentPage(1); }}
                                        className="px-3 py-2 bg-white/40 backdrop-blur-sm border border-white/50 rounded-xl text-[12px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">To</label>
                                    <input
                                        type="date"
                                        value={to}
                                        onChange={(e) => { setTo(e.target.value); setCurrentPage(1); }}
                                        className="px-3 py-2 bg-white/40 backdrop-blur-sm border border-white/50 rounded-xl text-[12px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-16 text-slate-500 text-sm font-medium">Loading sales history...</div>
                        ) : displaySalesList.length === 0 ? (
                            <div className="text-center py-16 text-slate-500 text-sm">No recent sales found.</div>
                        ) : (
                            <div className="overflow-x-auto px-8 py-4">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                    <tr>
                                        <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Sale #</th>
                                        <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Customer</th>
                                        <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Date</th>
                                        <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Payment</th>
                                        <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Total</th>
                                        <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Status</th>
                                        <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 text-right">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {displaySalesList.map((sale) => (
                                        <tr key={sale.saleId || sale.id} className="group hover:bg-white/20 transition-colors border-b border-white/20 last:border-0">
                                            <td className="py-4 align-top pt-5 text-[13px] font-bold text-[#1e293b]">
                                                {String(sale.saleId || sale.id).slice(0, 8).toUpperCase()}
                                            </td>

                                            <td className="py-4 align-top">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="text-[14px] font-semibold text-slate-700 mt-0.5">
                                                        {sale.customerName || 'Walk-in Customer'}
                                                    </span>
                                                    {sale.doctorName && (
                                                        <span className="text-[11px] text-sky-600 font-medium flex items-center gap-1">
                                                            <Stethoscope size={11} className="min-w-[11px]" /> Dr. {sale.doctorName}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="py-4 align-top pt-5 text-[13px] font-medium text-slate-600">
                                                {new Date(sale.saleDate || sale.createdAt).toLocaleString()}
                                            </td>

                                            <td className="py-4 align-top pt-5 text-[13px] font-semibold text-slate-700">
                                                <span className="px-3 py-1 bg-white/60 border border-white/80 text-slate-700 rounded-lg text-[11px] font-bold shadow-sm">
                                                    {sale.paymentMethod}
                                                </span>
                                            </td>

                                            <td className="py-4 align-top pt-5 text-[14px] font-bold text-[#1e293b]">
                                                LKR {Number(sale.totalAmount).toFixed(2)}
                                            </td>

                                            <td className="py-4 align-top">
                                                <div className="flex flex-col items-start gap-1.5 mt-0.5">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm ${
                                                        sale.status === 'Completed' ? 'bg-white border border-emerald-200 text-emerald-600' :
                                                            sale.status === 'Refunded' ? 'bg-amber-50 border border-amber-200 text-amber-600' :
                                                                'bg-rose-50/50 border border-rose-100 text-rose-600'
                                                    }`}>
                                                        {sale.status}
                                                    </span>
                                                    {sale.remarks && (
                                                        <span className="text-[11px] text-slate-500 font-medium flex items-start gap-1 max-w-[140px]" title={sale.remarks}>
                                                            <MessageSquare size={11} className="min-w-[11px] mt-[2px] text-slate-400" />
                                                            <span className="truncate">{sale.remarks}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="py-4 align-top pt-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100/50 rounded-lg transition-colors cursor-pointer"
                                                        onClick={() => setDetail(sale)}
                                                        title="View receipt"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    {sale.status === 'Completed' && (
                                                        <button
                                                            className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-100/50 rounded-lg transition-colors cursor-pointer"
                                                            onClick={() => handleOpenEdit(sale)}
                                                            title="Edit Sale"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {sale.status === 'Completed' && (
                                                        <button
                                                            className="flex items-center gap-1 px-2.5 py-1 bg-rose-50/80 text-rose-600 hover:bg-rose-100/90 rounded-lg text-[11px] font-bold uppercase transition-colors cursor-pointer border border-rose-100/50"
                                                            onClick={() => handleVoid(sale)}
                                                        >
                                                            <Ban className="w-3.5 h-3.5" /> Void
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="p-6 px-8 border-t border-white/30 bg-white/10 flex justify-between items-center rounded-b-[32px]">
                            <p className="text-[13px] font-medium text-slate-600">
                                Page {currentPage} of {totalPages || 1} • {filteredSales.length} total
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className={`flex items-center gap-1 px-3 py-1.5 bg-white/40 backdrop-blur-sm border border-white/50 rounded-lg text-[13px] font-semibold shadow-sm transition-colors ${currentPage === 1 ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:bg-white/60 cursor-pointer'}`}
                                >
                                    <ChevronLeft size={16} /> Prev
                                </button>
                                <button
                                    disabled={currentPage >= totalPages || totalPages === 0}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className={`flex items-center gap-1 px-3 py-1.5 bg-white/40 backdrop-blur-sm border border-white/50 rounded-lg text-[13px] font-semibold shadow-sm transition-colors ${currentPage >= totalPages || totalPages === 0 ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:bg-white/60 cursor-pointer'}`}
                                >
                                    Next <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                <ReceiptModal open={!!detail} onClose={() => setDetail(null)} sale={detail} />

                {editingSale && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] w-full max-w-[550px] border border-white">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-[18px] font-bold text-slate-800 flex items-center gap-2.5">
                                    <Edit className="w-5 h-5 text-sky-600"/> Edit Invoice
                                </h2>
                                <button onClick={() => setEditingSale(null)} className="hover:bg-white/50 p-2 rounded-full transition-colors border border-transparent hover:border-white/60 cursor-pointer">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="mb-6 p-4 bg-white/50 rounded-2xl border border-white/60 shadow-sm">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Invoice ID</p>
                                <p className="text-[14px] font-mono font-bold text-slate-800">{String(editingSale.saleId || editingSale.id).slice(0, 8).toUpperCase()}</p>
                            </div>

                            <form onSubmit={handleUpdateSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><User size={14}/> Customer Name</label>
                                        <input
                                            type="text"
                                            placeholder="Walk-in Customer"
                                            className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm"
                                            value={editForm.customerName}
                                            onChange={(e) => setEditForm({...editForm, customerName: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Stethoscope size={14}/> Doctor Name</label>
                                        <input
                                            type="text"
                                            placeholder="Optional"
                                            className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm"
                                            value={editForm.doctorName}
                                            onChange={(e) => setEditForm({...editForm, doctorName: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><CreditCard size={14}/> Payment Method</label>
                                        <select
                                            className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm cursor-pointer"
                                            value={editForm.paymentMethod}
                                            onChange={(e) => setEditForm({...editForm, paymentMethod: e.target.value})}
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="Card">Card</option>
                                            <option value="Split">Split</option>
                                            <option value="Insurance">Insurance</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><MessageSquare size={14}/> Remarks (Reason)</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Reason for edit..."
                                            className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm"
                                            value={editForm.remarks}
                                            onChange={(e) => setEditForm({...editForm, remarks: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="w-full mt-4 bg-sky-500/90 backdrop-blur-md text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(2,132,199,0.3)] hover:bg-sky-600 transition-all active:scale-[0.98] text-[15px] disabled:opacity-50 cursor-pointer border border-sky-400/50"
                                >
                                    {updating ? 'Updating...' : 'Update Invoice'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </CashierLayout>
    );
}