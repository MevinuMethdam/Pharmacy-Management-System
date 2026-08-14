import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { Package, Plus, Search, Edit, Trash2, PieChart as PieIcon, Truck, ShieldAlert, X } from 'lucide-react';
import { inventoryApi } from '../../api/inventoryApi';
import Highcharts from 'highcharts';
import Highcharts3D from 'highcharts/highcharts-3d';
import HighchartsReact from 'highcharts-react-official';
import toast from 'react-hot-toast';
import axios from 'axios';

if (typeof Highcharts === 'object' && !Highcharts.Chart.prototype.pan) {
}
try {
    Highcharts3D(Highcharts);
} catch (e) {
    console.log("Highcharts 3D already initialized");
}

const COLORS = ['#38bdf8', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function InventoryPage() {
    const [medicines, setMedicines] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        genericName: '',
        category: 'Tablets',
        batchNumber: '',
        quantity: '',
        costPrice: '',
        sellingPrice: '',
        expiryDate: '',
        minStockLevel: 10,
        supplierId: '',
        isControlled: false
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [medRes, supRes] = await Promise.all([
                inventoryApi.getAll(),
                axios.get('http://localhost:5000/api/suppliers')
            ]);
            setMedicines(medRes.data);
            setSuppliers(supRes.data || []);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to load inventory data from database');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const highchartsOptions = useMemo(() => {
        const categoryMap = {};
        medicines.forEach(med => {
            const cat = med.category || 'Other';
            if (!categoryMap[cat]) {
                categoryMap[cat] = 0;
            }
            categoryMap[cat] += Number(med.quantity || 0);
        });

        const seriesData = Object.keys(categoryMap).map((cat, index) => ({
            name: cat,
            y: categoryMap[cat],
            color: COLORS[index % COLORS.length]
        }));

        const finalData = seriesData.length > 0 ? seriesData : [{ name: 'No Stock', y: 1, color: '#38bdf8' }];

        return {
            chart: {
                type: 'pie',
                backgroundColor: 'transparent',
                margin: [0, 0, 0, 0],
                options3d: {
                    enabled: true,
                    alpha: 45,
                    beta: 0,
                    depth: 35
                }
            },
            title: {
                text: ''
            },
            tooltip: {
                pointFormat: '{series.name}: <b>{point.y}</b>'
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    depth: 60,
                    center: ['50%', '45%'],
                    size: '95%',
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b>: {point.y}',
                        style: {
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#1e293b'
                        }
                    }
                }
            },
            series: [{
                name: 'Quantity',
                data: finalData
            }],
            credits: {
                enabled: false
            }
        };
    }, [medicines]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Form Submitted! Data:", formData);

        setSubmitting(true);
        try {
            if (editingId) {
                await inventoryApi.update(editingId, formData);
                toast.success('Medicine updated successfully! ✏️');
            } else {
                await inventoryApi.add(formData);
                toast.success('Medicine saved to database successfully! 🎉');
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({
                name: '', genericName: '', category: 'Tablets', batchNumber: '',
                quantity: '', costPrice: '', sellingPrice: '', expiryDate: '', minStockLevel: 10, supplierId: '', isControlled: false
            });
            fetchData();
        } catch (err) {
            console.error("API Error:", err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to save medicine';
            toast.error(errorMsg);
            alert("Error: " + errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (med) => {
        let formattedDate = '';
        if (med.expiryDate) {
            formattedDate = med.expiryDate.split('T')[0];
        }

        setFormData({
            name: med.name,
            genericName: med.genericName || '',
            category: med.category,
            batchNumber: med.batchNumber,
            quantity: med.quantity,
            costPrice: med.costPrice,
            sellingPrice: med.sellingPrice,
            expiryDate: formattedDate,
            minStockLevel: med.minStockLevel || 10,
            supplierId: med.supplierId || '',
            isControlled: med.isControlled || false
        });
        setEditingId(med.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this medicine?')) {
            try {
                await inventoryApi.delete(id);
                toast.success('Medicine deleted! 🗑️');
                fetchData();
            } catch (err) {
                toast.error('Failed to delete medicine');
            }
        }
    };

    const filteredMedicines = medicines.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4">

                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply"
                     style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}>
                </div>

                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-sky-200/20 to-slate-300/20 blur-[120px] pointer-events-none z-[-2]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-slate-300/20 to-sky-200/20 blur-[140px] pointer-events-none z-[-2]"></div>

                <div className="relative z-10 w-full h-full flex flex-col gap-6">

                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/40 backdrop-blur-md shadow-sm flex items-center justify-center border border-white/60">
                                <Package size={20} strokeWidth={2.5} className="text-sky-600" />
                            </div>
                            <div>
                                <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">Pharmacy Inventory</h1>
                                <p className="text-[13px] font-medium text-slate-500 mt-1.5">Real-time database stock levels and management</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setEditingId(null);
                                setFormData({
                                    name: '', genericName: '', category: 'Tablets', batchNumber: '',
                                    quantity: '', costPrice: '', sellingPrice: '', expiryDate: '', minStockLevel: 10, supplierId: '', isControlled: false
                                });
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-5 py-3 bg-sky-500/90 backdrop-blur-md text-white font-bold rounded-2xl shadow-[0_10px_25px_-5px_rgba(2,132,199,0.3)] hover:bg-sky-600 transition-all active:scale-[0.98] text-[14px] cursor-pointer border border-sky-400/50"
                        >
                            <Plus size={18} strokeWidth={2.5} /> Add New Medicine
                        </button>
                    </div>

                    <div className="bg-white/40 backdrop-blur-xl p-4 rounded-[24px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] flex items-center gap-3">
                        <Search size={18} className="text-slate-400 ml-2" />
                        <input
                            type="text"
                            placeholder="Search by medicine name or batch number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full outline-none text-slate-700 text-sm font-medium bg-transparent placeholder-slate-400"
                        />
                    </div>

                    <div className="bg-white/30 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex flex-col md:flex-row items-center justify-between gap-6 relative">
                        <div className="w-full md:w-1/3">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="p-2 bg-white/50 text-sky-600 rounded-xl border border-white/60 shadow-sm">
                                    <PieIcon size={20} />
                                </div>
                                <h2 className="text-[17px] font-bold text-slate-800 tracking-tight">3D Stock Analytics</h2>
                            </div>
                            <p className="text-[13px] text-slate-500 font-medium">Visualizing live database inventory distribution in true 3D perspective</p>
                        </div>

                        <div className="h-[360px] w-full md:w-2/3 flex items-center justify-center overflow-visible">
                            <div className="w-full h-full">
                                <HighchartsReact
                                    highcharts={Highcharts}
                                    options={highchartsOptions}
                                    containerProps={{ style: { width: '100%', height: '100%', overflow: 'visible' } }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 overflow-hidden mb-6 flex flex-col">
                        <div className="overflow-x-auto px-8 py-4">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Medicine Name</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Category</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Batch #</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Stock Qty</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Unit Price (LKR)</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Expiry Date</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 text-right">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="text-center py-16 text-slate-500 font-medium text-sm">Loading from database...</td></tr>
                                ) : filteredMedicines.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center py-16 text-slate-500 font-medium text-sm">No medicines found in database.</td></tr>
                                ) : (
                                    filteredMedicines.map((med) => (
                                        <tr key={med.id} className={`group transition-colors border-b border-white/20 last:border-0 ${med.isControlled ? 'bg-rose-100/30 backdrop-blur-sm' : 'hover:bg-white/20'}`}>
                                            <td className="py-4 align-top pt-5">
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-bold text-[14px] ${med.isControlled ? 'text-rose-700 font-black' : 'text-[#1e293b]'}`}>{med.name}</p>
                                                    {med.isControlled && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100/80 text-rose-700 rounded-md text-[10px] font-bold border border-rose-200/50 backdrop-blur-sm" title="NMRA Controlled Drug">
                                                            <ShieldAlert size={12} /> Controlled
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`text-[12px] mt-0.5 ${med.isControlled ? 'text-rose-500 font-medium' : 'text-slate-500 font-medium'}`}>{med.genericName || med.supplier?.companyName || 'N/A'}</p>
                                            </td>

                                            <td className="py-4 align-top pt-5">
                                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${med.isControlled ? 'bg-rose-100/80 text-rose-700 border border-rose-200/50 backdrop-blur-sm' : 'bg-white/50 text-sky-600 border border-white/60 shadow-sm backdrop-blur-sm'}`}>{med.category}</span>
                                            </td>

                                            <td className={`py-4 align-top pt-5 text-[13px] font-mono font-bold ${med.isControlled ? 'text-rose-700' : 'text-slate-700'}`}>{med.batchNumber}</td>

                                            <td className="py-4 align-top pt-5 text-[13px] font-bold">
                                                <span className={med.quantity <= med.minStockLevel ? 'text-rose-600 bg-rose-100/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-rose-200/50' : med.isControlled ? 'text-rose-700 font-black' : 'text-slate-700'}>
                                                    {med.quantity} {med.quantity <= med.minStockLevel && '⚠️ Low'}
                                                </span>
                                            </td>

                                            <td className={`py-4 align-top pt-5 text-[14px] font-bold ${med.isControlled ? 'text-rose-700' : 'text-[#1e293b]'}`}>LKR {Number(med.sellingPrice).toFixed(2)}</td>

                                            <td className={`py-4 align-top pt-5 text-[13px] font-medium ${med.isControlled ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>{new Date(med.expiryDate).toLocaleDateString()}</td>

                                            <td className="py-4 align-top pt-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleEdit(med)} className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-100/50 rounded-lg transition-colors cursor-pointer" title="Edit Medicine">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(med.id)} className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-100/50 rounded-lg transition-colors cursor-pointer" title="Delete Medicine">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] border border-white w-[650px] max-h-[90vh] overflow-y-auto">

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[20px] font-bold text-slate-800 flex items-center gap-2.5">
                                <Package className="text-sky-600" /> {editingId ? 'Update Medicine' : 'Add New Medicine'}
                            </h2>
                            <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="hover:bg-white/50 p-2 rounded-full transition-colors border border-transparent hover:border-white/60 cursor-pointer">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <Truck size={14} className="text-sky-500"/> Manufacturer / Supplier *
                                </label>
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm cursor-pointer"
                                    value={formData.supplierId}
                                    onChange={e => setFormData({...formData, supplierId: e.target.value})}
                                >
                                    <option value="">-- Choose Supplier Company --</option>
                                    {suppliers.filter(s => s.status === 'Active').map(s => (
                                        <option key={s.id} value={s.id}>{s.companyName} (Rep: {s.repName})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Brand Name *</label>
                                    <input type="text" required placeholder="e.g. Panadol" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm"
                                           value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Generic Name</label>
                                    <input type="text" placeholder="e.g. Paracetamol" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm"
                                           value={formData.genericName} onChange={e => setFormData({...formData, genericName: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Category *</label>
                                    <select className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm cursor-pointer"
                                            value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        <option value="Tablets">Tablets</option>
                                        <option value="Capsules">Capsules</option>
                                        <option value="Syrup">Syrup</option>
                                        <option value="Injection">Injection</option>
                                        <option value="Cream/Ointment">Cream/Ointment</option>
                                        <option value="Inhaler">Inhaler</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Batch Number *</label>
                                    <input type="text" required placeholder="e.g. BATCH-9921" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm"
                                           value={formData.batchNumber} onChange={e => setFormData({...formData, batchNumber: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Quantity *</label>
                                    <input type="number" required min="0" placeholder="100" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm"
                                           value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Cost (LKR) *</label>
                                    <input type="number" required min="0" step="0.01" placeholder="10.00" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm"
                                           value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Selling (LKR) *</label>
                                    <input type="number" required min="0" step="0.01" placeholder="15.00" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm"
                                           value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Expiry Date *</label>
                                    <input type="date" required className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm cursor-pointer"
                                           value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Min Stock Level</label>
                                    <input type="number" min="1" placeholder="10" className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm"
                                           value={formData.minStockLevel} onChange={e => setFormData({...formData, minStockLevel: e.target.value})} />
                                </div>
                            </div>

                            <div className="p-4 bg-rose-50/50 backdrop-blur-sm border border-rose-200/50 rounded-2xl flex items-center justify-between mt-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/60 text-rose-600 rounded-xl border border-rose-100 shadow-sm">
                                        <ShieldAlert size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-bold text-slate-800">NMRA Controlled Substance</p>
                                        <p className="text-[11px] text-slate-500 font-medium">Enable if this medicine requires strict regulatory audit logging.</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.isControlled}
                                        onChange={e => setFormData({...formData, isControlled: e.target.checked})}
                                    />
                                    <div className="w-11 h-6 bg-slate-200/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500 shadow-inner"></div>
                                </label>
                            </div>

                            <div className="flex gap-4 pt-4 mt-2">
                                <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="w-1/2 bg-white/50 backdrop-blur-md text-slate-600 font-bold py-3.5 rounded-2xl border border-white/80 hover:bg-white/80 hover:text-slate-800 transition-all cursor-pointer shadow-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className="w-full mt-4 bg-sky-500/90 backdrop-blur-md text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(2,132,199,0.3)] hover:bg-sky-600 transition-all active:scale-[0.98] text-[15px] disabled:opacity-50 cursor-pointer border border-sky-400/50">
                                    {submitting ? 'Saving...' : editingId ? 'Update Medicine' : 'Save Medicine'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </AdminLayout>
    );
}