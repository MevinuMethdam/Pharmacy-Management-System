import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Truck, LogOut, Package, DollarSign, Clock, CheckCircle, Building2, Mail } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function SupplierDashboard() {
    const { logout, user } = useContext(AuthContext);
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPersonalizedData();
    }, []);

    const fetchPersonalizedData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            const res = await axios.get('http://localhost:5000/api/purchases/my-purchases', config);
            setPurchases(res.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load your personalized orders');
        } finally {
            setLoading(false);
        }
    };

    const totalSpent = purchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center border border-sky-100 shadow-sm">
                        <Truck className="text-sky-600" size={20} />
                    </div>
                    <div>
                        <h1 className="text-[18px] font-extrabold text-slate-800 tracking-tight">Supplier Portal</h1>
                        <p className="text-[11px] font-bold text-sky-500 uppercase tracking-widest">Kegalle Ph4Life Distributor Network</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[14px] font-extrabold text-slate-800">{user?.name || 'Distributor Partner'}</span>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Portal
                        </span>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2.5 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer border border-rose-100 shadow-sm"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
                <div className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 p-8 rounded-[32px] text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold uppercase tracking-wider mb-3 border border-white/20">
                            <Building2 size={13} /> Verified Supplier Account
                        </div>
                        <h2 className="text-[30px] font-black tracking-tight mb-1">{user?.name}</h2>
                        <p className="text-white/80 text-[14px] font-medium flex items-center gap-2">
                            <Mail size={15} /> {user?.email}
                        </p>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 flex items-center gap-4 flex-1 md:flex-initial">
                            <Package size={28} className="text-white" />
                            <div>
                                <p className="text-[10px] uppercase font-bold tracking-wider text-white/70">Your Total Orders</p>
                                <p className="text-[22px] font-black">{purchases.length}</p>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 flex items-center gap-4 flex-1 md:flex-initial">
                            <DollarSign size={28} className="text-white" />
                            <div>
                                <p className="text-[10px] uppercase font-bold tracking-wider text-white/70">Total Value</p>
                                <p className="text-[18px] font-black">LKR {totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
                    <h3 className="text-[18px] font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Clock className="text-sky-500" size={20} /> Your Purchase Orders & GRN History
                    </h3>

                    {loading ? (
                        <div className="text-center py-12 text-slate-400 font-medium">Loading your records...</div>
                    ) : purchases.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            No purchase orders found specifically assigned to your account yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="pb-3">PO / GRN ID</th>
                                    <th className="pb-3">Invoice Date</th>
                                    <th className="pb-3">Payment Term</th>
                                    <th className="pb-3">Total Amount (LKR)</th>
                                    <th className="pb-3">Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {purchases.map((p) => (
                                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="py-4 font-mono font-bold text-slate-700">PO-{String(p.id).padStart(4, '0')}</td>
                                        <td className="py-4 text-[13px] text-slate-600">{new Date(p.invoiceDate || p.createdAt).toLocaleDateString()}</td>
                                        <td className="py-4 text-[13px] font-semibold text-slate-700">{p.paymentTerm || 'Credit'}</td>
                                        <td className="py-4 text-[14px] font-black text-slate-800">LKR {Number(p.totalAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="py-4">
                                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-bold border border-emerald-100 inline-flex items-center gap-1">
                                                    <CheckCircle size={12} /> Received
                                                </span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}