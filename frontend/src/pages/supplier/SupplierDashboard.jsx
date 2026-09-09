import React, { useContext, useEffect, useState, useLayoutEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
    Truck, LogOut, Package, DollarSign, Clock, CheckCircle,
    Building2, Mail, LayoutDashboard, Receipt, CreditCard,
    Box, UserCircle, ChevronRight, ChevronLeft, Calendar, AlertCircle,
    Search, MapPin, Phone, Banknote, Eye, X, FileText, Bell, User, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import supplierBanner from '../../assets/supplier.png';
import profileImg from '../../assets/profile.png';

const socket = io('http://localhost:5000');

export default function SupplierDashboard() {
    const { logout, user } = useContext(AuthContext);
    const mySupplierId = user?.supplierId || user?.id;

    const [activeTab, setActiveTab] = useState('dashboard');
    const [purchases, setPurchases] = useState([]);
    const [payments, setPayments] = useState([]);
    const [products, setProducts] = useState([]);
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

    useEffect(() => {
        socket.on('receive_notification', (data) => {
            setNotifications((prev) => [data, ...prev]);
            setUnreadCount((prev) => prev + 1);
        });

        return () => {
            socket.off('receive_notification');
        };
    }, []);

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

    const markAsRead = () => {
        setUnreadCount(0);
        setIsDropdownOpen(!isDropdownOpen);
    };

    const totalOutstanding = supplierInfo?.totalOutstanding || 0;
    const creditPeriodDays = supplierInfo?.creditPeriod || 30;

    const isAccountInactive = supplierInfo?.status === 'Inactive';

    const upcomingDues = purchases.filter(p => {
        const dueDate = new Date(p.dueDate);
        const today = new Date();
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 7;
    });

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'orders', label: 'Orders & GRNs', icon: Receipt },
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

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">

            <aside
                className={`relative my-4 ml-4 h-[calc(100vh-32px)] bg-white rounded-[32px] border border-slate-200 transition-all duration-300 ease-in-out flex flex-col flex-shrink-0 z-40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] ${
                    isCollapsed ? 'w-24' : 'w-72'
                }`}
            >
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3.5 top-10 bg-white border border-slate-200 rounded-full p-1.5 shadow-sm hover:bg-slate-50 transition-all z-50 hover:scale-110 cursor-pointer flex items-center justify-center text-slate-400 hover:text-orange-600"
                >
                    {isCollapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronLeft size={18} strokeWidth={2.5} />}
                </button>

                <div className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-8'} mb-8 mt-8 transition-all duration-300`}>
                    {!isCollapsed && (
                        <div className="overflow-hidden whitespace-nowrap transition-opacity duration-300 w-full">
                            <div className="flex items-baseline gap-1.5 pb-0.5">
                                <span className="text-[22px] font-bold text-slate-700 tracking-tight">Supplier</span>
                                <span className="text-[22px] font-black bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent tracking-tight pr-1 pb-1">Portal</span>
                            </div>
                            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.15em] ml-0.5">Ph4Life Network</p>
                        </div>
                    )}
                    {isCollapsed && (
                        <span className="font-black text-[22px] bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent pb-1 pr-1">
                            SP
                        </span>
                    )}
                </div>

                <nav
                    ref={navRef}
                    onScroll={handleNavScroll}
                    className="space-y-1.5 px-4 flex-1 overflow-y-auto hide-scrollbar"
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
                                        ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100/50'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
                                }`}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${!isCollapsed && 'group-hover:scale-110'} ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                                {!isCollapsed && (
                                    <span className="whitespace-nowrap">{label}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto border-t border-slate-100 flex flex-col gap-2">
                    <button
                        onClick={logout}
                        title="Logout"
                        className={`flex items-center justify-center gap-2 w-full py-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 hover:text-rose-700 transition-colors font-bold text-[14px] cursor-pointer border border-rose-100/50 ${isCollapsed ? 'px-0' : 'px-4'}`}
                    >
                        <LogOut size={18} strokeWidth={2.5} />
                        {!isCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden relative">

                <div className="flex justify-between items-center px-8 pt-6 pb-2 z-30 bg-transparent">
                    <div className="hidden md:block">
                        <span className="text-[13px] font-bold text-slate-400 tracking-wide">
                            {formattedDate}
                        </span>
                    </div>

                    <div className="flex items-center gap-5 ml-auto">
                        <div className="relative">
                            <button
                                onClick={markAsRead}
                                className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all relative cursor-pointer text-slate-500 hover:text-orange-600"
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
                                        <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full shadow-sm">{notifications.length} New</span>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-6 text-center text-sm text-slate-400 font-medium">No new notifications</div>
                                        ) : (
                                            notifications.map((note) => (
                                                <div key={note.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                    <p className="text-xs font-bold text-slate-700 mb-0.5">{note.title}</p>
                                                    <p className="text-[11px] text-slate-500 leading-relaxed">{note.message}</p>
                                                    <p className="text-[9px] text-orange-500 mt-2 font-semibold">{new Date(note.time).toLocaleTimeString()}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setIsProfileOpen(true)}
                            className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center cursor-pointer hover:bg-slate-50 hover:text-orange-600 text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        >
                            <User size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 pb-8 pt-2 relative">

                    {isAccountInactive && (
                        <div className="mb-6 bg-rose-500 text-white p-4 rounded-2xl flex items-center gap-4 shadow-lg shadow-rose-500/20 animation-fade-in">
                            <AlertTriangle size={28} className="text-white flex-shrink-0" />
                            <div>
                                <h3 className="font-extrabold text-[16px]">Account Suspended / Inactive</h3>
                                <p className="text-[13px] font-medium opacity-90 mt-0.5">Your portal access is currently restricted. You cannot accept or reject payments at this time. Please contact Kegalle Ph4Life administration.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'dashboard' && (
                        <div className="space-y-6 max-w-6xl mx-auto animation-fade-in pb-10">

                            <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-yellow-500/10 p-6 rounded-[32px] border border-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="space-y-2 text-center md:text-left">
                                    <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">Distributor Dashboard</span>
                                    <h2 className="text-[26px] font-black text-slate-800">Welcome, {supplierInfo?.companyName || user?.name}!</h2>
                                    <p className="text-[13px] font-medium text-slate-600 max-w-lg">Manage your pharmaceutical supplies, track GRNs, and review payment receipts securely in one place.</p>
                                </div>
                                <div className="w-full md:w-[280px] h-[140px] flex items-center justify-center p-2">
                                    <img src={supplierBanner} alt="Supplier Banner" className="max-h-full max-w-full object-contain drop-shadow-md" />
                                </div>
                            </div>

                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <h2 className="text-[20px] font-black text-slate-800">Financial Summary</h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className={`bg-gradient-to-br p-6 rounded-[32px] text-white shadow-lg flex flex-col justify-between ${Number(totalOutstanding) > 0 ? 'from-rose-500 to-red-600 shadow-rose-500/20' : 'from-emerald-500 to-teal-600 shadow-emerald-500/20'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl"><DollarSign size={24} className="text-white" /></div>
                                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider">Total Outstanding</span>
                                    </div>
                                    <div>
                                        <p className="text-[32px] font-black leading-none">LKR {Number(totalOutstanding).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                        <p className="text-white/80 text-[12px] font-bold mt-2">Credit Term: {creditPeriodDays} Days</p>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
                                    <div className="flex justify-between items-start mb-4"><div className="p-3 bg-indigo-50 rounded-2xl"><Package size={24} className="text-indigo-600" /></div></div>
                                    <div>
                                        <p className="text-slate-500 text-[12px] font-bold mb-1 uppercase tracking-wider">Total Orders Supplied</p>
                                        <p className="text-[32px] font-black text-slate-800 leading-none">{purchases.length}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-amber-50 rounded-2xl"><Calendar size={24} className="text-amber-600" /></div>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-[12px] font-bold mb-1 uppercase tracking-wider">Upcoming Due Bills</p>
                                        <p className="text-[32px] font-black text-slate-800 leading-none">{upcomingDues.length}</p>
                                        <p className="text-[12px] font-medium text-amber-600 mt-2 flex items-center gap-1">
                                            <AlertCircle size={14}/> Due in next 7 days
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm mt-8 block w-full">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-[17px] font-bold text-slate-800 flex items-center gap-2">
                                        <Clock className="text-orange-500" size={20} /> Recent Deliveries (GRNs)
                                    </h3>
                                    <button onClick={() => setActiveTab('orders')} className="text-[12px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer">
                                        View All Orders &rarr;
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[600px]">
                                        <thead>
                                        <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            <th className="pb-3">Invoice No</th>
                                            <th className="pb-3">Invoice Date</th>
                                            <th className="pb-3 text-right">Amount (LKR)</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {loading ? <tr><td colSpan="3" className="text-center py-8 text-slate-400">Loading...</td></tr> :
                                            purchases.slice(0, 5).length === 0 ? <tr><td colSpan="3" className="text-center py-8 text-slate-400">No recent orders.</td></tr> :
                                                purchases.slice(0, 5).map(p => (
                                                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                                                        <td className="py-4 font-mono font-bold text-orange-700">{p.invoiceNumber}</td>
                                                        <td className="py-4 text-[13px] text-slate-600">{new Date(p.invoiceDate).toLocaleDateString()}</td>
                                                        <td className="py-4 text-[14px] font-black text-slate-800 text-right">{Number(p.totalAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="max-w-6xl mx-auto animation-fade-in pb-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                                <div>
                                    <h2 className="text-[24px] font-black text-slate-800 flex items-center gap-2"><CreditCard className="text-orange-500"/> Payments</h2>
                                    <p className="text-[13px] font-medium text-slate-500 mt-1">Review pending payment receipts and accept them to update your balance.</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                                                    <tr key={pay.id} className={`border-b border-slate-100 hover:bg-slate-50 ${pay.status === 'Pending' ? 'bg-amber-50/30' : ''} ${pay.status === 'Rejected' ? 'bg-rose-50/30' : ''}`}>
                                                        <td className="p-4 text-[13px] text-slate-600 font-medium">{new Date(pay.paymentDate).toLocaleDateString()}</td>
                                                        <td className="p-4 text-[12px] text-slate-500 max-w-[200px] truncate">{pay.notes || '-'}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${pay.status === 'Pending' ? 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse' : pay.status === 'Rejected' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                                {pay.status || 'Accepted'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-[14px] font-black text-slate-800 text-right">
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
                                                                        ? 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-md'
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
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="max-w-6xl mx-auto animation-fade-in flex flex-col h-full pb-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                                <h2 className="text-[24px] font-black text-slate-800 flex items-center gap-2"><Receipt className="text-orange-500"/> Orders & GRNs</h2>
                                <div className="relative w-full md:w-72">
                                    <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                                    <input type="text" placeholder="Search Invoice or GRN..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                           className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400" />
                                </div>
                            </div>

                            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden flex-1">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                                                filteredPurchases.map(p => (
                                                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="p-4">
                                                            <p className="font-bold text-[14px] text-orange-700">{p.invoiceNumber}</p>
                                                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{p.grnNumber}</p>
                                                        </td>
                                                        <td className="p-4 text-[13px] text-slate-600 font-medium">{new Date(p.invoiceDate).toLocaleDateString()}</td>
                                                        <td className="p-4 text-[13px] text-rose-500 font-bold">{new Date(p.dueDate).toLocaleDateString()}</td>
                                                        <td className="p-4 text-[12px] text-slate-500">{p.notes || '-'}</td>
                                                        <td className="p-4 text-[14px] font-black text-slate-800 text-right">{Number(p.totalAmount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="max-w-6xl mx-auto animation-fade-in pb-10">
                            <h2 className="text-[24px] font-black text-slate-800 mb-6 flex items-center gap-2"><Box className="text-orange-500"/> My Products</h2>
                            <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[600px]">
                                        <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            <th className="p-4">Medicine Name</th>
                                            <th className="p-4">Generic Name</th>
                                            <th className="p-4">Category</th>
                                            <th className="p-4">Barcode</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {loading ? <tr><td colSpan="4" className="text-center py-10 text-slate-400">Loading...</td></tr> :
                                            products.length === 0 ? <tr><td colSpan="4" className="text-center py-10 text-slate-400">No Products Supplied Yet.</td></tr> :
                                                products.map(prod => (
                                                    <tr key={prod.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="p-4 font-bold text-[14px] text-slate-800">{prod.name}</td>
                                                        <td className="p-4 text-[13px] text-slate-600">{prod.genericName || '-'}</td>
                                                        <td className="p-4 text-[13px] text-slate-600">
                                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[11px] font-bold">{prod.category || '-'}</span>
                                                        </td>
                                                        <td className="p-4 text-[12px] text-slate-500 font-mono">{prod.barcode || '-'}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="max-w-4xl mx-auto animation-fade-in pb-10">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-[24px] font-black text-slate-800 flex items-center gap-2"><Building2 className="text-orange-500"/> Company Profile</h2>
                            </div>

                            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 space-y-8">
                                <div>
                                    <h3 className="text-[12px] font-extrabold text-orange-600 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">General Information</h3>
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
                                    <h3 className="text-[12px] font-extrabold text-orange-600 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Bank & Financial Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                        <div><label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Bank Name</label><p className="text-[15px] font-bold text-slate-800 flex items-center gap-2"><Banknote size={16} className="text-emerald-500"/> {supplierInfo?.bankName || '-'}</p></div>
                                        <div><label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Account Number</label><p className="text-[15px] font-mono font-bold text-slate-800">{supplierInfo?.accountNumber || '-'}</p></div>
                                        <div><label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Account Name</label><p className="text-[15px] font-bold text-slate-800">{supplierInfo?.accountName || '-'}</p></div>
                                        <div><label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Credit Period</label><p className="text-[15px] font-bold text-slate-800">{supplierInfo?.creditPeriod ? `${supplierInfo.creditPeriod} Days` : '-'}</p></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div>

            {isProfileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsProfileOpen(false)}
                ></div>
            )}

            <aside
                className={`fixed top-4 right-4 h-[calc(100vh-32px)] w-80 bg-white rounded-[32px] border border-slate-200 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] z-50 transform transition-transform duration-300 ease-in-out ${isProfileOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}
            >
                <div className="p-6 h-full flex flex-col overflow-y-auto hide-scrollbar">
                    <div className="flex justify-between items-center mb-8">
                        <button onClick={() => setIsProfileOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                            <X size={20} />
                        </button>
                        <button onClick={logout} className="flex items-center gap-2 text-slate-500 hover:text-orange-600 font-bold text-[13px] transition-colors cursor-pointer">
                            Logout <LogOut size={16} />
                        </button>
                    </div>

                    <div className="flex flex-col items-center mb-8">
                        <div className="relative w-[100px] h-[100px] rounded-full border-4 border-white shadow-[0_8px_24px_rgba(249,115,22,0.15)] mb-4">
                            <img src={profileImg} alt="Profile" className="w-full h-full object-cover rounded-full bg-slate-50" />
                        </div>
                        <h2 className="text-[18px] font-extrabold text-slate-800 tracking-tight">
                            {supplierInfo?.companyName || user?.name || 'Distributor Partner'}
                        </h2>
                        <p className="text-[13px] font-medium text-orange-500 mt-0.5">
                            Verified Supplier Account
                        </p>
                    </div>

                    <div className="px-2">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[14px] font-extrabold text-slate-800 tracking-tight">Notifications</h3>
                            <Bell size={14} className="text-orange-500" />
                        </div>
                        <div className="space-y-4">
                            {notifications.length > 0 ? (
                                notifications.slice(0, 3).map((note, idx) => (
                                    <div key={idx} className="flex gap-3 items-start p-1 cursor-pointer group">
                                        <div className="p-1.5 bg-orange-50 text-orange-500 rounded-full mt-0.5 group-hover:scale-110 transition-transform"><Bell size={12} /></div>
                                        <div>
                                            <p className="text-[12px] font-bold text-slate-700 group-hover:text-orange-600 transition-colors">{note.title}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{new Date(note.time).toLocaleDateString()}, {new Date(note.time).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-sm text-slate-400 font-medium">No recent notifications</div>
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
                                    <FileText className="text-orange-500 w-6 h-6"/> Payment Receipt
                                </h2>
                                <p className="text-[12px] font-medium text-slate-500 mt-0.5">Payment Amount: <span className="font-bold text-emerald-600">LKR {Number(viewingReceipt.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></p>
                            </div>
                            <button onClick={() => setViewingReceipt(null)} className="hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className={`flex-1 overflow-y-auto bg-slate-100 rounded-2xl border border-slate-200 flex justify-center items-center p-2 ${!showRejectInput ? 'mb-4' : 'mb-2 h-[200px]'}`}>
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