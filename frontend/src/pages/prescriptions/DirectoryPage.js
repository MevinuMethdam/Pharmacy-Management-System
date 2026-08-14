import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Search, Plus, Users, Stethoscope, Edit, Trash2, Phone, MapPin, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function DirectoryPage() {
    const [activeTab, setActiveTab] = useState('patients');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);

    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
    const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);

    const [editingPatient, setEditingPatient] = useState(null);
    const [editingDoctor, setEditingDoctor] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [patientForm, setPatientForm] = useState({ name: '', age: '', gender: 'Male', contactNumber: '', address: '' });
    const [doctorForm, setDoctorForm] = useState({ name: '', specialization: '', contactNumber: '', hospitalOrClinic: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pRes, dRes] = await Promise.all([
                axios.get('http://localhost:5000/api/directory/patients'),
                axios.get('http://localhost:5000/api/directory/doctors')
            ]);
            setPatients(pRes.data || []);
            setDoctors(dRes.data || []);
        } catch (err) {
            toast.error('Failed to load directory data');
        } finally {
            setLoading(false);
        }
    };

    const handlePatientSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingPatient) {
                await axios.put(`http://localhost:5000/api/directory/patients/${editingPatient.id}`, patientForm);
                toast.success('Patient updated successfully!');
            } else {
                await axios.post('http://localhost:5000/api/directory/patients', patientForm);
                toast.success('Patient added successfully!');
            }
            closePatientModal();
            fetchData();
        } catch (err) {
            toast.error('Failed to save patient');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePatient = async (id) => {
        if (window.confirm('Are you sure you want to delete this patient?')) {
            try {
                await axios.delete(`http://localhost:5000/api/directory/patients/${id}`);
                toast.success('Patient deleted!');
                fetchData();
            } catch (err) {
                toast.error('Failed to delete patient');
            }
        }
    };

    const openEditPatient = (patient) => {
        setEditingPatient(patient);
        setPatientForm(patient);
        setIsPatientModalOpen(true);
    };

    const closePatientModal = () => {
        setIsPatientModalOpen(false);
        setEditingPatient(null);
        setPatientForm({ name: '', age: '', gender: 'Male', contactNumber: '', address: '' });
    };

    const handleDoctorSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingDoctor) {
                await axios.put(`http://localhost:5000/api/directory/doctors/${editingDoctor.id}`, doctorForm);
                toast.success('Doctor updated successfully!');
            } else {
                await axios.post('http://localhost:5000/api/directory/doctors', doctorForm);
                toast.success('Doctor added successfully!');
            }
            closeDoctorModal();
            fetchData();
        } catch (err) {
            toast.error('Failed to save doctor');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteDoctor = async (id) => {
        if (window.confirm('Are you sure you want to delete this doctor?')) {
            try {
                await axios.delete(`http://localhost:5000/api/directory/doctors/${id}`);
                toast.success('Doctor deleted!');
                fetchData();
            } catch (err) {
                toast.error('Failed to delete doctor');
            }
        }
    };

    const openEditDoctor = (doctor) => {
        setEditingDoctor(doctor);
        setDoctorForm(doctor);
        setIsDoctorModalOpen(true);
    };

    const closeDoctorModal = () => {
        setIsDoctorModalOpen(false);
        setEditingDoctor(null);
        setDoctorForm({ name: '', specialization: '', contactNumber: '', hospitalOrClinic: '' });
    };

    const filteredPatients = patients.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredDoctors = doctors.filter(d => d.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <AdminLayout>
            <div className="flex flex-col gap-6 font-sans pb-8">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200/50">
                                <Users size={20} strokeWidth={2.5} className="text-indigo-600" />
                            </div>
                            <h1 className="text-[24px] font-bold text-slate-800 tracking-tight">Directory</h1>
                        </div>
                        <p className="text-[13px] text-slate-400 mt-1 font-medium ml-14">
                            Manage Patient and Doctor profiles
                        </p>
                    </div>

                    <button
                        onClick={() => activeTab === 'patients' ? setIsPatientModalOpen(true) : setIsDoctorModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[14px] font-bold hover:bg-indigo-700 transition-all shadow-[0_8px_20px_-6px_rgba(99,102,241,0.4)] cursor-pointer"
                    >
                        <Plus size={18} /> Add {activeTab === 'patients' ? 'Patient' : 'Doctor'}
                    </button>
                </div>

                <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden flex flex-col mt-2">

                    <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
                        <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
                            <button
                                onClick={() => setActiveTab('patients')}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${activeTab === 'patients' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Users size={16} /> Patients
                            </button>
                            <button
                                onClick={() => setActiveTab('doctors')}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${activeTab === 'doctors' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Stethoscope size={16} /> Doctors
                            </button>
                        </div>

                        <div className="relative w-full lg:w-96">
                            <Search size={18} className="absolute left-4 top-3 text-slate-400" />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-white border-b border-slate-100">
                                <th className="p-5 pl-8 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Name</th>
                                <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    {activeTab === 'patients' ? 'Age / Gender' : 'Specialization'}
                                </th>
                                <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contact</th>
                                <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    {activeTab === 'patients' ? 'Address' : 'Hospital/Clinic'}
                                </th>
                                <th className="p-5 pr-8 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-10 text-slate-400 font-medium text-sm">Loading data...</td></tr>
                            ) : activeTab === 'patients' ? (
                                filteredPatients.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-10 text-slate-400 font-medium text-sm">No patients found.</td></tr>
                                ) : filteredPatients.map((patient) => (
                                    <tr key={`p-${patient.id}`} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                                        <td className="p-5 pl-8 text-[14px] font-bold text-slate-800">{patient.name}</td>
                                        <td className="p-5 text-[13px] font-medium text-slate-600">{patient.age || '-'} Yrs • {patient.gender || '-'}</td>
                                        <td className="p-5 text-[13px] font-medium text-slate-500 flex items-center gap-1.5"><Phone size={14}/> {patient.contactNumber || '-'}</td>
                                        <td className="p-5 text-[13px] font-medium text-slate-500"><span className="flex items-center gap-1.5 truncate max-w-[200px]"><MapPin size={14} className="min-w-[14px]"/>{patient.address || '-'}</span></td>
                                        <td className="p-5 pr-8 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openEditPatient(patient)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"><Edit size={16} /></button>
                                                <button onClick={() => handleDeletePatient(patient.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                filteredDoctors.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-10 text-slate-400 font-medium text-sm">No doctors found.</td></tr>
                                ) : filteredDoctors.map((doc) => (
                                    <tr key={`d-${doc.id}`} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                                        <td className="p-5 pl-8 text-[14px] font-bold text-indigo-600">Dr. {doc.name}</td>
                                        <td className="p-5 text-[13px] font-medium text-slate-600">{doc.specialization || '-'}</td>
                                        <td className="p-5 text-[13px] font-medium text-slate-500 flex items-center gap-1.5"><Phone size={14}/> {doc.contactNumber || '-'}</td>
                                        <td className="p-5 text-[13px] font-medium text-slate-500">{doc.hospitalOrClinic || '-'}</td>
                                        <td className="p-5 pr-8 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openEditDoctor(doc)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"><Edit size={16} /></button>
                                                <button onClick={() => handleDeleteDoctor(doc.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isPatientModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-[500px] border border-slate-100 animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-[18px] font-bold text-slate-800 flex items-center gap-2.5">
                                    <Users className="w-5 h-5 text-indigo-600"/> {editingPatient ? 'Edit Patient' : 'Add New Patient'}
                                </h2>
                                <button onClick={closePatientModal} className="hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handlePatientSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                                    <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none" value={patientForm.name} onChange={(e) => setPatientForm({...patientForm, name: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Age</label>
                                        <input type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none" value={patientForm.age} onChange={(e) => setPatientForm({...patientForm, age: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                                        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none cursor-pointer" value={patientForm.gender} onChange={(e) => setPatientForm({...patientForm, gender: e.target.value})}>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Number</label>
                                    <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none" value={patientForm.contactNumber} onChange={(e) => setPatientForm({...patientForm, contactNumber: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
                                    <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none" value={patientForm.address} onChange={(e) => setPatientForm({...patientForm, address: e.target.value})} />
                                </div>
                                <button type="submit" disabled={submitting} className="w-full mt-4 bg-indigo-600 text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)] hover:bg-indigo-700 transition-all cursor-pointer">
                                    {submitting ? 'Saving...' : 'Save Patient'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {isDoctorModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-[500px] border border-slate-100 animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-[18px] font-bold text-slate-800 flex items-center gap-2.5">
                                    <Stethoscope className="w-5 h-5 text-indigo-600"/> {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
                                </h2>
                                <button onClick={closeDoctorModal} className="hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleDoctorSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Doctor Name (Without Dr.)</label>
                                    <input type="text" required placeholder="e.g. Kumara" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none" value={doctorForm.name} onChange={(e) => setDoctorForm({...doctorForm, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Specialization</label>
                                    <input type="text" placeholder="e.g. Cardiologist" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none" value={doctorForm.specialization} onChange={(e) => setDoctorForm({...doctorForm, specialization: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contact Number</label>
                                    <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none" value={doctorForm.contactNumber} onChange={(e) => setDoctorForm({...doctorForm, contactNumber: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hospital or Clinic</label>
                                    <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-700 outline-none" value={doctorForm.hospitalOrClinic} onChange={(e) => setDoctorForm({...doctorForm, hospitalOrClinic: e.target.value})} />
                                </div>
                                <button type="submit" disabled={submitting} className="w-full mt-4 bg-indigo-600 text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)] hover:bg-indigo-700 transition-all cursor-pointer">
                                    {submitting ? 'Saving...' : 'Save Doctor'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}