import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { Package, Plus, Search, Edit, Trash2, PieChart as PieIcon, Truck, ShieldAlert, X, ScanBarcode, MapPin, Pill } from 'lucide-react';
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

const DOSAGE_UNITS = ["mg", "mcg", "g", "ml", "mg/ml", "IU", "%"];
const COMMON_DOSAGES = ["250mg", "500mg", "1g", "5ml"];

const isValidFormatAndLimits = (loc) => {
    if (!loc) return false;
    const match = loc.match(/^([A-Z]{3})-R(\d{2})-S(\d{2})-B(\d{2})$/i);
    if (!match) return false;
    const r = parseInt(match[2], 10);
    const s = parseInt(match[3], 10);
    const b = parseInt(match[4], 10);
    return r >= 1 && r <= 99 && s >= 1 && s <= 5 && b >= 1 && b <= 10;
};

const generateSmartRackLocation = (category, genericName, allMedicines) => {
    const cat = category || 'OTH';
    const prefix = cat.substring(0, 3).toUpperCase();

    let targetRack = 1;
    let targetShelf = 1;
    let targetBin = 0;
    let foundGeneric = false;

    const processLocation = (loc) => {
        if(!loc) return;
        const match = loc.match(/^([A-Z]{3})-R(\d{2})-S(\d{2})-B(\d{2})$/i);
        if(match) {
            const r = parseInt(match[2], 10);
            const s = parseInt(match[3], 10);
            const b = parseInt(match[4], 10);
            if (r <= 99 && s <= 5 && b <= 10) {
                const currentScore = targetRack * 1000 + targetShelf * 100 + targetBin;
                const newScore = r * 1000 + s * 100 + b;
                if (newScore > currentScore) {
                    targetRack = r; targetShelf = s; targetBin = b;
                }
            }
        }
    };

    if (genericName) {
        const sameGenericMeds = allMedicines.filter(m =>
            m.genericName?.toLowerCase() === genericName.toLowerCase() &&
            m.rackLocation &&
            m.rackLocation.toUpperCase().startsWith(prefix)
        );

        if (sameGenericMeds.length > 0) {
            foundGeneric = true;
            sameGenericMeds.forEach(m => processLocation(m.rackLocation));
        }
    }

    if (!foundGeneric) {
        const catMeds = allMedicines.filter(m => m.rackLocation && m.rackLocation.toUpperCase().startsWith(prefix));
        catMeds.forEach(m => processLocation(m.rackLocation));
    }

    targetBin += 1;

    if (targetBin > 10) {
        targetBin = 1;
        targetShelf += 1;
        if (targetShelf > 5) {
            targetShelf = 1;
            targetRack += 1;
        }
    }

    const format2 = (n) => n.toString().padStart(2, '0');
    return `${prefix}-R${format2(targetRack)}-S${format2(targetShelf)}-B${format2(targetBin)}`;
};

