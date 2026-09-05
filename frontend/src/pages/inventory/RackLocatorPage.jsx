import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Search, MapPin, Package, Box, Navigation, Layers, X, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

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

const Rack3D = ({ rackId, medicines, targetLoc, scale = 1 }) => {
    const RACK_W = 280;
    const RACK_H = 240;
    const RACK_D = 60;
    const SHELF_H = 45;
    const BOX_W = 18;
    const BOX_H = 22;
    const BOX_D = 18;

    const rackMeds = useMemo(() => {
        return medicines.filter(m => {
            const loc = parseLocation(m.rackLocation);
            return loc && loc.rack === rackId;
        });
    }, [medicines, rackId]);

    return (
        <div className="relative flex items-center justify-center" style={{ width: RACK_W, height: RACK_H, perspective: '1200px' }}>
            <div
                className="relative transition-transform duration-700 ease-out"
                style={{
                    width: RACK_W, height: RACK_H,
                    transformStyle: 'preserve-3d',
                    transform: `rotateX(15deg) rotateY(-25deg) scale(${scale})`
                }}
            >
                <div className="absolute -bottom-6 -left-4 -right-4 h-12 bg-slate-300/40 blur-xl" style={{ transform: 'rotateX(90deg)' }}></div>

                <div className="absolute inset-0 bg-white border border-slate-300" style={{ transform: `translateZ(-${RACK_D/2}px)`, backgroundImage: 'repeating-linear-gradient(transparent, transparent 18px, #f8fafc 18px, #f8fafc 20px)' }}>
                    <div className="absolute top-2 left-3 bg-slate-100 text-slate-500 font-bold px-2 py-0.5 text-[9px] rounded border border-slate-200">RACK {rackId}</div>
                </div>

                <div className="absolute bg-[#e2e8f0] border border-slate-300" style={{ width: RACK_D, height: RACK_H, left: 0, transformOrigin: 'left', transform: `rotateY(90deg)` }}></div>

                <div className="absolute bg-[#e2e8f0] border border-slate-300" style={{ width: RACK_D, height: RACK_H, right: 0, transformOrigin: 'right', transform: `rotateY(-90deg)` }}></div>

                {[1, 2, 3, 4, 5].map((shelfNum) => {
                    const bottomPos = (shelfNum - 1) * SHELF_H;

                    return (
                        <div key={shelfNum} className="absolute w-full" style={{ height: SHELF_H, bottom: bottomPos, transformStyle: 'preserve-3d' }}>
                            <div className="absolute w-full bg-[#f1f5f9] border border-slate-300" style={{ height: RACK_D, bottom: 0, transformOrigin: 'bottom', transform: `rotateX(-90deg)` }}></div>

                            <div className="absolute w-full bg-[#0ea5e9] shadow-sm border-b border-[#0284c7]" style={{ height: '6px', bottom: 0, transform: `translateZ(${RACK_D/2}px)` }}></div>

                            <div className="absolute bg-white border border-slate-200 text-slate-400 font-black text-[8px] px-1 rounded shadow-sm" style={{ left: '-20px', bottom: '4px', transform: `translateZ(${RACK_D/2 + 5}px) rotateY(15deg)` }}>S{shelfNum}</div>

                            <div className="absolute w-full flex justify-evenly px-2 items-end pb-[2px]" style={{ height: BOX_H, bottom: 0, transformStyle: 'preserve-3d', transform: `translateZ(0px)` }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((binNum) => {
                                    const isTargetBin = targetLoc?.rack === rackId && targetLoc?.shelf === shelfNum && targetLoc?.bin === binNum;
                                    const isOccupied = isTargetBin || rackMeds.some(m => {
                                        const loc = parseLocation(m.rackLocation);
                                        return loc && loc.shelf === shelfNum && loc.bin === binNum;
                                    });

                                    const bgColor = isTargetBin ? 'bg-[#0ea5e9]' : 'bg-[#cfa4f5]';
                                    const borderColor = isTargetBin ? 'border-[#0284c7]' : 'border-[#a855f7]';

                                    return (
                                        <div key={binNum} className="relative flex items-end justify-center" style={{ width: BOX_W, transformStyle: 'preserve-3d' }}>
                                            {isOccupied && (
                                                <div
                                                    className={`relative transition-all duration-700 ${isTargetBin ? 'z-50 scale-[1.3] -translate-y-2' : 'z-10'}`}
                                                    style={{ width: BOX_W, height: BOX_H, transformStyle: 'preserve-3d' }}
                                                >
                                                    <div className={`absolute inset-0 ${bgColor} ${borderColor} border shadow-sm`} style={{ transform: `translateZ(${BOX_D/2}px)` }}></div>
                                                    <div className={`absolute inset-0 ${bgColor} ${borderColor} border`} style={{ transform: `translateZ(-${BOX_D/2}px)` }}></div>
                                                    <div className={`absolute ${bgColor} ${borderColor} border`} style={{ width: BOX_D, height: BOX_H, right: 0, transformOrigin: 'right', transform: 'rotateY(-90deg)' }}></div>
                                                    <div className={`absolute ${bgColor} ${borderColor} border`} style={{ width: BOX_D, height: BOX_H, left: 0, transformOrigin: 'left', transform: 'rotateY(90deg)' }}></div>
                                                    <div className={`absolute ${bgColor} ${borderColor} border`} style={{ width: BOX_W, height: BOX_D, top: 0, transformOrigin: 'top', transform: 'rotateX(90deg)' }}></div>

                                                    {isTargetBin && (
                                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[35px] flex flex-col items-center pointer-events-none animate-bounce" style={{ transform: 'rotateX(-15deg) rotateY(25deg)', transformStyle: 'preserve-3d' }}>
                                                            <div className="bg-[#0ea5e9] text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg mb-0.5 uppercase tracking-wider border border-[#0284c7]">Target</div>
                                                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-[#0ea5e9]"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function RackLocatorPage() {
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMed, setSelectedMed] = useState(null);

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
                toast.error('Failed to load inventory for 3D Rack Mapping');
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

                    <div className="flex justify-between items-center mb-2 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/40 backdrop-blur-md shadow-sm flex items-center justify-center border border-white/60">
                                <Navigation size={20} strokeWidth={2.5} className="text-sky-600" />
                            </div>
                            <div>
                                <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">3D Pharmacy Floor</h1>
                                <p className="text-[13px] font-medium text-slate-500 mt-1.5">Locate medicines on realistic digital racks</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-[600px] overflow-hidden">

                        <div className="w-full xl:w-[350px] flex flex-col gap-4 shrink-0 z-50">
                            <div className="bg-white/40 backdrop-blur-xl p-4 rounded-[24px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] relative">
                                <div className="flex items-center gap-3">
                                    <Search size={18} className="text-slate-400 ml-2 shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Search medicine..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full outline-none text-slate-700 text-sm font-bold bg-transparent placeholder-slate-400"
                                    />
                                    {searchQuery && <button onClick={() => setSearchQuery('')}><X size={16} className="text-slate-400 hover:text-slate-600 cursor-pointer"/></button>}
                                </div>

                                {filteredSuggestions.length > 0 && (
                                    <div className="absolute top-[110%] left-0 w-full bg-white/95 backdrop-blur-3xl border border-slate-200 shadow-2xl rounded-2xl max-h-[300px] overflow-y-auto z-[60] py-2">
                                        {filteredSuggestions.map(m => (
                                            <div key={m.id} onClick={() => handleSearchSelect(m)} className="px-5 py-3 hover:bg-sky-50/80 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center transition-colors">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{m.name} <span className="text-xs text-slate-500 font-medium">({m.dosage})</span></p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">{m.genericName || 'No Generic'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedMed ? (
                                <div className="bg-white/50 backdrop-blur-2xl p-6 rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] flex-1 flex flex-col">
                                    <div className="w-14 h-14 bg-sky-100 border border-sky-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                        <Package className="w-7 h-7 text-sky-600" />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{selectedMed.name}</h2>
                                    <p className="text-sm font-bold text-slate-500 mb-6">{selectedMed.dosage}</p>

                                    <div className="space-y-3 flex-1">
                                        <div className="flex justify-between items-center p-4 bg-white/60 rounded-2xl border border-white shadow-sm">
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
                                        <div className="flex justify-between items-center p-4 bg-white/60 rounded-2xl border border-white shadow-sm mt-2">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Box size={14}/> Current Stock</span>
                                            <span className="text-sm font-black text-slate-800">{selectedMed.quantity} Units</span>
                                        </div>
                                    </div>

                                    <button onClick={() => setSelectedMed(null)} className="w-full py-3.5 mt-4 bg-slate-200/50 hover:bg-slate-200 text-slate-600 text-[13px] font-bold rounded-2xl transition-colors">
                                        Clear Selection & View All
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-white/30 backdrop-blur-2xl p-8 rounded-[32px] border border-white/50 border-dashed shadow-sm flex-1 flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 bg-slate-100/50 rounded-full flex items-center justify-center mb-4">
                                        <Search className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-700 mb-1">Search to Locate</h3>
                                    <p className="text-[13px] font-medium text-slate-500 max-w-[250px]">Search for a medicine to see its exact physical location and auto-zoom to the rack.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 bg-white/40 backdrop-blur-3xl rounded-[32px] border border-white/80 shadow-[inset_0_0_80px_rgba(203,213,225,0.4)] overflow-hidden relative flex flex-col">

                            <div className="absolute top-6 left-8 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-sm border border-slate-200 font-bold text-sky-600 text-sm flex items-center gap-2 z-50">
                                <Layers size={16}/> {targetLoc ? `Focused Target: Rack ${targetLoc.rack}` : 'Store Floor Layout'}
                            </div>

                            {loading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                    <div className="w-8 h-8 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin"></div>
                                    <span className="text-sky-500 font-bold">Building 3D Racks...</span>
                                </div>
                            ) : (
                                <div className="w-full h-full overflow-y-auto overflow-x-hidden hide-scrollbar">

                                    {targetLoc ? (
                                        <div className="min-h-full flex flex-col items-center justify-center p-10 animate-in fade-in zoom-in duration-500">
                                            <Rack3D rackId={targetLoc.rack} targetLoc={targetLoc} medicines={medicines} scale={1.4} />

                                            <button onClick={() => setSelectedMed(null)} className="mt-16 flex items-center gap-2 px-6 py-3 bg-white/80 border border-slate-200 shadow-sm rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                                                <ArrowLeft size={16}/> Back to Floor View
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-24 gap-x-12 p-16 pt-32 pb-32">
                                            {distinctRacks.map(rackId => (
                                                <div key={rackId} className="flex flex-col items-center justify-center">
                                                    <Rack3D rackId={rackId} targetLoc={null} medicines={medicines} scale={1} />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                </div>
                            )}

                            <div className="absolute bottom-6 right-8 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-200 z-50 flex gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-[#0ea5e9] border border-[#0284c7]"></div>
                                    <span className="text-[11px] font-bold text-slate-600">Target Medicine</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-[#cfa4f5] border border-[#a855f7]"></div>
                                    <span className="text-[11px] font-bold text-slate-600">Occupied Bin</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded border border-slate-300 bg-slate-100"></div>
                                    <span className="text-[11px] font-bold text-slate-600">Empty Space</span>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </AdminLayout>
    );
}