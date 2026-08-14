import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { inventoryApi } from '../../api/inventoryApi';
import { salesApi } from '../../api/salesApi';
import ReceiptModal from './ReceiptModal';
import {
    ShoppingCart, Search, Plus, Minus, Trash2, CheckCircle, Package, History, FileText,
    Eye, Edit, Ban, X, User, CreditCard, Stethoscope, MessageSquare, FileCheck, TrendingUp, MoreHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

export default function POSPage() {
    const [medicines, setMedicines] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [doctorName, setDoctorName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [loading, setLoading] = useState(false);

    const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
    const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('');

    const [recentSales, setRecentSales] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [detail, setDetail] = useState(null);
    const [editingSale, setEditingSale] = useState(null);
    const [editForm, setEditForm] = useState({ customerName: '', paymentMethod: '', doctorName: '', remarks: '' });
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchInventory();
        fetchSalesHistory();
        fetchPendingPrescriptions();
    }, []);

    const fetchInventory = async () => {
        try {
            const res = await inventoryApi.getAll();
            setMedicines(res.data);
        } catch (err) {
            toast.error('Failed to load inventory for POS');
        }
    };

    const fetchSalesHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await salesApi.list({ page: 0, size: 50 });
            if (Array.isArray(res.data)) {
                setRecentSales(res.data);
            } else {
                setRecentSales(res.data?.content || []);
            }
        } catch (err) {
            console.error('Failed to load sales history', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchPendingPrescriptions = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/prescriptions');
            const pending = (res.data || []).filter(rx => rx.status === 'Pending');
            setPendingPrescriptions(pending);
        } catch (err) {
            console.error('Failed to load prescriptions for POS', err);
        }
    };

    const handlePrescriptionSelect = (e) => {
        const rxId = e.target.value;
        setSelectedPrescriptionId(rxId);

        if (!rxId) {
            return;
        }

        const rx = pendingPrescriptions.find(p => String(p.id) === String(rxId));
        if (!rx) return;

        if (rx.patient?.name) setCustomerName(rx.patient.name);
        if (rx.doctor?.name) setDoctorName(rx.doctor.name);

        if (rx.items && rx.items.length > 0) {
            let updatedCart = [...cart];

            rx.items.forEach(item => {
                const med = medicines.find(m => m.id === item.medicineId);
                if (med) {
                    const existingItem = updatedCart.find(c => c.medicineId === med.id);
                    if (existingItem) {
                        existingItem.quantity += (item.quantity || 1);
                        existingItem.isRx = true;
                    } else {
                        updatedCart.push({
                            medicineId: med.id,
                            name: med.name,
                            batchNumber: med.batchNumber,
                            sellingPrice: med.sellingPrice,
                            quantity: item.quantity || 1,
                            maxStock: med.quantity,
                            isControlled: Boolean(med.isControlled || med.is_controlled),
                            isRx: true
                        });
                    }
                }
            });
            setCart(updatedCart);
            toast.success(`Loaded prescription RX-${String(rx.id).padStart(4, '0')} successfully!`);
        } else {
            toast.error('Selected prescription has no medicines attached.');
        }
    };

    const addToCart = (med) => {
        if (med.quantity <= 0) {
            toast.error('Out of stock!');
            return;
        }

        const existingItem = cart.find(item => item.medicineId === med.id);
        if (existingItem) {
            if (existingItem.quantity >= med.quantity) {
                toast.error('Cannot add more than available stock!');
                return;
            }
            setCart(cart.map(item =>
                item.medicineId === med.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCart([...cart, {
                medicineId: med.id,
                name: med.name,
                batchNumber: med.batchNumber,
                sellingPrice: med.sellingPrice,
                quantity: 1,
                maxStock: med.quantity,
                isControlled: Boolean(med.isControlled || med.is_controlled),
                isRx: false
            }]);
        }
        toast.success(`${med.name} added to cart`);
    };

    const updateQuantity = (medicineId, delta) => {
        setCart(cart.map(item => {
            if (item.medicineId === medicineId) {
                const newQty = item.quantity + delta;
                if (newQty > item.maxStock) {
                    toast.error('Exceeds available stock');
                    return item;
                }
                return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
        }).filter(Boolean));
    };

    const removeFromCart = (medicineId) => {
        setCart(cart.filter(item => item.medicineId !== medicineId));
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.error('Cart is empty!');
            return;
        }

        const hasControlledItem = cart.some(item => Boolean(item.isControlled));

        if (hasControlledItem && (!selectedPrescriptionId || !customerName || !doctorName)) {
            window.alert("🚨 STOP! NMRA REGULATORY WARNING:\n\nREQUIRED VALID PRESCRIPTION!\n\nYou have a 'Controlled Drug' in the cart. You must provide:\n1. Pending Prescription\n2. Customer Name\n3. Doctor Name");
            toast.error('Required Valid Prescription! Missing details.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                customerName: customerName || 'Walk-in Customer',
                doctorName,
                paymentMethod,
                prescriptionId: selectedPrescriptionId || null,
                items: cart.map(i => ({ medicineId: i.medicineId, quantity: i.quantity }))
            };

            await salesApi.checkout(payload);
            toast.success('Bill generated & Dispensed successfully! 🎉');

            setCart([]);
            setCustomerName('');
            setDoctorName('');
            setSelectedPrescriptionId('');
            fetchInventory();
            fetchSalesHistory();
            fetchPendingPrescriptions();

        } catch (err) {
            toast.error(err.response?.data?.error || 'Checkout failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVoid = async (sale) => {
        const id = sale.saleId || sale.id;
        if (window.confirm(`Are you sure you want to Void Invoice #${String(id).slice(0, 8).toUpperCase()}?`)) {
            try {
                if (salesApi.voidSale) {
                    await salesApi.voidSale(id);
                }
                toast.success('Sale voided successfully!');
                fetchSalesHistory();
                fetchInventory();
            } catch (err) {
                toast.error(err.response?.data?.error || err.message || 'Failed to void sale');
            }
        }
    };

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
        if (!editForm.remarks || editForm.remarks.trim() === '') {
            toast.error('Please provide a reason (Remarks) for this update!');
            return;
        }

        setUpdating(true);
        try {
            const id = editingSale.saleId || editingSale.id;
            if (salesApi.updateSale) {
                await salesApi.updateSale(id, editForm);
            }
            toast.success(`Invoice ${String(id).slice(0, 8).toUpperCase()} updated successfully!`);
            setEditingSale(null);
            fetchSalesHistory();
        } catch (err) {
            console.error("Update failed:", err);
            toast.error(err.response?.data?.error || err.message || 'Failed to update sale');
        } finally {
            setUpdating(false);
        }
    };

    const filteredMedicines = medicines.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getChartOptions = () => {
        const dailyRevenue = {};


        [...recentSales].reverse().forEach(sale => {
            if (sale.status === 'Completed') {
                const dateStr = new Date(sale.saleDate || sale.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                if (!dailyRevenue[dateStr]) dailyRevenue[dateStr] = 0;
                dailyRevenue[dateStr] += Number(sale.totalAmount);
            }
        });

        const categories = Object.keys(dailyRevenue);
        const data = Object.values(dailyRevenue);

        return {
            chart: {
                type: 'areaspline',
                backgroundColor: 'transparent',
                height: 280,
                style: {
                    fontFamily: 'Inter, sans-serif'
                }
            },
            title: {
                text: ''
            },
            xAxis: {
                categories: categories.length > 0 ? categories : ['No Data'],
                labels: {
                    style: {
                        color: '#64748b',
                        fontWeight: '600',
                        fontSize: '11px'
                    }
                },
                lineWidth: 0,
                tickWidth: 0,
                crosshair: {
                    color: '#e2e8f0',
                    dashStyle: 'Dash'
                }
            },
            yAxis: {
                title: {
                    text: 'REVENUE (LKR)',
                    align: 'high',
                    style: {
                        color: '#94a3b8',
                        fontSize: '10px',
                        fontWeight: '700',
                        letterSpacing: '1px'
                    }
                },
                labels: {
                    style: {
                        color: '#94a3b8',
                        fontWeight: '500'
                    }
                },
                gridLineColor: 'rgba(255,255,255,0.2)',
                gridLineDashStyle: 'Dash'
            },
            tooltip: {
                valuePrefix: 'LKR ',
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderColor: 'rgba(255,255,255,0.4)',
                borderRadius: 16,
                shadow: {
                    color: 'rgba(0, 0, 0, 0.08)',
                    offsetX: 0,
                    offsetY: 8,
                    width: 20
                },
                style: {
                    color: '#1e293b',
                    fontWeight: '600',
                    fontSize: '13px'
                }
            },
            plotOptions: {
                areaspline: {
                    fillOpacity: 0.5,
                    lineWidth: 3,
                    connectEnds: true,
                    enableMouseTracking: true,
                    marker: {
                        enabled: false,
                        states: {
                            hover: {
                                enabled: true,
                                radius: 5,
                                fillColor: '#ffffff',
                                lineColor: '#8b5cf6',
                                lineWidth: 2
                            }
                        }
                    },
                    color: '#8b5cf6',
                    fillColor: {
                        linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
                        stops: [
                            [0, 'rgba(139, 92, 246, 0.4)'],
                            [1, 'rgba(139, 92, 246, 0.0)']
                        ]
                    }
                }
            },
            legend: {
                enabled: false
            },
            credits: {
                enabled: false
            },
            series: [{
                name: 'Daily Revenue',
                data: data.length > 0 ? data : [0]
            }]
        };
    };

    return (
        <AdminLayout>
            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4">

                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply"
                     style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}>
                </div>

                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-indigo-200/20 to-slate-300/20 blur-[120px] pointer-events-none z-[-2]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-slate-300/20 to-indigo-200/20 blur-[140px] pointer-events-none z-[-2]"></div>

                <div className="relative z-10 w-full h-full flex flex-col gap-6 pb-2">

                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">POS Billing</h1>
                            <p className="text-[12px] font-medium text-slate-400 mt-1.5">Point of sale, active billing cart, and checkout</p>
                        </div>
                        <div className="p-2.5 bg-white/40 backdrop-blur-md rounded-full shadow-sm border border-slate-200 text-slate-500 hover:text-indigo-600 cursor-pointer transition-all hover:shadow-md">
                            <MoreHorizontal size={20} />
                        </div>
                    </div>

                    <div className="bg-white/30 backdrop-blur-2xl p-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex flex-col gap-2">
                        <div className="flex items-center gap-3 mb-2 px-1">
                            <div className="p-2.5 bg-white/50 text-indigo-600 rounded-xl border border-white/60 shadow-sm">
                                <TrendingUp size={20} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-[17px] font-bold text-slate-800 tracking-tight">30-Day Revenue Trend</h2>
                                <p className="text-[12.5px] text-slate-500 font-medium mt-0.5">Real-time daily cashflow and sales fluctuations</p>
                            </div>
                        </div>
                        <div className="w-full mt-2">
                            <HighchartsReact
                                highcharts={Highcharts}
                                options={getChartOptions()}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
                        <div className="lg:col-span-7 flex flex-col gap-4 bg-white/30 backdrop-blur-2xl p-6 rounded-[32px] border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden h-full">
                            <div className="flex items-center justify-between px-2">
                                <h2 className="text-[18px] font-bold text-slate-800">Pharmacy Catalog</h2>
                                <span className="text-xs font-semibold bg-white/50 text-indigo-700 px-3 py-1 rounded-full border border-white/60 shadow-sm backdrop-blur-sm">{medicines.length} Items</span>
                            </div>

                            <div className="relative">
                                <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or batch number..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm backdrop-blur-sm"
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-[200px] grid grid-cols-1 md:grid-cols-2 gap-4 pr-1">
                                {filteredMedicines.map(med => {
                                    const isControlled = Boolean(med.isControlled || med.is_controlled);
                                    return (
                                        <div
                                            key={med.id}
                                            onClick={() => addToCart(med)}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between backdrop-blur-sm shadow-sm hover:-translate-y-0.5 ${isControlled ? 'bg-rose-100/50 border-rose-200/50 hover:bg-rose-100/80' : 'bg-white/40 border-white/50 hover:bg-white/60'}`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <p className={`font-bold text-[14px] ${isControlled ? 'text-rose-700 font-black' : 'text-slate-800'}`}>{med.name}</p>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${isControlled ? 'bg-rose-50 text-rose-700 border-rose-200/50' : 'bg-white/60 text-indigo-700 border-white/80'}`}>{med.category}</span>
                                                </div>
                                                <p className={`text-xs mt-1 ${isControlled ? 'text-rose-500 font-medium' : 'text-slate-500 font-medium'}`}>Batch: {med.batchNumber}</p>
                                            </div>
                                            <div className="flex justify-between items-end mt-4">
                                                <span className={`font-black text-[15px] ${isControlled ? 'text-rose-700' : 'text-indigo-700'}`}>LKR {Number(med.sellingPrice).toFixed(2)}</span>
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${med.quantity <= med.minStockLevel ? 'bg-rose-50 text-rose-600 border-rose-200/50' : 'bg-white/60 text-emerald-700 border-white/80'}`}>
                                                    Stock: {med.quantity}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="lg:col-span-5 flex flex-col bg-white/30 backdrop-blur-2xl p-6 rounded-[32px] border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] justify-between h-full">
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex items-center gap-2 mb-4 px-1">
                                    <ShoppingCart className="text-indigo-600" size={20} />
                                    <h2 className="text-[18px] font-bold text-slate-800">Current Billing Cart</h2>
                                </div>

                                <div className="mb-4 p-4 bg-white/40 border border-white/60 backdrop-blur-sm rounded-2xl shadow-sm">
                                    <label className="block text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <FileCheck size={14}/> Load from Pending Prescription
                                    </label>
                                    <select
                                        value={selectedPrescriptionId}
                                        onChange={handlePrescriptionSelect}
                                        className="w-full px-3 py-2.5 bg-white/60 border border-white/80 rounded-xl text-[13px] font-bold text-slate-700 outline-none cursor-pointer shadow-sm"
                                    >
                                        <option value="">-- Choose Prescription (Optional) --</option>
                                        {pendingPrescriptions.map(rx => (
                                            <option key={rx.id} value={rx.id}>
                                                RX-{String(rx.id).padStart(4, '0')} - {rx.patient?.name || 'Patient'} (Dr. {rx.doctor?.name || 'Doctor'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-3 mb-5">
                                    <input
                                        type="text"
                                        placeholder="Customer Name (Required if Controlled)"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm backdrop-blur-sm"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            placeholder="Doctor Name"
                                            value={doctorName}
                                            onChange={(e) => setDoctorName(e.target.value)}
                                            className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm backdrop-blur-sm"
                                        />
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[13px] font-bold text-slate-700 outline-none cursor-pointer shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/40"
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="Card">Card</option>
                                            <option value="Insurance">Insurance</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto min-h-[150px] space-y-2 pr-1 mb-4 border-t border-b border-white/30 py-4">
                                    {cart.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-[13px] font-medium">
                                            <Package size={32} className="mb-2 opacity-50" />
                                            Cart is empty. Click items or load prescription.
                                        </div>
                                    ) : (
                                        cart.map(item => (
                                            <div key={item.medicineId} className={`flex items-center justify-between p-3 rounded-xl border backdrop-blur-sm shadow-sm ${item.isControlled ? 'bg-rose-100/50 border-rose-200/50' : 'bg-white/50 border-white/60'}`}>
                                                <div className="overflow-hidden pr-2 flex items-center gap-2">
                                                    <p className={`font-bold text-[13px] truncate max-w-[130px] ${item.isControlled ? 'text-rose-700 font-black' : 'text-slate-800'}`}>{item.name}</p>
                                                    {item.isRx ? (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider border border-indigo-200/50">RX</span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider border border-amber-200/50">OTC</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`text-[12px] font-bold w-16 text-right mr-1 ${item.isControlled ? 'text-rose-700' : 'text-indigo-700'}`}>LKR {(item.sellingPrice * item.quantity).toFixed(2)}</div>
                                                    <button onClick={() => updateQuantity(item.medicineId, -1)} className="p-1.5 bg-white/80 border border-white/80 rounded-lg hover:bg-white transition-colors cursor-pointer shadow-sm"><Minus size={12} /></button>
                                                    <span className="text-[13px] font-bold w-5 text-center text-slate-800">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.medicineId, 1)} className="p-1.5 bg-white/80 border border-white/80 rounded-lg hover:bg-white transition-colors cursor-pointer shadow-sm"><Plus size={12} /></button>
                                                    <button onClick={() => removeFromCart(item.medicineId)} className="text-rose-500 hover:text-rose-700 ml-1 p-1 cursor-pointer"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-white/30 pt-4 relative z-20 shrink-0">
                                <div className="flex justify-between items-center mb-5 px-1">
                                    <span className="text-[15px] font-bold text-slate-600">Total Amount:</span>
                                    <span className="text-[26px] font-black text-slate-800">LKR {totalAmount.toFixed(2)}</span>
                                </div>
                                <button
                                    onClick={handleCheckout}
                                    disabled={loading || cart.length === 0}
                                    className="w-full bg-indigo-500/90 backdrop-blur-md text-white font-bold py-4 rounded-2xl shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)] hover:bg-indigo-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-[15px] relative z-50 border border-indigo-400/50"
                                >
                                    <CheckCircle size={18} className={loading ? "animate-spin" : ""} />
                                    {loading ? 'Processing Bill...' : 'Complete Checkout & Print Bill'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 overflow-hidden flex flex-col mt-6">
                        <div className="p-6 border-b border-white/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/50 text-indigo-600 rounded-xl border border-white/60 shadow-sm">
                                    <History size={20} />
                                </div>
                                <div>
                                    <h2 className="text-[17px] font-bold text-[#1e293b] tracking-tight">Recent POS Transactions</h2>
                                    <p className="text-[13px] text-slate-500 mt-0.5 font-medium">Live view of the most recent bills processed</p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto px-8 py-4">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Invoice #</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Customer</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Date & Time</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Payment</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Total (LKR)</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Status</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 text-right">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {loadingHistory ? (
                                    <tr><td colSpan="7" className="text-center py-16 text-slate-500 font-medium text-[13px]">Loading recent transactions...</td></tr>
                                ) : recentSales.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center py-16 text-slate-500 font-medium text-[13px]"><div className="flex items-center justify-center gap-2"><FileText size={16}/> No transactions yet.</div></td></tr>
                                ) : (
                                    recentSales.slice(0, 10).map((sale) => {
                                        let isSaleControlled = false;
                                        if (sale.items && Array.isArray(sale.items)) {
                                            isSaleControlled = sale.items.some(item => {
                                                if (item.medicine && (item.medicine.isControlled || item.medicine.is_controlled)) {
                                                    return true;
                                                }
                                                const medInfo = medicines.find(m => String(m.id) === String(item.medicineId));
                                                return medInfo ? Boolean(medInfo.isControlled || medInfo.is_controlled) : false;
                                            });
                                        }

                                        return (
                                            <tr key={sale.saleId || sale.id} className="group hover:bg-white/20 transition-colors border-b border-white/20 last:border-0">
                                                <td className="py-4 align-top pt-5 font-mono text-[13px] font-bold text-slate-800">
                                                    {String(sale.saleId || sale.id).slice(0, 8).toUpperCase()}
                                                </td>
                                                <td className="py-4 align-top pt-5 text-[13px] font-semibold text-slate-700">
                                                    {sale.customerName || 'Walk-in Customer'}
                                                    {isSaleControlled && <span className="ml-2 px-1.5 py-0.5 bg-rose-100/80 text-rose-700 rounded text-[9px] font-bold border border-rose-200/50 backdrop-blur-sm" title="Contains Controlled Drug">CD</span>}
                                                </td>
                                                <td className="py-4 align-top pt-5 text-[13px] font-medium text-slate-600">
                                                    {new Date(sale.saleDate || sale.createdAt).toLocaleString()}
                                                </td>
                                                <td className="py-4 align-top pt-5 text-[13px] font-semibold text-slate-700">
                                                    <span className="px-2.5 py-1 bg-white/50 border border-white/60 text-slate-600 rounded-lg backdrop-blur-sm shadow-sm">{sale.paymentMethod}</span>
                                                </td>
                                                <td className="py-4 align-top pt-5 text-[14px] font-bold text-indigo-700">
                                                    {Number(sale.totalAmount).toFixed(2)}
                                                </td>
                                                <td className="py-4 align-top pt-5 text-[12px] font-bold">
                                                    {sale.status === 'Completed' ? (
                                                        <span className="px-2.5 py-1 bg-white/50 border border-white/60 text-emerald-600 rounded-lg backdrop-blur-sm shadow-sm">Completed</span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-rose-100/50 border border-rose-200/50 text-rose-600 rounded-lg backdrop-blur-sm shadow-sm">{sale.status}</span>
                                                    )}
                                                </td>
                                                <td className="py-4 align-top pt-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100/50 rounded-lg transition-colors cursor-pointer"
                                                            onClick={() => setDetail(sale)}
                                                            title="View & Print Receipt"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>

                                                        {sale.status === 'Completed' && !isSaleControlled && (
                                                            <button
                                                                className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-100/50 rounded-lg transition-colors cursor-pointer"
                                                                onClick={() => handleOpenEdit(sale)}
                                                                title="Edit Sale"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                        )}

                                                        {sale.status === 'Completed' && !isSaleControlled && (
                                                            <button
                                                                className="flex items-center gap-1 px-2.5 py-1 bg-rose-50/80 text-rose-600 hover:bg-rose-100/90 rounded-lg text-[11px] font-bold uppercase transition-colors cursor-pointer border border-rose-100/50"
                                                                onClick={() => handleVoid(sale)}
                                                            >
                                                                <Ban className="w-3.5 h-3.5" /> Void
                                                            </button>
                                                        )}

                                                        {sale.status === 'Completed' && isSaleControlled && (
                                                            <span className="text-[10px] text-rose-500 italic font-medium" title="Cannot edit or void controlled drug sales due to NMRA regulations">Locked</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
            <ReceiptModal open={!!detail} onClose={() => setDetail(null)} sale={detail} />

            {editingSale && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] w-[550px] border border-white">

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[18px] font-bold text-slate-800 flex items-center gap-2.5">
                                <Edit className="w-5 h-5 text-indigo-600"/> Edit Invoice
                            </h2>
                            <button onClick={() => setEditingSale(null)} className="hover:bg-white/50 p-2 rounded-full transition-colors border border-transparent hover:border-white/60 cursor-pointer">
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
                                        className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm backdrop-blur-sm"
                                        value={editForm.customerName}
                                        onChange={(e) => setEditForm({...editForm, customerName: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Stethoscope size={14}/> Doctor Name</label>
                                    <input
                                        type="text"
                                        placeholder="Optional"
                                        className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm backdrop-blur-sm"
                                        value={editForm.doctorName}
                                        onChange={(e) => setEditForm({...editForm, doctorName: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><CreditCard size={14}/> Payment Method</label>
                                    <select
                                        className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm backdrop-blur-sm cursor-pointer"
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
                                        required
                                        placeholder="Required reason..."
                                        className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm backdrop-blur-sm"
                                        value={editForm.remarks}
                                        onChange={(e) => setEditForm({...editForm, remarks: e.target.value})}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={updating}
                                className="w-full mt-4 bg-indigo-500/90 backdrop-blur-md text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)] hover:bg-indigo-600 transition-all active:scale-[0.98] text-[15px] disabled:opacity-50 cursor-pointer border border-indigo-400/50"
                            >
                                {updating ? 'Updating...' : 'Update Invoice'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}