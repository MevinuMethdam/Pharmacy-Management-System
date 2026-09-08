import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
    Truck, LogOut, Package, DollarSign, Clock, CheckCircle,
    Building2, Mail, LayoutDashboard, Receipt, CreditCard,
    Box, UserCircle, ChevronRight, Calendar, AlertCircle,
    Search, MapPin, Phone, Banknote, Eye, X, FileText
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

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

    const [viewingReceipt, setViewingReceipt] = useState(null);
    const [accepting, setAccepting] = useState(false);

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

    const totalOutstanding = supplierInfo?.totalOutstanding || 0;
    const creditPeriodDays = supplierInfo?.creditPeriod || 30;

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
        { id: 'profile', label: 'Company Profile', icon: UserCircle },
    ];

    const filteredPurchases = purchases.filter(p =>
        p.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.grnNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-[280px] bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 flex-shrink-0">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30 text-white">
                        <Truck size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-[18px] font-black text-slate-800 tracking-tight leading-none">Supplier Portal</h1>
                        <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mt-1">Ph4Life Network</p>
                    </div>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button key={item.id} onClick={() => { setActiveTab(item.id); setSearchQuery(''); }}
                                    className={`flex items-center justify-between w-full p-3.5 rounded-2xl transition-all font-bold text-[13px] cursor-pointer ${
                                        isActive ? 'bg-sky-50 text-sky-700 border border-sky-100 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
                                    }`}>
                                <div className="flex items-center gap-3"><Icon size={18} className={isActive ? 'text-sky-600' : 'text-slate-400'} strokeWidth={isActive ? 2.5 : 2} /> {item.label}</div>
                                {isActive && <ChevronRight size={16} className="text-sky-400" />}
                            </button>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[11px] font-bold text-slate-600 uppercase">System Active</span>
                        </div>
                        <p className="text-[12px] font-medium text-slate-500 truncate">Rep: <span className="font-bold text-slate-700">{supplierInfo?.repName || user?.name}</span></p>
                    </div>
                    <button onClick={logout} className="flex items-center justify-center gap-2 w-full p-3.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors font-bold text-[13px] cursor-pointer">
                        <LogOut size={16} /> Secure Logout
                    </button>
                </div>
            </aside>

            <main className="flex-1 h-screen overflow-y-auto bg-slate-50/50 p-4 md:p-8">

                {activeTab === 'dashboard' && (
                    <div className="space-y-6 max-w-6xl mx-auto animation-fade-in pb-10">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <h2 className="text-[24px] font-black text-slate-800">Overview</h2>
                                <p className="text-[13px] font-medium text-slate-500">Welcome back, {supplierInfo?.companyName || user?.name}. Here is your financial summary.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-rose-500 to-orange-500 p-6 rounded-[32px] text-white shadow-lg shadow-rose-500/20 flex flex-col justify-between">
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
                                    <Clock className="text-sky-500" size={20} /> Recent Deliveries (GRNs)
                                </h3>
                                <button onClick={() => setActiveTab('orders')} className="text-[12px] font-bold text-sky-600 hover:text-sky-700 cursor-pointer">
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
                                                    <td className="py-4 font-mono font-bold text-sky-700">{p.invoiceNumber}</td>
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
                                <h2 className="text-[24px] font-black text-slate-800 flex items-center gap-2"><CreditCard className="text-sky-500"/> Payments</h2>
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
                                                <tr key={pay.id} className={`border-b border-slate-100 hover:bg-slate-50 ${pay.status === 'Pending' ? 'bg-amber-50/30' : ''}`}>
                                                    <td className="p-4 text-[13px] text-slate-600 font-medium">{new Date(pay.paymentDate).toLocaleDateString()}</td>
                                                    <td className="p-4 text-[12px] text-slate-500 max-w-[200px] truncate">{pay.notes || '-'}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${pay.status === 'Pending' ? 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                            {pay.status || 'Accepted'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-[14px] font-black text-slate-800 text-right">
                                                        {Number(pay.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={() => setViewingReceipt(pay)}
                                                            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer shadow-sm ${
                                                                pay.status === 'Pending'
                                                                    ? 'bg-sky-500 text-white hover:bg-sky-600 hover:shadow-md'
                                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                            }`}
                                                        >
                                                            <Eye size={14}/> {pay.status === 'Pending' ? 'Review & Accept' : 'View Receipt'}
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
                            <h2 className="text-[24px] font-black text-slate-800 flex items-center gap-2"><Receipt className="text-sky-500"/> Orders & GRNs</h2>
                            <div className="relative w-full md:w-72">
                                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input type="text" placeholder="Search Invoice or GRN..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                       className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400" />
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
                                                        <p className="font-bold text-[14px] text-sky-700">{p.invoiceNumber}</p>
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
                        <h2 className="text-[24px] font-black text-slate-800 mb-6 flex items-center gap-2"><Box className="text-sky-500"/> My Products</h2>
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
                            <h2 className="text-[24px] font-black text-slate-800 flex items-center gap-2"><Building2 className="text-sky-500"/> Company Profile</h2>
                        </div>

                        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 space-y-8">
                            <div>
                                <h3 className="text-[12px] font-extrabold text-sky-600 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">General Information</h3>
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
                                <h3 className="text-[12px] font-extrabold text-sky-600 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Bank & Financial Details</h3>
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

            {viewingReceipt && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white/90 backdrop-blur-2xl p-6 rounded-[32px] shadow-2xl border border-white w-full max-w-[600px] flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <div>
                                <h2 className="text-[20px] font-bold text-slate-800 flex items-center gap-2.5">
                                    <FileText className="text-sky-500 w-6 h-6"/> Payment Receipt
                                </h2>
                                <p className="text-[12px] font-medium text-slate-500 mt-0.5">Payment Amount: <span className="font-bold text-emerald-600">LKR {Number(viewingReceipt.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></p>
                            </div>
                            <button onClick={() => setViewingReceipt(null)} className="hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-100 rounded-2xl border border-slate-200 flex justify-center items-center p-2 mb-4">
                            {viewingReceipt.receiptImage ? (
                                <iframe
                                    src={viewingReceipt.receiptImage}
                                    className="w-full h-[400px] rounded-xl bg-white"
                                    title="Receipt Document"
                                />
                            ) : (
                                <p className="text-slate-400 font-medium text-sm">No receipt document attached.</p>
                            )}
                        </div>

                        {viewingReceipt.status === 'Pending' ? (
                            <div className="flex-shrink-0 flex flex-col gap-2">
                                <button
                                    onClick={() => handleAcceptPayment(viewingReceipt.id)}
                                    disabled={accepting}
                                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <CheckCircle size={18} /> {accepting ? 'Processing...' : 'Accept Payment & Update Balance'}
                                </button>
                                <p className="text-[11px] text-slate-500 text-center font-medium">Clicking this will accept the payment and reduce your outstanding balance.</p>
                            </div>
                        ) : (
                            <div className="flex-shrink-0 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex justify-center items-center gap-2">
                                <CheckCircle size={16} className="text-emerald-500" />
                                <span className="text-[13px] font-bold text-emerald-700">Payment Already Accepted</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}