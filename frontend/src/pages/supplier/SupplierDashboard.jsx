import React, { useContext, useEffect, useState, useLayoutEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
    Truck, LogOut, Package, DollarSign, Clock, CheckCircle,
    Building2, Mail, LayoutDashboard, Receipt, CreditCard,
    Box, UserCircle, ChevronRight, ChevronLeft, Calendar, AlertCircle,
    Search, MapPin, Phone, Banknote, Eye, X, FileText, Bell, User, AlertTriangle, ArrowRightLeft, Archive, Download
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import supplierBanner from '../../assets/supplier.png';
import profileImg from '../../assets/profile.png';
import logo from '../../assets/logo.png';

const socket = io('http://localhost:5000');

export default function SupplierDashboard() {
    const { logout, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const mySupplierId = user?.supplierId || user?.id;

    const [activeTab, setActiveTab] = useState('dashboard');
    const [purchases, setPurchases] = useState([]);
    const [payments, setPayments] = useState([]);
    const [products, setProducts] = useState([]);
    const [returns, setReturns] = useState([]);
    const [supplierInfo, setSupplierInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const [viewingReceipt, setViewingReceipt] = useState(null);
    const [accepting, setAccepting] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);

    const navRef = useRef(null);

    useLayoutEffect(() => {
        const savedScrollPos = sessionStorage.getItem('supplierSidebarScrollPos');
        if (savedScrollPos && navRef.current) {
            navRef.current.scrollTop = parseInt(savedScrollPos, 10);
        }
    }, []);

    const handleNavScroll = (e) => {
        sessionStorage.setItem('supplierSidebarScrollPos', e.target.scrollTop);
    };

    const handleSupplierLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('/supplier/login');
    };

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const res = await axios.get('http://localhost:5000/api/notifications', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const myNotifs = res.data.filter(n => n.target === 'supplier' && (!n.supplierId || String(n.supplierId) === String(mySupplierId)));
                    setNotifications(myNotifs);
                    setUnreadCount(myNotifs.length);
                }
            } catch (err) {
                console.error("Failed to load notifications", err);
            }
        };
        if (mySupplierId) fetchNotifs();

        socket.on('receive_notification', (data) => {
            if (data.target === 'supplier' && (!data.supplierId || String(data.supplierId) === String(mySupplierId))) {
                setNotifications((prev) => [data, ...prev]);
                setUnreadCount((prev) => prev + 1);

                if (data.type === 'warning' || data.title.includes('Return') || data.title.includes('Low Stock')) {
                    toast.custom((t) => (
                        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black/5`}>
                            <div className="flex-1 w-0 p-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 pt-0.5">
                                        <Bell className="h-10 w-10 text-blue-500" />
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <p className="text-[14px] font-bold text-slate-800">{data.title}</p>
                                        <p className="mt-1 text-[12px] text-slate-500">{data.message}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ), { duration: 5000, position: 'top-right' });
                }
            }
        });

        return () => {
            socket.off('receive_notification');
        };
    }, [mySupplierId]);

    useEffect(() => {
        if (mySupplierId) {
            fetchPortalData();
        } else {
            toast.error("Supplier Identification Error. Please re-login.");
        }
    }, [mySupplierId]);

    const fetchPortalData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            const purRes = await axios.get('http://localhost:5000/api/purchases/my-purchases', config).catch(() => ({ data: [] }));
            setPurchases(purRes.data || []);

            const payRes = await axios.get('http://localhost:5000/api/supplier-payments', config).catch(() => ({ data: [] }));
            const allPayments = payRes.data || [];
            setPayments(allPayments.filter(p => String(p.supplierId) === String(mySupplierId)));

            const prodRes = await axios.get('http://localhost:5000/api/medicines', config).catch(() => ({ data: [] }));
            const allProducts = prodRes.data || [];
            setProducts(allProducts.filter(m => String(m.supplierId) === String(mySupplierId)));

            const retRes = await axios.get('http://localhost:5000/api/returns/history', config).catch(() => ({ data: [] }));
            const allReturns = retRes.data || [];
            setReturns(allReturns.filter(r => {
                if (r.supplierId) return String(r.supplierId) === String(mySupplierId);
                const relatedMed = allProducts.find(m => m.name === r.medicineName);
                return relatedMed ? String(relatedMed.supplierId) === String(mySupplierId) : false;
            }));

            const supRes = await axios.get('http://localhost:5000/api/suppliers', config).catch(() => ({ data: [] }));
            const allSuppliers = supRes.data || [];
            const myInfo = allSuppliers.find(s => String(s.id) === String(mySupplierId));

            setSupplierInfo(myInfo || null);

        } catch (err) {
            console.error(err);
            toast.error('Failed to load portal data');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptPayment = async (paymentId) => {
        if (!window.confirm("Are you sure you want to accept this payment? This will update your current outstanding balance.")) return;

        setAccepting(true);
        try {
            const token = localStorage.getItem('token');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            await axios.put(`http://localhost:5000/api/supplier-payments/${paymentId}/accept`, {}, config);

            toast.success("Payment Accepted! Outstanding balance updated. 🎉");
            setViewingReceipt(null);
            fetchPortalData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to accept payment.");
        } finally {
            setAccepting(false);
        }
    };

    const handleRejectPayment = async (paymentId) => {
        if (!rejectionReason.trim()) {
            toast.error("Please enter a reason for rejecting the payment.");
            return;
        }
        if (!window.confirm("Are you sure you want to reject this payment receipt?")) return;

        setRejecting(true);
        try {
            const token = localStorage.getItem('token');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            await axios.put(`http://localhost:5000/api/supplier-payments/${paymentId}/reject`, { reason: rejectionReason }, config);

            toast.error("Payment Rejected. Admin has been notified.");
            setViewingReceipt(null);
            setShowRejectInput(false);
            setRejectionReason('');
            fetchPortalData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to reject payment.");
        } finally {
            setRejecting(false);
        }
    };

    const markAsRead = async () => {
        setIsDropdownOpen(!isDropdownOpen);
        if (unreadCount > 0) {
            try {
                setUnreadCount(0);
            } catch(e) {
                console.error("Failed to mark as read");
            }
        }
    };

    const handleGenerateReport = (moduleName) => {
        toast.success(`${moduleName} Report generation started...`);
    };

    const totalOutstanding = supplierInfo?.totalOutstanding || 0;
    const isAccountInactive = supplierInfo?.status === 'Inactive';
    const totalRevenue = purchases.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
    const supplierDebitNotes = returns.filter(r => r.actionType === 'Return to Supplier');
    const totalDebitNotes = supplierDebitNotes.reduce((acc, curr) => acc + Number(curr.totalValue || 0), 0);

    const allTransactions = [
        ...payments.map(p => ({
            id: `pay_${p.id}`,
            date: p.paymentDate,
            type: 'Payment Received',
            details: p.notes || 'Direct Payment',
            amount: Number(p.amount),
            isDeduction: false,
            status: p.status || 'Accepted'
        })),
        ...supplierDebitNotes.map(r => ({
            id: `ret_${r.id}`,
            date: r.createdAt,
            type: 'Refund Deduction',
            details: `${r.medicineName} (Batch: ${r.batchNumber || 'N/A'}) - ${r.reason || 'Returned'}`,
            amount: Number(r.totalValue),
            isDeduction: true,
            status: r.status
        }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const collectionRate = totalRevenue > 0 ? (((totalRevenue - totalOutstanding) / totalRevenue) * 100).toFixed(0) : 0;
    const gaugeData = [
        { name: 'Collected', value: Number(collectionRate) },
        { name: 'Pending', value: 100 - Number(collectionRate) }
    ];
    const finalGaugeData = totalRevenue > 0 ? gaugeData : [{ name: 'Collected', value: 0 }, { name: 'Pending', value: 100 }];
    const COLORS = ['#3b82f6', '#e2e8f0'];

    const hasData = purchases && purchases.length > 0;

    const areaChartData = purchases.slice(0, 12).reverse().map(p => ({
        name: p.invoiceNumber ? p.invoiceNumber.substring(p.invoiceNumber.length - 4) : 'N/A',
        amount: Number(p.totalAmount || 0)
    }));

    const barChartData = purchases.slice(0, 8).reverse().map(p => ({
        name: new Date(p.invoiceDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        value: Number(p.totalAmount || 0)
    }));

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'orders', label: 'Orders & GRNs', icon: Receipt },
        { id: 'returns', label: 'Returns (Debit Notes)', icon: Archive },
        { id: 'products', label: 'My Products', icon: Box },
        { id: 'profile', label: 'Company Profile', icon: Building2 },
    ];

    const formattedDate = React.useMemo(() => {
        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'short' });
        const year = d.getFullYear();
        const weekday = d.toLocaleString('en-US', { weekday: 'long' });
        return `${day} ${month} ${year}, ${weekday}`;
    }, []);

    const filteredPurchases = purchases.filter(p =>
        p.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.grnNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredReturns = supplierDebitNotes.filter(r =>
        r.medicineName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pageVariants = {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
        exit: { opacity: 0, y: -15, transition: { duration: 0.2, ease: "easeIn" } }
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden relative z-0">

            <div
                className="absolute inset-0 z-0 pointer-events-none opacity-[0.02]"
                style={{
                    backgroundImage: `url(${logo})`,
                    backgroundSize: '250px',
                    backgroundRepeat: 'repeat',
                    backgroundPosition: 'center'
                }}
            />

            <aside
                className={`relative my-4 ml-4 h-[calc(100vh-32px)] bg-white rounded-[32px] border border-slate-200 transition-all duration-300 ease-in-out flex flex-col flex-shrink-0 z-40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] ${
                    isCollapsed ? 'w-24' : 'w-72'
                }`}
            >
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3.5 top-10 bg-white border border-slate-200 rounded-full p-1.5 shadow-sm hover:bg-slate-50 transition-all z-50 hover:scale-110 cursor-pointer flex items-center justify-center text-slate-400 hover:text-blue-600"
                >
                    {isCollapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronLeft size={18} strokeWidth={2.5} />}
                </button>

                <div className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-8'} mb-8 mt-8 transition-all duration-300`}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap transition-opacity duration-300 w-full">
                            <img src={logo} alt="Ph4Life Logo" className="w-10 h-10 object-contain drop-shadow-sm shrink-0" />
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-1.5 pb-0.5">
                                    <span className="text-[20px] font-bold text-slate-700 tracking-tight">Supplier</span>
                                    <span className="text-[20px] font-extrabold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent tracking-tight pr-1 pb-1">Portal</span>
                                </div>
                                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-[0.15em] ml-0.5">Ph4Life Network</p>
                            </div>
                        </div>
                    )}
                    {isCollapsed && (
                        <img src={logo} alt="Ph4Life Logo" className="w-9 h-9 object-contain drop-shadow-sm" />
                    )}
                </div>

                <nav
                    ref={navRef}
                    onScroll={handleNavScroll}
                    className="space-y-1.5 px-4 flex-1 overflow-y-auto hide-scrollbar relative z-10"
                >
                    {navItems.map(({ id, label, icon: Icon }) => {
                        const isActive = activeTab === id;
                        return (
                            <button
                                key={id}
                                onClick={() => { setActiveTab(id); setSearchQuery(''); }}
                                title={isCollapsed ? label : ""}
                                className={`flex items-center w-full ${isCollapsed ? 'justify-center' : 'gap-3.5 px-5'} py-3.5 rounded-2xl text-[14px] font-bold transition-all duration-200 group cursor-pointer ${
                                    isActive
                                        ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
                                }`}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${!isCollapsed && 'group-hover:scale-110'} ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                {!isCollapsed && (
                                    <span className="whitespace-nowrap">{label}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto border-t border-slate-100 flex flex-col gap-2 relative z-10">
                    <button
                        onClick={handleSupplierLogout}
                        title="Logout"
                        className={`flex items-center justify-center gap-2 w-full py-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 hover:text-rose-700 transition-colors font-bold text-[14px] cursor-pointer border border-rose-100/50 ${isCollapsed ? 'px-0' : 'px-4'}`}
                    >
                        <LogOut size={18} strokeWidth={2.5} />
                        {!isCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden relative z-10">

                <div className="flex justify-between items-center px-8 pt-6 pb-2 z-30 bg-transparent">
                    <div className="hidden md:block">
                        <span className="text-[13px] font-bold text-slate-400 tracking-wide bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm border border-slate-200/50">
                            {formattedDate}
                        </span>
                    </div>

                    <div className="flex items-center gap-5 ml-auto">
                        <div className="relative">
                            <button
                                onClick={markAsRead}
                                className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm flex items-center justify-center hover:bg-white transition-all relative cursor-pointer text-slate-500 hover:text-blue-600"
                            >
                                <Bell size={18} strokeWidth={2.5} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white"></span>
                                    </span>
                                )}
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_12px_40px_-10px_rgba(15,23,42,0.15)] border border-slate-200 overflow-hidden z-50">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shadow-sm">{notifications.length} Alerts</span>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="p-6 text-center text-sm text-slate-400 font-medium">No new notifications</div>
                                        ) : (
                                            notifications.map((note) => {
                                                let iconColor = 'text-blue-500';
                                                let bgColor = 'bg-blue-50';
                                                let Icon = Bell;

                                                if(note.title.includes('Low Stock')) { iconColor = 'text-orange-500'; bgColor = 'bg-orange-50'; Icon = AlertTriangle; }
                                                if(note.title.includes('Return') || note.title.includes('Debit')) { iconColor = 'text-rose-500'; bgColor = 'bg-rose-50'; Icon = ArrowRightLeft; }

                                                return (
                                                    <div key={note.id || Math.random()} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 items-start">
                                                        <div className={`p-2 rounded-full ${bgColor} ${iconColor} shrink-0 mt-0.5`}>
                                                            <Icon size={14} strokeWidth={2.5}/>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-700 mb-1 leading-tight">{note.title}</p>
                                                            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{note.message}</p>
                                                            <p className="text-[9px] text-slate-400 mt-2 font-bold">{new Date(note.time || note.createdAt).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setIsProfileOpen(true)}
                            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm flex items-center justify-center cursor-pointer hover:bg-white hover:text-blue-600 text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                            <User size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 pb-8 pt-2 relative custom-scrollbar">

                    {isAccountInactive && (
                        <div className="mb-6 bg-rose-500 text-white p-4 rounded-2xl flex items-center gap-4 shadow-lg shadow-rose-500/20 relative z-20">
                            <AlertTriangle size={28} className="text-white flex-shrink-0" />
                            <div>
                                <h3 className="font-bold text-[16px]">Account Suspended / Inactive</h3>
                                <p className="text-[13px] font-medium opacity-90 mt-0.5">Your portal access is currently restricted. You cannot accept or reject payments at this time. Please contact Kegalle Ph4Life administration.</p>
                            </div>
                        </div>
                    )}

                    <AnimatePresence mode="wait">

                        {activeTab === 'dashboard' && (
                            <motion.div
                                key="dashboard"
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="space-y-6 max-w-7xl mx-auto pb-10 relative z-20"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                                    <div className="lg:col-span-5 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-sky-500/10 p-6 rounded-[32px] border border-white shadow-sm flex flex-col justify-between h-[220px] relative overflow-hidden backdrop-blur-md">
                                        <div className="z-10">
                                            <p className="text-[12px] font-bold text-slate-500 mb-1">Welcome back,</p>
                                            <h2 className="text-[26px] font-extrabold text-slate-800 mb-2">{supplierInfo?.companyName || user?.name}</h2>
                                            <p className="text-[13px] font-medium text-slate-600 max-w-[200px]">Glad to see you again! Review your distributor metrics securely.</p>
                                        </div>
                                        <button onClick={() => setActiveTab('orders')} className="z-10 text-[12px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-auto w-max bg-white/50 px-3 py-1.5 rounded-full backdrop-blur-sm transition-all hover:bg-white">
                                            Tap to view orders <ChevronRight size={14}/>
                                        </button>
                                        <img src={supplierBanner} alt="Supplier Banner" className="absolute -right-4 -bottom-4 h-[160px] object-contain drop-shadow-md opacity-90 z-0 pointer-events-none" />
                                    </div>

                                    <div className="lg:col-span-3 bg-white/90 backdrop-blur-md p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col items-center justify-between h-[220px]">
                                        <div className="w-full">
                                            <h3 className="text-[14px] font-bold text-slate-800 mb-1">Collection Rate</h3>
                                            <p className="text-[11px] text-slate-400">From total revenue</p>
                                        </div>

                                        <div className="relative w-[130px] h-[130px] flex items-center justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={finalGaugeData}
                                                        cx="50%"
                                                        cy="50%"
                                                        startAngle={225}
                                                        endAngle={-45}
                                                        innerRadius={45}
                                                        outerRadius={60}
                                                        dataKey="value"
                                                        stroke="none"
                                                        cornerRadius={20}
                                                    >
                                                        {finalGaugeData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center mt-2">
                                                <span className="text-[26px] font-bold text-slate-800 leading-none">{collectionRate}%</span>
                                                <span className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-wider">Collected</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-4 bg-white/90 backdrop-blur-md p-5 rounded-[32px] border border-slate-200 shadow-sm flex flex-col h-[220px]">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="text-[14px] font-bold text-slate-800">Financial Tracking</h3>
                                            <button className="text-slate-400 hover:text-slate-600"><Eye size={16}/></button>
                                        </div>

                                        <div className="flex items-center justify-between flex-1">
                                            <div className="space-y-2.5 flex-1 pr-2">
                                                <div className="bg-slate-50/80 px-4 py-2.5 rounded-[20px] border border-slate-100">
                                                    <p className="text-[11px] font-bold text-slate-400 mb-0.5 uppercase">Pending Dues</p>
                                                    <p className="text-[17px] font-bold text-slate-800 leading-none">LKR {(totalOutstanding/1000).toFixed(1)}k</p>
                                                </div>
                                                <div className="bg-rose-50/50 px-4 py-2.5 rounded-[20px] border border-rose-100/50">
                                                    <p className="text-[11px] font-bold text-slate-400 mb-0.5 uppercase">Debit Notes</p>
                                                    <p className="text-[17px] font-bold text-rose-600 leading-none">LKR {(totalDebitNotes/1000).toFixed(1)}k</p>
                                                </div>
                                            </div>

                                            <div className="relative w-[100px] h-[100px] flex items-center justify-center shrink-0">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={[{value: totalRevenue > 0 ? totalRevenue : 1}]}
                                                            cx="50%" cy="50%"
                                                            innerRadius={36} outerRadius={48}
                                                            dataKey="value" stroke="none" fill={totalRevenue > 0 ? "#10b981" : "#e2e8f0"}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-[10px] text-slate-400 font-bold mb-0.5">Revenue</span>
                                                    <span className="text-[15px] font-bold text-slate-800 leading-none">{(totalRevenue/1000).toFixed(0)}k</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                                    <div className="lg:col-span-7 bg-white/90 backdrop-blur-md p-6 rounded-[32px] border border-slate-200 shadow-sm h-[380px] flex flex-col relative">
                                        <div className="mb-4">
                                            <h3 className="text-[16px] font-bold text-slate-800 flex items-center gap-2">
                                                Revenue Overview
                                            </h3>
                                            <p className="text-[12px] font-medium text-blue-500 mt-1">Based on recent GRNs</p>
                                        </div>
                                        <div className="w-full h-[260px] relative">
                                            {!hasData && (
                                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl">
                                                    <span className="text-[13px] font-bold text-slate-500 bg-white px-5 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-2">
                                                        <AlertCircle size={16} className="text-slate-400"/> No data available yet
                                                    </span>
                                                </div>
                                            )}
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(value) => `${(value/1000)}k`} />
                                                    <RechartsTooltip
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                        labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                                        itemStyle={{ fontWeight: 'bold', color: '#3b82f6' }}
                                                    />
                                                    <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-5 bg-white/90 backdrop-blur-md p-6 rounded-[32px] border border-slate-200 shadow-sm h-[380px] flex flex-col justify-between relative">
                                        <div className="w-full h-[180px] relative">
                                            {!hasData && (
                                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl">
                                                    <span className="text-[13px] font-bold text-slate-500 bg-white px-5 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-2">
                                                        <AlertCircle size={16} className="text-slate-400"/> No data available yet
                                                    </span>
                                                </div>
                                            )}
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={barChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} tickFormatter={(value) => `${(value/1000)}k`} />
                                                    <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                                    <Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={12} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="mt-4">
                                            <h3 className="text-[14px] font-bold text-slate-800 mb-1">Total System Activity</h3>
                                            <p className="text-[11px] font-medium text-emerald-500 mb-4">+ active than last week</p>

                                            <div className="grid grid-cols-4 gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-blue-500"></div><span className="text-[10px] font-bold text-slate-500">Revenue</span></div>
                                                    <span className="text-[13px] font-bold text-slate-800">{(totalRevenue/1000).toFixed(0)}k</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-indigo-500"></div><span className="text-[10px] font-bold text-slate-500">Dues</span></div>
                                                    <span className="text-[13px] font-bold text-slate-800">{(totalOutstanding/1000).toFixed(0)}k</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-rose-500"></div><span className="text-[10px] font-bold text-slate-500">Returns</span></div>
                                                    <span className="text-[13px] font-bold text-slate-800">{(totalDebitNotes/1000).toFixed(0)}k</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-slate-800"></div><span className="text-[10px] font-bold text-slate-500">Orders</span></div>
                                                    <span className="text-[13px] font-bold text-slate-800">{purchases.length}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/90 backdrop-blur-md rounded-[32px] border border-slate-200 shadow-sm overflow-hidden mt-6">
                                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-[18px] font-bold text-slate-800 flex items-center gap-2">
                                                <ArrowRightLeft className="text-blue-500" size={20}/> Revenue & Deductions Ledger
                                            </h3>
                                            <p className="text-[12px] font-medium text-slate-500 mt-1">Comprehensive record of all your incoming payments and refund deductions.</p>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                <th className="p-4 w-[15%]">Date</th>
                                                <th className="p-4 w-[20%]">Type</th>
                                                <th className="p-4 w-[35%]">Details & Notes</th>
                                                <th className="p-4 w-[15%] text-right">Amount (LKR)</th>
                                                <th className="p-4 w-[15%] text-center">Status</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {loading ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">Loading...</td></tr> :
                                                allTransactions.length === 0 ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">No Transactions Found.</td></tr> :
                                                    allTransactions.map(txn => (
                                                        <tr key={txn.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                                                            <td className="p-4 text-[13px] text-slate-600 font-medium">{new Date(txn.date).toLocaleDateString()}</td>
                                                            <td className="p-4">
                                                                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${txn.isDeduction ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                        {txn.type}
                                                                    </span>
                                                            </td>
                                                            <td className="p-4 text-[12px] text-slate-600 leading-relaxed max-w-[250px] truncate" title={txn.details}>{txn.details}</td>
                                                            <td className={`p-4 text-[14px] font-bold text-right ${txn.isDeduction ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                {txn.isDeduction ? '-' : '+'}{txn.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${txn.status === 'Pending' ? 'bg-amber-100 text-amber-700' : txn.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                                                                        {txn.status}
                                                                    </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                            }
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                            </motion.div>
                        )}

                        {activeTab === 'payments' && (
                            <motion.div
                                key="payments"
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="max-w-7xl mx-auto pb-10 relative z-20"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                                    <div>
                                        <h2 className="text-[24px] font-bold text-slate-800 flex items-center gap-2"><CreditCard className="text-blue-500"/> Payments</h2>
                                        <p className="text-[13px] font-medium text-slate-500 mt-1">Review pending payment receipts and accept them to update your balance.</p>
                                    </div>
                                    <button onClick={() => handleGenerateReport('Payments')} className="flex shrink-0 items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm cursor-pointer">
                                        <Download size={16} className="text-blue-500" /> Generate Report
                                    </button>
                                </div>

                                <div className="bg-white/90 backdrop-blur-md rounded-[24px] border border-slate-200 shadow-sm overflow-hidden mb-8">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                <th className="p-4">Payment Date</th>
                                                <th className="p-4">Notes</th>
                                                <th className="p-4">Status</th>
                                                <th className="p-4 text-right">Amount (LKR)</th>
                                                <th className="p-4 text-center">Action</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {loading ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">Loading...</td></tr> :
                                                payments.length === 0 ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">No Payment Records Found.</td></tr> :
                                                    payments.map(pay => (
                                                        <tr key={pay.id} className={`border-b border-slate-100 hover:bg-slate-50/80 ${pay.status === 'Pending' ? 'bg-amber-50/30' : ''} ${pay.status === 'Rejected' ? 'bg-rose-50/30' : ''}`}>
                                                            <td className="p-4 text-[13px] text-slate-600 font-medium">{new Date(pay.paymentDate).toLocaleDateString()}</td>
                                                            <td className="p-4 text-[12px] text-slate-500 max-w-[200px] truncate">{pay.notes || '-'}</td>
                                                            <td className="p-4">
                                                                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${pay.status === 'Pending' ? 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse' : pay.status === 'Rejected' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                                    {pay.status || 'Accepted'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-[14px] font-bold text-slate-800 text-right">
                                                                {Number(pay.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <button
                                                                    onClick={() => {
                                                                        setViewingReceipt(pay);
                                                                        setShowRejectInput(false);
                                                                        setRejectionReason('');
                                                                    }}
                                                                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer shadow-sm ${
                                                                        pay.status === 'Pending'
                                                                            ? 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md'
                                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                                    }`}
                                                                >
                                                                    <Eye size={14}/> {pay.status === 'Pending' ? 'Review' : 'View'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'orders' && (
                            <motion.div
                                key="orders"
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="max-w-7xl mx-auto flex flex-col h-full pb-10 relative z-20"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                                    <div>
                                        <h2 className="text-[24px] font-bold text-slate-800 flex items-center gap-2"><Receipt className="text-blue-500"/> Orders & GRNs</h2>
                                        <p className="text-[13px] font-medium text-slate-500 mt-1">Track all invoices generated from your deliveries.</p>
                                    </div>
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <div className="relative w-full md:w-64">
                                            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                                            <input type="text" placeholder="Search Invoice or GRN..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                                   className="w-full pl-9 pr-4 py-2.5 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl text-[13px] font-bold outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
                                        </div>
                                        <button onClick={() => handleGenerateReport('Orders')} className="flex shrink-0 items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm cursor-pointer">
                                            <Download size={16} className="text-blue-500" /> Generate Report
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white/90 backdrop-blur-md rounded-[24px] border border-slate-200 shadow-sm overflow-hidden flex-1">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[700px]">
                                            <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                <th className="p-4">Invoice / GRN No</th>
                                                <th className="p-4">Invoice Date</th>
                                                <th className="p-4">Due Date</th>
                                                <th className="p-4">Notes</th>
                                                <th className="p-4 text-right">Total Amount (LKR)</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {loading ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">Loading...</td></tr> :
                                                filteredPurchases.length === 0 ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">No Orders Found.</td></tr> :
                                                    filteredPurchases.map(p => {
                                                        const isOverdue = p.paymentStatus !== 'Paid' && new Date(p.dueDate) < new Date();
                                                        return (
                                                            <tr key={p.id} className={`border-b border-slate-100 hover:bg-slate-50/80 ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                                                                <td className="p-4">
                                                                    <p className="font-bold text-[14px] text-blue-700">{p.invoiceNumber}</p>
                                                                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{p.grnNumber}</p>
                                                                </td>
                                                                <td className="p-4 text-[13px] text-slate-600 font-medium">{new Date(p.invoiceDate).toLocaleDateString()}</td>
                                                                <td className="p-4 text-[13px] font-bold flex flex-col gap-1 mt-1.5">
                                                                    <span className={isOverdue ? 'text-rose-600' : 'text-slate-600'}>{new Date(p.dueDate).toLocaleDateString()}</span>
                                                                    {isOverdue && <span className="text-[9px] uppercase tracking-wider bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded w-max">Overdue</span>}
                                                                </td>
                                                                <td className="p-4 text-[12px] text-slate-500">{p.notes || '-'}</td>
                                                                <td className="p-4 text-[14px] font-bold text-slate-800 text-right">{Number(p.totalAmount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                            </tr>
                                                        )
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'returns' && (
                            <motion.div
                                key="returns"
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="max-w-7xl mx-auto flex flex-col h-full pb-10 relative z-20"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                                    <div>
                                        <h2 className="text-[24px] font-bold text-slate-800 flex items-center gap-2"><Archive className="text-blue-500"/> Returns (Debit Notes)</h2>
                                        <p className="text-[13px] font-medium text-slate-500 mt-1">Review expired or damaged items returned by the pharmacy.</p>
                                    </div>
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <div className="relative w-full md:w-64">
                                            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                                            <input type="text" placeholder="Search by Medicine or Batch..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                                   className="w-full pl-9 pr-4 py-2.5 bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl text-[13px] font-bold outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
                                        </div>
                                        <button onClick={() => handleGenerateReport('Returns')} className="flex shrink-0 items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm cursor-pointer">
                                            <Download size={16} className="text-blue-500" /> Generate Report
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white/90 backdrop-blur-md rounded-[24px] border border-slate-200 shadow-sm overflow-hidden flex-1">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[700px]">
                                            <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                <th className="p-4 w-[25%]">Medicine Details</th>
                                                <th className="p-4 w-[15%]">Return Date</th>
                                                <th className="p-4 w-[35%]">Reason</th>
                                                <th className="p-4 w-[15%] text-right">Debit Value (LKR)</th>
                                                <th className="p-4 w-[10%] text-center">Status</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {loading ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">Loading...</td></tr> :
                                                filteredReturns.length === 0 ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">No Returns Found.</td></tr> :
                                                    filteredReturns.map(r => (
                                                        <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                                                            <td className="p-4">
                                                                <p className="font-bold text-[14px] text-slate-800">{r.medicineName}</p>
                                                                <p className="text-[11px] text-slate-500 font-mono mt-0.5">Batch: {r.batchNumber || 'N/A'} | Qty: {r.quantity}</p>
                                                            </td>
                                                            <td className="p-4 text-[13px] text-slate-600 font-medium">{new Date(r.createdAt).toLocaleDateString()}</td>
                                                            <td className="p-4 text-[12px] text-slate-600 leading-relaxed max-w-[250px]">{r.reason || 'Returned as per policy.'}</td>
                                                            <td className="p-4 text-[14px] font-bold text-rose-600 text-right">-{Number(r.totalValue).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                            <td className="p-4 text-center">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${r.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                    {r.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'products' && (
                            <motion.div
                                key="products"
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="max-w-7xl mx-auto pb-10 relative z-20"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                                    <h2 className="text-[24px] font-bold text-slate-800 flex items-center gap-2"><Box className="text-blue-500"/> My Products</h2>
                                    <button onClick={() => handleGenerateReport('Products')} className="flex shrink-0 items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm cursor-pointer">
                                        <Download size={16} className="text-blue-500" /> Generate Report
                                    </button>
                                </div>
                                <div className="bg-white/90 backdrop-blur-md rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[700px]">
                                            <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                <th className="p-4">Medicine Name</th>
                                                <th className="p-4">Generic Name</th>
                                                <th className="p-4">Category</th>
                                                <th className="p-4">Barcode</th>
                                                <th className="p-4 text-center">Stock Level</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {loading ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">Loading...</td></tr> :
                                                products.length === 0 ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">No Products Supplied Yet.</td></tr> :
                                                    products.map(prod => {
                                                        const isLowStock = Number(prod.quantity) <= Number(prod.minStockLevel || 10);

                                                        return (
                                                            <tr key={prod.id} className={`border-b border-slate-100 hover:bg-slate-50/80 ${isLowStock ? 'bg-orange-50/30' : ''}`}>
                                                                <td className="p-4 font-bold text-[14px] text-slate-800">{prod.name}</td>
                                                                <td className="p-4 text-[13px] text-slate-600">{prod.genericName || '-'}</td>
                                                                <td className="p-4 text-[13px] text-slate-600">
                                                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[11px] font-bold">{prod.category || '-'}</span>
                                                                </td>
                                                                <td className="p-4 text-[12px] text-slate-500 font-mono">{prod.barcode || '-'}</td>
                                                                <td className="p-4 text-center text-[13px] font-bold">
                                                                    {isLowStock ? (
                                                                        <div className="flex items-center justify-center gap-1.5 text-orange-600" title="Low stock at Pharmacy! Contact admin for order.">
                                                                            {prod.quantity} <AlertTriangle size={14} className="animate-pulse-soft"/>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-emerald-600">{prod.quantity}</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'profile' && (
                            <motion.div
                                key="profile"
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="max-w-4xl mx-auto pb-10 relative z-20"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-[24px] font-bold text-slate-800 flex items-center gap-2"><Building2 className="text-blue-500"/> Company Profile</h2>
                                    <button onClick={() => handleGenerateReport('Profile')} className="flex shrink-0 items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm cursor-pointer">
                                        <Download size={16} className="text-blue-500" /> Generate Report
                                    </button>
                                </div>

                                <div className="bg-white/90 backdrop-blur-md rounded-[32px] border border-slate-200 shadow-sm p-8 space-y-8">
                                    <div>
                                        <h3 className="text-[12px] font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">General Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div><label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Company Name</label><p className="text-[15px] font-bold text-slate-800">{supplierInfo?.companyName || '-'}</p></div>
                                            <div><label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Medical Rep Name</label><p className="text-[15px] font-bold text-slate-800 flex items-center gap-2"><UserCircle size={16} className="text-slate-400"/> {supplierInfo?.repName || '-'}</p></div>
                                            <div><label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Contact Number</label><p className="text-[15px] font-bold text-slate-800 flex items-center gap-2"><Phone size={16} className="text-slate-400"/> {supplierInfo?.contactNumber || '-'}</p></div>
                                            <div><label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email Address</label><p className="text-[15px] font-bold text-slate-800 flex items-center gap-2"><Mail size={16} className="text-slate-400"/> {supplierInfo?.email || '-'}</p></div>
                                            <div className="md:col-span-2"><label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Company Address</label><p className="text-[15px] font-bold text-slate-800 flex items-center gap-2"><MapPin size={16} className="text-slate-400"/> {supplierInfo?.address || '-'}</p></div>
                                            {supplierInfo?.brNumber && <div><label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">BR Number</label><p className="text-[15px] font-bold text-slate-800">{supplierInfo.brNumber}</p></div>}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-[12px] font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Bank & Financial Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/80 p-6 rounded-2xl border border-slate-100">
                                            <div><label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Bank Name</label><p className="text-[15px] font-bold text-slate-800 flex items-center gap-2"><Banknote size={16} className="text-emerald-500"/> {supplierInfo?.bankName || '-'}</p></div>
                                            <div><label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Account Number</label><p className="text-[15px] font-mono font-bold text-slate-800">{supplierInfo?.accountNumber || '-'}</p></div>
                                            <div><label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Account Name</label><p className="text-[15px] font-bold text-slate-800">{supplierInfo?.accountName || '-'}</p></div>
                                            <div><label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Credit Period</label><p className="text-[15px] font-bold text-slate-800">{supplierInfo?.creditPeriod ? `${supplierInfo.creditPeriod} Days` : '-'}</p></div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>

                </main>
            </div>

            {isProfileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsProfileOpen(false)}
                ></div>
            )}

            <aside
                className={`fixed top-4 right-4 h-[calc(100vh-32px)] w-80 bg-white/95 backdrop-blur-md rounded-[32px] border border-slate-200 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] z-50 transform transition-transform duration-300 ease-in-out ${isProfileOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}
            >
                <div className="p-6 h-full flex flex-col overflow-y-auto hide-scrollbar">
                    <div className="flex justify-between items-center mb-8">
                        <button onClick={() => setIsProfileOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                            <X size={20} />
                        </button>
                        <button onClick={handleSupplierLogout} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-[13px] transition-colors cursor-pointer">
                            Logout <LogOut size={16} />
                        </button>
                    </div>

                    <div className="flex flex-col items-center mb-8">
                        <div className="relative w-[100px] h-[100px] rounded-full border-4 border-white shadow-[0_8px_24px_rgba(37,99,235,0.15)] mb-4">
                            <img src={profileImg} alt="Profile" className="w-full h-full object-cover rounded-full bg-slate-50" />
                        </div>
                        <h2 className="text-[18px] font-extrabold text-slate-800 tracking-tight">
                            {supplierInfo?.companyName || user?.name || 'Distributor Partner'}
                        </h2>
                        <p className="text-[13px] font-medium text-blue-500 mt-0.5">
                            Verified Supplier Account
                        </p>
                    </div>

                    <div className="px-2">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[14px] font-extrabold text-slate-800 tracking-tight">Recent Alerts</h3>
                            <Bell size={14} className="text-blue-500" />
                        </div>
                        <div className="space-y-4">
                            {notifications.length > 0 ? (
                                notifications.slice(0, 5).map((note, idx) => {
                                    let iconColor = 'text-blue-500';
                                    let bgColor = 'bg-blue-50';
                                    let Icon = Bell;

                                    if(note.title.includes('Low Stock')) { iconColor = 'text-orange-500'; bgColor = 'bg-orange-50'; Icon = AlertTriangle; }
                                    if(note.title.includes('Return') || note.title.includes('Debit')) { iconColor = 'text-rose-500'; bgColor = 'bg-rose-50'; Icon = ArrowRightLeft; }

                                    return (
                                        <div key={idx} className="flex gap-3 items-start p-1.5 cursor-pointer group hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                                            <div className={`p-1.5 ${bgColor} ${iconColor} rounded-full mt-0.5 group-hover:scale-110 transition-transform shrink-0`}><Icon size={12} strokeWidth={2.5}/></div>
                                            <div>
                                                <p className="text-[12px] font-bold text-slate-700 group-hover:text-slate-900 transition-colors leading-tight mb-0.5">{note.title}</p>
                                                <p className="text-[10px] font-medium text-slate-500 leading-relaxed line-clamp-2">{note.message}</p>
                                                <p className="text-[9px] text-slate-400 mt-1.5 font-bold">{new Date(note.time || note.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center py-6 text-sm text-slate-400 font-medium">No recent alerts</div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {viewingReceipt && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white/90 backdrop-blur-2xl p-6 rounded-[32px] shadow-2xl border border-white w-full max-w-[600px] flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <div>
                                <h2 className="text-[20px] font-bold text-slate-800 flex items-center gap-2.5">
                                    <FileText className="text-blue-500 w-6 h-6"/> Payment Receipt
                                </h2>
                                <p className="text-[12px] font-medium text-slate-500 mt-0.5">Payment Amount: <span className="font-bold text-emerald-600">LKR {Number(viewingReceipt.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></p>
                            </div>
                            <button onClick={() => setViewingReceipt(null)} className="hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className={`flex-1 overflow-y-auto bg-slate-100 rounded-2xl border border-slate-200 flex justify-center items-center p-2 custom-scrollbar ${!showRejectInput ? 'mb-4' : 'mb-2 h-[200px]'}`}>
                            {viewingReceipt.receiptImage ? (
                                <iframe
                                    src={viewingReceipt.receiptImage}
                                    className="w-full h-full min-h-[300px] rounded-xl bg-white"
                                    title="Receipt Document"
                                />
                            ) : (
                                <p className="text-slate-400 font-medium text-sm">No receipt document attached.</p>
                            )}
                        </div>

                        {showRejectInput && viewingReceipt.status === 'Pending' && (
                            <div className="mb-4 bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                                <label className="block text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <AlertTriangle size={14}/> Reason for Rejection *
                                </label>
                                <textarea
                                    className="w-full px-3 py-2.5 bg-white border border-rose-200 rounded-xl text-[13px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-rose-400/40 resize-none h-20"
                                    placeholder="Please state why this receipt is rejected (e.g. Blurry image, wrong amount...)"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                ></textarea>
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => setShowRejectInput(false)}
                                        className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[12px] font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleRejectPayment(viewingReceipt.id)}
                                        disabled={rejecting}
                                        className="flex-1 py-2 bg-rose-500 text-white rounded-lg text-[12px] font-bold hover:bg-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {viewingReceipt.status === 'Pending' && !showRejectInput && (
                            <div className="flex-shrink-0 flex gap-3">
                                <button
                                    onClick={() => setShowRejectInput(true)}
                                    disabled={isAccountInactive}
                                    className="flex-1 flex items-center justify-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold py-3.5 rounded-2xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Reject Receipt
                                </button>
                                <button
                                    onClick={() => handleAcceptPayment(viewingReceipt.id)}
                                    disabled={accepting || isAccountInactive}
                                    className="flex-[2] flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CheckCircle size={18} /> {accepting ? 'Processing...' : 'Accept Payment'}
                                </button>
                            </div>
                        )}

                        {viewingReceipt.status === 'Accepted' && (
                            <div className="flex-shrink-0 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex justify-center items-center gap-2">
                                <CheckCircle size={16} className="text-emerald-500" />
                                <span className="text-[13px] font-bold text-emerald-700">Payment Already Accepted</span>
                            </div>
                        )}

                        {viewingReceipt.status === 'Rejected' && (
                            <div className="flex-shrink-0 bg-rose-50 border border-rose-100 rounded-2xl p-4 flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 text-rose-600 font-bold text-[13px]">
                                    <X size={16} /> Payment Rejected
                                </div>
                                <p className="text-[12px] text-slate-600 font-medium">
                                    <span className="font-bold text-slate-700">Reason:</span> {viewingReceipt.rejectionReason || 'No specific reason provided.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}