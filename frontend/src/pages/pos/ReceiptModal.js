import React from 'react';
import { X, Printer } from 'lucide-react';

export default function ReceiptModal({ open, onClose, sale }) {
    if (!open || !sale) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 print:bg-white print:p-0">
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[420px] max-h-[90vh] flex flex-col overflow-hidden print:shadow-none print:w-full print:max-w-none print:h-auto print:overflow-visible">

                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0 print:hidden">
                    <h2 className="text-[16px] font-bold text-slate-800">Receipt Details</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors cursor-pointer"
                    >
                        <X size={18} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="p-8 bg-white flex-1 overflow-y-auto print:overflow-visible" id="printable-receipt">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-black text-indigo-600 tracking-tight">Kegalle Rx</h1>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Pharmacy & Grocery</p>
                        <p className="text-[11px] text-slate-400 mt-2">123 Main Street, Kegalle</p>
                        <p className="text-[11px] text-slate-400">Tel: 035 222 3333</p>
                    </div>

                    <div className="border-t border-b border-dashed border-slate-200 py-3 mb-4 space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-slate-500">Invoice No:</span>
                            <span className="font-mono font-bold text-slate-800">{String(sale.saleId || sale.id).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-slate-500">Date & Time:</span>
                            <span className="font-medium text-slate-800">{new Date(sale.saleDate || sale.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-slate-500">Customer:</span>
                            <span className="font-bold text-slate-800">{sale.customerName || 'Walk-in Customer'}</span>
                        </div>
                        {sale.doctorName && (
                            <div className="flex justify-between text-[11px]">
                                <span className="font-bold text-slate-500">Doctor:</span>
                                <span className="font-bold text-slate-800">Dr. {sale.doctorName}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-slate-500">Payment By:</span>
                            <span className="font-bold text-slate-800">{sale.paymentMethod || 'Cash'}</span>
                        </div>
                    </div>

                    <div className="mb-6">
                        <table className="w-full text-left">
                            <thead>
                            <tr className="border-b border-slate-200 text-slate-800 text-[11px]">
                                <th className="py-2 font-bold uppercase">Item Description</th>
                                <th className="py-2 font-bold uppercase text-center w-12">Qty</th>
                                <th className="py-2 font-bold uppercase text-right w-20">Amount</th>
                            </tr>
                            </thead>
                            <tbody className="text-[12px] text-slate-700 font-medium">
                            {sale.items && sale.items.length > 0 ? (
                                sale.items.map((item, idx) => {
                                    const itemName = item.medicine?.name || item.name || `Item #${item.medicineId || idx}`;
                                    const price = Number(item.unitPrice || item.price || 0);
                                    const qty = Number(item.quantity || 1);
                                    const subTotal = price * qty;

                                    return (
                                        <tr key={idx} className="border-b border-slate-50">
                                            <td className="py-2.5 pr-2 leading-tight">
                                                <span className="font-bold text-slate-800">{itemName}</span>
                                                <div className="text-[10px] text-slate-400 mt-0.5">@ {price.toFixed(2)}</div>
                                            </td>
                                            <td className="py-2.5 text-center font-bold">{qty}</td>
                                            <td className="py-2.5 text-right font-bold text-slate-800">{subTotal.toFixed(2)}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="3" className="py-4 text-center text-slate-400 text-xs italic">Item details not available</td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t-2 border-dashed border-slate-800 mb-6">
                        <span className="text-[14px] font-black text-slate-800 uppercase">Total (LKR)</span>
                        <span className="text-[20px] font-black text-indigo-600">{Number(sale.totalAmount).toFixed(2)}</span>
                    </div>

                    <div className="text-center text-[10px] text-slate-400 font-medium mt-8 border-t border-slate-100 pt-4 pb-2">
                        <p>Thank you for choosing Kegalle Rx!</p>
                        <p>Wishing you a speedy recovery.</p>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50/50 shrink-0 print:hidden">
                    <button
                        onClick={handlePrint}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-[0_8px_20px_-6px_rgba(99,102,241,0.4)] cursor-pointer active:scale-[0.98]"
                    >
                        <Printer size={18} /> Print Receipt
                    </button>
                </div>
            </div>
        </div>
    );
}