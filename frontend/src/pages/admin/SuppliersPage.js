import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import {
    Search, Plus, Edit, Trash2, X, Truck, Building, User,
    Phone, FileText, Calendar, BarChart2, DollarSign, Mail,
    MapPin, CreditCard, Send, UploadCloud, CheckCircle, AlertCircle, AlertTriangle
} from 'lucide-react';
import axios from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

export default function SuppliersPage() {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentSupplier, setPaymentSupplier] = useState(null);
    const [submittingPayment, setSubmittingPayment] = useState(false);

    const [formErrors, setFormErrors] = useState({});

    const [rejectModal, setRejectModal] = useState({ isOpen: false, message: '' });

    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        receiptPreview: '',
        notes: ''
    });

    const [form, setForm] = useState({
        companyName: '',
        repName: '',
        contactNumber: '',
        creditPeriod: 30,
        returnWindow: 3,
        brNumber: '',
        status: 'Inactive',
        email: '',
        address: '',
        officePhone: '',
        bankName: '',
        accountNumber: '',
        accountName: ''
    });

    useEffect(() => {
        const controller = new AbortController();
        fetchSuppliers(controller);

        return () => {
            controller.abort();
        };
    }, []);

    const fetchSuppliers = async (controller = null) => {
        setLoading(true);
        try {
            const config = {
                ...(controller && { signal: controller.signal })
            };

            const [supRes, payRes, purRes] = await Promise.all([
                axios.get('http://localhost:5000/api/suppliers', config),
                axios.get('http://localhost:5000/api/supplier-payments', config).catch((err) => {
                    if (axios.isCancel(err)) throw err;
                    return { data: [] };
                }),
                axios.get('http://localhost:5000/api/purchases', config).catch((err) => {
                    if (axios.isCancel(err)) throw err;
                    return { data: [] };
                })
            ]);

            const suppliersData = supRes.data || [];
            const paymentsData = payRes.data || [];
            const purchasesData = purRes.data || [];

            const today = new Date();
            today.setHours(0,0,0,0);

            const enhancedSuppliers = suppliersData.map(sup => {
                const rejectedPayments = paymentsData.filter(p => String(p.supplierId) === String(sup.id) && p.status === 'Rejected');
                const latestRejected = rejectedPayments.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];

                const supPurchases = purchasesData.filter(p => String(p.supplierId) === String(sup.id) && p.paymentStatus !== 'Paid');
                let earliestDueInvoice = null;
                let minDiffDays = Infinity;
                let dueInvoicesList = [];

                supPurchases.forEach(pur => {
                    if (pur.dueDate) {
                        const dueDateObj = new Date(pur.dueDate);
                        dueDateObj.setHours(0,0,0,0);
                        const diffTime = dueDateObj.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays <= 5) {
                            dueInvoicesList.push(pur.invoiceNumber);
                            if (diffDays < minDiffDays) {
                                minDiffDays = diffDays;
                                earliestDueInvoice = { ...pur, diffDays };
                            }
                        }
                    }
                });

                return {
                    ...sup,
                    rejectionReason: latestRejected ? latestRejected.rejectionReason : null,
                    dueInvoice: earliestDueInvoice,
                    dueInvoicesList: dueInvoicesList
                };
            });

            setSuppliers(enhancedSuppliers);
        } catch (err) {
            if (axios.isCancel(err)) {
                console.log('API Request canceled to free browser connection pool.');
            } else {
                toast.error('Failed to load suppliers data');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let currentErrors = {};
        const phoneRegex = /^[0-9]{10}$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const nmraRegex = /^WL\/\d{4}\/\d+$/i;

        const isDuplicateCompany = suppliers.some(
            sup => sup.companyName.toLowerCase().trim() === form.companyName.toLowerCase().trim() &&
                (!editingSupplier || String(sup.id) !== String(editingSupplier.id))
        );

        if (isDuplicateCompany) {
            currentErrors.companyName = 'This Company Name already exists';
        }

        if (!form.brNumber || form.brNumber.trim() === '') {
            currentErrors.brNumber = 'NMRA License Number is required.';
        } else if (!nmraRegex.test(form.brNumber)) {
            currentErrors.brNumber = 'Format must be WL/[Year]/[Numbers] (e.g. WL/2026/0152)';
        } else {
            const isDuplicateNMRA = suppliers.some(
                sup => sup.brNumber && sup.brNumber.toLowerCase().trim() === form.brNumber.toLowerCase().trim() &&
                    (!editingSupplier || String(sup.id) !== String(editingSupplier.id))
            );
            if (isDuplicateNMRA) {
                currentErrors.brNumber = 'This NMRA License Number is already registered.';
            }
        }

        if (!phoneRegex.test(form.contactNumber)) {
            currentErrors.contactNumber = 'Contact Number must be exactly 10 digits.';
        }
        if (form.officePhone && !phoneRegex.test(form.officePhone)) {
            currentErrors.officePhone = 'Office Phone must be exactly 10 digits.';
        }

        if (form.email) {
            if (!emailRegex.test(form.email)) {
                currentErrors.email = 'Please enter a valid email address (e.g. name@domain.com).';
            } else {
                const isDuplicateEmail = suppliers.some(
                    sup => sup.email && sup.email.toLowerCase().trim() === form.email.toLowerCase().trim() &&
                        (!editingSupplier || String(sup.id) !== String(editingSupplier.id))
                );
                if (isDuplicateEmail) {
                    currentErrors.email = 'This email is already taken.';
                }
            }
        }

        if (form.creditPeriod === '' || Number(form.creditPeriod) < 0 || Number(form.creditPeriod) > 120) {
            currentErrors.creditPeriod = 'Credit Period must be between 0 and 120 days.';
        }

        if (form.returnWindow === '' || Number(form.returnWindow) < 0 || Number(form.returnWindow) > 36) {
            currentErrors.returnWindow = 'Return Window must be between 0 and 36 months.';
        }

        if (Object.keys(currentErrors).length > 0) {
            setFormErrors(currentErrors);
            toast.error('Please fix the errors in the form.');
            return;
        }

        setFormErrors({});
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

    const handleSendInvite = async (id) => {
        if (window.confirm('Are you sure you want to send a secure portal invitation email to this supplier?')) {
            const toastId = toast.loading('Sending invitation email...');
            try {
                await axios.post(`http://localhost:5000/api/suppliers/${id}/invite`, {});
                toast.success('Invitation email sent successfully!', { id: toastId });
                fetchSuppliers();
            } catch (err) {
                toast.error(err.response?.data?.error || 'Failed to send invite', { id: toastId });
            }
        }
    };

    const openPaymentModal = (supplier) => {
        setPaymentSupplier(supplier);
        setPaymentForm({
            amount: '',
            paymentDate: new Date().toISOString().split('T')[0],
            receiptPreview: '',
            notes: ''
        });
        setIsPaymentModalOpen(true);
    };

    const closePaymentModal = () => {
        setIsPaymentModalOpen(false);
        setPaymentSupplier(null);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentForm({ ...paymentForm, receiptPreview: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        if (!paymentForm.amount || paymentForm.amount <= 0) {
            toast.error('Please enter a valid payment amount');
            return;
        }
        if (!paymentForm.receiptPreview) {
            toast.error('Please upload the payment receipt document');
            return;
        }

        setSubmittingPayment(true);
        try {
            const payload = {
                amount: paymentForm.amount,
                paymentDate: paymentForm.paymentDate,
                notes: paymentForm.notes,
                receiptImage: paymentForm.receiptPreview,
                supplierId: paymentSupplier.id,
                paymentNumber: `PAY-${Date.now()}`,
                status: 'Pending'
            };
            await axios.post('http://localhost:5000/api/supplier-payments', payload);
            toast.success('Payment receipt sent to Supplier for Review! ⏳');
            closePaymentModal();
            fetchSuppliers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to record payment');
        } finally {
            setSubmittingPayment(false);
        }
    };

    const openEdit = (supplier) => {
        setEditingSupplier(supplier);
        setFormErrors({});
        setForm({
            companyName: supplier.companyName || '',
            repName: supplier.repName || '',
            contactNumber: supplier.contactNumber || '',
            creditPeriod: supplier.creditPeriod || 30,
            returnWindow: supplier.returnWindow !== undefined ? supplier.returnWindow : 3,
            brNumber: supplier.brNumber || '',
            status: supplier.status || 'Inactive',
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
        setFormErrors({});
        setForm({
            companyName: '', repName: '', contactNumber: '', creditPeriod: 30, returnWindow: 3, brNumber: '', status: 'Inactive',
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
            return { y: Number(s.creditPeriod) || 0, color: pastelColors[colorIndex], borderColor: 'transparent', borderWidth: 0 };
        });

        const dynamicHeight = Math.max(200, displaySuppliers.length * 45 + 80);

        return {
            chart: { type: 'bar', backgroundColor: 'transparent', height: dynamicHeight, style: { fontFamily: 'Inter, sans-serif', color: '#475569' }, spacingBottom: 0 },
            title: { text: '' },
            xAxis: { categories: categories, title: { text: null }, labels: { style: { color: '#475569', fontWeight: '500', fontSize: '11px' }, align: 'left', reserveSpace: true }, lineWidth: 0, tickWidth: 0 },
            yAxis: { min: 0, title: { text: null }, labels: { style: { color: '#94a3b8', fontWeight: '500', fontSize: '10px' } }, gridLineColor: 'rgba(255,255,255,0.2)', gridLineDashStyle: 'Dash' },
            tooltip: { valueSuffix: ' Days', backgroundColor: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.4)', borderRadius: 12, shadow: { color: 'rgba(0, 0, 0, 0.08)', offsetX: 0, offsetY: 8, width: 20 }, style: { color: '#1e293b', fontWeight: '600', fontSize: '13px' } },
            plotOptions: { bar: { borderRadius: 14, maxPointWidth: 35, borderWidth: 0, borderColor: 'transparent', dataLabels: { enabled: true, align: 'right', style: { color: '#475569', textOutline: 'none', fontWeight: '600', fontSize: '11px' } }, groupPadding: 0.15 } },
            legend: { enabled: false }, credits: { enabled: false },
            series: [{ name: 'Credit Period', data: data }]
        };
    };

    return (
        <AdminLayout>
            <style>{`
                .hover-scroll::-webkit-scrollbar { width: 6px; background-color: transparent; }
                .hover-scroll::-webkit-scrollbar-thumb { background-color: transparent; border-radius: 10px; }
                .hover-scroll:hover::-webkit-scrollbar-thumb { background-color: #cbd5e1; }
                
                @keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
                .animate-pulse-soft { animation: pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            `}</style>

            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4">
                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}></div>
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
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-sky-500/90 backdrop-blur-md text-white font-bold rounded-2xl shadow-[0_10px_25px_-5px_rgba(2,132,199,0.3)] hover:bg-sky-600 transition-all active:scale-[0.98] text-[14px] cursor-pointer border border-sky-400/50">
                            <Plus size={18} strokeWidth={2.5} /> Add Supplier
                        </button>
                    </div>

                    <div className="bg-white/40 backdrop-blur-xl p-4 rounded-[24px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] flex items-center gap-3">
                        <Search size={18} className="text-slate-400 ml-2" />
                        <input type="text" placeholder="Search by Company or Rep Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full outline-none text-slate-700 text-sm font-medium bg-transparent placeholder-slate-400" />
                    </div>

                    {suppliers.length > 0 && (
                        <div className="bg-white/30 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex flex-col gap-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-white/50 text-sky-600 rounded-xl border border-white/60 shadow-sm"><BarChart2 size={20} strokeWidth={2.5} /></div>
                                    <div>
                                        <h2 className="text-[17px] font-bold text-[#1e293b] tracking-tight">{searchQuery ? 'Searched Supplier Credit Period' : 'Top 10 Suppliers (Credit Period)'}</h2>
                                        <p className="text-[13px] text-slate-500 font-medium mt-0.5">{searchQuery ? 'Showing credit terms for the matching supplier(s)' : 'Showing top 10 distributors with highest credit terms'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full mt-2"><HighchartsReact highcharts={Highcharts} options={getChartOptions()} /></div>
                        </div>
                    )}

                    <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 overflow-hidden mb-4 flex flex-col">

                        <div className="px-6 py-4">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                <tr>
                                    <th className="w-[14%] px-3 pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight">Company Name</th>
                                    <th className="w-[12%] px-3 pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight">Medical Rep</th>
                                    <th className="w-[16%] px-3 pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight">Contact</th>
                                    <th className="w-[9%] px-3 pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight">Credit Period</th>
                                    <th className="w-[13%] px-3 pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight">Outstanding Balance</th>
                                    <th className="w-[9%] px-3 pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight">Status</th>
                                    <th className="w-[9%] px-3 pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight text-center">Alerts</th>
                                    <th className="w-[18%] px-3 pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight text-right pr-4">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {loading ? (
                                    <tr><td colSpan="8" className="text-center py-16 text-slate-500 font-medium text-sm">Loading suppliers...</td></tr>
                                ) : filteredSuppliers.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center py-16 text-slate-500 font-medium text-sm">No suppliers found.</td></tr>
                                ) : filteredSuppliers.map((s) => (
                                    <tr key={s.id} className="group hover:bg-white/20 transition-colors border-b border-white/20 last:border-0">
                                        <td className="px-3 py-4 align-top pt-5">
                                            <p className="font-bold text-[14px] text-[#1e293b] break-words">{s.companyName}</p>
                                            {s.brNumber && <span className="block text-[11px] text-slate-400 font-medium mt-1">NMRA: {s.brNumber}</span>}
                                        </td>
                                        <td className="px-3 py-4 align-top pt-5">
                                            <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600">
                                                <User size={14} className="text-slate-400 flex-shrink-0"/> <span className="truncate">{s.repName}</span>
                                            </span>
                                        </td>
                                        <td className="px-3 py-4 align-top pt-5">
                                            <div className="flex flex-col gap-1 w-full">
                                                <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600"><Phone size={14} className="text-slate-400 flex-shrink-0"/> {s.contactNumber}</span>
                                                {s.email && <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 break-all"><Mail size={12} className="text-slate-400 flex-shrink-0"/> {s.email}</span>}
                                            </div>
                                        </td>
                                        <td className="px-3 py-4 align-top pt-5 text-[13px] font-bold text-slate-700">{s.creditPeriod} Days</td>
                                        <td className="px-3 py-4 align-top pt-5">
                                            <span className={`text-[14px] font-black ${Number(s.totalOutstanding) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                LKR {Number(s.totalOutstanding || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                            </span>
                                        </td>
                                        <td className="px-3 py-4 align-top pt-5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold backdrop-blur-sm shadow-sm ${s.status === 'Active' ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/50' : 'bg-slate-100/80 text-slate-600 border border-slate-200/50'}`}>
                                                {s.status}
                                            </span>
                                        </td>

                                        <td className="px-3 py-4 align-top pt-5 text-center">
                                            <div className="flex justify-center items-center gap-3">
                                                {s.rejectionReason && (
                                                    <div
                                                        onClick={() => setRejectModal({ isOpen: true, message: s.rejectionReason })}
                                                        className="flex flex-col items-center justify-center cursor-pointer group"
                                                        title="Payment Rejected - Click to view reason"
                                                    >
                                                        <div className="p-1.5 bg-rose-100/80 text-rose-600 rounded-lg group-hover:bg-rose-200 transition-colors shadow-sm">
                                                            <AlertCircle size={18} strokeWidth={2.5} />
                                                        </div>
                                                    </div>
                                                )}

                                                {s.dueInvoice && (
                                                    <div
                                                        onClick={() => navigate(`/admin/purchases`, { state: { highlightInvoices: s.dueInvoicesList } })}
                                                        className="flex flex-col items-center justify-center cursor-pointer group"
                                                        title="Payment Due - Click to view invoice"
                                                    >
                                                        <div className="p-1.5 bg-amber-100/80 text-amber-600 rounded-lg group-hover:bg-amber-200 transition-colors animate-pulse-soft shadow-sm">
                                                            <AlertTriangle size={18} strokeWidth={2.5} />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-amber-600 mt-1 whitespace-nowrap">
                                                            {s.dueInvoice.diffDays < 0 ? 'Overdue' : `${s.dueInvoice.diffDays} Days`}
                                                        </span>
                                                    </div>
                                                )}

                                                {!s.rejectionReason && !s.dueInvoice && (
                                                    <span className="text-[11px] font-medium text-slate-400">-</span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-3 py-4 align-top pt-4 pr-4 text-right">
                                            <div className="flex justify-end gap-1.5 flex-nowrap whitespace-nowrap">
                                                <button onClick={() => handleSendInvite(s.id)} className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100/50 rounded-lg transition-colors cursor-pointer" title="Send Portal Invite"><Send size={16} /></button>
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

            {rejectModal.isOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white p-6 rounded-[24px] shadow-2xl border border-slate-100 max-w-sm w-full animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2.5 text-rose-600">
                                <AlertCircle size={24} strokeWidth={2.5} />
                                <h3 className="font-bold text-lg">Payment Rejected</h3>
                            </div>
                            <button onClick={() => setRejectModal({ isOpen: false, message: '' })} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-1.5 transition-colors cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 mb-6">
                            <p className="text-[13px] font-medium text-slate-700 leading-relaxed">
                                {rejectModal.message}
                            </p>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={() => setRejectModal({ isOpen: false, message: '' })} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer shadow-sm">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isPaymentModalOpen && paymentSupplier && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] border border-white w-full max-w-[500px]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-[20px] font-bold text-slate-800 flex items-center gap-2.5">
                                    <DollarSign className="w-6 h-6 text-emerald-500"/> Submit Payment Receipt
                                </h2>
                                <p className="text-[12px] font-medium text-slate-500 mt-1">Send to: <span className="font-bold text-slate-700">{paymentSupplier.companyName}</span></p>
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
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Upload Receipt (Image/PDF) *</label>
                                <div className="w-full border-2 border-dashed border-emerald-200 bg-emerald-50/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-emerald-50 transition-colors relative">
                                    <input type="file" required accept="image/*,.pdf,.doc,.docx" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
                                    {paymentForm.receiptPreview ? (
                                        <>
                                            <CheckCircle className="text-emerald-500 mb-2" size={28} />
                                            <span className="text-[13px] font-bold text-emerald-700">Receipt Attached Successfully</span>
                                            <span className="text-[11px] text-emerald-500 mt-1">Click to change file</span>
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="text-emerald-400 mb-2" size={28} />
                                            <span className="text-[13px] font-bold text-slate-600">Click or Drag receipt here</span>
                                            <span className="text-[11px] text-slate-400 mt-1">Supports JPG, PNG, PDF</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Notes (Optional)</label>
                                <textarea className="w-full px-4 py-3 bg-white/60 border border-slate-200 rounded-2xl text-[13px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none h-20"
                                          value={paymentForm.notes} onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})} placeholder="Add any notes about this payment..."></textarea>
                            </div>

                            <button type="submit" disabled={submittingPayment} className="w-full mt-4 bg-emerald-500/90 backdrop-blur-md text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(16,185,129,0.3)] hover:bg-emerald-600 transition-all active:scale-[0.98] text-[15px] cursor-pointer disabled:opacity-50 border border-emerald-400/50">
                                {submittingPayment ? 'Uploading...' : 'Send Receipt for Review'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] border border-white w-full max-w-[650px] max-h-[90vh] overflow-y-auto hover-scroll">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[20px] font-bold text-slate-800 flex items-center gap-2.5">
                                <Building className="w-5 h-5 text-sky-600"/> {editingSupplier ? 'Edit Supplier Details' : 'Add New Supplier'}
                            </h2>
                            <button onClick={closeModal} className="hover:bg-white/50 p-2 rounded-full transition-colors border border-transparent hover:border-white/60 cursor-pointer">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-5">

                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6">
                                <h3 className="text-[12px] font-extrabold text-sky-600 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Account Status & Terms</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 whitespace-nowrap">Supplier Status <span className="text-rose-500">*</span></label>
                                        <select
                                            required
                                            className={`w-full px-4 py-3 border rounded-2xl text-[14px] font-bold outline-none focus:ring-2 shadow-sm ${!editingSupplier ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-800 focus:ring-sky-500/40 cursor-pointer'}`}
                                            value={form.status}
                                            onChange={(e) => setForm({...form, status: e.target.value})}
                                            disabled={!editingSupplier}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                        {!editingSupplier && <p className="text-[9px] font-bold text-slate-400 mt-1.5 ml-1">* Supplier will be Active after setting password</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 whitespace-nowrap">Credit Period (Days) <span className="text-rose-500">*</span></label>
                                        <input type="number" required min="0" max="120" className={`w-full px-4 py-3 bg-white border ${formErrors.creditPeriod ? 'border-rose-500 focus:ring-rose-500/40' : 'border-slate-200 focus:ring-sky-500/40'} rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 shadow-sm`}
                                               value={form.creditPeriod}
                                               onChange={(e) => {
                                                   const val = e.target.value;
                                                   setForm({...form, creditPeriod: val});
                                                   let err = null;
                                                   if (val === '' || Number(val) < 0 || Number(val) > 120) {
                                                       err = 'Credit Period must be between 0 and 120 days.';
                                                   }
                                                   setFormErrors(prev => ({...prev, creditPeriod: err}));
                                               }}
                                        />
                                        {formErrors.creditPeriod && <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-1 flex items-center gap-1"><AlertCircle size={10}/> {formErrors.creditPeriod}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 whitespace-nowrap">Return Window (Months) <span className="text-rose-500">*</span></label>
                                        <input type="number" required min="0" max="36" className={`w-full px-4 py-3 bg-white border ${formErrors.returnWindow ? 'border-rose-500 focus:ring-rose-500/40' : 'border-slate-200 focus:ring-sky-500/40'} rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 shadow-sm`}
                                               value={form.returnWindow}
                                               onChange={(e) => {
                                                   const val = e.target.value;
                                                   setForm({...form, returnWindow: val});
                                                   let err = null;
                                                   if (val === '' || Number(val) < 0 || Number(val) > 36) {
                                                       err = 'Must be between 0 and 36 months.';
                                                   }
                                                   setFormErrors(prev => ({...prev, returnWindow: err}));
                                               }}
                                        />
                                        {formErrors.returnWindow && <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-1 flex items-center gap-1"><AlertCircle size={10}/> {formErrors.returnWindow}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-[12px] font-extrabold text-sky-600 uppercase tracking-widest border-b border-white pb-2">General Info</h3>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Company Name <span className="text-rose-500">*</span></label>
                                    <input type="text" required className={`w-full px-4 py-3 bg-white/60 border ${formErrors.companyName ? 'border-rose-500 focus:ring-rose-500/40' : 'border-white/80 focus:ring-sky-500/40'} rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 shadow-sm backdrop-blur-sm`}
                                           value={form.companyName}
                                           onChange={(e) => {
                                               const val = e.target.value;
                                               setForm({...form, companyName: val});
                                               const isDup = suppliers.some(sup => sup.companyName.toLowerCase().trim() === val.toLowerCase().trim() && (!editingSupplier || String(sup.id) !== String(editingSupplier.id)));
                                               setFormErrors(prev => ({...prev, companyName: isDup ? 'This Company Name already exists' : null}));
                                           }}
                                    />
                                    {formErrors.companyName && <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-1 flex items-center gap-1"><AlertCircle size={10}/> {formErrors.companyName}</p>}
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <FileText size={14}/> NMRA Wholesale License No <span className="text-rose-500">*</span>
                                    </label>
                                    <input type="text" required placeholder="e.g. WL/2026/0152"
                                           className={`w-full px-4 py-3 bg-white/60 border ${formErrors.brNumber ? 'border-rose-500 focus:ring-rose-500/40' : 'border-white/80 focus:ring-sky-500/40'} rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 shadow-sm backdrop-blur-sm`}
                                           value={form.brNumber}
                                           onChange={(e) => {
                                               const val = e.target.value;
                                               setForm({...form, brNumber: val});
                                               let err = null;
                                               const nmraRegex = /^WL\/\d{4}\/\d+$/i;
                                               if (val && !nmraRegex.test(val)) {
                                                   err = 'Format must be WL/[Year]/[Numbers] (e.g. WL/2026/0152)';
                                               } else if (val) {
                                                   const isDup = suppliers.some(sup => sup.brNumber && sup.brNumber.toLowerCase().trim() === val.toLowerCase().trim() && (!editingSupplier || String(sup.id) !== String(editingSupplier.id)));
                                                   if (isDup) err = 'This NMRA License Number is already registered.';
                                               }
                                               setFormErrors(prev => ({...prev, brNumber: err}));
                                           }}
                                    />
                                    {formErrors.brNumber && <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-1 flex items-center gap-1"><AlertCircle size={10}/> {formErrors.brNumber}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Medical Rep Name <span className="text-rose-500">*</span></label><input type="text" required className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.repName} onChange={(e) => setForm({...form, repName: e.target.value})} /></div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Contact Number <span className="text-rose-500">*</span></label>
                                        <input type="text" required placeholder="07XXXXXXXX" className={`w-full px-4 py-3 bg-white/60 border ${formErrors.contactNumber ? 'border-rose-500 focus:ring-rose-500/40' : 'border-white/80 focus:ring-sky-500/40'} rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 shadow-sm backdrop-blur-sm`}
                                               value={form.contactNumber}
                                               onChange={(e) => {
                                                   const val = e.target.value;
                                                   setForm({...form, contactNumber: val});
                                                   let err = null;
                                                   if (val && !/^[0-9]{10}$/.test(val)) {
                                                       err = 'Contact Number must be exactly 10 digits.';
                                                   }
                                                   setFormErrors(prev => ({...prev, contactNumber: err}));
                                               }}
                                        />
                                        {formErrors.contactNumber && <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-1 flex items-center gap-1"><AlertCircle size={10}/> {formErrors.contactNumber}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email Address <span className="text-rose-500">*</span></label>
                                        <input type="text" required className={`w-full px-4 py-3 bg-white/60 border ${formErrors.email ? 'border-rose-500 focus:ring-rose-500/40' : 'border-white/80 focus:ring-sky-500/40'} rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 shadow-sm backdrop-blur-sm`}
                                               value={form.email}
                                               onChange={(e) => {
                                                   const val = e.target.value;
                                                   setForm({...form, email: val});
                                                   let err = null;
                                                   if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                                                       err = 'Please enter a valid email address (e.g. name@domain.com).';
                                                   } else if (val) {
                                                       const isDuplicateEmail = suppliers.some(
                                                           sup => sup.email && sup.email.toLowerCase().trim() === val.toLowerCase().trim() &&
                                                               (!editingSupplier || String(sup.id) !== String(editingSupplier.id))
                                                       );
                                                       if (isDuplicateEmail) {
                                                           err = 'This email is already taken.';
                                                       }
                                                   }
                                                   setFormErrors(prev => ({...prev, email: err}));
                                               }}
                                        />
                                        {formErrors.email && <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-1 flex items-center gap-1"><AlertCircle size={10}/> {formErrors.email}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Office Phone</label>
                                        <input type="text" placeholder="Optional" className={`w-full px-4 py-3 bg-white/60 border ${formErrors.officePhone ? 'border-rose-500 focus:ring-rose-500/40' : 'border-white/80 focus:ring-sky-500/40'} rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 shadow-sm backdrop-blur-sm`}
                                               value={form.officePhone}
                                               onChange={(e) => {
                                                   const val = e.target.value;
                                                   setForm({...form, officePhone: val});
                                                   let err = null;
                                                   if (val && !/^[0-9]{10}$/.test(val)) {
                                                       err = 'Office Phone must be exactly 10 digits.';
                                                   }
                                                   setFormErrors(prev => ({...prev, officePhone: err}));
                                               }}
                                        />
                                        {formErrors.officePhone && <p className="text-[10px] text-rose-500 font-bold mt-1.5 ml-1 flex items-center gap-1"><AlertCircle size={10}/> {formErrors.officePhone}</p>}
                                    </div>
                                </div>
                                <div><label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><MapPin size={14}/> Company Address</label><input type="text" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
                            </div>
                            <div className="space-y-4 pt-2">
                                <h3 className="text-[12px] font-extrabold text-sky-600 uppercase tracking-widest border-b border-white pb-2">Bank Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Bank Name</label><input type="text" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.bankName} onChange={(e) => setForm({...form, bankName: e.target.value})} /></div>
                                    <div><label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Account Number</label><input type="text" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.accountNumber} onChange={(e) => setForm({...form, accountNumber: e.target.value})} /></div>
                                </div>
                                <div><label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><CreditCard size={14}/> Account Name</label><input type="text" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm" value={form.accountName} onChange={(e) => setForm({...form, accountName: e.target.value})} /></div>
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