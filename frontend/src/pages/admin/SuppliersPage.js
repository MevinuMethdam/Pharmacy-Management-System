import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Search, Plus, Edit, Trash2, X, Truck, Building, User, Phone, FileText, Calendar, BarChart2, DollarSign, Mail, MapPin, CreditCard } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentSupplier, setPaymentSupplier] = useState(null);
    const [submittingPayment, setSubmittingPayment] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
        chequeNumber: '',
        notes: ''
    });

    const [form, setForm] = useState({
        companyName: '',
        repName: '',
        contactNumber: '',
        creditPeriod: 30,
        brNumber: '',
        status: 'Active',
        email: '',
        address: '',
        officePhone: '',
        bankName: '',
        accountNumber: '',
        accountName: ''
    });

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/suppliers');
            setSuppliers(res.data || []);
        } catch (err) {
            toast.error('Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingSupplier) {
                await axios.put(`http://localhost:5000/api/suppliers/${editingSupplier.id}`, form);
                toast.success('Supplier updated successfully!');
            } else {
                await axios.post('http://localhost:5000/api/suppliers', form);
                toast.success('Supplier added successfully!');
            }
            closeModal();
            fetchSuppliers();
        } catch (err) {
            toast.error('Failed to save supplier');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this supplier? This might affect existing medicines.')) {
            try {
                await axios.delete(`http://localhost:5000/api/suppliers/${id}`);
                toast.success('Supplier deleted!');
                fetchSuppliers();
            } catch (err) {
                toast.error('Failed to delete supplier (Might be linked to inventory)');
            }
        }
    };

    const openPaymentModal = (supplier) => {
        setPaymentSupplier(supplier);
        setPaymentForm({
            amount: '',
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'Cash',
            chequeNumber: '',
            notes: ''
        });
        setIsPaymentModalOpen(true);
    };

    const closePaymentModal = () => {
        setIsPaymentModalOpen(false);
        setPaymentSupplier(null);
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        if (!paymentForm.amount || paymentForm.amount <= 0) {
            toast.error('Please enter a valid payment amount');
            return;
        }

        setSubmittingPayment(true);
        try {
            const payload = {
                ...paymentForm,
                supplierId: paymentSupplier.id,
                paymentNumber: `PAY-${Date.now()}`
            };
            await axios.post('http://localhost:5000/api/supplier-payments', payload);
            toast.success('Payment recorded and Outstanding Balance updated! 🎉');
            closePaymentModal();
            fetchSuppliers();
        } catch (err) {
            toast.error('Failed to record payment');
        } finally {
            setSubmittingPayment(false);
        }
    };

    const openEdit = (supplier) => {
        setEditingSupplier(supplier);
        setForm({
            companyName: supplier.companyName || '',
            repName: supplier.repName || '',
            contactNumber: supplier.contactNumber || '',
            creditPeriod: supplier.creditPeriod || 30,
            brNumber: supplier.brNumber || '',
            status: supplier.status || 'Active',
            email: supplier.email || '',
            address: supplier.address || '',
            officePhone: supplier.officePhone || '',
            bankName: supplier.bankName || '',
            accountNumber: supplier.accountNumber || '',
            accountName: supplier.accountName || ''
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
        setForm({
            companyName: '', repName: '', contactNumber: '', creditPeriod: 30, brNumber: '', status: 'Active',
            email: '', address: '', officePhone: '', bankName: '', accountNumber: '', accountName: ''
        });
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.repName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getChartOptions = () => {

        const sortedSuppliers = [...suppliers].sort((a, b) => (Number(b.creditPeriod) || 0) - (Number(a.creditPeriod) || 0));

        let displaySuppliers = [];

        if (!searchQuery.trim()) {

            displaySuppliers = sortedSuppliers.slice(0, 10);
        } else {
            displaySuppliers = sortedSuppliers.filter(s =>
                s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.repName.toLowerCase().includes(searchQuery.toLowerCase())
            ).slice(0, 10);
        }

        const categories = displaySuppliers.map(s => s.companyName);
        const pastelColors = ['#9cb8fc', '#cfa4f5', '#ffb8d1', '#84cbf5', '#dfbdf5', '#ffc7e3', '#a4c8f0', '#cbaacb', '#ffb7b2'];

        const data = displaySuppliers.map((s, index) => {
            const colorIndex = index % pastelColors.length;
            const baseColor = pastelColors[colorIndex];

            return {
                y: Number(s.creditPeriod) || 0,
                color: baseColor,
                borderColor: 'transparent',
                borderWidth: 0
            };
        });

        const dynamicHeight = Math.max(200, displaySuppliers.length * 45 + 80);

        return {
            chart: {
                type: 'bar',
                backgroundColor: 'transparent',
                height: dynamicHeight,
                style: { fontFamily: 'Inter, sans-serif', color: '#475569' },
                spacingBottom: 0
            },
            title: { text: '' },
            xAxis: {
                categories: categories,
                title: { text: null },
                labels: {
                    style: {
                        color: '#475569',
                        fontWeight: '500',
                        fontSize: '11px'
                    },
                    align: 'left',
                    reserveSpace: true
                },
                lineWidth: 0,
                tickWidth: 0
            },
            yAxis: {
                min: 0,
                title: { text: null },
                labels: { style: { color: '#94a3b8', fontWeight: '500', fontSize: '10px' } },
                gridLineColor: 'rgba(255,255,255,0.2)',
                gridLineDashStyle: 'Dash'
            },
            tooltip: {
                valueSuffix: ' Days',
                // Removed outside: true so tooltip renders inside SVG bounds to prevent clipping
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderColor: 'rgba(255,255,255,0.4)',
                borderRadius: 12,
                shadow: { color: 'rgba(0, 0, 0, 0.08)', offsetX: 0, offsetY: 8, width: 20 },
                style: { color: '#1e293b', fontWeight: '600', fontSize: '13px' }
            },
            plotOptions: {
                bar: {
                    borderRadius: 14,
                    maxPointWidth: 35,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    states: {
                        hover: {
                            borderWidth: 0,
                            borderColor: 'transparent'
                        }
                    },
                    dataLabels: {
                        enabled: true,
                        align: 'right',
                        inside: false,
                        style: { color: '#475569', textOutline: 'none', fontWeight: '600', fontSize: '11px' }
                    },
                    groupPadding: 0.15
                }
            },
            legend: { enabled: false },
            credits: { enabled: false },
            series: [{ name: 'Credit Period', data: data }]
        };
    };

    return (
        <AdminLayout>
            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4">

                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply"
                     style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}>
                </div>

                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-sky-200/20 to-slate-300/20 blur-[120px] pointer-events-none z-[-2]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-slate-300/20 to-sky-200/20 blur-[140px] pointer-events-none z-[-2]"></div>

                <div className="relative z-10 w-full h-full flex flex-col gap-6 pb-2">

                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/40 backdrop-blur-md shadow-sm flex items-center justify-center border border-white/60">
                                <Truck size={20} strokeWidth={2.5} className="text-sky-600" />
                            </div>
                            <div>
                                <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">Suppliers</h1>
                                <p className="text-[13px] font-medium text-slate-500 mt-1.5">Manage pharmaceutical distributors and medical representatives</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-sky-500/90 backdrop-blur-md text-white font-bold rounded-2xl shadow-[0_10px_25px_-5px_rgba(2,132,199,0.3)] hover:bg-sky-600 transition-all active:scale-[0.98] text-[14px] cursor-pointer border border-sky-400/50"
                        >
                            <Plus size={18} strokeWidth={2.5} /> Add Supplier
                        </button>
                    </div>

                    <div className="bg-white/40 backdrop-blur-xl p-4 rounded-[24px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] flex items-center gap-3">
                        <Search size={18} className="text-slate-400 ml-2" />
                        <input
                            type="text"
                            placeholder="Search by Company or Rep Name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full outline-none text-slate-700 text-sm font-medium bg-transparent placeholder-slate-400"
                        />
                    </div>

                    {suppliers.length > 0 && (
                        <div className="bg-white/30 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex flex-col gap-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-white/50 text-sky-600 rounded-xl border border-white/60 shadow-sm">
                                        <BarChart2 size={20} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h2 className="text-[17px] font-bold text-[#1e293b] tracking-tight">
                                            {searchQuery ? 'Searched Supplier Credit Period' : 'Top 10 Suppliers (Credit Period)'}
                                        </h2>
                                        <p className="text-[13px] text-slate-500 font-medium mt-0.5">
                                            {searchQuery ? 'Showing credit terms for the matching supplier(s)' : 'Showing top 10 distributors with highest credit terms'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full mt-2">
                                <HighchartsReact
                                    highcharts={Highcharts}
                                    options={getChartOptions()}
                                />
                            </div>
                        </div>
                    )}

                    <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 overflow-hidden mb-4 flex flex-col">
                        <div className="overflow-x-auto px-8 py-4">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Company Name</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Medical Rep</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Contact</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Credit Period</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Outstanding Balance</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Status</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 text-right">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="text-center py-16 text-slate-500 font-medium text-sm">Loading suppliers...</td></tr>
                                ) : filteredSuppliers.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center py-16 text-slate-500 font-medium text-sm">No suppliers found matching your criteria.</td></tr>
                                ) : filteredSuppliers.map((s) => (
                                    <tr key={s.id} className="group hover:bg-white/20 transition-colors border-b border-white/20 last:border-0">
                                        <td className="py-4 align-top pt-5">
                                            <p className="font-bold text-[14px] text-[#1e293b]">{s.companyName}</p>
                                            {s.brNumber && <span className="block text-[11px] text-slate-400 font-medium mt-1">BR: {s.brNumber}</span>}
                                        </td>
                                        <td className="py-4 align-top pt-5">
                                            <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600">
                                                <User size={14} className="text-slate-400"/> {s.repName}
                                            </span>
                                        </td>
                                        <td className="py-4 align-top pt-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600">
                                                    <Phone size={14} className="text-slate-400"/> {s.contactNumber}
                                                </span>
                                                {s.email && (
                                                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                                        <Mail size={12} className="text-slate-400"/> {s.email}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 align-top pt-5 text-[13px] font-bold text-slate-700">{s.creditPeriod} Days</td>
                                        <td className="py-4 align-top pt-5">
                                            <span className={`text-[14px] font-black ${Number(s.totalOutstanding) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                LKR {Number(s.totalOutstanding || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                            </span>
                                        </td>
                                        <td className="py-4 align-top pt-5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold backdrop-blur-sm shadow-sm ${
                                                s.status === 'Active' ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/50' : 'bg-rose-100/80 text-rose-700 border border-rose-200/50'
                                            }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="py-4 align-top pt-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openPaymentModal(s)} className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/50 rounded-lg transition-colors cursor-pointer" title="Make Payment"><DollarSign size={16} strokeWidth={2.5} /></button>
                                                <button onClick={() => openEdit(s)} className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-100/50 rounded-lg transition-colors cursor-pointer" title="Edit Supplier"><Edit size={16} /></button>
                                                <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-100/50 rounded-lg transition-colors cursor-pointer" title="Delete Supplier"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            {isPaymentModalOpen && paymentSupplier && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] border border-white w-full max-w-[500px]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-[20px] font-bold text-slate-800 flex items-center gap-2.5">
                                    <DollarSign className="w-6 h-6 text-emerald-500"/> Make Payment
                                </h2>
                                <p className="text-[12px] font-medium text-slate-500 mt-1">Pay to: <span className="font-bold text-slate-700">{paymentSupplier.companyName}</span></p>
                            </div>
                            <button onClick={closePaymentModal} className="hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 mb-6 flex justify-between items-center">
                            <span className="text-[12px] font-bold text-slate-600 uppercase">Current Outstanding</span>
                            <span className="text-[18px] font-black text-rose-500">LKR {Number(paymentSupplier.totalOutstanding || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Payment Amount *</label>
                                    <input type="number" required min="1" step="0.01" className="w-full px-4 py-3 bg-white/60 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/40"
                                           value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Date *</label>
                                    <input type="date" required className="w-full px-4 py-3 bg-white/60 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/40"
                                           value={paymentForm.paymentDate} onChange={e => setPaymentForm({...paymentForm, paymentDate: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Payment Method *</label>
                                <select required className="w-full px-4 py-3 bg-white/60 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                                        value={paymentForm.paymentMethod} onChange={e => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}>
                                    <option value="Cash">Cash</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Online">Online</option>
                                </select>
                            </div>

                            {paymentForm.paymentMethod === 'Cheque' && (
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Cheque Number</label>
                                    <input type="text" required placeholder="e.g. 123456" className="w-full px-4 py-3 bg-white/60 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/40"
                                           value={paymentForm.chequeNumber} onChange={e => setPaymentForm({...paymentForm, chequeNumber: e.target.value})} />
                                </div>
                            )}

                            <button type="submit" disabled={submittingPayment} className="w-full mt-4 bg-emerald-500/90 backdrop-blur-md text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(16,185,129,0.3)] hover:bg-emerald-600 transition-all active:scale-[0.98] text-[15px] cursor-pointer disabled:opacity-50 border border-emerald-400/50">
                                {submittingPayment ? 'Processing...' : 'Record Payment'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] border border-white w-full max-w-[650px] max-h-[90vh] overflow-y-auto hide-scrollbar">

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[20px] font-bold text-slate-800 flex items-center gap-2.5">
                                <Building className="w-5 h-5 text-sky-600"/> {editingSupplier ? 'Edit Supplier Details' : 'Add New Supplier'}
                            </h2>
                            <button onClick={closeModal} className="hover:bg-white/50 p-2 rounded-full transition-colors border border-transparent hover:border-white/60 cursor-pointer">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">

                            <div className="space-y-4">
                                <h3 className="text-[12px] font-extrabold text-sky-600 uppercase tracking-widest border-b border-white pb-2">General Info</h3>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Company Name <span className="text-rose-500">*</span></label>
                                    <input type="text" required placeholder="e.g. Hemas Pharmaceuticals" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.companyName} onChange={(e) => setForm({...form, companyName: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Medical Rep Name <span className="text-rose-500">*</span></label>
                                        <input type="text" required placeholder="e.g. Kasun" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.repName} onChange={(e) => setForm({...form, repName: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Contact Number <span className="text-rose-500">*</span></label>
                                        <input type="text" required placeholder="e.g. 0771234567" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.contactNumber} onChange={(e) => setForm({...form, contactNumber: e.target.value})} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email Address</label>
                                        <input type="email" placeholder="e.g. info@hemas.com" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Office Phone</label>
                                        <input type="text" placeholder="e.g. 0112345678" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.officePhone} onChange={(e) => setForm({...form, officePhone: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><MapPin size={14}/> Company Address</label>
                                    <input type="text" placeholder="e.g. 123, Galle Road, Colombo" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <h3 className="text-[12px] font-extrabold text-sky-600 uppercase tracking-widest border-b border-white pb-2">Bank & Terms</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Bank Name</label>
                                        <input type="text" placeholder="e.g. Commercial Bank" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.bankName} onChange={(e) => setForm({...form, bankName: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Account Number</label>
                                        <input type="text" placeholder="e.g. 1000123456" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.accountNumber} onChange={(e) => setForm({...form, accountNumber: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><CreditCard size={14}/> Account Name</label>
                                    <input type="text" placeholder="e.g. Hemas Pharmaceuticals PLC" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.accountName} onChange={(e) => setForm({...form, accountName: e.target.value})} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Credit Period (Days)</label>
                                        <input type="number" required min="0" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.creditPeriod} onChange={(e) => setForm({...form, creditPeriod: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Status</label>
                                        <select className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm cursor-pointer" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><FileText size={14}/> BR / License Number</label>
                                    <input type="text" placeholder="Optional (Business Registration)" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.brNumber} onChange={(e) => setForm({...form, brNumber: e.target.value})} />
                                </div>
                            </div>

                            <button type="submit" disabled={submitting} className="w-full mt-6 bg-sky-500/90 backdrop-blur-md text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(2,132,199,0.3)] hover:bg-sky-600 transition-all active:scale-[0.98] text-[15px] cursor-pointer disabled:opacity-50 border border-sky-400/50">
                                {submitting ? 'Saving...' : 'Save Supplier'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}