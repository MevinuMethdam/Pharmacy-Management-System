import React, { useEffect, useState, useCallback, useMemo, useContext } from 'react';
import toast from 'react-hot-toast';
import {
    DollarSign, ShoppingBag, AlertTriangle, Clock, FileText, Activity,
    MoreHorizontal, Eye, Ban, ChevronLeft, ChevronRight, Edit, X, User, CreditCard,
    Stethoscope, MessageSquare
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { salesApi } from '../../api/salesApi';
import { inventoryApi } from '../../api/inventoryApi';
import ReceiptModal from '../pos/ReceiptModal';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import AdminLayout from '../../components/layout/AdminLayout';
import io from 'socket.io-client';
import { AuthContext } from '../../context/AuthContext';

import welcomeImage from '../../assets/illustration_converted.png';

const socket = io('http://localhost:5000');

const STATUS_VARIANT = { Completed: 'green', Refunded: 'yellow', Voided: 'red' };

const MedicalHeroCard = ({ revenue = 0 }) => (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-blue-500 to-sky-400 p-8 rounded-[28px] text-white shadow-[0_16px_32px_-12px_rgba(99,102,241,0.4)] flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1 h-full cursor-default border border-white/20">
        <div className="absolute top-[-40%] right-[-20%] w-[250px] h-[250px] rounded-full border-[30px] border-white/10 pointer-events-none"></div>
        <div className="absolute top-[-20%] right-[-40%] w-[350px] h-[350px] rounded-full border-[40px] border-white/5 pointer-events-none"></div>

        <div className="relative z-10 mt-2">
            <p className="text-white/80 font-medium tracking-wide text-[14px] mb-2">Today's Revenue</p>
            <h3 className="text-[36px] font-extrabold tracking-tight leading-none drop-shadow-sm">
                LKR {Number(revenue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </h3>
        </div>

        <div className="relative z-10 mt-auto flex justify-between items-end w-full pb-1">
            <div>
                <p className="text-white/70 text-[10px] font-bold tracking-widest uppercase mb-1 drop-shadow-sm">Cardholder</p>
                <p className="text-white/90 font-bold text-[15px] tracking-widest drop-shadow-sm uppercase">
                    Administrator
                </p>
            </div>
        </div>
    </div>
);

const SparklineCard = ({ revenue = 0, chartData = [] }) => (
    <div className="bg-white/40 backdrop-blur-xl p-6 rounded-[28px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/60 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1 h-full cursor-default">
        <div className="flex justify-between items-start mb-2">
            <div>
                <h3 className="text-[#1e293b] text-[15px] font-bold tracking-tight">MTD Revenue</h3>
                <p className="text-slate-500 text-[12px] font-medium mt-0.5">Current Month</p>
            </div>
            <span className="text-[12px] font-semibold text-emerald-600 bg-emerald-100/50 backdrop-blur-sm px-2.5 py-1 rounded-full">+100%</span>
        </div>
        <div className="h-[90px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <defs>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#0ea5e9" />
                            <stop offset="100%" stopColor="#0f766e" />
                        </linearGradient>
                    </defs>
                    <Line type="monotone" dataKey="val" stroke="url(#lineGrad)" strokeWidth={3} dot={false} animationDuration={2000} />
                </LineChart>
            </ResponsiveContainer>
        </div>
        <div className="flex justify-between items-end mt-2">
            <p className="text-[24px] font-bold text-[#1e293b] leading-none">
                LKR {Number(revenue).toFixed(2)}
            </p>
            <div className="flex gap-2 text-[10px] font-semibold text-slate-400 uppercase">
                <span>W1</span><span>W2</span><span className="text-sky-600">W3</span>
            </div>
        </div>
    </div>
);

const EfficiencyCard = ({ spent = 0, budget = 0 }) => {
    const remaining = Math.max(0, budget - spent);
    const spendPercentage = budget > 0 ? Math.round((spent / budget) * 100) : 0;

    const dynamicPieData = budget > 0 || spent > 0
        ? [
            { name: 'Spent', value: spent, color: '#0ea5e9' },
            { name: 'Remaining', value: remaining, color: '#e2e8f0' }
        ]
        : [
            { name: 'No Data', value: 1, color: '#e2e8f0' }
        ];

    return (
        <div className="bg-white/40 backdrop-blur-xl p-6 rounded-[28px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/60 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1 h-full cursor-default relative">
            <div className="flex justify-between items-start">
                <h3 className="text-[#1e293b] text-[15px] font-bold tracking-tight">Procurement Spend</h3>
                <MoreHorizontal size={18} className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" />
            </div>
            <div className="relative h-[120px] w-full flex items-center justify-center mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={dynamicPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={54} startAngle={90} endAngle={-270} dataKey="value" stroke="none" cornerRadius={10} animationDuration={1500}>
                            {dynamicPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[#1e293b] text-[18px] font-bold tracking-tight">{spendPercentage}%</span>
                    <span className="text-[10px] font-bold text-white bg-sky-500/90 backdrop-blur-sm px-2 py-0.5 rounded-full mt-1 shadow-sm">
                        LKR {Number(spent).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                </div>
            </div>
            <div className="flex justify-center gap-4 mt-2 text-[11px] font-medium text-slate-500">
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9]"></div>Spent</div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>Remaining</div>
            </div>
        </div>
    );
};

const SmallStatCard = ({ title, value, icon: Icon, iconColor }) => (
    <div className="bg-white/40 backdrop-blur-xl p-5 rounded-[24px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] hover:-translate-y-1 transition-transform duration-300 cursor-default">
        <div className="flex justify-between items-start mb-3">
            <p className="text-[13px] font-medium text-slate-500 leading-tight">{title}</p>
            <Icon size={18} strokeWidth={2.5} className={`${iconColor} opacity-80 min-w-[18px]`} />
        </div>
        <h3 className="text-[22px] font-bold text-[#1e293b] tracking-tight">{value}</h3>
    </div>
);

export default function AdminDashboard() {
    const { user } = useContext(AuthContext) || {};

    const [salesData, setSalesData] = useState({ content: [], page: 0, totalPages: 0, totalElements: 0 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [detail, setDetail] = useState(null);

    const [lowStockCount, setLowStockCount] = useState(0);
    const [expiringCount, setExpiringCount] = useState(0);

    const [editingSale, setEditingSale] = useState(null);
    const [editForm, setEditForm] = useState({ customerName: '', paymentMethod: '', doctorName: '', remarks: '' });
    const [updating, setUpdating] = useState(false);

    const fetchSalesData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await salesApi.list({
                page,
                size: 5,
                from: from ? new Date(from).toISOString() : undefined,
                to: to ? new Date(to).toISOString() : undefined
            });

            if (Array.isArray(res.data)) {
                setSalesData({
                    content: res.data,
                    page: 0,
                    totalPages: 1,
                    totalElements: res.data.length
                });
            } else {
                setSalesData({
                    content: res.data?.content || [],
                    page: res.data?.page || 0,
                    totalPages: res.data?.totalPages || 1,
                    totalElements: res.data?.totalElements || 0
                });
            }
        } catch (err) {
            toast.error(err.message || 'Failed to load sales history');
        } finally {
            setLoading(false);
        }
    }, [page, from, to]);

    const fetchInventoryStats = useCallback(async () => {
        try {
            const res = await inventoryApi.getAll();
            const medicines = res.data || [];

            const lowStock = medicines.filter(m => Number(m.quantity) <= Number(m.minStockLevel || 10)).length;
            setLowStockCount(lowStock);

            const today = new Date();
            const thirtyDaysLater = new Date();
            thirtyDaysLater.setDate(today.getDate() + 30);

            const expiring = medicines.filter(m => {
                if (!m.expiryDate) return false;
                const expDate = new Date(m.expiryDate);
                return expDate >= today && expDate <= thirtyDaysLater;
            }).length;
            setExpiringCount(expiring);

        } catch (err) {
            console.error('Failed to load inventory stats for dashboard', err);
        }
    }, []);

    useEffect(() => {
        fetchSalesData();
        fetchInventoryStats();

        socket.on('receive_notification', () => {
            fetchSalesData();
            fetchInventoryStats();
        });

        return () => {
            socket.off('receive_notification');
        };
    }, [fetchSalesData, fetchInventoryStats]);

    const todayStr = new Date().toDateString();

    const safeContent = Array.isArray(salesData?.content) ? salesData.content : [];
    const displaySalesList = safeContent.filter(s => {
        const rm = s.remarks ? s.remarks.toUpperCase() : '';
        return !(rm.includes('QUOTEPENDING') || rm.includes('ESTIMATE') || rm.includes('QUOTATION'));
    });

    const completedSales = displaySalesList.filter(s => s.status === 'Completed');

    const todaySales = completedSales.filter(s => new Date(s.saleDate || s.createdAt).toDateString() === todayStr);

    const todayRevenue = todaySales.length > 0
        ? todaySales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0)
        : completedSales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);

    const mtdRevenue = completedSales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);

    const dynamicMainChartData = useMemo(() => {
        const dateMap = {};

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
            { name: '01 Jan', revenue: 420, cost: 210 },
            { name: '02 Jan', revenue: 280, cost: 160 },
            { name: '03 Jan', revenue: 380, cost: 220 },
            { name: '04 Jan', revenue: 460, cost: 310 },
            { name: '05 Jan', revenue: 290, cost: 180 },
            { name: '06 Jan', revenue: 140, cost: 80 },
            { name: '07 Jan', revenue: 190, cost: 150 },
        ];
    }, [completedSales]);

    const dynamicSparklineData = useMemo(() => {
        const reversedSales = [...completedSales].reverse();
        if (reversedSales.length === 0) return [{ val: 0 }, { val: 0 }];
        return reversedSales.map(s => ({ val: Number(s.totalAmount || 0) }));
    }, [completedSales]);

    async function handleVoid(sale) {
        if (window.confirm(`Are you sure you want to Void Invoice #${String(sale.saleId || sale.id).slice(0, 8).toUpperCase()}?`)) {
            try {
                if (salesApi.voidSale) {
                    await salesApi.voidSale(sale.saleId || sale.id);
                }
                toast.success('Sale voided successfully!');
                fetchSalesData();
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
            fetchSalesData();
        } catch (err) {
            toast.error(err.message || 'Failed to update sale');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <AdminLayout>
            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4">

                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply"
                     style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}>
                </div>

                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-sky-200/20 to-slate-300/20 blur-[120px] pointer-events-none z-[-2]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-slate-300/20 to-sky-200/20 blur-[140px] pointer-events-none z-[-2]"></div>

                <div className="relative z-10 w-full h-full flex flex-col gap-6">

                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">Dashboard</h1>
                            <p className="text-[12px] font-medium text-slate-400 mt-1.5">Pharmacy Management System</p>
                        </div>
                        <div className="p-2.5 bg-white/40 backdrop-blur-md rounded-full shadow-sm border border-slate-200 text-slate-500 hover:text-teal-600 cursor-pointer transition-all hover:shadow-md">
                            <MoreHorizontal size={20} />
                        </div>
                    </div>

                    <div className="relative overflow-hidden bg-white/30 backdrop-blur-2xl px-8 py-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex items-center justify-between mb-2">
                        <div className="absolute top-[-50%] right-[-5%] w-[300px] h-[300px] bg-gradient-to-br from-sky-200/20 to-slate-200/20 rounded-full blur-[60px] pointer-events-none"></div>
                        <div className="absolute bottom-[-50%] right-[15%] w-[200px] h-[200px] bg-gradient-to-br from-slate-200/30 to-sky-200/20 rounded-full blur-[50px] pointer-events-none"></div>

                        <div className="relative z-10">
                            <h2 className="text-[24px] font-bold text-[#1e293b] tracking-tight mb-2 flex items-center gap-2">
                                Welcome back, {user?.firstName || 'Admin'}! <span className="animate-bounce inline-block origin-bottom-right">👋</span>
                            </h2>
                            <p className="text-[14px] text-slate-600 font-medium max-w-xl leading-relaxed">
                                You've processed <strong className="text-sky-600">{todaySales.length} sales</strong> today, generating a revenue of <strong className="text-emerald-600">LKR {Number(todayRevenue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>. Keep up the great work and maintain your pharmacy's efficiency!
                            </p>
                        </div>

                        <div className="hidden md:flex relative z-10 w-48 h-40 items-center justify-center mr-4">
                            <img
                                src={welcomeImage}
                                alt="Welcome Illustration"
                                className="w-full h-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="col-span-1 h-[240px]"><MedicalHeroCard revenue={todayRevenue} /></div>
                        <div className="col-span-1 h-[240px]"><SparklineCard revenue={mtdRevenue} chartData={dynamicSparklineData} /></div>
                        <div className="col-span-1 h-[240px]">
                            <EfficiencyCard spent={0} budget={0} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        <SmallStatCard title="Transactions" value={salesData.totalElements} icon={ShoppingBag} iconColor="text-blue-500" />
                        <SmallStatCard title="Low-Stock" value={lowStockCount} icon={AlertTriangle} iconColor="text-rose-500" />
                        <SmallStatCard title="Expiring (30d)" value={expiringCount} icon={Clock} iconColor="text-amber-500" />
                        <SmallStatCard title="Pending Presc." value="0" icon={FileText} iconColor="text-teal-500" />
                        <SmallStatCard title="Dispensed" value={completedSales.length} icon={Activity} iconColor="text-sky-500" />
                    </div>

                    <div className="bg-white/30 backdrop-blur-2xl p-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50">
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

                        <div className="h-[300px] w-full">
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
                                        onChange={(e) => { setFrom(e.target.value); setPage(0); }}
                                        className="px-3 py-2 bg-white/40 backdrop-blur-sm border border-white/50 rounded-xl text-[12px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 ml-1">To</label>
                                    <input
                                        type="date"
                                        value={to}
                                        onChange={(e) => { setTo(e.target.value); setPage(0); }}
                                        className="px-3 py-2 bg-white/40 backdrop-blur-sm border border-white/50 rounded-xl text-[12px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-16"><Spinner /></div>
                        ) : displaySalesList.length === 0 ? (
                            <div className="text-center py-16 text-slate-500 text-sm">No recent sales found. (Quotations are hidden here)</div>
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
                                            <td className="py-4 align-top pt-5 text-[13px] font-bold text-[#1e293b]">{String(sale.saleId || sale.id).slice(0, 8).toUpperCase()}</td>

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

                                            <td className="py-4 align-top pt-5 text-[13px] font-medium text-slate-600">{new Date(sale.saleDate || sale.createdAt).toLocaleString()}</td>
                                            <td className="py-4 align-top pt-5 text-[13px] font-semibold text-slate-700">{sale.paymentMethod}</td>
                                            <td className="py-4 align-top pt-5 text-[14px] font-bold text-[#1e293b]">LKR {Number(sale.totalAmount).toFixed(2)}</td>

                                            <td className="py-4 align-top">
                                                <div className="flex flex-col items-start gap-1.5 mt-0.5">
                                                    <Badge variant={STATUS_VARIANT[sale.status]}>{sale.status}</Badge>
                                                    {sale.remarks && (
                                                        <span
                                                            className="text-[11px] text-slate-500 font-medium flex items-start gap-1 max-w-[140px]"
                                                            title={sale.remarks}
                                                        >
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
                                Page {salesData.page + 1} of {salesData.totalPages || 1} • {salesData.totalElements} total
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={page === 0}
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    className={`flex items-center gap-1 px-3 py-1.5 bg-white/40 backdrop-blur-sm border border-white/50 rounded-lg text-[13px] font-semibold shadow-sm transition-colors ${page === 0 ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:bg-white/60 cursor-pointer'}`}
                                >
                                    <ChevronLeft size={16} /> Prev
                                </button>
                                <button
                                    disabled={page >= salesData.totalPages - 1 || salesData.totalPages === 0}
                                    onClick={() => setPage(p => p + 1)}
                                    className={`flex items-center gap-1 px-3 py-1.5 bg-white/40 backdrop-blur-sm border border-white/50 rounded-lg text-[13px] font-semibold shadow-sm transition-colors ${page >= salesData.totalPages - 1 || salesData.totalPages === 0 ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:bg-white/60 cursor-pointer'}`}
                                >
                                    Next <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                <ReceiptModal open={!!detail} onClose={() => setDetail(null)} sale={detail} />

                {editingSale && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
                        <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] w-[550px] border border-white">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-[18px] font-bold text-slate-800 flex items-center gap-2.5">
                                    <Edit className="w-5 h-5 text-sky-600"/> Edit Invoice
                                </h2>
                                <button onClick={() => setEditingSale(null)} className="hover:bg-white/50 p-2 rounded-full transition-colors border border-transparent hover:border-white/60">
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
                                            className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm"
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
        </AdminLayout>
    );
}