export default function InventoryPage() {
    const [medicines, setMedicines] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [medSupplierMap, setMedSupplierMap] = useState({});

    const [latestMedDetails, setLatestMedDetails] = useState({});

    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '', genericName: '', category: '', dosage: '', barcode: '', rackLocation: '', batchNumber: '',
        quantity: '', costPrice: '', sellingPrice: '', expiryDate: '', minStockLevel: 10, supplierId: '', isControlled: false
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            const medRes = await axios.get('http://localhost:5000/api/medicines', config).catch(err => { console.error("Medicine Error:", err); return { data: [] }; });
            const supRes = await axios.get('http://localhost:5000/api/suppliers', config).catch(err => { console.error("Supplier Error:", err); return { data: [] }; });
            const purRes = await axios.get('http://localhost:5000/api/purchases', config).catch(err => { console.error("Purchase Error:", err); return { data: [] }; });

            const loadedMedicines = Array.isArray(medRes?.data) ? medRes.data : [];
            const loadedSuppliers = Array.isArray(supRes?.data) ? supRes.data : [];
            const loadedPurchases = Array.isArray(purRes?.data) ? purRes.data : [];

            const mapping = {};
            const detailsMap = {};

            const sortedPurchases = [...loadedPurchases].sort((a, b) => new Date(a.invoiceDate || a.createdAt || 0) - new Date(b.invoiceDate || b.createdAt || 0));

            sortedPurchases.forEach(p => {
                const currentSupId = p.supplierId || (p.supplier ? p.supplier.id : null);
                const itemsArray = p.items || p.PurchaseItems || p.purchaseItems || p.PurchaseDetails || [];

                if (currentSupId && Array.isArray(itemsArray)) {
                    itemsArray.forEach(item => {
                        const currentMedId = item.medicineId || item.MedicineId || (item.medicine ? item.medicine.id : null);
                        const medName = String(item.name || item.medicineName || '').toLowerCase();

                        if (currentMedId) {
                            mapping[String(currentMedId)] = String(currentSupId);
                            detailsMap[String(currentMedId)] = item;
                        }
                        if (medName) {
                            mapping[medName] = String(currentSupId);
                            detailsMap[medName] = item;
                        }
                    });
                }
            });

            setMedSupplierMap(mapping);
            setLatestMedDetails(detailsMap);
            setMedicines(loadedMedicines);
            setSuppliers(loadedSuppliers);
        } catch (err) {
            toast.error('Failed to load inventory data');
            console.error(err);
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
            if (!categoryMap[cat]) { categoryMap[cat] = 0; }
            categoryMap[cat] += Number(med.quantity || 0);
        });

        const seriesData = Object.keys(categoryMap).map((cat, index) => ({
            name: cat, y: categoryMap[cat], color: COLORS[index % COLORS.length]
        }));

        const finalData = seriesData.length > 0 ? seriesData : [{ name: 'No Stock', y: 1, color: '#38bdf8' }];

        return {
            chart: { type: 'pie', backgroundColor: 'transparent', margin: [0, 0, 0, 0], options3d: { enabled: true, alpha: 45, beta: 0, depth: 35 } },
            title: { text: '' },
            tooltip: { pointFormat: '{series.name}: <b>{point.y}</b>' },
            plotOptions: { pie: { allowPointSelect: true, cursor: 'pointer', depth: 60, center: ['50%', '45%'], size: '95%', dataLabels: { enabled: true, format: '<b>{point.name}</b>: {point.y}', style: { fontSize: '11px', fontWeight: '600', color: '#1e293b' } } } },
            series: [{ name: 'Quantity', data: finalData }],
            credits: { enabled: false }
        };
    }, [medicines]);

    const dosageSuggestions = useMemo(() => {
        const currentVal = formData.dosage || '';
        const numMatch = currentVal.match(/^\d+(\.\d+)?/);
        if (numMatch) {
            const num = numMatch[0];
            return DOSAGE_UNITS.map(unit => `${num}${unit}`);
        }
        return [...COMMON_DOSAGES, ...DOSAGE_UNITS];
    }, [formData.dosage]);

    const getRackError = (loc) => {
        if (!loc) return 'Rack location is required!';

        const regex = /^([A-Z]{3})-R(\d{2})-S(\d{2})-B(\d{2})$/i;
        const match = loc.match(regex);

        if (!match) return 'Format must be exactly: XXX-R00-S00-B00';

        const rack = parseInt(match[2], 10);
        const shelf = parseInt(match[3], 10);
        const bin = parseInt(match[4], 10);

        if (rack < 1 || rack > 99) return 'Invalid Rack! Maximum Rack count is 99.';
        if (shelf < 1 || shelf > 5) return 'Invalid Shelf! Maximum 5 Shelves per rack allowed.';
        if (bin < 1 || bin > 10) return 'Invalid Bin! Maximum 10 Bins per shelf allowed.';

        const duplicate = medicines.find(m =>
            m.rackLocation?.toUpperCase() === loc.toUpperCase() &&
            String(m.id) !== String(editingId)
        );

        if (duplicate) return `Location taken by: ${duplicate.name} (${duplicate.dosage || 'N/A'})`;

        return '';
    };

    const rackError = getRackError(formData.rackLocation);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (rackError) {
            toast.error(`Fix Rack Error: ${rackError}`);
            return;
        }

        setSubmitting(true);
        try {
            if (editingId) {
                await inventoryApi.update(editingId, formData);
                toast.success('Medicine pricing & details updated successfully! ✏️');
            } else {
                await inventoryApi.add(formData);
                toast.success('Medicine saved successfully! 🎉');
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ name: '', genericName: '', category: '', dosage: '', barcode: '', rackLocation: '', batchNumber: '', quantity: '', costPrice: '', sellingPrice: '', expiryDate: '', minStockLevel: 10, supplierId: '', isControlled: false });
            fetchData();
        } catch (err) {
            console.error("API Error:", err);
            toast.error(err.response?.data?.error || err.message || 'Failed to save medicine');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSupplierChange = (e) => {
        const selectedSupId = e.target.value;
        setFormData({
            name: '', genericName: '', category: '', dosage: '', barcode: '', rackLocation: '', batchNumber: '',
            quantity: '', costPrice: '', sellingPrice: '', expiryDate: '', minStockLevel: 10, supplierId: selectedSupId, isControlled: false
        });
        setEditingId(null);
    };

    const handleMedicineSelect = (e) => {
        const medId = e.target.value;
        if (!medId) {
            setEditingId(null);
            setFormData(prev => ({
                ...prev, name: '', genericName: '', category: '', dosage: '', barcode: '',
                rackLocation: '', batchNumber: '', quantity: '', costPrice: '', sellingPrice: '', expiryDate: '', isControlled: false
            }));
            return;
        }

        const matchedMed = medicines.find(m => String(m.id) === String(medId));
        if (matchedMed) {
            setEditingId(matchedMed.id);

            const grnDetails = latestMedDetails[String(matchedMed.id)] || latestMedDetails[String(matchedMed.name).toLowerCase()] || {};

            const catToUse = matchedMed.category || grnDetails.unit || 'Tablets';
            const genToUse = matchedMed.genericName || grnDetails.genericName || '';

            let autoRack = matchedMed.rackLocation;
            if (!isValidFormatAndLimits(autoRack)) {
                autoRack = generateSmartRackLocation(catToUse, genToUse, medicines);
            }

            setFormData(prev => ({
                ...prev,
                name: matchedMed.name || grnDetails.medicineName || grnDetails.name || '',
                genericName: genToUse,
                category: catToUse,
                dosage: matchedMed.dosage || '',
                barcode: matchedMed.barcode || grnDetails.barcode || '',
                rackLocation: autoRack,
                batchNumber: matchedMed.batchNumber || grnDetails.batchNumber || '',
                quantity: matchedMed.quantity || grnDetails.quantity || '',
                costPrice: matchedMed.costPrice || grnDetails.costPrice || '',
                sellingPrice: matchedMed.sellingPrice || grnDetails.sellingPrice || '',
                expiryDate: (matchedMed.expiryDate ? matchedMed.expiryDate.split('T')[0] : null) || (grnDetails.expiryDate ? grnDetails.expiryDate.split('T')[0] : ''),
                minStockLevel: matchedMed.minStockLevel || 10,
                isControlled: matchedMed.isControlled || false
            }));
        }
    };

    const handleEdit = (med) => {
        let formattedDate = '';
        if (med.expiryDate) { formattedDate = med.expiryDate.split('T')[0]; }

        let finalRack = med.rackLocation || '';
        if (!isValidFormatAndLimits(finalRack)) {
            finalRack = generateSmartRackLocation(med.category, med.genericName, medicines);
        }

        setFormData({
            name: med.name, genericName: med.genericName || '', category: med.category || '', dosage: med.dosage || '', barcode: med.barcode || '',
            rackLocation: finalRack,
            batchNumber: med.batchNumber || '', quantity: med.quantity || '', costPrice: med.costPrice || '', sellingPrice: med.sellingPrice || '', expiryDate: formattedDate, minStockLevel: med.minStockLevel || 10,
            supplierId: med.supplierId || String(medSupplierMap[med.id]) || (med.supplier ? med.supplier.id : ''), isControlled: med.isControlled || false
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
            } catch (err) { toast.error('Failed to delete medicine'); }
        }
    };

    const filteredMedicines = medicines.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.batchNumber && m.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.barcode && m.barcode.includes(searchQuery))
    );

    return (
        <AdminLayout>
            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4">
                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}></div>
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
                                <p className="text-[13px] font-medium text-slate-500 mt-1.5">Update prices & stock locations for purchased medicines</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setEditingId(null);
                                setFormData({ name: '', genericName: '', category: '', dosage: '', barcode: '', rackLocation: '', batchNumber: '', quantity: '', costPrice: '', sellingPrice: '', expiryDate: '', minStockLevel: 10, supplierId: '', isControlled: false });
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-5 py-3 bg-sky-500/90 backdrop-blur-md text-white font-bold rounded-2xl shadow-[0_10px_25px_-5px_rgba(2,132,199,0.3)] hover:bg-sky-600 transition-all active:scale-[0.98] text-[14px] cursor-pointer border border-sky-400/50"
                        >
                            <Plus size={18} strokeWidth={2.5} /> Update Medicine Info
                        </button>
                    </div>

                    <div className="bg-white/40 backdrop-blur-xl p-4 rounded-[24px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] flex items-center gap-3">
                        <Search size={18} className="text-slate-400 ml-2" />
                        <input
                            type="text"
                            placeholder="Search by medicine name, batch number, or barcode..."
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
                                <HighchartsReact highcharts={Highcharts} options={highchartsOptions} containerProps={{ style: { width: '100%', height: '100%', overflow: 'visible' } }} />
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
                                                    <p className={`font-bold text-[14px] ${med.isControlled ? 'text-rose-700 font-black' : 'text-[#1e293b]'}`}>
                                                        {med.name} {med.dosage && <span className="text-[11px] font-semibold text-slate-400">({med.dosage})</span>}
                                                    </p>
                                                    {med.isControlled && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100/80 text-rose-700 rounded-md text-[10px] font-bold border border-rose-200/50 backdrop-blur-sm" title="NMRA Controlled Drug"><ShieldAlert size={12} /> Controlled</span>
                                                    )}
                                                </div>
                                                <p className={`text-[12px] mt-0.5 ${med.isControlled ? 'text-rose-500 font-medium' : 'text-slate-500 font-medium'}`}>
                                                    {med.genericName || med.supplier?.companyName || 'N/A'}
                                                    {med.rackLocation && <span className="ml-2 inline-flex items-center gap-0.5 text-sky-600 font-semibold"><MapPin size={10}/> Rack: {med.rackLocation}</span>}
                                                </p>
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
                                                    <button onClick={() => handleEdit(med)} className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-100/50 rounded-lg transition-colors cursor-pointer" title="Edit Medicine"><Edit size={16} /></button>
                                                    <button onClick={() => handleDelete(med.id)} className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-100/50 rounded-lg transition-colors cursor-pointer" title="Delete Medicine"><Trash2 size={16} /></button>
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
                    <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] border border-white w-[700px] max-h-[90vh] overflow-y-auto hide-scrollbar">

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[20px] font-bold text-slate-800 flex items-center gap-2.5">
                                <Package className="text-sky-600" /> Update Inventory Record
                            </h2>
                            <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="hover:bg-white/50 p-2 rounded-full transition-colors border border-transparent hover:border-white/60 cursor-pointer">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div className="space-y-4">
                                <h3 className="text-[12px] font-extrabold text-sky-600 uppercase tracking-widest border-b border-white pb-2 flex items-center gap-1.5"><Pill size={14}/> Medicine Information</h3>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <Truck size={14} className="text-sky-500"/> Select Supplier *
                                    </label>
                                    <select
                                        required
                                        className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm cursor-pointer"
                                        value={formData.supplierId}
                                        onChange={handleSupplierChange}
                                    >
                                        <option value="">-- Choose Supplier Company --</option>
                                        {suppliers.filter(s => s.status === 'Active').map(s => (
                                            <option key={s.id} value={s.id}>{s.companyName} {s.repName ? `(Rep: ${s.repName})` : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Medicine (Brand Name) *</label>
                                        <select
                                            required
                                            className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm cursor-pointer disabled:opacity-50"
                                            value={editingId || ''}
                                            onChange={handleMedicineSelect}
                                            disabled={!formData.supplierId}
                                        >
                                            <option value="">{formData.supplierId ? "-- Select Received Medicine --" : "Select Supplier first"}</option>

                                            {medicines.filter(m => {
                                                const sId = String(formData.supplierId);
                                                const mId = String(m.id);
                                                const mName = String(m.name).toLowerCase();

                                                const belongsToSupplier = String(m.supplierId) === sId ||
                                                    String(m.SupplierId) === sId ||
                                                    String(m.supplier_id) === sId ||
                                                    String(m.supplier?.id) === sId ||
                                                    String(medSupplierMap[mId]) === sId ||
                                                    String(medSupplierMap[mName]) === sId;

                                                if (!belongsToSupplier) return false;

                                                const isAlreadyConfigured = m.sellingPrice && Number(m.sellingPrice) > 0 && m.rackLocation && isValidFormatAndLimits(m.rackLocation);

                                                if (isAlreadyConfigured && String(m.id) !== String(editingId)) {
                                                    return false;
                                                }

                                                return true;
                                            }).map(m => (
                                                <option key={m.id} value={m.id}>{m.name} {m.dosage ? `(${m.dosage})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Generic Name (Locked)</label>
                                        <input type="text" readOnly className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-500 cursor-not-allowed outline-none shadow-sm backdrop-blur-sm"
                                               value={formData.genericName} placeholder="Auto Fill" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Category (Locked)</label>
                                        <input type="text" readOnly className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-500 cursor-not-allowed outline-none shadow-sm backdrop-blur-sm"
                                               value={formData.category} placeholder="Auto Fill" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Dosage / Strength *</label>
                                        <input type="text" required list="dosage-units-list" placeholder="e.g. 500mg" className="w-full px-4 py-3 bg-white border border-sky-200 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm"
                                               value={formData.dosage} onChange={e => setFormData({...formData, dosage: e.target.value})} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><ScanBarcode size={12}/> Barcode / Item Code (Locked)</label>
                                        <input type="text" readOnly className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-500 cursor-not-allowed outline-none shadow-sm backdrop-blur-sm"
                                               value={formData.barcode} placeholder="Auto Fill" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><MapPin size={12}/> Rack / Shelf Location *</label>
                                        <input type="text" required placeholder="e.g. TAB-R01-S01-B01"
                                               className={`w-full px-4 py-3 bg-white border ${rackError ? 'border-rose-400 ring-1 ring-rose-400 focus:ring-rose-500' : 'border-sky-200 focus:ring-2 focus:ring-sky-500/40'} rounded-2xl text-[14px] font-bold text-slate-800 outline-none shadow-sm uppercase transition-all`}
                                               value={formData.rackLocation} onChange={e => setFormData({...formData, rackLocation: e.target.value.toUpperCase()})} />

                                        {rackError ? (
                                            <p className="text-[10.5px] text-rose-500 font-bold mt-1.5 ml-1 leading-tight flex items-start gap-1">
                                                <ShieldAlert size={12} className="shrink-0 mt-[1px]" /> <span>{rackError}</span>
                                            </p>
                                        ) : (
                                            <p className="text-[9px] text-sky-600 font-bold mt-1 ml-1 leading-tight">
                                                Limits: 99 Racks | 5 Shelves (පේළි) | 10 Bins (ඉඩ)
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <h3 className="text-[12px] font-extrabold text-sky-600 uppercase tracking-widest border-b border-white pb-2">Stock & Pricing Information</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Batch Number (Locked)</label>
                                        <input type="text" readOnly className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-500 cursor-not-allowed outline-none shadow-sm backdrop-blur-sm"
                                               value={formData.batchNumber} placeholder="Auto Fill from GRN" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Expiry Date (Locked)</label>
                                        <input type="date" readOnly className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-500 cursor-not-allowed outline-none shadow-sm backdrop-blur-sm pointer-events-none"
                                               value={formData.expiryDate} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Stock Qty (Locked)</label>
                                        <input type="number" readOnly className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-500 cursor-not-allowed outline-none shadow-sm backdrop-blur-sm"
                                               value={formData.quantity} placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Cost (LKR) (Locked)</label>
                                        <input type="number" readOnly className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-500 cursor-not-allowed outline-none shadow-sm backdrop-blur-sm"
                                               value={formData.costPrice} placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black text-sky-600 uppercase tracking-wider mb-1.5">Selling Price (LKR) *</label>
                                        <input type="number" required min="0" step="0.01" placeholder="15.00" className="w-full px-4 py-3 bg-white border border-sky-300 rounded-2xl text-[14px] font-black text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/50 shadow-sm"
                                               value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Min Stock Level (Alert)</label>
                                    <input type="number" min="1" placeholder="10" className="w-full px-4 py-3 bg-white border border-sky-200 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm"
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
                                <button type="submit" disabled={submitting || !editingId || !!rackError} className="w-full mt-4 bg-sky-500/90 backdrop-blur-md text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(2,132,199,0.3)] hover:bg-sky-600 transition-all active:scale-[0.98] text-[15px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-sky-400/50">
                                    {submitting ? 'Saving...' : 'Update Inventory Info'}
                                </button>
                            </div>
                        </form>

                        <datalist id="dosage-units-list">
                            {dosageSuggestions.map((suggestion, idx) => (
                                <option key={idx} value={suggestion} />
                            ))}
                        </datalist>

                    </div>
                </div>,
                document.body
            )}
        </AdminLayout>
    );
}