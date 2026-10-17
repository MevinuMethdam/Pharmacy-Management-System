import React, { useContext, useEffect, useState, useLayoutEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
    Truck, LogOut, Package, DollarSign, Clock, CheckCircle,
    Building2, Mail, LayoutDashboard, Receipt, CreditCard,
    Box, UserCircle, ChevronRight, ChevronLeft, Calendar, AlertCircle,
    Search, MapPin, Phone, Banknote, Eye, X, FileText, Bell, User, AlertTriangle, ArrowRightLeft, Archive, Download, PackagePlus
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

    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [savingPassword, setSavingPassword] = useState(false);
    const [currentPasswordError, setCurrentPasswordError] = useState('');
    const passwordSubmitRef = useRef(false);

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

    // Stock Request States
    const [viewingRequest, setViewingRequest] = useState(null);
    const [showRequestReject, setShowRequestReject] = useState(false);
    const [requestRejectReason, setRequestRejectReason] = useState('');
    const [processingRequest, setProcessingRequest] = useState(false);

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

    const notificationSeen = useRef(new Set());
    const notificationRead = useRef(new Set());
    const refreshNotifications = useRef(() => {});

    const showSupplierNotification = (data) => {
        toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black/5`}>
                <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                            {data.title?.includes('Refill') || data.title?.includes('Request') ? <PackagePlus className="h-10 w-10 text-emerald-500" /> : <Bell className="h-10 w-10 text-blue-500" />}
                        </div>
                        <div className="ml-3 flex-1">
                            <p className="text-[14px] font-bold text-slate-800">{data.title}</p>
                            <p className="mt-1 text-[12px] text-slate-500">{data.message}</p>
                        </div>
                    </div>
                </div>
            </div>
        ), { duration: 5000, position: 'top-right' });
    };

    const addSupplierNotification = (data, announce = true) => {
        const id = String(data.id);
        const isNew = !notificationSeen.current.has(id);
        notificationSeen.current.add(id);
        const note = { ...data, isRead: Boolean(data.isRead || notificationRead.current.has(id)) };
        setNotifications(prev => {
            const previous = prev.find(n => String(n.id) === id);
            const merged = { ...previous, ...note, isRead: Boolean(previous?.isRead || note.isRead) };
            if (previous && id.startsWith(`supplier-${mySupplierId}-`)) {
                merged.createdAt = previous.createdAt;
            }
            if (previous?.status && previous.status !== 'Pending' && (!note.status || note.status === 'Pending')) {
                merged.status = previous.status;
                merged.rejectReason = previous.rejectReason;
            }
            return [merged, ...prev.filter(n => String(n.id) !== id)]
                .sort((x, y) => new Date(y.time || y.createdAt || 0) - new Date(x.time || x.createdAt || 0));
        });
        if (isNew && announce) showSupplierNotification(note);
    };

    const addOutcomeNotification = (kind, id, status, reason = '', announce = false) => {
        addSupplierNotification({
            id: `supplier-${mySupplierId}-${kind}-${id}-${status.toLowerCase()}`,
            target: 'supplier', supplierId: mySupplierId,
            type: status === 'Rejected' ? 'warning' : 'success',
            title: `${kind === 'payment' ? 'Payment' : 'Stock'} ${status}`,
            message: `${kind === 'payment' ? 'Payment' : 'Stock request'} #${id} was ${status.toLowerCase()}.${reason ? ` Reason: ${reason}` : ''}`,
            createdAt: new Date().toISOString(), isRead: false
        }, announce);
    };

    useEffect(() => {
        setUnreadCount(notifications.filter(n => !n.isRead).length);
    }, [notifications]);

    useEffect(() => {
        if (!mySupplierId) return;
        let disposed = false;
        let inFlight = false;
        const initialized = new Set();
        notificationSeen.current = new Set();
        try {
            const savedRead = JSON.parse(localStorage.getItem(`supplier-notification-read:${mySupplierId}`) || '[]');
            notificationRead.current = new Set(Array.isArray(savedRead) ? savedRead.map(String) : []);
        } catch {
            notificationRead.current = new Set();
        }
        setNotifications([]);
        const belongsToSupplier = n => {
            const tag = n.title?.match(/\[SUP:([^\]]+)\]/);
            if (n.supplierId != null) return String(n.supplierId) === String(mySupplierId) && (n.target === 'supplier' || Boolean(tag));
            return tag ? tag[1] === String(mySupplierId) : n.target === 'supplier';
        };
        const normalize = n => ({ ...n, title: n.title?.replace(`[SUP:${mySupplierId}] `, '') });
        const receive = (rows, source) => {
            const announce = initialized.has(source);
            rows.forEach(n => {
                addSupplierNotification(normalize(n), announce);
                if ((n.restockId || /Request|Refill/.test(n.title || '')) && /^(Accepted|Rejected)$/.test(n.status || '')) {
                    addOutcomeNotification('stock', n.restockId || n.id, n.status, n.rejectReason || n.rejectionReason || '', announce);
                }
            });
            initialized.add(source);
        };
        const fetchNotifs = async () => {
            if (disposed || inFlight) return;
            const token = localStorage.getItem('token');
            if (!token) return;
            inFlight = true;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                const results = await Promise.allSettled([
                    axios.get('http://localhost:5000/api/notifications', config)
                        .catch(() => axios.get('http://localhost:5000/api/notifications/unread', config)),
                    axios.get('http://localhost:5000/api/notifications/restock-requests', config),
                    axios.get('http://localhost:5000/api/supplier-payments', config),
                    axios.get('http://localhost:5000/api/returns/history', config),
                    axios.get('http://localhost:5000/api/medicines', config)
                ]);
                if (disposed) return;
                results.slice(0, 2).forEach((result, index) => {
                    if (result.status === 'fulfilled' && Array.isArray(result.value.data)) {
                        receive(result.value.data.filter(belongsToSupplier), `notifications-${index}`);
                    }
                });
                const paymentResult = results[2];
                if (paymentResult.status === 'fulfilled' && Array.isArray(paymentResult.value.data)) {
                    const announce = initialized.has('payments');
                    paymentResult.value.data.filter(p => String(p.supplierId) === String(mySupplierId)).forEach(p => {
                        addSupplierNotification({
                            id: `supplier-${mySupplierId}-payment-${p.id}-received`,
                            title: 'Payment Received', type: 'info',
                            message: `Payment #${p.id} of Rs. ${Number(p.amount || 0).toLocaleString()} was received from the pharmacy.`,
                            createdAt: p.createdAt || p.paymentDate, isRead: false
                        }, announce);
                        const status = String(p.status || '').toLowerCase();
                        if (status === 'accepted' || status === 'rejected') {
                            addOutcomeNotification('payment', p.id, status === 'accepted' ? 'Accepted' : 'Rejected', p.rejectionReason || p.rejectReason || '', announce);
                        }
                    });
                    initialized.add('payments');
                }
                const returnResult = results[3];
                const medicines = results[4].status === 'fulfilled' && Array.isArray(results[4].value.data) ? results[4].value.data : [];
                if (returnResult.status === 'fulfilled' && Array.isArray(returnResult.value.data)) {
                    returnResult.value.data.filter(r => {
                        if (r.actionType !== 'Return to Supplier') return false;
                        if (r.supplierId != null) return String(r.supplierId) === String(mySupplierId);
                        const matches = medicines.filter(m => r.medicineId != null
                            ? String(m.id) === String(r.medicineId)
                            : m.name === r.medicineName && (!r.batchNumber || m.batchNumber === r.batchNumber));
                        return matches.length > 0 && matches.every(m => String(m.supplierId) === String(mySupplierId));
                    }).forEach(r => addSupplierNotification({
                        id: `supplier-${mySupplierId}-debit-${r.id}`,
                        title: 'Debit Note Received', type: 'warning',
                        message: `${r.medicineName || 'Medicine'} — Rs. ${Number(r.totalValue || 0).toLocaleString()}.${r.reason ? ` ${r.reason}` : ''}`,
                        createdAt: r.createdAt, isRead: false
                    }, initialized.has('returns')));
                    initialized.add('returns');
                }
            } catch (err) {
                console.error('Failed to refresh supplier notifications', err);
            } finally {
                inFlight = false;
            }
        };
        refreshNotifications.current = fetchNotifs;
        const onNotification = data => {
            if (!data || !belongsToSupplier(data)) return;
            if (data.id != null) addSupplierNotification(normalize(data));
            fetchNotifs();
        };
        const onRestock = data => {
            if (!data || data.supplierId == null || String(data.supplierId) === String(mySupplierId)) fetchNotifs();
        };
        const refresh = () => { if (!document.hidden) fetchNotifs(); };
        fetchNotifs();
        const timer = window.setInterval(refresh, 5000);
        socket.on('receive_notification', onNotification);
        socket.on('restock_updated', onRestock);
        socket.on('connect', refresh);
        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            disposed = true;
            refreshNotifications.current = () => {};
            window.clearInterval(timer);
            socket.off('receive_notification', onNotification);
            socket.off('restock_updated', onRestock);
            socket.off('connect', refresh);
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', refresh);
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

    const handleLinkedRestock = async (action) => {
        if (processingRequest) return;
        if (action === 'reject' && !requestRejectReason.trim()) {
            return toast.error('Please enter a rejection reason.');
        }
        setProcessingRequest(true);
        try {
            await axios.put(
                `http://localhost:5000/api/notifications/restock-requests/${viewingRequest.restockId}/${action}`,
                action === 'reject' ? { reason: requestRejectReason.trim() } : {},
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            const status = action === 'accept' ? 'Accepted' : 'Rejected';
            addOutcomeNotification('stock', viewingRequest.restockId, status, action === 'reject' ? requestRejectReason.trim() : '');
            setNotifications(prev => prev.map(n => n.id === viewingRequest.id
                ? { ...n, status, isRead: true, rejectReason: action === 'reject' ? requestRejectReason.trim() : null }
                : n));
            setViewingRequest(null);
            setShowRequestReject(false);
            setRequestRejectReason('');
            toast.success(action === 'accept' ? 'Stock and selected invoice updated.' : 'Stock request rejected.');
            await fetchPortalData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to process stock request.');
        } finally {
            setProcessingRequest(false);
        }
    };

    const handleAcceptPayment = async (paymentId) => {
        if (!window.confirm("Are you sure you want to accept this payment? This will update your current outstanding balance.")) return;

        setAccepting(true);
        try {
            const token = localStorage.getItem('token');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            await axios.put(`http://localhost:5000/api/supplier-payments/${paymentId}/accept`, {}, config);
            addOutcomeNotification('payment', paymentId, 'Accepted');
            refreshNotifications.current();
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
            addOutcomeNotification('payment', paymentId, 'Rejected', rejectionReason.trim());
            refreshNotifications.current();
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

    const markAsRead = async (note) => {
        if (note.isRead) return;
        const id = String(note.id);
        notificationRead.current.add(id);
        setNotifications(prev => prev.map(n => String(n.id) === id ? { ...n, isRead: true } : n));
        try {
            localStorage.setItem(`supplier-notification-read:${mySupplierId}`, JSON.stringify([...notificationRead.current]));
        } catch (err) {
            console.error('Unable to remember notification read state', err);
        }
        if (/^\d+$/.test(id)) {
            try {
                await axios.put(`http://localhost:5000/api/notifications/${id}/read`, {}, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
            } catch (err) {
                console.error('Unable to sync notification read state', err);
            }
        }
    };

    const handleChangePassword = async (event) => {
        event.preventDefault();
        if (passwordSubmitRef.current) return;
        setCurrentPasswordError('');
        const { currentPassword, newPassword, confirmPassword } = passwordForm;
        if (!currentPassword || !newPassword || !confirmPassword) return toast.error('Please fill all password fields.');
        if (newPassword.length < 8 || new TextEncoder().encode(newPassword).length > 72) {
            return toast.error('New password must have at least 8 characters and be no more than 72 UTF-8 bytes.');
        }
        if (newPassword !== confirmPassword) return toast.error('New passwords do not match.');
        if (newPassword === currentPassword) return toast.error('New password must be different from the current password.');
        const token = localStorage.getItem('token');
        if (!token) return toast.error('Please log in again to update your password.');
        passwordSubmitRef.current = true;
        setSavingPassword(true);
        try {
            await axios.put('http://localhost:5000/api/suppliers/change-password',
                { currentPassword, newPassword, confirmPassword },
                { headers: { Authorization: `Bearer ${token}` } });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            toast.success('Successfully created');
            addSupplierNotification({
                id: `supplier-${mySupplierId}-password-${Date.now()}`,
                title: 'Successfully created',
                message: 'Your new password was saved successfully.',
                type: 'success', createdAt: new Date().toISOString(), isRead: false
            }, false);
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to update password. Please try again.';
            if (/current password is incorrect|invalid (current )?password/i.test(message)) {
                setCurrentPasswordError('Invalid password');
                toast.error('Invalid password', { style: { color: '#dc2626' } });
            } else {
                toast.error(message);
            }
        } finally {
            passwordSubmitRef.current = false;
            setSavingPassword(false);
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

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'orders', label: 'Orders & GRNs', icon: Receipt },
        { id: 'returns', label: 'Returns (Debit Notes)', icon: Archive },
        { id: 'products', label: 'My Products', icon: Box },
        { id: 'requests', label: 'Stock Requests', icon: PackagePlus },
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

            <aside className={`relative my-4 ml-4 h-[calc(100vh-32px)] bg-[#343638] rounded-[32px] border border-white/10 transition-all duration-300 ease-in-out flex flex-col flex-shrink-0 z-40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] ${isCollapsed ? 'w-24' : 'w-72'}`}>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3.5 top-10 bg-[#414345] border border-white/10 rounded-full p-1.5 shadow-sm hover:bg-white/5 transition-all z-50 hover:scale-110 cursor-pointer flex items-center justify-center text-slate-200 hover:text-white"
                >
                    {isCollapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronLeft size={18} strokeWidth={2.5} />}
                </button>

                <div className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-8'} mb-8 mt-8 transition-all duration-300`}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap transition-opacity duration-300 w-full">
                            <img src={logo} alt="Ph4Life Logo" className="w-9 h-9 object-contain flex-shrink-0 drop-shadow-sm" />
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-1.5 pb-0.5">
                                    <span className="text-[22px] font-bold text-white tracking-tight">Supplier</span>
                                    <span className="text-[22px] font-black bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent tracking-tight pr-1 pb-1">Portal</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.15em] ml-0.5">Ph4Life Network</p>
                            </div>
                        </div>
                    )}
                    {isCollapsed && (
                        <img src={logo} alt="Ph4Life Logo" className="w-8 h-8 object-contain drop-shadow-sm" />
                    )}
                </div>

                <nav
                    ref={navRef}
                    onScroll={handleNavScroll}
                    className="space-y-1.5 px-4 flex-1 overflow-y-auto hide-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative z-10"
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
                                        ? 'bg-transparent text-sky-200 shadow-[inset_3px_0_0_0_#7dd3fc] border border-transparent'
                                        : 'text-slate-200 hover:bg-white/5 hover:text-white border border-transparent'
                                }`}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${!isCollapsed && 'group-hover:scale-110'}`} />
                                {!isCollapsed && (
                                    <span className="whitespace-nowrap">{label}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto border-t border-white/10 flex flex-col gap-2 relative z-10">
                    <button
                        onClick={handleSupplierLogout}
                        title="Logout"
                        className={`flex items-center justify-center gap-2 w-full py-3 bg-transparent text-rose-200 rounded-2xl hover:bg-white/5 hover:text-rose-100 transition-colors font-bold text-[14px] cursor-pointer border border-transparent ${isCollapsed ? 'px-0' : 'px-4'}`}
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
                                onClick={() => setIsDropdownOpen(prev => !prev)}
                                aria-label={`Notifications, ${unreadCount} unread`}
                                className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm flex items-center justify-center hover:bg-white transition-all relative cursor-pointer text-slate-500 hover:text-blue-600"
                            >
                                <Bell size={18} strokeWidth={2.5} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-blue-600 motion-safe:animate-pulse border-2 border-white text-white text-[10px] font-bold flex items-center justify-center" aria-live="polite">
                                        {unreadCount}
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

                                                if(note.title?.includes('Low Stock')) { iconColor = 'text-orange-500'; bgColor = 'bg-orange-50'; Icon = AlertTriangle; }
                                                if(note.title?.includes('Return') || note.title?.includes('Debit')) { iconColor = 'text-rose-500'; bgColor = 'bg-rose-50'; Icon = ArrowRightLeft; }
                                                if(note.title?.includes('Refill') || note.title?.includes('Request')) { iconColor = 'text-emerald-500'; bgColor = 'bg-emerald-50'; Icon = PackagePlus; }

                                                return (
                                                    <button type="button" key={note.id} onClick={() => markAsRead(note)}
                                                            aria-label={`${note.title}. ${note.isRead ? 'Read' : 'Mark as read'}`}
                                                            className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 items-start cursor-pointer ${note.isRead ? 'bg-white' : 'bg-blue-50/40'}`}>
                                                        <div className={`p-2 rounded-full ${bgColor} ${iconColor} shrink-0 mt-0.5`}>
                                                            <Icon size={14} strokeWidth={2.5}/>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-700 mb-1 leading-tight">{note.title}</p>
                                                            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{note.message}</p>
                                                            <p className="text-[9px] text-slate-400 mt-2 font-bold">{new Date(note.time || note.createdAt).toLocaleString()}</p>
                                                        </div>
                                                    </button>
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
                            <motion.div key="dashboard" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="relative font-sans z-20 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4 space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">Dashboard</h1>
                                        <p className="text-[12px] font-medium text-slate-400 mt-1.5">Supplier Management Portal</p>
                                    </div>
                                </div>
                                <div className="relative overflow-hidden bg-white/30 backdrop-blur-2xl px-8 py-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex items-center justify-between mb-2">
                                    <div className="absolute top-[-50%] right-[-5%] w-[300px] h-[300px] bg-gradient-to-br from-sky-200/20 to-slate-200/20 rounded-full blur-[60px] pointer-events-none"></div>
                                    <div className="absolute bottom-[-50%] right-[15%] w-[200px] h-[200px] bg-gradient-to-br from-slate-200/30 to-sky-200/20 rounded-full blur-[50px] pointer-events-none"></div>

                                    <div className="relative z-10">
                                        <h2 className="text-[24px] font-bold text-[#1e293b] tracking-tight mb-2 flex items-center gap-2">
                                            Welcome back, {supplierInfo?.companyName || user?.name || 'Supplier'}! <span className="animate-bounce inline-block origin-bottom-right">👋</span>
                                        </h2>
                                        <p className="text-[14px] text-slate-600 font-medium max-w-xl leading-relaxed">
                                            You've supplied <strong className="text-sky-600">{purchases.length} orders</strong>, with a total invoice value of <strong className="text-emerald-600">LKR {Number(totalRevenue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>. Review your payments and deliveries.{' '}
                                            <button onClick={() => setActiveTab('orders')} className="inline-flex items-center gap-1 font-bold text-sky-600 hover:text-sky-700 cursor-pointer">View orders <ChevronRight size={14}/></button>
                                        </p>
                                    </div>

                                    <div className="hidden md:flex relative z-10 w-48 h-40 items-center justify-center mr-4">
                                        <img
                                            src={supplierBanner}
                                            alt="Supplier delivery illustration"
                                            className="w-full h-full object-contain drop-shadow-md hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="h-[240px] min-w-0">
                                        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-blue-500 to-sky-400 p-8 rounded-[28px] text-white shadow-[0_16px_32px_-12px_rgba(99,102,241,0.4)] flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1 h-full cursor-default border border-white/20">
                                            <div className="absolute top-[-40%] right-[-20%] w-[250px] h-[250px] rounded-full border-[30px] border-white/10 pointer-events-none"></div>
                                            <div className="absolute top-[-20%] right-[-40%] w-[350px] h-[350px] rounded-full border-[40px] border-white/5 pointer-events-none"></div>

                                            <div className="relative z-10 mt-2">
                                                <p className="text-white/80 font-medium tracking-wide text-[14px] mb-2">Total Invoice Value</p>
                                                <h3 className="text-[36px] font-extrabold tracking-tight leading-none drop-shadow-sm">
                                                    LKR {Number(totalRevenue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                </h3>
                                            </div>

                                            <div className="relative z-10 mt-auto flex justify-between items-end w-full pb-1">
                                                <div>
                                                    <p className="text-white/70 text-[10px] font-bold tracking-widest uppercase mb-1 drop-shadow-sm">Supplier</p>
                                                    <p className="text-white/90 font-bold text-[15px] tracking-widest drop-shadow-sm uppercase">
                                                        {supplierInfo?.companyName || user?.name || 'Supplier'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white/40 backdrop-blur-xl p-6 rounded-[28px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/60 flex flex-col items-center justify-between h-[240px] min-w-0 transition-transform duration-300 hover:-translate-y-1">
                                        <div className="w-full">
                                            <h3 className="text-[14px] font-bold text-slate-800 mb-1">Collection Rate</h3>
                                            <p className="text-[11px] text-slate-400">From total revenue</p>
                                        </div>
                                        <div className="relative w-[130px] h-[130px] flex items-center justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={finalGaugeData} cx="50%" cy="50%" startAngle={225} endAngle={-45} innerRadius={45} outerRadius={60} dataKey="value" stroke="none" cornerRadius={20}>
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

                                    <div className="bg-white/40 backdrop-blur-xl p-6 rounded-[28px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/60 flex flex-col h-[240px] min-w-0 transition-transform duration-300 hover:-translate-y-1">
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
                                                        <Pie data={[{value: totalRevenue > 0 ? totalRevenue : 1}]} cx="50%" cy="50%" innerRadius={36} outerRadius={48} dataKey="value" stroke="none" fill={totalRevenue > 0 ? "#10b981" : "#e2e8f0"} />
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
                                <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 overflow-hidden mt-6">
                                    <div className="p-8 pb-6 border-b border-white/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-[18px] font-bold text-slate-800 flex items-center gap-2">
                                                <ArrowRightLeft className="text-blue-500" size={20}/> Revenue & Deductions Ledger
                                            </h3>
                                            <p className="text-[12px] font-medium text-slate-500 mt-1">Comprehensive record of all your incoming payments and refund deductions.</p>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto px-8 py-4">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead>
                                            <tr className="border-b border-white/30 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2 w-[15%]">Date</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2 w-[20%]">Type</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2 w-[35%]">Details & Notes</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2 w-[15%] text-right">Amount (LKR)</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2 w-[15%] text-center">Status</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {loading ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">Loading...</td></tr> :
                                                allTransactions.length === 0 ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">No Transactions Found.</td></tr> :
                                                    allTransactions.map(txn => (
                                                        <tr key={txn.id} className="group hover:bg-white/20 transition-colors border-b border-white/20 last:border-0">
                                                            <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[13px] text-slate-600 font-medium">{new Date(txn.date).toLocaleDateString()}</td>
                                                            <td className="px-3 first:pl-0 last:pr-0 py-4 align-top">
                                                                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${txn.isDeduction ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                        {txn.type}
                                                                    </span>
                                                            </td>
                                                            <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[12px] text-slate-600 leading-relaxed max-w-[250px] truncate" title={txn.details}>{txn.details}</td>
                                                            <td className={`px-3 first:pl-0 last:pr-0 py-4 align-top text-[14px] font-bold text-right ${txn.isDeduction ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                {txn.isDeduction ? '-' : '+'}{txn.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                            </td>
                                                            <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-center">
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

                                <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 overflow-hidden mb-8">
                                    <div className="overflow-x-auto px-8 py-4">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead>
                                            <tr className="border-b border-white/30 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2">Payment Date</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2">Notes</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2">Status</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2 text-right">Amount (LKR)</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2 text-center">Action</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {loading ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">Loading...</td></tr> :
                                                payments.length === 0 ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">No Payment Records Found.</td></tr> :
                                                    payments.map(pay => (
                                                        <tr key={pay.id} className={`group hover:bg-white/20 transition-colors border-b border-white/20 last:border-0 ${pay.status === 'Pending' ? 'bg-amber-50/30' : ''} ${pay.status === 'Rejected' ? 'bg-rose-50/30' : ''}`}>
                                                            <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[13px] text-slate-600 font-medium">{new Date(pay.paymentDate).toLocaleDateString()}</td>
                                                            <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[12px] text-slate-500 max-w-[200px] truncate">{pay.notes || '-'}</td>
                                                            <td className="px-3 first:pl-0 last:pr-0 py-4 align-top">
                                                                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${pay.status === 'Pending' ? 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse' : pay.status === 'Rejected' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                                    {pay.status || 'Accepted'}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[14px] font-bold text-slate-800 text-right">
                                                                {Number(pay.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                            </td>
                                                            <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-center">
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

                                <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 overflow-hidden flex-1">
                                    <div className="overflow-x-auto px-8 py-4">
                                        <table className="w-full text-left border-collapse min-w-[700px]">
                                            <thead>
                                            <tr className="border-b border-white/30 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2">Invoice / GRN No</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2">Invoice Date</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2">Due Date</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2">Notes</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2 text-right">Total Amount (LKR)</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {loading ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">Loading...</td></tr> :
                                                filteredPurchases.length === 0 ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">No Orders Found.</td></tr> :
                                                    filteredPurchases.map(p => {
                                                        const isOverdue = p.paymentStatus !== 'Paid' && new Date(p.dueDate) < new Date();
                                                        return (
                                                            <tr key={p.id} className={`group hover:bg-white/20 transition-colors border-b border-white/20 last:border-0 ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                                                                <td className="px-3 first:pl-0 last:pr-0 py-4 align-top">
                                                                    <p className="font-bold text-[14px] text-blue-700">{p.invoiceNumber}</p>
                                                                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{p.grnNumber}</p>
                                                                </td>
                                                                <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[13px] text-slate-600 font-medium">{new Date(p.invoiceDate).toLocaleDateString()}</td>
                                                                <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[13px] font-bold flex flex-col gap-1 mt-1.5">
                                                                    <span className={isOverdue ? 'text-rose-600' : 'text-slate-600'}>{new Date(p.dueDate).toLocaleDateString()}</span>
                                                                    {isOverdue && <span className="text-[9px] uppercase tracking-wider bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded w-max">Overdue</span>}
                                                                </td>
                                                                <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[12px] text-slate-500">{p.notes || '-'}</td>
                                                                <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[14px] font-bold text-slate-800 text-right">{Number(p.totalAmount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
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

                                <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 overflow-hidden flex-1">
                                    <div className="overflow-x-auto px-8 py-4">
                                        <table className="w-full text-left border-collapse min-w-[700px]">
                                            <thead>
                                            <tr className="border-b border-white/30 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2 w-[25%]">Medicine Details</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2 w-[15%]">Return Date</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2 w-[35%]">Reason</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2 w-[15%] text-right">Debit Value (LKR)</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2 w-[10%] text-center">Status</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {loading ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">Loading...</td></tr> :
                                                filteredReturns.length === 0 ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">No Returns Found.</td></tr> :
                                                    filteredReturns.map(r => (
                                                        <tr key={r.id} className="group hover:bg-white/20 transition-colors border-b border-white/20 last:border-0">
                                                            <td className="px-3 first:pl-0 last:pr-0 py-4 align-top">
                                                                <p className="font-bold text-[14px] text-slate-800">{r.medicineName}</p>
                                                                <p className="text-[11px] text-slate-500 font-mono mt-0.5">Batch: {r.batchNumber || 'N/A'} | Qty: {r.quantity}</p>
                                                            </td>
                                                            <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[13px] text-slate-600 font-medium">{new Date(r.createdAt).toLocaleDateString()}</td>
                                                            <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[12px] text-slate-600 leading-relaxed max-w-[250px]">{r.reason || 'Returned as per policy.'}</td>
                                                            <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[14px] font-bold text-rose-600 text-right">-{Number(r.totalValue).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                            <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-center">
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
                                <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 overflow-hidden">
                                    <div className="overflow-x-auto px-8 py-4">
                                        <table className="w-full text-left border-collapse min-w-[700px]">
                                            <thead>
                                            <tr className="border-b border-white/30 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2">Medicine Name</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2">Generic Name</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2">Category</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2">Barcode</th>
                                                <th className="px-3 first:pl-0 last:pr-0 pb-4 pt-2 text-center">Stock Level</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {loading ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">Loading...</td></tr> :
                                                products.length === 0 ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">No Products Supplied Yet.</td></tr> :
                                                    products.map(prod => {
                                                        const isLowStock = Number(prod.quantity) <= Number(prod.minStockLevel || 10);

                                                        return (
                                                            <tr key={prod.id} className={`group hover:bg-white/20 transition-colors border-b border-white/20 last:border-0 ${isLowStock ? 'bg-orange-50/30' : ''}`}>
                                                                <td className="px-3 first:pl-0 last:pr-0 py-4 align-top font-bold text-[14px] text-slate-800">{prod.name}</td>
                                                                <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[13px] text-slate-600">{prod.genericName || '-'}</td>
                                                                <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[13px] text-slate-600">
                                                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[11px] font-bold">{prod.category || '-'}</span>
                                                                </td>
                                                                <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-[12px] text-slate-500 font-mono">{prod.barcode || '-'}</td>
                                                                <td className="px-3 first:pl-0 last:pr-0 py-4 align-top text-center text-[13px] font-bold">
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

                                <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 p-8 space-y-8">
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
                                    <form onSubmit={handleChangePassword} className="space-y-4">
                                        <h3 className="text-[12px] font-extrabold text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Change Password</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {[
                                                ['currentPassword', 'Current Password', 'current-password'],
                                                ['newPassword', 'New Password', 'new-password'],
                                                ['confirmPassword', 'Confirm New Password', 'new-password']
                                            ].map(([name, label, autoComplete]) => (
                                                <div key={name}>
                                                    <label htmlFor={`supplier-${name}`} className="block text-[12px] font-bold text-slate-500 mb-2">{label}</label>
                                                    <input id={`supplier-${name}`} name={name} type="password" autoComplete={autoComplete}
                                                           required disabled={savingPassword} value={passwordForm[name]}
                                                           aria-invalid={name === 'currentPassword' && Boolean(currentPasswordError)}
                                                           aria-describedby={name === 'currentPassword' && currentPasswordError ? 'supplier-current-password-error' : undefined}
                                                           onChange={e => {
                                                               setPasswordForm(prev => ({ ...prev, [name]: e.target.value }));
                                                               if (name === 'currentPassword') setCurrentPasswordError('');
                                                           }}
                                                           className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/80 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60" />
                                                    {name === 'currentPassword' && currentPasswordError && (
                                                        <p id="supplier-current-password-error" role="alert" className="mt-2 text-[12px] font-semibold text-red-600">{currentPasswordError}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[12px] text-slate-500">Use at least 8 characters for your new password.</p>
                                        <button type="submit" disabled={savingPassword}
                                                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                                            {savingPassword ? 'Updating...' : 'Update Password'}
                                        </button>
                                    </form>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'requests' && (
                            <motion.div key="requests" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-7xl mx-auto pb-10 relative z-20">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                                    <div>
                                        <h2 className="text-[24px] font-bold text-slate-800 flex items-center gap-2"><PackagePlus className="text-blue-500"/> Stock Requests</h2>
                                        <p className="text-[13px] font-medium text-slate-500 mt-1">Review and process stock refill requests from the pharmacy.</p>
                                    </div>
                                    <button onClick={() => handleGenerateReport('Stock Requests')} className="flex shrink-0 items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm cursor-pointer">
                                        <Download size={16} className="text-blue-500" /> Generate Report
                                    </button>
                                </div>

                                <div className="bg-white/90 backdrop-blur-md rounded-[24px] border border-slate-200 shadow-sm overflow-hidden mb-8">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                <th className="p-4 w-[15%]">Date</th>
                                                <th className="p-4 w-[25%]">Request Title</th>
                                                <th className="p-4 w-[40%]">Details</th>
                                                <th className="p-4 w-[10%] text-center">Status</th>
                                                <th className="p-4 w-[10%] text-center">Action</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {loading ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">Loading...</td></tr> :
                                                notifications.filter(n => n.title?.includes('Request') || n.title?.includes('Refill')).length === 0 ? <tr><td colSpan="5" className="text-center py-10 text-slate-400">No Requests Found.</td></tr> :
                                                    notifications.filter(n => n.title?.includes('Request') || n.title?.includes('Refill')).map((req, idx) => (
                                                        <tr key={req.id || idx} className={`border-b border-slate-100 hover:bg-slate-50/80 ${req.status === 'Accepted' ? 'bg-emerald-50/30' : req.status === 'Rejected' ? 'bg-rose-50/30' : 'bg-amber-50/30'}`}>
                                                            <td className="p-4 text-[13px] text-slate-600 font-medium">{new Date(req.time || req.createdAt).toLocaleDateString()}</td>
                                                            <td className="p-4 text-[13px] font-bold text-slate-800">{req.title}</td>
                                                            <td className="p-4 text-[12px] text-slate-500">{req.message}</td>
                                                            <td className="p-4 text-center">
                                                                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${req.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : req.status === 'Rejected' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse'}`}>
                                                                    {req.status || 'Pending'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <button
                                                                    onClick={() => {
                                                                        setViewingRequest(req);
                                                                        setShowRequestReject(false);
                                                                        setRequestRejectReason('');
                                                                    }}
                                                                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer shadow-sm ${req.status === 'Accepted' || req.status === 'Rejected' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md'}`}
                                                                >
                                                                    <Eye size={14}/> {req.status === 'Accepted' || req.status === 'Rejected' ? 'View' : 'Review'}
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
                    </AnimatePresence>
                </main>
            </div>

            {isProfileOpen && (
                <div className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-sm transition-opacity" onClick={() => setIsProfileOpen(false)}></div>
            )}
            <aside className={`fixed top-4 right-4 h-[calc(100vh-32px)] w-80 bg-white/95 backdrop-blur-md rounded-[32px] border border-slate-200 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] z-50 transform transition-transform duration-300 ease-in-out ${isProfileOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}>
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
                    <div className="space-y-5 border-t border-slate-100 pt-6">
                        {[
                            ['Company Name', supplierInfo?.companyName || user?.name],
                            ['Medical Rep Name', supplierInfo?.repName],
                            ['Contact Number', supplierInfo?.contactNumber],
                            ['Email Address', supplierInfo?.email || user?.email],
                            ['Company Address', supplierInfo?.address],
                            ['BR Number', supplierInfo?.brNumber],
                            ['Account Status', supplierInfo?.status]
                        ].map(([label, value]) => (
                            <div key={label}>
                                <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">{label}</p>
                                <p className="text-[13px] font-semibold text-slate-700 break-words">{value || '—'}</p>
                            </div>
                        ))}
                        <button type="button" onClick={() => { setActiveTab('profile'); setSearchQuery(''); setIsProfileOpen(false); }}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 font-bold text-[13px] hover:bg-blue-100 transition-colors cursor-pointer">
                            <Building2 size={16} /> Company Profile
                        </button>
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

                        <div className={`flex-1 overflow-y-auto bg-slate-100 rounded-2xl border border-slate-200 flex justify-center items-center p-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${!showRejectInput ? 'mb-4' : 'mb-2 h-[200px]'}`}>
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

            {viewingRequest && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white w-full max-w-[500px] flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="px-6 pt-6 pb-4 flex justify-between items-center flex-shrink-0">
                            <div>
                                <h2 className="text-[20px] font-bold text-slate-800 flex items-center gap-2.5">
                                    <PackagePlus className="text-blue-500 w-6 h-6"/> Review Stock Request
                                </h2>
                                <p className="text-[12px] font-medium text-slate-500 mt-0.5">Review this stock request from the pharmacy.</p>
                            </div>
                            <button onClick={() => setViewingRequest(null)} className="hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="px-6 pb-6 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {(() => {
                                const matchedProduct = viewingRequest.restockId
                                    ? products.find(p => String(p.id) === String(viewingRequest.medicineId))
                                    : products.find(p =>
                                        (viewingRequest.title && viewingRequest.title.toLowerCase().includes(p.name.toLowerCase())) ||
                                        (viewingRequest.message && viewingRequest.message.toLowerCase().includes(p.name.toLowerCase())) ||
                                        (viewingRequest.medicineId && String(viewingRequest.medicineId) === String(p.id))
                                    );
                                const qtyMatch = (viewingRequest.message && viewingRequest.message.match(/Quantity Needed:\s*(\d+)/i)) ||
                                    (viewingRequest.title && viewingRequest.title.match(/Quantity:\s*(\d+)/i));
                                const requestedQty = qtyMatch ? qtyMatch[1] : (matchedProduct?.quantity || 'N/A');

                                return (
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6">
                                        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                                            <PackagePlus className="text-blue-500" size={18}/>
                                            <h3 className="text-[14px] font-extrabold text-slate-800">Requested Item Details</h3>
                                        </div>
                                        {matchedProduct ? (
                                            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Medicine (Brand Name)</label>
                                                    <p className="text-[13px] font-bold text-slate-800">{matchedProduct.name}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Generic Name (Locked)</label>
                                                    <p className="text-[13px] font-bold text-slate-800">{matchedProduct.genericName || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category (Locked)</label>
                                                    <p className="text-[13px] font-bold text-slate-800">{matchedProduct.category || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dosage / Strength</label>
                                                    <p className="text-[13px] font-bold text-slate-800">{matchedProduct.dosage || '-'}</p>
                                                </div>
                                                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                                                    <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Requested Stock Qty</label>
                                                    <p className="text-[16px] font-black text-emerald-700">{requestedQty}</p>
                                                </div>
                                                <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                                                    <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Cost (Your Income / Unit)</label>
                                                    <p className="text-[16px] font-black text-blue-700">LKR {Number(matchedProduct.costPrice).toFixed(2)}</p>
                                                </div>
                                                <div className="col-span-2 pt-2 border-t border-slate-200">
                                                    <p className="text-[12px] text-slate-500 leading-relaxed font-medium">
                                                        <span className="font-bold text-slate-600">Request Note: </span>
                                                        {viewingRequest.message}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-[13px] text-slate-600 leading-relaxed">{viewingRequest.message}</p>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-slate-400 mt-4 font-bold text-right">{new Date(viewingRequest.time || viewingRequest.createdAt).toLocaleString()}</p>
                                    </div>
                                );
                            })()}

                            {showRequestReject && (!viewingRequest.status || viewingRequest.status === 'Pending') && (
                                <div className="mb-4 bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                                    <label className="block text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <AlertTriangle size={14}/> Reason for Rejection *
                                    </label>
                                    <textarea
                                        className="w-full px-3 py-2.5 bg-white border border-rose-200 rounded-xl text-[13px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-rose-400/40 resize-none h-20"
                                        placeholder="State why you cannot fulfill this request (e.g., Out of stock, Discontinued...)"
                                        value={requestRejectReason}
                                        onChange={(e) => setRequestRejectReason(e.target.value)}
                                    ></textarea>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => setShowRequestReject(false)}
                                            className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[12px] font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (viewingRequest.restockId) {
                                                    await handleLinkedRestock('reject');
                                                    return;
                                                }
                                                if (!requestRejectReason.trim()) {
                                                    toast.error('Please enter a rejection reason.');
                                                    return;
                                                }
                                                setProcessingRequest(true);
                                                try {
                                                    const matchedProduct = products.find(p =>
                                                        (viewingRequest.title && viewingRequest.title.toLowerCase().includes(p.name.toLowerCase())) ||
                                                        (viewingRequest.message && viewingRequest.message.toLowerCase().includes(p.name.toLowerCase())) ||
                                                        (viewingRequest.medicineId && String(viewingRequest.medicineId) === String(p.id))
                                                    );

                                                    if(matchedProduct) {
                                                        await axios.put(`http://localhost:5000/api/medicines/${matchedProduct.id}`, {
                                                            quantity: matchedProduct.quantity,
                                                            costPrice: matchedProduct.costPrice,
                                                            sellingPrice: matchedProduct.sellingPrice,
                                                            expiryDate: matchedProduct.expiryDate,
                                                            minStockLevel: matchedProduct.minStockLevel,
                                                            rejectionReason: requestRejectReason
                                                        }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                                                    } else {
                                                        toast.error("Error: Connected medicine not found in your catalog.");
                                                        setProcessingRequest(false);
                                                        return;
                                                    }

                                                    setNotifications(prev => prev.map(n => n.id === viewingRequest.id ? { ...n, status: 'Rejected', rejectReason: requestRejectReason } : n));
                                                    addOutcomeNotification('stock', viewingRequest.id, 'Rejected', requestRejectReason.trim());
                                                    toast.error("Stock Request Rejected. Pharmacy has been notified.");
                                                    setViewingRequest(null);
                                                    setShowRequestReject(false);
                                                    setRequestRejectReason('');
                                                } catch (err) {
                                                    toast.error("Error rejecting request.");
                                                } finally {
                                                    setProcessingRequest(false);
                                                }
                                            }}
                                            disabled={processingRequest}
                                            className="flex-1 py-2 bg-rose-500 text-white rounded-lg text-[12px] font-bold hover:bg-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            {processingRequest ? 'Rejecting...' : 'Confirm Rejection'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(!viewingRequest.status || viewingRequest.status === 'Pending') && !showRequestReject && (
                                <div className="flex-shrink-0 flex gap-3">
                                    <button
                                        onClick={() => setShowRequestReject(true)}
                                        disabled={isAccountInactive}
                                        className="flex-1 flex items-center justify-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold py-3.5 rounded-2xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Reject Request
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (viewingRequest.restockId) {
                                                await handleLinkedRestock('accept');
                                                return;
                                            }
                                            setProcessingRequest(true);
                                            try {
                                                const matchedProduct = products.find(p =>
                                                    (viewingRequest.title && viewingRequest.title.toLowerCase().includes(p.name.toLowerCase())) ||
                                                    (viewingRequest.message && viewingRequest.message.toLowerCase().includes(p.name.toLowerCase())) ||
                                                    (viewingRequest.medicineId && String(viewingRequest.medicineId) === String(p.id))
                                                );

                                                if (matchedProduct) {
                                                    const qtyMatch = (viewingRequest.message && viewingRequest.message.match(/Quantity Needed:\s*(\d+)/i)) ||
                                                        (viewingRequest.title && viewingRequest.title.match(/Quantity:\s*(\d+)/i));
                                                    const requestedQty = qtyMatch ? parseInt(qtyMatch[1], 10) : parseInt(matchedProduct.minStockLevel || 50, 10);

                                                    await axios.put(`http://localhost:5000/api/medicines/${matchedProduct.id}`, {
                                                        quantity: Number(matchedProduct.quantity) + requestedQty,
                                                        costPrice: matchedProduct.costPrice,
                                                        sellingPrice: matchedProduct.sellingPrice,
                                                        expiryDate: matchedProduct.expiryDate,
                                                        minStockLevel: matchedProduct.minStockLevel,
                                                        rejectionReason: null
                                                    }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

                                                    fetchPortalData();
                                                } else {
                                                    toast.error("Error: Connected medicine not found in your catalog.");
                                                    setProcessingRequest(false);
                                                    return;
                                                }

                                                setNotifications(prev => prev.map(n => n.id === viewingRequest.id ? { ...n, status: 'Accepted' } : n));
                                                addOutcomeNotification('stock', viewingRequest.id, 'Accepted');
                                                toast.success("Stock Request Accepted! Inventory Updated.");
                                                setViewingRequest(null);
                                            } catch(err) {
                                                toast.error("Error accepting request.");
                                            } finally {
                                                setProcessingRequest(false);
                                            }
                                        }}
                                        disabled={processingRequest || isAccountInactive}
                                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <CheckCircle size={18} /> {processingRequest ? 'Processing...' : 'Accept Request'}
                                    </button>
                                </div>
                            )}

                            {viewingRequest.status === 'Accepted' && (
                                <div className="flex-shrink-0 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex justify-center items-center gap-2 mt-4">
                                    <CheckCircle size={16} className="text-emerald-500" />
                                    <span className="text-[13px] font-bold text-emerald-700">Request Already Accepted</span>
                                </div>
                            )}

                            {viewingRequest.status === 'Rejected' && (
                                <div className="flex-shrink-0 bg-rose-50 border border-rose-100 rounded-2xl p-4 flex flex-col gap-1.5 mt-4">
                                    <div className="flex items-center gap-2 text-rose-600 font-bold text-[13px]">
                                        <X size={16} /> Request Rejected
                                    </div>
                                    <p className="text-[12px] text-slate-600 font-medium">
                                        <span className="font-bold text-slate-700">Reason:</span> {viewingRequest.rejectReason || 'No reason provided.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

