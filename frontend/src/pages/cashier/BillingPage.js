import React, { useState } from 'react';
import { FaSearch, FaShoppingCart, FaCreditCard, FaPrint, FaBarcode, FaPlus, FaMinus, FaTrashAlt } from 'react-icons/fa';
import CashierLayout from '../../components/layout/CashierLayout';

import pic1 from '../../assets/Pic1.png';
import pic2 from '../../assets/Pic2.png';
import pic3 from '../../assets/Pic3.jpg';
import pic4 from '../../assets/Pic4.png';
import pic5 from '../../assets/Pic5.png';

const initialMedicines = [
    { id: 101, name: 'Paracetamol 500mg (TABLETS)', batchNumber: 'P210A', sellingPrice: 200.00, quantity: 50, image: pic1, isControlled: false },
    { id: 102, name: 'Amoxicillin 250mg (CAPSULES)', batchNumber: 'A305D', sellingPrice: 350.00, quantity: 20, image: pic2, isControlled: true },
    { id: 103, name: 'Ibuprofen 400mg (LIQUID SYRUP)', batchNumber: 'I420S', sellingPrice: 280.00, quantity: 35, image: pic3, isControlled: false },
    { id: 104, name: 'Diazepam 5mg (INJECTION)', batchNumber: 'D900I', sellingPrice: 410.00, quantity: 10, image: pic4, isControlled: true },
    { id: 105, name: 'Clotrimazole 1% (CREAM)', batchNumber: 'C115C', sellingPrice: 190.00, quantity: 40, image: pic5, isControlled: false },
];

