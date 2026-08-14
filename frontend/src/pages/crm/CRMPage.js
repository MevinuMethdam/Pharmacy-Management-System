import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { Search, Plus, Users, Edit, Trash2, Phone, Mail, MapPin, X, Star, Activity, CreditCard, Sparkles, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

export default function CRMPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const [customers, setCustomers] = useState([]);

    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [showAIInsightsModal, setShowAIInsightsModal] = useState(false);
    const [selectedCustomerForAI, setSelectedCustomerForAI] = useState(null);
    const [aiInsightLoading, setAiInsightLoading] = useState(false);
    const [aiRecommendation, setAiRecommendation] = useState(null);

    const [customerForm, setCustomerForm] = useState({
        name: '',
        nic: '',
        contactNumber: '',
        age: '',
        gender: '',
        email: '',
        address: '',
        loyaltyPoints: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/crm/customers');
            setCustomers(res.data || []);
        } catch (err) {
            toast.error('Failed to load CRM data');
        } finally {
            setLoading(false);
        }
    };

    const validateCustomerForm = () => {
        if (!customerForm.name || customerForm.name.trim().length < 2) {
            toast.error('Name must be at least 2 characters long');
            return false;
        }

        if (!customerForm.age || isNaN(customerForm.age) || customerForm.age <= 0 || customerForm.age > 120) {
            toast.error('Please enter a valid age between 1 and 120');
            return false;
        }

        if (!customerForm.gender) {
            toast.error('Please select a gender (Male/Female/Other)');
            return false;
        }

        const nicRegex = /^([0-9]{9}[x|X|v|V]|[0-9]{12})$/;
        if (!customerForm.nic || !nicRegex.test(customerForm.nic)) {
            toast.error('Please enter a valid Sri Lankan NIC (e.g. 987654321V or 199876543210)');
            return false;
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(customerForm.contactNumber)) {
            toast.error('Please enter a valid 10-digit contact number (e.g. 0771234567)');
            return false;
        }

        if (customerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerForm.email)) {
            toast.error('Please enter a valid email address');
            return false;
        }

        if (customerForm.loyaltyPoints < 0) {
            toast.error('Loyalty points cannot be negative');
            return false;
        }
        return true;
    };

    const handleCustomerSubmit = async (e) => {
        e.preventDefault();

        if (!validateCustomerForm()) return;

        setSubmitting(true);

        const payload = {
            ...customerForm,
            age: parseInt(customerForm.age),
            loyaltyPoints: parseInt(customerForm.loyaltyPoints) || 0
        };

        try {
            if (editingCustomer) {
                await axios.put(`http://localhost:5000/api/crm/customers/${editingCustomer.id}`, payload);
                toast.success('Customer updated successfully!');
            } else {
                await axios.post('http://localhost:5000/api/crm/customers', payload);
                toast.success('Customer added successfully!');
            }
            closeCustomerModal();
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save customer');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCustomer = async (id) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            try {
                await axios.delete(`http://localhost:5000/api/crm/customers/${id}`);
                toast.success('Customer deleted!');
                fetchData();
            } catch (err) {
                toast.error('Failed to delete customer');
            }
        }
    };

    const openEditCustomer = (customer) => {
        setEditingCustomer(customer);
        setCustomerForm({
            name: customer.name || '',
            nic: customer.nic || '',
            contactNumber: customer.contactNumber || '',
            age: customer.age || '',
            gender: customer.gender || '',
            email: customer.email || '',
            address: customer.address || '',
            loyaltyPoints: customer.loyaltyPoints || 0
        });
        setIsCustomerModalOpen(true);
    };

    const closeCustomerModal = () => {
        setIsCustomerModalOpen(false);
        setEditingCustomer(null);
        setCustomerForm({ name: '', nic: '', contactNumber: '', age: '', gender: '', email: '', address: '', loyaltyPoints: 0 });
    };

    const openAIHealthInsights = async (customer) => {
        setSelectedCustomerForAI(customer);
        setShowAIInsightsModal(true);
        setAiInsightLoading(true);
        setAiRecommendation(null);

        try {
            const res = await axios.get(`http://localhost:5000/api/crm/customers/${customer.id}/ai-insights`);
            setAiRecommendation(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to connect to AI. Please try again.");
            setShowAIInsightsModal(false);
        } finally {
            setAiInsightLoading(false);
        }
    };

    const applyAIBonus = async () => {
        if (!selectedCustomerForAI || !aiRecommendation) return;
        try {
            const updatedPoints = (selectedCustomerForAI.loyaltyPoints || 0) + aiRecommendation.autoBonus;
            await axios.put(`http://localhost:5000/api/crm/customers/${selectedCustomerForAI.id}`, {
                ...selectedCustomerForAI,
                loyaltyPoints: updatedPoints
            });
            toast.success(`Successfully added +${aiRecommendation.autoBonus} AI Loyalty Bonus! 🎉`, { icon: '✨' });
            setShowAIInsightsModal(false);
            fetchData();
        } catch (err) {
            toast.error('Failed to apply AI loyalty bonus');
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactNumber?.includes(searchQuery) ||
        c.nic?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getChartOptions = () => {
        const monthMap = {};

        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const m = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
            monthMap[m] = { new: 0, returning: 0 };
        }

        customers.forEach(c => {
            const date = c.createdAt ? new Date(c.createdAt) : new Date();
            if (isNaN(date.getTime())) return;
            const monthStr = date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });

            if (monthMap[monthStr] !== undefined) {
                if (c.loyaltyPoints > 10) {
                    monthMap[monthStr].returning += 1;
                } else {
                    monthMap[monthStr].new += 1;
                }
            }
        });

        const categories = Object.keys(monthMap);
        const newData = categories.map(m => monthMap[m].new);
        const returningData = categories.map(m => monthMap[m].returning);

        return {
            chart: {
                type: 'column',
                backgroundColor: 'transparent',
                height: 320,
                style: { fontFamily: 'Inter, sans-serif' }
            },
            title: { text: '' },
            xAxis: {
                categories: categories,
                labels: { style: { color: '#64748b', fontWeight: '500', fontSize: '11px' } },
                lineWidth: 0,
                tickWidth: 0
            },
            yAxis: {
                min: 0,
                title: { text: null },
                labels: { style: { color: '#94a3b8', fontWeight: '500', fontSize: '10px' } },
                gridLineColor: 'rgba(255,255,255,0.2)',
                gridLineDashStyle: 'Dash',
                stackLabels: {
                    enabled: true,
                    style: { fontWeight: 'bold', color: '#64748b', fontSize: '11px' }
                }
            },
            tooltip: {
                shared: true,
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderColor: 'rgba(255,255,255,0.4)',
                borderRadius: 16,
                shadow: { color: 'rgba(0, 0, 0, 0.08)', offsetX: 0, offsetY: 8, width: 20 },
                style: { color: '#1e293b', fontWeight: '600', fontSize: '13px' }
            },
            plotOptions: {
                column: {
                    stacking: 'normal',
                    borderRadius: 6,
                    borderWidth: 0,
                    pointWidth: 35,
                    dataLabels: { enabled: true, style: { color: '#ffffff', textOutline: 'none', fontWeight: '600' } }
                }
            },
            legend: { itemStyle: { color: '#475569', fontWeight: '500', fontSize: '12px' } },
            credits: { enabled: false },
            series: [
                { name: 'Returning Customers', data: returningData, color: '#ffb8d1' },
                { name: 'New Customers', data: newData, color: '#9cb8fc' }
            ]
        };
    };

    return (
        <AdminLayout>
            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4">

                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply"
                     style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}>
                </div>

                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-teal-200/20 to-slate-300/20 blur-[120px] pointer-events-none z-[-2]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-slate-300/20 to-blue-200/20 blur-[140px] pointer-events-none z-[-2]"></div>

                <div className="relative z-10 w-full h-full flex flex-col gap-6 pb-2">

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/40 backdrop-blur-md shadow-sm flex items-center justify-center border border-white/60">
                                    <Star size={20} strokeWidth={2.5} className="text-teal-600" />
                                </div>
                                <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">CRM & Loyalty</h1>
                            </div>
                            <p className="text-[13px] text-slate-500 mt-1.5 font-medium ml-14">
                                Manage patient profiles, loyalty points, and AI health recommendations
                            </p>
                        </div>

                        <button
                            onClick={() => setIsCustomerModalOpen(true)}
                            className="flex items-center gap-2 bg-teal-500/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl text-[14px] font-bold hover:bg-teal-600 transition-all shadow-[0_10px_25px_-5px_rgba(20,184,166,0.3)] border border-teal-400/50 cursor-pointer active:scale-[0.98]"
                        >
                            <Plus size={18} strokeWidth={2.5} /> Add Patient / Customer
                        </button>
                    </div>

                    {customers.length > 0 && (
                        <div className="bg-white/30 backdrop-blur-2xl p-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex flex-col gap-4 mt-2">
                            <div className="flex items-center gap-3 mb-2 px-1">
                                <div className="p-2.5 bg-white/50 text-blue-600 rounded-xl border border-white/60 shadow-sm">
                                    <Activity size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h2 className="text-[17px] font-bold text-slate-800 tracking-tight">Customer Retention Overview</h2>
                                    <p className="text-[13px] text-slate-500 font-medium mt-0.5">Monthly comparison of new acquisitions vs returning loyal customers</p>
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

                    <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden flex flex-col mt-2">
                        <div className="p-6 border-b border-white/30 flex flex-col lg:flex-row justify-between gap-4 bg-white/10">
                            <div className="relative w-full">
                                <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search Patients (Name, Phone, NIC)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/40 shadow-sm backdrop-blur-sm"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto px-8 py-4">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Name</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Age / Gender / NIC</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Contact</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Address</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Loyalty Points</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 text-right">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center py-16 text-slate-500 font-medium text-[13px]">Loading data...</td></tr>
                                ) : filteredCustomers.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-16 text-slate-500 font-medium text-[13px]">No customers found.</td></tr>
                                ) : filteredCustomers.map((customer) => (
                                    <tr key={`c-${customer.id}`} className="group hover:bg-white/20 transition-colors border-b border-white/20 last:border-0">
                                        <td className="py-4 align-top pt-5 text-[14px] font-bold text-[#1e293b]">{customer.name}</td>
                                        <td className="py-4 align-top pt-5 text-[13px] font-medium text-slate-600">
                                            {customer.age ? `${customer.age} Yrs • ` : ''}{customer.gender}
                                            {customer.nic && <span className="block text-[11px] text-teal-700 font-bold mt-1"><CreditCard size={12} className="inline mr-1 -mt-0.5" />{customer.nic}</span>}
                                        </td>
                                        <td className="py-4 align-top pt-5 text-[13px] font-medium text-slate-600 space-y-1.5">
                                            <div className="flex items-center gap-1.5"><Phone size={14} className="text-slate-400"/> {customer.contactNumber}</div>
                                            {customer.email && <div className="flex items-center gap-1.5"><Mail size={14} className="text-slate-400"/> {customer.email}</div>}
                                        </td>
                                        <td className="py-4 align-top pt-5 text-[13px] font-medium text-slate-600"><span className="flex items-center gap-1.5 truncate max-w-[150px]"><MapPin size={14} className="min-w-[14px] text-slate-400"/>{customer.address || '-'}</span></td>
                                        <td className="py-4 align-top pt-5 text-[15px] font-black text-amber-500 flex items-center gap-1.5"><Star size={16} className="fill-amber-500 text-amber-500"/> {customer.loyaltyPoints}</td>
                                        <td className="py-4 align-top pt-4 text-right">
                                            <div className="flex justify-end gap-2">

                                                <button onClick={() => openAIHealthInsights(customer)} className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/50 rounded-lg transition-colors cursor-pointer" title="AI Health Insights & Perks">
                                                    <Sparkles size={16} />
                                                </button>
                                                <button onClick={() => openEditCustomer(customer)} className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-100/50 rounded-lg transition-colors cursor-pointer" title="Edit Patient"><Edit size={16} /></button>
                                                <button onClick={() => handleDeleteCustomer(customer.id)} className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-100/50 rounded-lg transition-colors cursor-pointer" title="Delete Patient"><Trash2 size={16} /></button>
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
            {showAIInsightsModal && selectedCustomerForAI && createPortal(
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white/95 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] border border-white w-full max-w-[550px] relative overflow-hidden">
                        <button onClick={() => setShowAIInsightsModal(false)} className="absolute top-6 right-6 hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer text-slate-400">
                            <X size={20}/>
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 text-indigo-600 shadow-inner">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h2 className="text-[18px] font-bold text-slate-800">AI Health & Loyalty Advisor</h2>
                                <p className="text-[12px] text-slate-500 font-medium">Customer: <span className="font-bold text-slate-700">{selectedCustomerForAI.name}</span></p>
                            </div>
                        </div>

                        {aiInsightLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center">
                                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                                <p className="text-[14px] font-bold text-slate-700">Analyzing purchase & health history with AI...</p>
                            </div>
                        ) : aiRecommendation && (
                            <div className="space-y-4">
                                <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-2">
                                    <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck size={14}/> Health Profile Analysis</p>
                                    <p className="text-[14px] font-bold text-indigo-950">{aiRecommendation.healthProfile}</p>
                                </div>

                                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 space-y-2">
                                    <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5"><Star size={14}/> Recommended Loyalty Perk</p>
                                    <p className="text-[14px] font-bold text-amber-950">{aiRecommendation.recommendedPerk}</p>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AI Auto-Boost Bonus</p>
                                        <p className="text-[16px] font-black text-amber-500 flex items-center gap-1 mt-0.5"><Star size={16} className="fill-amber-500"/> +{aiRecommendation.autoBonus} Loyalty Points</p>
                                    </div>
                                    <button
                                        onClick={applyAIBonus}
                                        className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-[13px] hover:bg-indigo-700 transition-all shadow-md cursor-pointer flex items-center gap-2"
                                    >
                                        <Sparkles size={14} /> Apply AI Bonus
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {isCustomerModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] border border-white w-full max-w-[550px] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[20px] font-bold text-slate-800 flex items-center gap-2.5">
                                <Users className="w-5 h-5 text-teal-600"/> {editingCustomer ? 'Edit Patient / Customer' : 'Add New Patient / Customer'}
                            </h2>
                            <button onClick={closeCustomerModal} className="hover:bg-white/50 p-2 rounded-full transition-colors border border-transparent hover:border-white/60 cursor-pointer">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleCustomerSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Full Name <span className="text-rose-500">*</span></label>
                                <input type="text" required placeholder="e.g. Nimal Perera" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/40 shadow-sm backdrop-blur-sm" value={customerForm.name} onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Age <span className="text-rose-500">*</span></label>
                                    <input type="number" required min="1" max="120" placeholder="e.g. 35" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/40 shadow-sm backdrop-blur-sm" value={customerForm.age} onChange={(e) => setCustomerForm({...customerForm, age: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Gender <span className="text-rose-500">*</span></label>
                                    <select required className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/40 shadow-sm backdrop-blur-sm cursor-pointer" value={customerForm.gender} onChange={(e) => setCustomerForm({...customerForm, gender: e.target.value})}>
                                        <option value="" disabled>-- Select Gender --</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Contact Number <span className="text-rose-500">*</span></label>
                                    <input type="text" required placeholder="e.g. 0771234567" maxLength="10" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/40 shadow-sm backdrop-blur-sm" value={customerForm.contactNumber} onChange={(e) => setCustomerForm({...customerForm, contactNumber: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Loyalty Points</label>
                                    <input type="number" min="0" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/40 shadow-sm backdrop-blur-sm" value={customerForm.loyaltyPoints} onChange={(e) => setCustomerForm({...customerForm, loyaltyPoints: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">NIC Number <span className="text-rose-500">*</span></label>
                                    <input type="text" required placeholder="e.g. 987654321V" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/40 shadow-sm backdrop-blur-sm" value={customerForm.nic} onChange={(e) => setCustomerForm({...customerForm, nic: e.target.value.toUpperCase()})} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email</label>
                                    <input type="email" placeholder="Optional" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/40 shadow-sm backdrop-blur-sm" value={customerForm.email} onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Address</label>
                                <input type="text" placeholder="Optional" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/40 shadow-sm backdrop-blur-sm" value={customerForm.address} onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})} />
                            </div>

                            <button type="submit" disabled={submitting} className="w-full mt-4 bg-teal-500/90 backdrop-blur-md text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(20,184,166,0.3)] hover:bg-teal-600 transition-all active:scale-[0.98] text-[15px] cursor-pointer disabled:opacity-50 border border-teal-400/50">
                                {submitting ? 'Saving...' : 'Save Patient / Customer'}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </AdminLayout>
    );
}