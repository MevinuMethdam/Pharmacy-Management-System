import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { Receipt, Plus, Trash2, Calendar, FileText, Package, Search, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const COMMON_GENERICS = [
    // A
    "Abacavir", "Acarbose", "Acetaminophen", "Acetazolamide", "Acyclovir", "Adrenaline", "Albendazole",
    "Albuterol", "Alendronate", "Allopurinol", "Alprazolam", "Aluminum Hydroxide", "Amiodarone",
    "Amitriptyline", "Amlodipine", "Amoxicillin", "Amoxicillin + Clavulanic Acid", "Ampicillin",
    "Aspirin", "Atenolol", "Atorvastatin", "Azathioprine", "Azithromycin",
    // B
    "Bacitracin", "Beclometasone", "Bedaquiline", "Betamethasone", "Bezafibrate", "Bisacodyl",
    "Bisoprolol", "Bromhexine", "Budesonide", "Bupivacaine", "Buscopan",
    // C
    "Calamine", "Calcium Carbonate", "Candesartan", "Captopril", "Carbamazepine", "Carbimazole",
    "Carvedilol", "Cefadroxil", "Cefalexin", "Cefazolin", "Cefdinir", "Cefepime", "Cefixime",
    "Cefotaxime", "Cefpodoxime", "Ceftazidime", "Ceftriaxone", "Cefuroxime", "Celecoxib",
    "Cetirizine", "Chloramphenicol", "Chlorhexidine", "Chloroquine", "Chlorpheniramine",
    "Ciprofloxacin", "Clarithromycin", "Clindamycin", "Clobetasol", "Clomifene", "Clonazepam",
    "Clonidine", "Clopidogrel", "Clotrimazole", "Cloxacillin", "Colchicine", "Colistin",
    // D
    "Dabigatran", "Dapagliflozin", "Dapsone", "Daptomycin", "Dexamethasone", "Dextromethorphan",
    "Diazepam", "Diclofenac", "Digoxin", "Diltiazem", "Diphenhydramine", "Divalproex",
    "Dobutamine", "Domperidone", "Donepezil", "Dopamine", "Doxycycline", "Dydrogesterone",
    // E
    "Enalapril", "Enoxaparin", "Empagliflozin", "Epinephrine", "Erythromycin", "Escitalopram",
    "Esomeprazole", "Ethambutol", "Ethosuximide", "Ezetimibe",
    // F
    "Famotidine", "Fenofibrate", "Fentanyl", "Ferrous Sulfate", "Fexofenadine", "Fluconazole",
    "Fluoxetine", "Fluticasone", "Folic Acid", "Furosemide", "Fusidic Acid",
    // G
    "Gabapentin", "Gemfibrozil", "Gentamicin", "Glibenclamide", "Gliclazide", "Glimepiride",
    "Glipizide", "Griseofulvin", "Guaifenesin",
    // H
    "Haloperidol", "Heparin", "Hydralazine", "Hydrochlorothiazide", "Hydrocortisone",
    "Hydrogen Peroxide", "Hydroxychloroquine", "Hydroxyzine", "Hyoscine",
    // I
    "Ibuprofen", "Imipenem", "Indomethacin", "Insulin (Isophane)", "Insulin (Regular)",
    "Iodine", "Ipratropium", "Irbesartan", "Iron", "Isosorbide Dinitrate", "Isosorbide Mononitrate",
    // K
    "Ketamine", "Ketoconazole", "Ketoprofen", "Ketorolac",
    // L
    "Labetalol", "Lactulose", "Lamivudine", "Lamotrigine", "Lansoprazole", "Latanoprost",
    "Levocetirizine", "Levodopa", "Levofloxacin", "Levothyroxine", "Lidocaine", "Linagliptin",
    "Lincomycin", "Linezolid", "Lisinopril", "Lithium", "Loperamide", "Loratadine",
    "Lorazepam", "Losartan", "Lovastatin", "Lumefantrine",
    // M
    "Magnesium Sulfate", "Mannitol", "Mebendazole", "Mebeverine", "Mefenamic Acid",
    "Mefloquine", "Meloxicam", "Meropenem", "Metformin", "Methimazole", "Methotrexate",
    "Methyldopa", "Methylprednisolone", "Metoclopramide", "Metoprolol", "Metronidazole",
    "Miconazole", "Midazolam", "Minocycline", "Montelukast", "Morphine", "Moxifloxacin", "Mupirocin",
    // N
    "Nalidixic Acid", "Naloxone", "Naproxen", "Neomycin", "Neostigmine", "Nevirapine",
    "Nifedipine", "Nitrofurantoin", "Nitroglycerin", "Norethisterone", "Nystatin",
    // O
    "Ofloxacin", "Olanzapine", "Olmesartan", "Omeprazole", "Ondansetron", "Ornidazole",
    "Oseltamivir", "Oxytocin",
    // P
    "Pantoprazole", "Paracetamol", "Penicillin V", "Permethrin", "Phenobarbital",
    "Phenoxymethylpenicillin", "Phenytoin", "Phytomenadione", "Pioglitazone", "Piperacillin",
    "Piroxicam", "Polymyxin B", "Potassium Chloride", "Povidone-Iodine", "Pramipexole",
    "Prasugrel", "Pravastatin", "Prazosin", "Prednisolone", "Pregabalin", "Proguanil",
    "Promethazine", "Propofol", "Propranolol", "Propylthiouracil", "Pyrantel", "Pyrazinamide", "Pyrimethamine",
    // Q
    "Quetiapine", "Quinine",
    // R
    "Rabeprazole", "Ramipril", "Ranitidine", "Rifampicin", "Risperidone", "Rivaroxaban",
    "Rosuvastatin", "Roxithromycin",
    // S
    "Salbutamol", "Salicylic Acid", "Secnidazole", "Sertraline", "Sevelamer", "Sildenafil",
    "Silver Sulfadiazine", "Simvastatin", "Sitagliptin", "Sodium Bicarbonate", "Sodium Chloride",
    "Sodium Valproate", "Spironolactone", "Streptomycin", "Sucralfate", "Sulfamethoxazole", "Sulfasalazine",
    // T
    "Tamsulosin", "Tazobactam", "Teicoplanin", "Telmisartan", "Tenoxicam", "Terbinafine",
    "Tetanus Toxoid", "Tetracycline", "Theophylline", "Thiamine", "Thyroxine", "Ticagrelor",
    "Tigecycline", "Timolol", "Tinidazole", "Tobramycin", "Tolterodine", "Topiramate",
    "Tramadol", "Tranexamic Acid", "Trimethoprim",
    // U
    "Ursodeoxycholic Acid",
    // V
    "Valacyclovir", "Valproic Acid", "Valsartan", "Vancomycin", "Verapamil", "Vildagliptin",
    "Vitamin A", "Vitamin B Complex", "Vitamin C", "Vitamin D", "Vitamin E",
    // W
    "Warfarin",
    // X
    "Xylometazoline",
    // Z
    "Zidovudine", "Zinc Oxide", "Zinc Sulfate", "Zolpidem", "Zopiclone"
];

export default function PurchasesPage() {
    const [purchases, setPurchases] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const generateUniqueCode = () => Math.floor(10000 + Math.random() * 90000);

    const initialFormState = {
        invoiceNumber: '',
        grnNumber: `GRN-${Date.now()}`,
        supplierId: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        notes: '',
        items: [{
            medicineId: '', medicineName: '', isNew: true, genericName: '', unit: 'Tablets', barcode: '',
            batchNumber: '', expiryDate: '', quantity: '', costPrice: '', sellingPrice: '', subtotal: 0,
            _uniqueCode: generateUniqueCode(), _manualBarcode: false
        }]
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const supRes = await axios.get('http://localhost:5000/api/suppliers').catch(err => { console.error("Supplier Error:", err); return { data: [] }; });
            const medRes = await axios.get('http://localhost:5000/api/medicines').catch(err => { console.error("Medicine Error:", err); return { data: [] }; });
            const purRes = await axios.get('http://localhost:5000/api/purchases').catch(err => { console.error("Purchase Error:", err); return { data: [] }; });

            setSuppliers(supRes.data || []);
            setMedicines(medRes.data || []);
            setPurchases(purRes.data || []);
        } catch (err) {
            toast.error('Failed to load data. Please check backend connection.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const uniqueGenericNames = useMemo(() => {
        const dbGenerics = medicines.map(m => m.genericName).filter(Boolean);
        const combined = [...COMMON_GENERICS, ...dbGenerics];
        return [...new Set(combined)].sort();
    }, [medicines]);

    const handleAddItem = () => {
        if (!formData.supplierId) {
            toast.error("Please select a Supplier first to add medicines.");
            return;
        }
        setFormData({
            ...formData,
            items: [
                ...formData.items,
                {
                    medicineId: '', medicineName: '', isNew: true, genericName: '', unit: 'Tablets', barcode: '',
                    batchNumber: '', expiryDate: '', quantity: '', costPrice: '', sellingPrice: '', subtotal: 0,
                    _uniqueCode: generateUniqueCode(), _manualBarcode: false
                }
            ]
        });
    };

    const handleRemoveItem = (index) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const handleMedicineInput = (index, value) => {
        const newItems = [...formData.items];
        newItems[index].medicineName = value;

        const selectedMed = medicines.find(m =>
            (m.supplierId == formData.supplierId) &&
            (m.name.toLowerCase() === value.toLowerCase())
        );

        if (selectedMed) {
            newItems[index].medicineId = selectedMed.id;
            newItems[index].isNew = false;
            newItems[index].genericName = selectedMed.genericName || 'N/A';
            newItems[index].unit = selectedMed.category || 'Tablets';
            newItems[index].barcode = selectedMed.barcode || 'N/A';
            newItems[index].costPrice = selectedMed.costPrice || 0;
            newItems[index].sellingPrice = selectedMed.sellingPrice || 0;
            newItems[index].quantity = selectedMed.quantity || 10;
            newItems[index].batchNumber = selectedMed.batchNumber || '';

            if (selectedMed.expiryDate) {
                newItems[index].expiryDate = selectedMed.expiryDate.split('T')[0];
            }
        } else {
            newItems[index].medicineId = value;
            newItems[index].isNew = true;
            newItems[index].genericName = newItems[index].genericName === 'N/A' ? '' : newItems[index].genericName;

            if (!newItems[index]._manualBarcode) {
                const selectedSupplier = suppliers.find(s => String(s.id) === String(formData.supplierId));
                let companyPrefix = selectedSupplier && selectedSupplier.companyName
                    ? selectedSupplier.companyName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() : 'SUP';
                companyPrefix = companyPrefix.padEnd(3, 'X');

                let medPrefix = value ? value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() : 'MED';
                medPrefix = medPrefix.padEnd(3, 'X');

                newItems[index].barcode = `${companyPrefix}-${medPrefix}-${newItems[index]._uniqueCode}`;
            }
        }

        const qty = Number(newItems[index].quantity) || 0;
        const cost = Number(newItems[index].costPrice) || 0;
        newItems[index].subtotal = (qty * cost).toFixed(2);

        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        if (field === 'barcode') { newItems[index]._manualBarcode = true; }

        if (field === 'quantity' || field === 'costPrice') {
            const qty = Number(newItems[index].quantity) || 0;
            const cost = Number(newItems[index].costPrice) || 0;
            newItems[index].subtotal = (qty * cost).toFixed(2);
        }

        setFormData({ ...formData, items: newItems });
    };

    const handleSupplierChange = (e) => {
        setFormData({
            ...formData,
            supplierId: e.target.value,
            items: [{
                medicineId: '', medicineName: '', isNew: true, genericName: '', unit: 'Tablets', barcode: '', batchNumber: '',
                expiryDate: '', quantity: '', costPrice: '', sellingPrice: '', subtotal: 0,
                _uniqueCode: generateUniqueCode(), _manualBarcode: false
            }]
        });
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0).toFixed(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.items.length === 0 || !formData.items[0].medicineId) {
            toast.error('Please enter at least one medicine to save the GRN!');
            return;
        }

        const hasInvalidItem = formData.items.some(item => !item.medicineId || !item.batchNumber || !item.expiryDate || item.quantity <= 0 || item.costPrice <= 0);
        if (hasInvalidItem) {
            toast.error('Please check the medicine items. Ensure Batch, Expiry, Qty, and Cost are correctly filled.');
            return;
        }

        setSubmitting(true);
        try {
            const formattedItems = formData.items.map(item => ({
                ...item,
                name: item.medicineName,
                sellingPrice: item.sellingPrice || item.costPrice || 0
            }));

            const payload = { ...formData, items: formattedItems, totalAmount: calculateTotal() };

            await axios.post('http://localhost:5000/api/purchases', payload);
            toast.success('GRN Saved! Stock & Supplier Accounts updated automatically. 🎉');

            setIsModalOpen(false);
            setFormData({ ...initialFormState, grnNumber: `GRN-${Date.now()}` });
            fetchData();
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Failed to create GRN. Please check if the Invoice Number is already used.';
            toast.error(errorMsg);
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredPurchases = purchases.filter(p =>
        p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplier?.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4">
                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}></div>
                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-indigo-200/20 to-slate-300/20 blur-[120px] pointer-events-none z-[-2]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-slate-300/20 to-indigo-200/20 blur-[140px] pointer-events-none z-[-2]"></div>

                <div className="relative z-10 w-full h-full flex flex-col gap-6">

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/40 backdrop-blur-md shadow-sm flex items-center justify-center border border-white/60">
                                <Receipt size={20} strokeWidth={2.5} className="text-indigo-600" />
                            </div>
                            <div>
                                <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">Purchases & GRN</h1>
                                <p className="text-[13px] font-medium text-slate-500 mt-1.5">Manage supplier invoices and update inventory stock</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-indigo-500/90 backdrop-blur-md text-white font-bold rounded-2xl shadow-[0_10px_25px_-5px_rgba(99,102,241,0.3)] hover:bg-indigo-600 transition-all active:scale-[0.98] text-[14px] cursor-pointer border border-indigo-400/50"
                        >
                            <Plus size={18} strokeWidth={2.5} /> Enter New GRN (Bill)
                        </button>
                    </div>

                    <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden flex flex-col mt-2">

                        <div className="p-6 border-b border-white/30 flex flex-col lg:flex-row justify-between gap-4 bg-white/10">
                            <div className="relative w-full">
                                <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by Invoice Number or Supplier..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm backdrop-blur-sm"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto px-8 py-4">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Invoice / GRN No</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Supplier</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Date</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Total Amount</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-16 text-slate-500 font-medium text-[13px]">Loading GRN history...</td></tr>
                                ) : filteredPurchases.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-16 text-slate-500 font-medium text-[13px]">No purchase records found.</td></tr>
                                ) : filteredPurchases.map((purchase) => (
                                    <tr key={purchase.id} className="group hover:bg-white/20 transition-colors border-b border-white/20 last:border-0">
                                        <td className="py-4 align-top pt-5">
                                            <p className="font-bold text-[14px] text-indigo-700">{purchase.invoiceNumber}</p>
                                            <p className="text-[11px] text-slate-500 font-bold mt-1 font-mono">{purchase.grnNumber}</p>
                                        </td>
                                        <td className="py-4 align-top pt-5 text-[14px] font-bold text-[#1e293b]">
                                            {purchase.supplier?.companyName || 'Unknown Supplier'}
                                        </td>
                                        <td className="py-4 align-top pt-5 text-[13px] font-medium text-slate-600">
                                            <div className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400"/> {new Date(purchase.invoiceDate).toLocaleDateString()}</div>
                                        </td>
                                        <td className="py-4 align-top pt-5 text-[15px] font-black text-slate-800">
                                            LKR {Number(purchase.totalAmount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </td>
                                        <td className="py-4 align-top pt-5">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100/80 text-amber-700 border border-amber-200/50">
                                                Unpaid
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
                    <div className="bg-slate-50/95 backdrop-blur-2xl p-6 md:p-8 rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] border border-white w-full max-w-[1300px] max-h-[95vh] overflow-hidden flex flex-col relative">

                        <div className="flex justify-between items-center mb-6 flex-shrink-0">
                            <div>
                                <h2 className="text-[22px] font-black text-slate-800 flex items-center gap-2.5">
                                    <Receipt className="text-indigo-600" /> Goods Receipt Note (GRN)
                                </h2>
                                <p className="text-[12px] font-medium text-slate-500 mt-1">Select an existing medicine from the list, OR type a new medicine name to automatically add it to inventory.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white p-2 rounded-full transition-colors border border-transparent hover:border-slate-200 cursor-pointer text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form id="grn-form" onSubmit={handleSubmit} className="overflow-y-auto hide-scrollbar flex-1 pr-2 space-y-6">

                            <div className="bg-white/80 border border-white shadow-sm rounded-2xl p-5 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText size={16} className="text-indigo-500"/>
                                    <h3 className="text-[14px] font-bold text-slate-700 uppercase tracking-wider">Invoice Header</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Supplier *</label>
                                        <select required className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                                                value={formData.supplierId} onChange={handleSupplierChange}>
                                            <option value="">-- Select Supplier --</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Invoice Number *</label>
                                        <input type="text" required placeholder="e.g. INV-90210" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/40"
                                               value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">GRN Number</label>
                                        <input type="text" disabled className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-500 cursor-not-allowed"
                                               value={formData.grnNumber} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Invoice Date *</label>
                                        <input type="date" required className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                                               value={formData.invoiceDate} onChange={e => setFormData({...formData, invoiceDate: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Due Date *</label>
                                        <input type="date" required className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                                               value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/80 border border-white shadow-sm rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Package size={16} className="text-indigo-500"/>
                                        <h3 className="text-[14px] font-bold text-slate-700 uppercase tracking-wider">Line Items (Medicines)</h3>
                                    </div>
                                    <button type="button" onClick={handleAddItem} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[12px] font-bold transition-colors shadow-sm cursor-pointer">
                                        <Plus size={14} /> Add Row
                                    </button>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-slate-200 pb-2">
                                    <table className="w-full text-left bg-white whitespace-nowrap min-w-[1200px]">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[220px]">Medicine *</th>
                                            <th className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[140px]">Generic Name</th>
                                            <th className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[120px]">Category</th>
                                            <th className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[120px]">Barcode</th>
                                            <th className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[110px]">Batch *</th>
                                            <th className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[140px]">Expiry *</th>
                                            <th className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[80px]">Qty *</th>
                                            <th className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[100px]">Cost (LKR) *</th>
                                            <th className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[100px] text-right">Subtotal</th>
                                            <th className="p-3 text-center w-[50px]"></th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                        {formData.items.map((item, index) => (
                                            <tr key={index} className="hover:bg-slate-50/50 transition-colors">

                                                <td className="p-2 align-top relative">
                                                    <input
                                                        type="text"
                                                        list={`medicines-list-${index}`}
                                                        required
                                                        placeholder={formData.supplierId ? "Type or select..." : "Select Supplier first"}
                                                        disabled={!formData.supplierId}
                                                        className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-[13px] font-bold text-indigo-800 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm disabled:bg-slate-100"
                                                        value={item.medicineName}
                                                        onChange={e => handleMedicineInput(index, e.target.value)}
                                                    />
                                                    <datalist id={`medicines-list-${index}`}>
                                                        {medicines.filter(m => m.supplierId == formData.supplierId).map(m => (
                                                            <option key={m.id} value={m.name} />
                                                        ))}
                                                    </datalist>
                                                    {item.isNew && item.medicineName && (
                                                        <span className="absolute -bottom-3 left-3 text-[9px] font-black text-emerald-500 bg-emerald-50 px-1 rounded">NEW ITEM</span>
                                                    )}
                                                </td>

                                                <td className="p-2 align-top">
                                                    <input type="text" readOnly={!item.isNew}
                                                           list="generic-names-list"
                                                           className={`w-full p-2 border rounded-lg text-[12px] font-bold outline-none ${!item.isNew ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-sm'}`}
                                                           value={item.genericName}
                                                           onChange={e => handleItemChange(index, 'genericName', e.target.value)}
                                                           placeholder={!item.isNew ? "Auto Fill" : "Type 2 letters..."} />
                                                </td>

                                                <td className="p-2 align-top">
                                                    <select disabled={!item.isNew}
                                                            className={`w-full p-2 border rounded-lg text-[12px] font-bold outline-none ${!item.isNew ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-sm cursor-pointer'}`}
                                                            value={item.unit}
                                                            onChange={e => handleItemChange(index, 'unit', e.target.value)}>
                                                        <option value="Tablets">Tablets</option>
                                                        <option value="Capsules">Capsules</option>
                                                        <option value="Syrup">Syrup</option>
                                                        <option value="Injection">Injection</option>
                                                        <option value="Cream/Ointment">Cream</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </td>

                                                <td className="p-2 align-top">
                                                    <input type="text" readOnly={true}
                                                           className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-[12px] font-bold text-slate-500 cursor-not-allowed outline-none shadow-sm"
                                                           value={item.barcode}
                                                           placeholder="Auto Generated" />
                                                </td>

                                                <td className="p-2 align-top">
                                                    <input type="text" required placeholder="Type Batch..." className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[12px] font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-sm"
                                                           value={item.batchNumber} onChange={e => handleItemChange(index, 'batchNumber', e.target.value)} />
                                                </td>

                                                <td className="p-2 align-top">
                                                    <input type="date" required className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[12px] font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 cursor-pointer shadow-sm"
                                                           value={item.expiryDate} onChange={e => handleItemChange(index, 'expiryDate', e.target.value)} />
                                                </td>

                                                <td className="p-2 align-top">
                                                    <input type="number" required min="1" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[12px] font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-sm"
                                                           value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} />
                                                </td>

                                                <td className="p-2 align-top">
                                                    <input type="number" required min="0" step="0.01" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[12px] font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-sm"
                                                           value={item.costPrice} onChange={e => handleItemChange(index, 'costPrice', e.target.value)} />
                                                </td>

                                                <td className="p-2 align-top text-right font-black text-[14px] text-slate-800 pt-2.5">
                                                    {Number(item.subtotal).toFixed(2)}
                                                </td>

                                                <td className="p-2 align-top text-center pt-2">
                                                    <button type="button" onClick={() => handleRemoveItem(index)} className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500 rounded-md transition-all cursor-pointer"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="h-4"></div>
                        </form>

                        <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Grand Total</span>
                                <span className="text-[26px] font-black text-indigo-600 leading-none">LKR {calculateTotal()}</span>
                            </div>

                            <div className="flex gap-3 w-full md:w-auto">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-auto px-6 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-[13px] hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" form="grn-form" disabled={submitting} className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-[14px] hover:bg-indigo-700 transition-all shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)] active:scale-[0.98] disabled:opacity-50 cursor-pointer">
                                    <CheckCircle size={18} /> {submitting ? 'Saving...' : 'Save GRN & Update Stock'}
                                </button>
                            </div>
                        </div>

                        <datalist id="generic-names-list">
                            {uniqueGenericNames.map((name, idx) => (
                                <option key={idx} value={name} />
                            ))}
                        </datalist>

                    </div>
                </div>,
                document.body
            )}
        </AdminLayout>
    );
}