export default function BillingPage() {
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('Cash');

    const filteredMedicines = initialMedicines.filter(med =>
        med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const addToCart = (med) => {
        const existingItem = cart.find(item => item.id === med.id);
        if (existingItem) {
            setCart(cart.map(item =>
                item.id === med.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCart([...cart, { ...med, quantity: 1 }]);
        }
    };

    const updateQuantity = (itemId, delta) => {
        setCart(cart.map(item => {
            if (item.id === itemId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
        }).filter(Boolean));
    };

    const removeFromCart = (itemId) => {
        setCart(cart.filter(item => item.id !== itemId));
    };

    const subtotalAmount = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    const taxAmount = subtotalAmount * 0.05;
    const totalAmount = subtotalAmount + taxAmount - discount;

    const handleCheckout = () => {
        alert(`Checking out order. Total: LKR ${totalAmount.toFixed(2)}. Paid via ${paymentMethod}.\nThis is a simulation.`);
        setCart([]);
        setDiscount(0);
    };

    return (
        <CashierLayout>
            <div className="flex flex-col gap-6 font-sans">
                <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div>
                        <h1 className="text-[24px] font-black text-slate-800 tracking-tight">Cashier POS Billing Counter</h1>
                        <p className="text-[13px] font-medium text-slate-400">Manage prescriptions, scan items, and complete fast customer checkouts.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl font-bold text-xs border border-emerald-100">
                            Terminal Active 🟢
                        </span>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-grow flex flex-col gap-6 bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_8px_32px_-12px_rgba(31,38,135,0.05)]">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-[20px] font-bold text-[#1e293b] tracking-tight">Medicine Catalog</h2>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filteredMedicines.length} Items Found</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative flex-grow">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by name, generic or batch..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-300 transition-all shadow-inner"
                                />
                            </div>
                            <button className="flex items-center gap-2 p-3.5 px-5 bg-sky-500 text-white rounded-xl font-bold text-[14px] hover:bg-sky-600 transition-colors shadow-sm cursor-pointer">
                                <FaBarcode size={18}/> Scan Barcode
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 overflow-y-auto max-h-[55vh] pr-1">
                            {filteredMedicines.map(med => (
                                <div key={med.id} className="flex flex-col gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:border-sky-200 hover:shadow-md group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                                            <img src={med.image} alt={med.name} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex-grow flex flex-col gap-1 pr-1">
                                            <h3 className="text-[13px] font-extrabold text-slate-800 tracking-tight leading-tight group-hover:text-sky-600 transition-colors">{med.name}</h3>
                                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                                <span>Batch: <strong className="text-slate-700">{med.batchNumber}</strong></span>
                                                {med.isControlled && <span className="p-0.5 px-1 text-[9px] font-bold text-rose-600 bg-rose-50 rounded">CONTROLLED</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-between gap-3 pt-3 border-t border-slate-100">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[11px] font-medium text-slate-400">Price (unit)</span>
                                            <span className="text-[16px] font-black text-slate-900">LKR {med.sellingPrice.toFixed(2)}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5 items-end">
                                            <span className="text-[11px] font-medium text-slate-400">Stock: {med.quantity}</span>
                                            <button onClick={() => addToCart(med)} className="flex items-center gap-1.5 p-2 px-3 text-[12px] font-bold bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm cursor-pointer">
                                                <FaPlus size={10}/> Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="w-full lg:w-[380px] flex flex-col gap-6 bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_8px_32px_-12px_rgba(31,38,135,0.05)] self-start">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FaShoppingCart className="text-sky-600" size={18} />
                                <h2 className="text-[18px] font-bold text-[#1e293b] tracking-tight">Current Order</h2>
                            </div>
                            <span className="text-xs font-bold text-white bg-sky-600 px-2.5 py-1 rounded-full">{cart.reduce((sum, item) => sum + item.quantity, 0)} Items</span>
                        </div>

                        <div className="flex-grow flex flex-col gap-3 py-2 overflow-y-auto max-h-[35vh] border-t border-b border-slate-100">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-10 text-center text-slate-400 gap-3">
                                    <FaShoppingCart size={36} className="opacity-20" />
                                    <span className="text-[13px] font-medium leading-relaxed">No items in order yet.<br/>Select items from catalog.</span>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.id} className="flex justify-between items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex-grow flex flex-col gap-0.5">
                                            <h4 className="text-[12px] font-bold text-slate-800 truncate max-w-[140px]" title={item.name}>{item.name}</h4>
                                            <span className="text-[10px] font-medium text-slate-400">LKR {item.sellingPrice.toFixed(2)} x {item.quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-slate-500 hover:text-sky-600"><FaMinus size={9} /></button>
                                                <span className="text-[12px] font-bold w-5 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-slate-500 hover:text-sky-600"><FaPlus size={9} /></button>
                                            </div>
                                            <span className="text-[13px] font-black text-slate-900 w-20 text-right">LKR {(item.sellingPrice * item.quantity).toFixed(2)}</span>
                                            <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-rose-400 hover:text-rose-600"><FaTrashAlt size={12}/></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            <div className="flex items-center justify-between text-[13px] font-medium text-slate-500 px-1">
                                <span>Subtotal</span>
                                <span className="font-bold text-slate-800">LKR {subtotalAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[13px] font-medium text-slate-500 px-1">
                                <span>Tax (5.0%)</span>
                                <span className="font-bold text-slate-800">LKR {taxAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 py-1.5 border-t border-slate-100">
                                <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Discount</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={discount === 0 ? '' : discount}
                                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                    className="w-28 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-bold text-slate-800 outline-none text-right shadow-inner"
                                />
                            </div>
                            <div className="flex items-center justify-between gap-4 py-1.5 border-t border-slate-100">
                                <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Payment</label>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setPaymentMethod('Cash')} className={`p-2 px-3 text-[12px] font-bold rounded-lg cursor-pointer transition-colors ${paymentMethod === 'Cash' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Cash</button>
                                    <button onClick={() => setPaymentMethod('Card')} className={`flex items-center gap-1 p-2 px-3 text-[12px] font-bold rounded-lg cursor-pointer transition-colors ${paymentMethod === 'Card' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}><FaCreditCard size={12}/> Card</button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner mt-2">
                                <span className="text-[14px] font-bold text-slate-600">Total Amount</span>
                                <span className="text-[22px] font-black text-slate-950 tracking-tighter">LKR {totalAmount.toFixed(2)}</span>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button className="flex-grow flex items-center justify-center gap-1.5 p-3.5 bg-white text-sky-700 rounded-xl font-bold text-[13px] hover:bg-sky-50 transition-colors border-2 border-sky-200 shadow-sm cursor-pointer">
                                    <FaPrint size={14}/> Print Bill
                                </button>
                                <button onClick={handleCheckout} className="flex-grow flex items-center justify-center gap-1.5 p-3.5 bg-sky-600 text-white rounded-xl font-bold text-[13px] hover:bg-sky-700 transition-colors shadow-md cursor-pointer active:scale-[0.98]">
                                    <FaShoppingCart size={14}/> CHECKOUT
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </CashierLayout>
    );
}