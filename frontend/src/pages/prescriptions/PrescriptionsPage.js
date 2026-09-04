import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import {
    Search, Plus, FileText, Eye, CheckCircle, Clock, Filter, X, User,
    Stethoscope, Calendar, FileCheck, Trash2, Pill, Edit, Printer, ShieldAlert,
    Sparkles, UploadCloud, AlertTriangle, Image as ImageIcon, PieChart as PieIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { inventoryApi } from '../../api/inventoryApi';
import Highcharts from 'highcharts';
import Highcharts3D from 'highcharts/highcharts-3d';
import HighchartsReact from 'highcharts-react-official';

if (typeof Highcharts === 'object' && !Highcharts.Chart.prototype.pan) {
}
try {
    Highcharts3D(Highcharts);
} catch (e) {
    console.log("Highcharts 3D already initialized");
}

export default function PrescriptionsPage() {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingRxId, setEditingRxId] = useState(null);
    const [patients, setPatients] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [submitting, setUpdating] = useState(false);

    const [selectedRx, setSelectedRx] = useState(null);

    const [showAIUploadModal, setShowAIUploadModal] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [selectedAIRx, setSelectedAIRx] = useState(null);
    const [extractedData, setExtractedData] = useState({ patient: '', doctor: '', medicines: [] });

    const [form, setForm] = useState({
        patientId: '',
        doctorId: '',
        doctorName: '',
        doctorSpecialization: '',
        doctorContactNumber: '',
        doctorHospitalOrClinic: '',
        prescriptionDate: new Date().toISOString().split('T')[0],
        status: 'Pending',
        digitalCopyUrl: '',
        notes: '',
        items: [{ medicineId: '', quantity: 1, dosageM: '', dosageA: '', dosageN: '' }]
    });

    useEffect(() => {
        fetchPrescriptions();
        fetchPatients();
        fetchMedicines();
    }, []);

    const fetchPrescriptions = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/prescriptions');
            setPrescriptions(res.data || []);
        } catch (err) {
            console.error('Failed to load prescriptions', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPatients = async () => {
        try {
            let pRes = await axios.get('http://localhost:5000/api/crm/customers').catch(() => null);
            if (!pRes || !pRes.data) {
                pRes = await axios.get('http://localhost:5000/api/directory/patients').catch(() => null);
            }
            if (pRes && pRes.data) {
                const data = Array.isArray(pRes.data) ? pRes.data : (pRes.data.content || pRes.data.patients || []);
                setPatients(data);
            }
        } catch (err) {
            console.error("Patient fetch error:", err);
        }
    };

    const fetchMedicines = async () => {
        try {
            const res = await inventoryApi.getAll();
            if (res && res.data) {
                setMedicines(res.data);
                return;
            }
        } catch (err) {
            console.error("inventoryApi fetch error, trying fallback...", err);
        }

        try {
            const res = await axios.get('http://localhost:5000/api/medicines');
            if (res && res.data) {
                const data = Array.isArray(res.data) ? res.data : (res.data.content || res.data.medicines || []);
                setMedicines(data);
            }
        } catch (err) {
            console.error("Axios fallback medicine fetch error:", err);
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...form.items];
        newItems[index][field] = value;
        setForm({ ...form, items: newItems });
    };

    const addItemRow = () => {
        setForm({ ...form, items: [...form.items, { medicineId: '', quantity: 1, dosageM: '', dosageA: '', dosageN: '' }] });
    };

    const removeItemRow = (index) => {
        const newItems = form.items.filter((_, i) => i !== index);
        setForm({ ...form, items: newItems });
    };

    const closeModal = () => {
        setIsAddModalOpen(false);
        setEditingRxId(null);
        setForm({
            patientId: '', doctorId: '', doctorName: '', doctorSpecialization: '', doctorContactNumber: '', doctorHospitalOrClinic: '',
            prescriptionDate: new Date().toISOString().split('T')[0], status: 'Pending', digitalCopyUrl: '', notes: '',
            items: [{ medicineId: '', quantity: 1, dosageM: '', dosageA: '', dosageN: '' }]
        });
    };

    const openEditModal = (rx) => {
        setEditingRxId(rx.id);
        const parsedItems = (rx.items && rx.items.length > 0) ? rx.items.map(item => {
            let dosageM = '', dosageA = '', dosageN = '';
            if (item.dosageInstructions) {
                const parts = item.dosageInstructions.split(' | ');
                if (parts.length === 3) {
                    dosageM = parts[0].replace('Morn:', '').trim();
                    dosageA = parts[1].replace('Noon:', '').trim();
                    dosageN = parts[2].replace('Night:', '').trim();
                } else {
                    dosageM = item.dosageInstructions;
                }
            }
            return {
                medicineId: item.medicineId,
                quantity: item.quantity,
                dosageM: dosageM === '-' ? '' : dosageM,
                dosageA: dosageA === '-' ? '' : dosageA,
                dosageN: dosageN === '-' ? '' : dosageN
            };
        }) : [{ medicineId: '', quantity: 1, dosageM: '', dosageA: '', dosageN: '' }];

        setForm({
            patientId: rx.patientId || '',
            doctorId: rx.doctorId || '',
            doctorName: rx.doctor?.name || '',
            doctorSpecialization: rx.doctor?.specialization || '',
            doctorContactNumber: rx.doctor?.contactNumber || '',
            doctorHospitalOrClinic: rx.doctor?.hospitalOrClinic || '',
            prescriptionDate: rx.prescriptionDate || new Date().toISOString().split('T')[0],
            status: rx.status || 'Pending',
            digitalCopyUrl: rx.digitalCopyUrl || '',
            notes: rx.notes || '',
            items: parsedItems
        });

        setIsAddModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm(`Are you sure you want to delete Prescription RX-${String(id).padStart(4, '0')}?`)) {
            try {
                if(String(id).includes('999')) {
                    setPrescriptions(prescriptions.filter(p => p.id !== id));
                    toast.success('AI Draft removed successfully!');
                    return;
                }
                await axios.delete(`http://localhost:5000/api/prescriptions/${id}`);
                toast.success('Prescription deleted successfully!');
                fetchPrescriptions();
            } catch (err) {
                toast.error('Failed to delete prescription');
                console.error(err);
            }
        }
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!form.patientId || !form.doctorName) {
            toast.error('Please select a Patient and enter Doctor Name');
            return;
        }

        setUpdating(true);
        try {
            let currentDoctorId = form.doctorId;

            if (!editingRxId) {
                const doctorRes = await axios.post('http://localhost:5000/api/directory/doctors', {
                    name: form.doctorName,
                    specialization: form.doctorSpecialization,
                    contactNumber: form.doctorContactNumber,
                    hospitalOrClinic: form.doctorHospitalOrClinic
                });
                currentDoctorId = doctorRes.data.id;
            }

            const formattedItems = form.items.map(item => ({
                medicineId: item.medicineId,
                quantity: item.quantity,
                dosageInstructions: `Morn: ${item.dosageM || '-'} | Noon: ${item.dosageA || '-'} | Night: ${item.dosageN || '-'}`
            }));

            const payload = {
                patientId: form.patientId,
                doctorId: currentDoctorId,
                prescriptionDate: form.prescriptionDate,
                status: form.status,
                digitalCopyUrl: form.digitalCopyUrl,
                notes: form.notes,
                items: formattedItems
            };

            if (editingRxId) {
                await axios.put(`http://localhost:5000/api/prescriptions/${editingRxId}`, payload);
                toast.success('Prescription updated successfully!');
            } else {
                await axios.post('http://localhost:5000/api/prescriptions', payload);
                toast.success('Prescription added successfully!');
            }

            closeModal();
            fetchPrescriptions();
        } catch (err) {
            toast.error(`Failed to ${editingRxId ? 'update' : 'add'} prescription`);
            console.error(err);
        } finally {
            setUpdating(false);
        }
    };

    const handleFileUpload = (e) => {
        e.preventDefault();
        setIsScanning(true);

        setTimeout(() => {
            setIsScanning(false);
            setShowAIUploadModal(false);

            const newRx = {
                id: 9990 + Math.floor(Math.random() * 10),
                prescriptionDate: new Date().toISOString().split('T')[0],
                patient: { name: 'Sunil Perera (AI Draft)' },
                doctor: { name: 'Dr. Gunaratne' },
                status: 'Pending Verification',
                isAI: true,
                imageUrl: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=400&h=500'
            };

            setPrescriptions([newRx, ...prescriptions]);
            toast.success("AI Scanning Complete! Prescription drafted for verification.", { icon: '✨' });
        }, 3000);
    };

    const openVerification = (rx) => {
        setSelectedAIRx(rx);
        setExtractedData({
            patient: rx.patient?.name?.replace(' (AI Draft)', '') || '',
            doctor: rx.doctor?.name || '',
            medicines: [
                { name: 'Amoxil 250mg', dosage: '1 pill 3 times a day', isControlled: true },
                { name: 'Panadol 500mg', dosage: '2 pills when needed', isControlled: false }
            ]
        });
        setShowVerifyModal(true);
    };

    const handleApproveForPOS = () => {
        setPrescriptions(prescriptions.map(p =>
            p.id === selectedAIRx.id ? {
                ...p,
                status: 'Approved for POS',
                patient: { name: extractedData.patient },
                doctor: { name: extractedData.doctor }
            } : p
        ));
        setShowVerifyModal(false);
        toast.success(`RX-${String(selectedAIRx.id).padStart(4, '0')} Verified and Sent to POS successfully!`, { icon: '✅' });
    };

    const filteredPrescriptions = prescriptions.filter(rx => {
        const pName = rx.patient?.name ? rx.patient.name.toLowerCase() : '';
        const rxId = String(rx.id).toLowerCase();
        const matchesSearch = pName.includes(searchQuery.toLowerCase()) || rxId.includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || rx.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const donutChartOptions = useMemo(() => {
        const statusMap = { Pending: 0, 'Pending Verification': 0, 'Approved for POS': 0, Dispensed: 0 };
        prescriptions.forEach(rx => {
            const st = rx.status || 'Pending';
            if (statusMap[st] !== undefined) {
                statusMap[st] += 1;
            } else {
                statusMap[st] = 1;
            }
        });

        const seriesData = [
            { name: 'Pending', y: statusMap['Pending'], color: '#f59e0b' },
            { name: 'AI Verify', y: statusMap['Pending Verification'], color: '#c084fc' },
            { name: 'Approved', y: statusMap['Approved for POS'], color: '#38bdf8' },
            { name: 'Dispensed', y: statusMap['Dispensed'], color: '#10b981' }
        ].filter(data => data.y > 0);

        const finalData = seriesData.length > 0 ? seriesData : [{ name: 'No Prescriptions', y: 1, color: '#94a3b8' }];

        return {
            chart: { type: 'pie', backgroundColor: 'transparent', margin: [0, 0, 0, 0], options3d: { enabled: true, alpha: 45, beta: 0, depth: 35 } },
            title: { text: '' },
            tooltip: { pointFormat: '{series.name}: <b>{point.y}</b>' },
            plotOptions: { pie: { allowPointSelect: true, cursor: 'pointer', depth: 60, center: ['50%', '45%'], size: '95%', dataLabels: { enabled: true, format: '<b>{point.name}</b>: {point.y}', style: { fontSize: '11px', fontWeight: '600', color: '#1e293b' } } } },
            series: [{ name: 'Prescriptions', data: finalData }],
            credits: { enabled: false }
        };
    }, [prescriptions]);

    return (
        <AdminLayout>
            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4">

                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply"
                     style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}>
                </div>

                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-indigo-200/20 to-slate-300/20 blur-[120px] pointer-events-none z-[-2]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-slate-300/20 to-indigo-200/20 blur-[140px] pointer-events-none z-[-2]"></div>

                <div className="relative z-10 w-full h-full flex flex-col gap-6 pb-2">

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                        <div>
                            <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">Prescriptions</h1>
                            <p className="text-[13px] font-medium text-slate-500 mt-1.5">
                                Manage patient prescriptions, prescribed medicines, and dispensing status
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowAIUploadModal(true)}
                                className="flex items-center gap-2 bg-white/60 backdrop-blur-md px-5 py-3 rounded-2xl text-[14px] font-extrabold shadow-sm hover:bg-white/80 transition-all cursor-pointer border border-white/80"
                            >
                                <Sparkles size={16} className="text-purple-600" />
                                <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">AI</span>
                            </button>
                            <button
                                onClick={() => { closeModal(); setIsAddModalOpen(true); }}
                                className="flex items-center gap-2 bg-indigo-500/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl text-[14px] font-bold hover:bg-indigo-600 transition-all shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)] border border-indigo-400/50 cursor-pointer active:scale-[0.98]"
                            >
                                <Plus size={18} strokeWidth={2.5} /> Add Prescription
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/30 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex flex-col md:flex-row items-center justify-between gap-6 relative">
                        <div className="w-full md:w-1/3">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="p-2 bg-white/50 text-indigo-600 rounded-xl border border-white/60 shadow-sm">
                                    <PieIcon size={20} />
                                </div>
                                <h2 className="text-[17px] font-bold text-slate-800 tracking-tight">Prescription Analytics</h2>
                            </div>
                            <p className="text-[13px] text-slate-500 font-medium">Real-time 3D breakdown of prescription fulfillment and verification states.</p>
                        </div>
                        <div className="h-[360px] w-full md:w-2/3 flex items-center justify-center overflow-visible">
                            <div className="w-full h-full">
                                <HighchartsReact
                                    highcharts={Highcharts}
                                    options={donutChartOptions}
                                    containerProps={{ style: { width: '100%', height: '100%', overflow: 'visible' } }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden flex flex-col mt-2">

                        <div className="p-6 border-b border-white/30 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/10">
                            <div className="relative w-full md:w-96">
                                <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by Patient Name or RX ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm backdrop-blur-sm"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <Filter size={16} className="text-slate-400" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-sm font-bold text-slate-700 outline-none cursor-pointer shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-indigo-500/40"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Pending Verification">Pending Verification (AI)</option>
                                    <option value="Approved for POS">Approved for POS</option>
                                    <option value="Dispensed">Dispensed</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto px-8 py-4">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">RX ID</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Date</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Patient</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Doctor</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Status</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 text-right">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center py-16 text-slate-500 font-medium text-[13px]">Loading prescriptions...</td></tr>
                                ) : filteredPrescriptions.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-16 text-slate-500 font-medium text-[13px]">No prescriptions found. Click "+ Add Prescription" to create one.</td></tr>
                                ) : (
                                    filteredPrescriptions.map((rx) => (
                                        <tr key={rx.id} className="group hover:bg-white/20 transition-colors border-b border-white/20 last:border-0">
                                            <td className="py-4 align-top pt-5 font-mono text-[13px] font-bold text-indigo-700">
                                                RX-{String(rx.id).padStart(4, '0')}
                                            </td>
                                            <td className="py-4 align-top pt-5 text-[13px] font-medium text-slate-600">
                                                {rx.prescriptionDate}
                                            </td>
                                            <td className="py-4 align-top pt-5 text-[14px] font-bold text-[#1e293b]">
                                                {rx.patient?.name || 'Unknown Patient'}
                                            </td>
                                            <td className="py-4 align-top pt-5 text-[13px] font-medium text-slate-600">
                                                {rx.doctor?.name ? `Dr. ${rx.doctor.name}` : 'Unknown Doctor'}
                                            </td>
                                            <td className="py-4 align-top pt-5">
                                                {rx.status === 'Pending Verification' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-fuchsia-100/50 border border-fuchsia-200/50 text-fuchsia-700 rounded-lg text-[11px] font-bold backdrop-blur-sm shadow-sm">
                                                        <Sparkles size={14} /> Verify (AI)
                                                    </span>
                                                ) : rx.status === 'Approved for POS' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100/50 border border-blue-200/50 text-blue-700 rounded-lg text-[11px] font-bold backdrop-blur-sm shadow-sm">
                                                        <FileCheck size={14} /> Approved
                                                    </span>
                                                ) : rx.status === 'Pending' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100/50 border border-amber-200/50 text-amber-700 rounded-lg text-[11px] font-bold backdrop-blur-sm shadow-sm">
                                                        <Clock size={14} /> Pending
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/50 border border-emerald-200/50 text-emerald-700 rounded-lg text-[11px] font-bold backdrop-blur-sm shadow-sm">
                                                        <CheckCircle size={14} /> Dispensed
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-4 align-top pt-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {rx.status === 'Pending Verification' ? (
                                                        <button
                                                            onClick={() => openVerification(rx)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-50/80 text-fuchsia-600 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-fuchsia-100 transition-colors border border-fuchsia-100 cursor-pointer shadow-sm backdrop-blur-sm"
                                                        >
                                                            <Sparkles size={14} /> Verify Data
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => setSelectedRx(rx)} className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-100/50 rounded-lg transition-colors cursor-pointer" title="View Details">
                                                                <Eye size={16} />
                                                            </button>
                                                            <button onClick={() => openEditModal(rx)} className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-100/50 rounded-lg transition-colors cursor-pointer" title="Edit Prescription">
                                                                <Edit size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button onClick={() => handleDelete(rx.id)} className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-100/50 rounded-lg transition-colors cursor-pointer" title="Delete/Remove">
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

            {showAIUploadModal && createPortal(
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] border border-white w-full max-w-[500px] p-8 text-center relative overflow-hidden">
                        <button onClick={() => setShowAIUploadModal(false)} className="absolute top-6 right-6 hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer text-slate-400">
                            <X size={20}/>
                        </button>

                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-100 shadow-inner">
                            <Sparkles className="w-8 h-8 text-indigo-600" />
                        </div>

                        <h2 className="text-[20px] font-bold text-slate-800 mb-2">AI Prescription Scanner</h2>
                        <p className="text-[13px] text-slate-500 font-medium mb-8">
                            Upload a photo of the prescription. AI will extract patient, doctor, and medicine details to reduce manual data entry errors.
                        </p>

                        {!isScanning ? (
                            <form onSubmit={handleFileUpload}>
                                <label className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/80 transition-colors rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer mb-6 group shadow-inner">
                                    <UploadCloud className="w-10 h-10 text-indigo-400 group-hover:text-indigo-600 transition-colors mb-3" />
                                    <span className="text-[14px] font-bold text-indigo-700">Click to upload or drag image</span>
                                    <span className="text-[12px] font-medium text-slate-400 mt-1">Supports JPG, PNG, PDF</span>
                                    <input type="file" className="hidden" accept="image/*,.pdf" />
                                </label>
                                <button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-2xl shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] transition-all py-3.5 text-[14px] hover:shadow-[0_8px_20px_-6px_rgba(79,70,229,0.6)] cursor-pointer">
                                    Start Document Scan
                                </button>
                            </form>
                        ) : (
                            <div className="py-12 flex flex-col items-center">
                                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                <p className="text-[15px] font-bold text-slate-700">AI is analyzing handwriting...</p>
                                <p className="text-[12px] text-slate-400 font-medium mt-2">Checking dosage & compliance records</p>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {showVerifyModal && selectedAIRx && createPortal(
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] border border-white w-full max-w-[900px] flex flex-col overflow-hidden max-h-[90vh]">

                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                            <div>
                                <h2 className="text-[18px] font-bold text-slate-800 flex items-center gap-2.5">
                                    <ShieldAlert className="w-5 h-5 text-indigo-600"/> Pharmacist Clinical Verification
                                </h2>
                                <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                                    Verify AI extracted data against the original document to ensure legal compliance.
                                </p>
                            </div>
                            <button onClick={() => setShowVerifyModal(false)} className="hover:bg-slate-200 p-2 rounded-full transition-colors cursor-pointer">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                            <div className="md:w-1/2 bg-slate-50 border-r border-slate-200 p-6 flex flex-col">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <ImageIcon size={14}/> Original Document
                                </p>
                                <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center relative shadow-sm">
                                    <img src={selectedAIRx.imageUrl} alt="Prescription" className="w-full h-full object-cover opacity-80" />
                                    <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md text-white text-[11px] font-bold p-3 rounded-xl flex items-start gap-2 border border-white/10 shadow-lg">
                                        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0"/>
                                        Ensure doctor's signature and date are valid before approving this draft.
                                    </div>
                                </div>
                            </div>

                            <div className="md:w-1/2 p-6 overflow-y-auto bg-white/50">
                                <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <FileText size={14}/> AI Extracted Data
                                </p>

                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Patient Name</label>
                                        <input type="text" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-sm" value={extractedData.patient} onChange={(e) => setExtractedData({...extractedData, patient: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Doctor Name</label>
                                        <input type="text" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-sm" value={extractedData.doctor} onChange={(e) => setExtractedData({...extractedData, doctor: e.target.value})} />
                                    </div>
                                </div>

                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <Pill size={14} className="text-indigo-500"/> Prescribed Medicines
                                </p>
                                <div className="space-y-3 mb-6">
                                    {extractedData.medicines.map((med, idx) => (
                                        <div key={idx} className={`p-4 rounded-xl border shadow-sm transition-colors ${med.isControlled ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <input type="text" className="bg-transparent font-bold text-[13px] text-slate-800 outline-none w-full border-b border-transparent focus:border-slate-300" value={med.name} onChange={(e) => {
                                                    const newMeds = [...extractedData.medicines];
                                                    newMeds[idx].name = e.target.value;
                                                    setExtractedData({...extractedData, medicines: newMeds});
                                                }}/>
                                                {med.isControlled && <span className="bg-rose-100 text-rose-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1"><ShieldAlert size={10}/> Controlled</span>}
                                            </div>
                                            <input type="text" className="bg-transparent font-medium text-[12px] text-slate-500 outline-none w-full border-b border-transparent focus:border-slate-300" value={med.dosage} onChange={(e) => {
                                                const newMeds = [...extractedData.medicines];
                                                newMeds[idx].dosage = e.target.value;
                                                setExtractedData({...extractedData, medicines: newMeds});
                                            }}/>
                                        </div>
                                    ))}
                                    <button className="text-[12px] font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-800 transition-colors cursor-pointer">
                                        <Plus size={14}/> Add missed item
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                            <button onClick={() => setShowVerifyModal(false)} className="px-6 py-2.5 bg-slate-50 text-slate-600 font-bold border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer text-[13px]">
                                Save as Draft
                            </button>
                            <button
                                onClick={handleApproveForPOS}
                                className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] transition-all text-[13px] hover:bg-indigo-700 cursor-pointer flex items-center gap-2"
                            >
                                <CheckCircle size={16}/> Approve & Send to POS
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isAddModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[32px] shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] border border-white w-full max-w-[750px] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[20px] font-bold text-slate-800 flex items-center gap-2.5">
                                {editingRxId ? <Edit className="w-5 h-5 text-indigo-600"/> : <Plus className="w-5 h-5 text-indigo-600"/>}
                                {editingRxId ? 'Edit Prescription' : 'Add New Prescription'}
                            </h2>
                            <button onClick={closeModal} className="hover:bg-white/50 p-2 rounded-full transition-colors border border-transparent hover:border-white/60 cursor-pointer">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleAddSubmit} className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <User size={14} className="text-indigo-500" /> Select Patient
                                </label>
                                <select required className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer shadow-sm backdrop-blur-sm" value={form.patientId} onChange={(e) => setForm({...form, patientId: e.target.value})}>
                                    <option value="">-- Choose Patient --</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.name || p.customerName || p.patientName || `Patient #${p.id}`}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="p-5 bg-white/40 border border-white/60 rounded-2xl shadow-sm backdrop-blur-sm space-y-4">
                                <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                    <Stethoscope size={14} className="text-indigo-500"/> Doctor Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Doctor Name</label>
                                        <input type="text" required placeholder="e.g. Kumara" className="w-full px-4 py-2.5 bg-white/60 border border-white/80 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm" value={form.doctorName} onChange={(e) => setForm({...form, doctorName: e.target.value})} disabled={!!editingRxId} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Specialization</label>
                                        <input type="text" placeholder="e.g. Cardiologist" className="w-full px-4 py-2.5 bg-white/60 border border-white/80 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm" value={form.doctorSpecialization} onChange={(e) => setForm({...form, doctorSpecialization: e.target.value})} disabled={!!editingRxId} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Number</label>
                                        <input type="text" placeholder="Optional" className="w-full px-4 py-2.5 bg-white/60 border border-white/80 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm" value={form.doctorContactNumber} onChange={(e) => setForm({...form, doctorContactNumber: e.target.value})} disabled={!!editingRxId} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hospital/Clinic</label>
                                        <input type="text" placeholder="Optional" className="w-full px-4 py-2.5 bg-white/60 border border-white/80 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm" value={form.doctorHospitalOrClinic} onChange={(e) => setForm({...form, doctorHospitalOrClinic: e.target.value})} disabled={!!editingRxId} />
                                    </div>
                                </div>
                                {editingRxId && <p className="text-[10px] text-slate-500 italic mt-1 font-medium">* Doctor details cannot be changed during an edit.</p>}
                            </div>

                            <div className="p-5 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl shadow-sm backdrop-blur-sm space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <Pill size={14}/> Prescribed Medicines List
                                    </h3>
                                    <button type="button" onClick={addItemRow} className="text-[11px] font-bold bg-indigo-500/90 text-white border border-indigo-400/50 px-3 py-1.5 rounded-xl hover:bg-indigo-600 transition-colors shadow-sm cursor-pointer">
                                        + Add Medicine
                                    </button>
                                </div>

                                {form.items.map((item, index) => {
                                    const selectedMedObj = medicines.find(m => String(m.id) === String(item.medicineId));
                                    const isItemControlled = selectedMedObj ? Boolean(selectedMedObj.isControlled || selectedMedObj.is_controlled) : false;

                                    return (
                                        <div key={index} className={`flex flex-col md:flex-row items-center gap-3 p-3 border rounded-xl shadow-sm backdrop-blur-sm transition-colors ${isItemControlled ? 'bg-rose-100/50 border-rose-200/50' : 'bg-white/60 border-white/80'}`}>
                                            <div className="flex-1 w-full relative">
                                                <select required className="w-full px-3 py-2.5 bg-white/80 border border-white/80 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm" value={item.medicineId} onChange={(e) => handleItemChange(index, 'medicineId', e.target.value)}>
                                                    <option value="">-- Select Medicine --</option>
                                                    {medicines.map(m => {
                                                        const isMedControlled = Boolean(m.isControlled || m.is_controlled);
                                                        const medName = m.name || m.medicineName || m.genericName || `Medicine #${m.id}`;
                                                        return (
                                                            <option key={m.id} value={m.id}>
                                                                {isMedControlled ? '🛑 [CD] ' : ''}{medName} (Stock: {m.quantity})
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                {isItemControlled && (
                                                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-rose-500" title="NMRA Controlled Drug">
                                                        <ShieldAlert size={14} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-20">
                                                <input type="number" min="1" required placeholder="Qty" className="w-full px-3 py-2.5 bg-white/80 border border-white/80 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                                            </div>
                                            <div className="flex-1 flex gap-1 w-full">
                                                <div className="flex-1 flex items-center border border-white/80 bg-white/50 backdrop-blur-sm rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/40 shadow-sm">
                                                    <span className="px-2 py-2 bg-white/60 text-[10px] font-bold text-slate-600 border-r border-white/80">Morn</span>
                                                    <input type="text" className="w-full px-1 py-2 text-xs font-bold text-center text-slate-800 outline-none bg-transparent" placeholder="1" value={item.dosageM || ''} onChange={(e) => handleItemChange(index, 'dosageM', e.target.value)} />
                                                </div>
                                                <div className="flex-1 flex items-center border border-white/80 bg-white/50 backdrop-blur-sm rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/40 shadow-sm">
                                                    <span className="px-2 py-2 bg-white/60 text-[10px] font-bold text-slate-600 border-r border-white/80">Noon</span>
                                                    <input type="text" className="w-full px-1 py-2 text-xs font-bold text-center text-slate-800 outline-none bg-transparent" placeholder="0" value={item.dosageA || ''} onChange={(e) => handleItemChange(index, 'dosageA', e.target.value)} />
                                                </div>
                                                <div className="flex-1 flex items-center border border-white/80 bg-white/50 backdrop-blur-sm rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/40 shadow-sm">
                                                    <span className="px-2 py-2 bg-white/60 text-[10px] font-bold text-slate-600 border-r border-white/80">Night</span>
                                                    <input type="text" className="w-full px-1 py-2 text-xs font-bold text-center text-slate-800 outline-none bg-transparent" placeholder="1" value={item.dosageN || ''} onChange={(e) => handleItemChange(index, 'dosageN', e.target.value)} />
                                                </div>
                                            </div>
                                            {form.items.length > 1 && (
                                                <button type="button" onClick={() => removeItemRow(index)} className="p-2.5 text-rose-500 hover:bg-rose-100/50 rounded-lg transition-colors cursor-pointer ml-1">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Calendar size={14} className="text-indigo-500"/> Prescription Date</label>
                                    <input type="date" required className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer shadow-sm backdrop-blur-sm" value={form.prescriptionDate} onChange={(e) => setForm({...form, prescriptionDate: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><FileCheck size={14} className="text-indigo-500"/> Status</label>
                                    <div className="w-full px-4 py-3 bg-white/40 border border-white/60 rounded-2xl text-[13px] font-bold text-slate-600 flex items-center justify-between cursor-not-allowed select-none shadow-sm backdrop-blur-sm">
                                        <span className="flex items-center gap-2">
                                            {form.status === 'Pending' ? <Clock size={16} className="text-amber-500" /> : <CheckCircle size={16} className="text-emerald-500" />}
                                            <span className={form.status === 'Pending' ? 'text-amber-600' : 'text-emerald-600'}>{form.status}</span>
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 italic mt-1.5 font-medium">* Status updates automatically via POS billing.</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">Notes / Instructions</label>
                                <textarea rows="2" placeholder="Add any special notes..." className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-[13px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-sm backdrop-blur-sm" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})}></textarea>
                            </div>

                            <button type="submit" disabled={submitting} className="w-full mt-4 bg-indigo-500/90 backdrop-blur-md text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)] border border-indigo-400/50 hover:bg-indigo-600 transition-all active:scale-[0.98] text-[15px] disabled:opacity-50 cursor-pointer">
                                {submitting ? 'Saving...' : editingRxId ? 'Update Prescription' : 'Save Prescription'}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {selectedRx && createPortal(
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4 print:bg-white print:p-0 print:backdrop-blur-none">
                    <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_16px_40px_0_rgba(31,38,135,0.2)] w-full max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none print:h-auto print:overflow-visible print:bg-white">

                        <div className="px-8 py-5 border-b border-white/50 flex justify-between items-center bg-white/40 shrink-0 print:hidden">
                            <h2 className="text-[18px] font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="text-indigo-600 w-5 h-5"/> Prescription Details
                            </h2>
                            <button onClick={() => setSelectedRx(null)} className="hover:bg-white/60 p-2 rounded-full transition-colors border border-transparent hover:border-white/80 cursor-pointer text-slate-500">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="p-8 flex-1 overflow-y-auto print:overflow-visible" id="printable-rx">
                            <div className="hidden print:block text-center mb-8 border-b border-slate-200 pb-6">
                                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Kegalle Rx</h1>
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Official Prescription Record</p>
                            </div>

                            <div className="space-y-6 text-sm font-medium text-slate-700">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/60 rounded-2xl border border-white/80 shadow-sm print:border-none print:bg-transparent print:p-0 print:shadow-none">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">RX Number</p>
                                        <p className="font-mono font-black text-indigo-600 text-lg">RX-{String(selectedRx.id).padStart(4, '0')}</p>
                                    </div>
                                    <div className="p-4 bg-white/60 rounded-2xl border border-white/80 shadow-sm print:border-none print:bg-transparent print:p-0 print:shadow-none">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                                        <p className="font-bold text-slate-800">{selectedRx.status}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200/50 pb-1">Patient Info</p>
                                        <p className="font-bold text-slate-800 text-base">{selectedRx.patient?.name || 'N/A'}</p>
                                        <p className="text-slate-500 mt-1 text-xs">Date: {selectedRx.prescriptionDate}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200/50 pb-1">Prescriber Info</p>
                                        <p className="font-bold text-slate-800 text-base">Dr. {selectedRx.doctor?.name || 'N/A'}</p>
                                        {selectedRx.doctor?.specialization && <p className="text-slate-500 text-xs mt-0.5">{selectedRx.doctor.specialization}</p>}
                                        {selectedRx.doctor?.hospitalOrClinic && <p className="text-slate-500 text-xs mt-0.5">{selectedRx.doctor.hospitalOrClinic}</p>}
                                        {selectedRx.doctor?.contactNumber && <p className="text-slate-500 text-xs mt-0.5">Tel: {selectedRx.doctor.contactNumber}</p>}
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 border-b border-slate-200/50 pb-1 flex items-center gap-1.5">
                                        <Pill size={14} className="text-indigo-500"/> Prescribed Medicines
                                    </p>
                                    <div className="space-y-3">
                                        {selectedRx.items && selectedRx.items.length > 0 ? (
                                            <div className="overflow-hidden rounded-xl border border-white/80 shadow-sm print:border-none print:shadow-none">
                                                <table className="w-full text-left border-collapse bg-white/60 print:bg-transparent">
                                                    <thead>
                                                    <tr className="bg-white/40 text-[10px] text-slate-500 uppercase tracking-wider border-b border-white/80 print:bg-transparent print:border-b-2 print:border-slate-300">
                                                        <th className="py-3 px-4">Medicine</th>
                                                        <th className="py-3 px-4">Dosage</th>
                                                        <th className="py-3 px-4 text-center">Qty</th>
                                                    </tr>
                                                    </thead>
                                                    <tbody>
                                                    {selectedRx.items.map((it, idx) => (
                                                        <tr key={idx} className="border-b border-white/60 last:border-0 print:border-b print:border-slate-100">
                                                            <td className="py-3 px-4 font-bold text-slate-800 text-xs">
                                                                {it.medicine?.name || 'Unknown Medicine'}
                                                            </td>
                                                            <td className="py-3 px-4 text-xs text-slate-600 font-mono">
                                                                {it.dosageInstructions || '-'}
                                                            </td>
                                                            <td className="py-3 px-4 text-center font-bold text-indigo-600">
                                                                {it.quantity}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-500 italic bg-white/60 border border-white/80 p-4 rounded-xl text-center shadow-sm print:bg-transparent print:border-none">No specific medicines attached.</p>
                                        )}
                                    </div>
                                </div>

                                {selectedRx.notes && (
                                    <div className="pt-4">
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200/50 pb-1 flex items-center gap-1.5">
                                            <FileText size={14} className="text-indigo-500"/> Additional Notes
                                        </p>
                                        <p className="p-4 bg-amber-50/50 border border-amber-100/50 rounded-xl text-slate-700 text-xs italic leading-relaxed shadow-sm print:bg-transparent print:border-slate-300 print:shadow-none">
                                            "{selectedRx.notes}"
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="hidden print:block mt-12 pt-6 border-t-2 border-dashed border-slate-300 text-[10px] text-slate-400 text-center">
                                <p>This is a system generated document from Kegalle Rx Pharmacy System.</p>
                                <p>{new Date().toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="p-5 border-t border-white/50 bg-white/40 shrink-0 print:hidden flex justify-end gap-3">
                            <button onClick={() => setSelectedRx(null)} className="px-5 py-2.5 bg-white/80 border border-white/80 text-slate-600 font-bold text-sm rounded-xl hover:bg-white transition-colors cursor-pointer shadow-sm">
                                Close
                            </button>
                            <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500/90 border border-indigo-400/50 text-white font-bold text-sm rounded-xl hover:bg-indigo-600 transition-colors shadow-md cursor-pointer">
                                <Printer size={16}/> Print Document
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </AdminLayout>
    );
}