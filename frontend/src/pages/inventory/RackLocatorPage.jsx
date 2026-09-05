import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Search, MapPin, Package, Box, Navigation, Layers, X, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

import rackImage from '../../assets/pharmacy_rack.png';

const parseLocation = (loc) => {
    if (!loc) return null;
    const match = loc.match(/^([A-Z]{3})-R(\d{2})-S(\d{2})-B(\d{2})$/i);
    if (!match) return null;
    return {
        category: match[1],
        rack: parseInt(match[2], 10),
        shelf: parseInt(match[3], 10),
        bin: parseInt(match[4], 10)
    };
};

const RealisticRack = ({ rackId, medicines, targetLoc }) => {
    const rackMeds = useMemo(() => {
        return medicines.filter(m => {
            const loc = parseLocation(m.rackLocation);
            return loc && loc.rack === rackId;
        });
    }, [medicines, rackId]);

    return (
        <div className="flex flex-col items-center w-full mx-auto">

            <div className="bg-white/90 backdrop-blur-md px-6 py-2.5 rounded-full shadow-sm border border-slate-200 text-slate-700 font-black text-[14px] flex items-center gap-2 z-20 mb-6 tracking-widest uppercase">
                <Layers className="w-4 h-4 text-sky-500" /> RACK {String(rackId).padStart(2, '0')}
            </div>

            <div className="relative flex items-center justify-center w-full max-w-[650px] aspect-[1.45/1] drop-shadow-2xl">

                <img
                    src={rackImage}
                    alt="Pharmacy Rack"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />

                <div className="absolute z-10" style={{
                    top: '15%',
                    bottom: '21%',
                    left: '12%',
                    right: '12%',
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    justifyContent: 'space-between',
                }}>
                    {[1, 2, 3, 4, 5].map((shelfNum) => (
                        <div key={shelfNum} className="flex justify-between items-end w-full h-[18%]">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((binNum) => {

                                const isTargetBin = targetLoc?.rack === rackId && targetLoc?.shelf === shelfNum && targetLoc?.bin === binNum;
                                const isOccupied = isTargetBin || rackMeds.some(m => {
                                    const loc = parseLocation(m.rackLocation);
                                    return loc && loc.shelf === shelfNum && loc.bin === binNum;
                                });

                                return (
                                    <div key={binNum} className="relative flex-1 flex justify-center items-end h-full px-[2px] pb-[1px]">
                                        {isOccupied && (
                                            <div
                                                className={`relative flex items-end justify-center transition-all duration-700 ease-out cursor-pointer w-full h-[65%] max-w-[24px]
                                                    ${isTargetBin ? 'z-50 scale-[1.3] -translate-y-5' : 'z-10 hover:-translate-y-1.5 hover:scale-110'}
                                                `}
                                            >
                                                {isTargetBin && (
                                                    <div className="absolute w-[45px] h-[45px] bg-sky-400/50 blur-xl rounded-full z-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                                                )}

                                                <div
                                                    className={`relative z-10 w-full h-full rounded-[3px] shadow-[2px_3px_5px_rgba(0,0,0,0.3)] border border-white/50 overflow-hidden flex flex-col justify-between 
                                                    ${isTargetBin ? 'bg-gradient-to-b from-sky-300 to-sky-500 shadow-[0_10px_20px_rgba(34,211,238,0.6)]' : 'bg-gradient-to-b from-purple-400 to-purple-600 opacity-95'}`}
                                                >
                                                    <div className="w-full h-[20%] bg-white/30 border-b border-white/20"></div>

                                                    {isTargetBin && <div className="absolute top-[35%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white] animate-pulse"></div>}

                                                    <div className="w-[60%] h-[30%] bg-white/20 mx-auto rounded-[1px] mb-1.5"></div>
                                                </div>

                                                {isTargetBin && (
                                                    <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-50 pointer-events-none">
                                                        <div className="bg-sky-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-xl uppercase tracking-widest border border-sky-300 whitespace-nowrap">
                                                            Target
                                                        </div>
                                                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-sky-500"></div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default function RackLocatorPage() {
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMed, setSelectedMed] = useState(null);
    const [currentRackId, setCurrentRackId] = useState(1);

    useEffect(() => {
        const fetchInventory = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                const res = await axios.get('http://localhost:5000/api/medicines', config);
                const data = Array.isArray(res.data) ? res.data : (res.data.content || []);

                const validMeds = data.filter(m => m.rackLocation && m.rackLocation.match(/^([A-Z]{3})-R(\d{2})-S(\d{2})-B(\d{2})$/i));
                setMedicines(validMeds);
            } catch (err) {
                console.error("Fetch Error:", err);
                toast.error('Failed to load inventory for Rack Mapping');
            } finally {
                setLoading(false);
            }
        };
        fetchInventory();
    }, []);

    const targetLoc = parseLocation(selectedMed?.rackLocation);

    const distinctRacks = useMemo(() => {
        const racks = new Set(medicines.map(m => parseLocation(m.rackLocation)?.rack).filter(Boolean));
        const sortedRacks = [...racks].sort((a, b) => a - b);

        if (sortedRacks.length < 6) {
            let i = 1;
            while (sortedRacks.length < 6) {
                if (!sortedRacks.includes(i)) sortedRacks.push(i);
                i++;
            }
        }
        return sortedRacks.sort((a, b) => a - b);
    }, [medicines]);

    const handleSearchSelect = (med) => {
        setSelectedMed(med);
        setSearchQuery('');
        const loc = parseLocation(med.rackLocation);
        if (loc && loc.rack) {
            setCurrentRackId(loc.rack);
        }
    };

    const handlePrevRack = () => {
        setCurrentRackId(prev => Math.max(Math.min(...distinctRacks), prev - 1));
    };

    const handleNextRack = () => {
        setCurrentRackId(prev => Math.min(Math.max(...distinctRacks), prev + 1));
    };

    const filteredSuggestions = searchQuery.length > 1
        ? medicines.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || (m.barcode && m.barcode.includes(searchQuery)))
        : [];

    return (
        <AdminLayout>
            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4 flex flex-col">

                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}></div>
                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-sky-200/20 to-slate-300/20 blur-[120px] pointer-events-none z-[-2]"></div>

                <div className="relative z-10 w-full flex-1 flex flex-col gap-6">

                    <div className="flex flex-col lg:flex-row justify-between items-center gap-4 shrink-0 z-50">
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <div className="w-10 h-10 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm flex items-center justify-center border border-white/80 shrink-0">
                                <Navigation size={20} strokeWidth={2.5} className="text-sky-600" />
                            </div>
                            <div>
                                <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">Pharmacy Store Floor</h1>
                                <p className="text-[13px] font-medium text-slate-500 mt-1.5">Locate medicines directly on realistic digital racks</p>
                            </div>
                        </div>

                        <div className="w-full lg:w-[400px] bg-white/90 backdrop-blur-xl p-2.5 rounded-[20px] border border-slate-200 shadow-md relative pointer-events-auto transition-all">
                            <div className="flex items-center gap-3 px-2">
                                <Search size={18} className="text-slate-400 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Search medicine to locate..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full outline-none text-slate-700 text-sm font-bold bg-transparent placeholder-slate-400"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="shrink-0 p-1 hover:bg-slate-100 rounded-full transition-colors">
                                        <X size={16} className="text-slate-400 hover:text-slate-600 cursor-pointer"/>
                                    </button>
                                )}
                            </div>

                            {filteredSuggestions.length > 0 && (
                                <div className="absolute top-[115%] left-0 w-full bg-white/95 backdrop-blur-3xl border border-slate-200 shadow-2xl rounded-2xl max-h-[300px] overflow-y-auto z-[100] py-2">
                                    {filteredSuggestions.map(m => (
                                        <div key={m.id} onClick={() => handleSearchSelect(m)} className="px-5 py-3 hover:bg-sky-50/80 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center transition-colors">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{m.name} <span className="text-xs text-slate-500 font-medium">({m.dosage})</span></p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="hidden lg:flex bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-full shadow-sm border border-slate-200 font-bold text-sky-600 text-sm items-center gap-2">
                            <Layers size={18}/> Displaying: Rack {currentRackId}
                        </div>
                    </div>

                    <div className="flex-1 w-full bg-white/40 backdrop-blur-3xl rounded-[32px] border border-white/80 shadow-[inset_0_0_80px_rgba(203,213,225,0.4)] overflow-hidden relative flex flex-col min-h-[600px]">

                        {selectedMed && (
                            <div className="absolute top-6 left-6 w-[350px] flex flex-col gap-4 z-40 pointer-events-none">
                                <div className="bg-white/90 backdrop-blur-2xl p-6 rounded-[32px] border border-slate-200 shadow-2xl flex flex-col pointer-events-auto animate-in fade-in slide-in-from-left-8 duration-300">
                                    <div className="w-14 h-14 bg-sky-100 border border-sky-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                        <Package className="w-7 h-7 text-sky-600" />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{selectedMed.name}</h2>
                                    <p className="text-sm font-bold text-slate-500 mb-6">{selectedMed.dosage}</p>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center p-4 bg-white/60 rounded-2xl border border-slate-100 shadow-sm">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Layers size={14}/> Rack Code</span>
                                            <span className="text-sm font-black text-slate-800">{targetLoc.category}-R{String(targetLoc.rack).padStart(2,'0')}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-[#0ea5e9] text-white rounded-2xl shadow-[0_8px_20px_-6px_rgba(14,165,233,0.5)] border border-[#38bdf8] relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-10 translate-x-10 pointer-events-none"></div>
                                            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 z-10"><MapPin size={14}/> Exact Position</span>
                                            <span className="text-[15px] font-black z-10 text-right">
                                                Shelf {targetLoc.shelf} <br/> Bin {targetLoc.bin}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-white/60 rounded-2xl border border-slate-100 shadow-sm mt-2">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Box size={14}/> Current Stock</span>
                                            <span className="text-sm font-black text-slate-800">{selectedMed.quantity} Units</span>
                                        </div>
                                    </div>

                                    <button onClick={() => setSelectedMed(null)} className="w-full py-3.5 mt-4 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[13px] font-bold rounded-2xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                                        <X size={16}/> Clear Search
                                    </button>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                <div className="w-8 h-8 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin"></div>
                                <span className="text-sky-500 font-bold">Building Digital Racks...</span>
                            </div>
                        ) : (
                            <div className={`w-full h-full flex flex-col items-center justify-center pt-10 pb-20 transition-all duration-500 ${selectedMed ? 'pl-[380px]' : 'px-8'}`}>

                                <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 w-full">

                                    <RealisticRack
                                        rackId={currentRackId}
                                        targetLoc={selectedMed ? targetLoc : null}
                                        medicines={medicines}
                                    />

                                    <div className="mt-12 flex items-center gap-8 bg-white/80 backdrop-blur-xl px-8 py-4 rounded-3xl shadow-sm border border-white/80 relative z-50">
                                        <button
                                            onClick={handlePrevRack}
                                            disabled={currentRackId <= Math.min(...distinctRacks)}
                                            className="p-3 bg-white border border-slate-200 text-slate-500 rounded-xl hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-500 transition-all cursor-pointer shadow-sm"
                                        >
                                            <ChevronLeft size={24} strokeWidth={2.5}/>
                                        </button>

                                        <div className="flex flex-col items-center min-w-[140px]">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current View</span>
                                            <span className="text-xl font-black text-slate-800">Rack {String(currentRackId).padStart(2, '0')}</span>
                                        </div>

                                        <button
                                            onClick={handleNextRack}
                                            disabled={currentRackId >= Math.max(...distinctRacks)}
                                            className="p-3 bg-white border border-slate-200 text-slate-500 rounded-xl hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-500 transition-all cursor-pointer shadow-sm"
                                        >
                                            <ChevronRight size={24} strokeWidth={2.5}/>
                                        </button>
                                    </div>

                                </div>
                            </div>
                        )}

                        <div className="absolute bottom-6 right-8 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-200 z-40 flex gap-6 pointer-events-none">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-cyan-400 border border-cyan-500 shadow-sm"></div>
                                <span className="text-[11px] font-bold text-slate-600">Target Medicine</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-purple-500 border border-purple-600 shadow-sm"></div>
                                <span className="text-[11px] font-bold text-slate-600">Occupied Bin</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded border border-slate-300 bg-slate-100 shadow-sm"></div>
                                <span className="text-[11px] font-bold text-slate-600">Empty Space</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}