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
    const RACK_W = 320;
    const RACK_H = 280;
    const RACK_D = 60;
    const SHELF_H = 50;
    const BOX_W = 18;
    const BOX_H = 24;
    const BOX_D = 20;

    const rackMeds = useMemo(() => {
        return medicines.filter(m => {
            const loc = parseLocation(m.rackLocation);
            return loc && loc.rack === rackId;
        });
    }, [medicines, rackId]);

    return (
        <div className="relative flex items-center justify-center" style={{ width: RACK_W, height: RACK_H, perspective: '1400px' }}>
            <div
                className="relative transition-transform duration-700 ease-out flex items-center justify-center"
                style={{
                    width: RACK_W, height: RACK_H,
                    transformStyle: 'preserve-3d',
                    transform: `rotateX(15deg) rotateY(-25deg) scale(${scale})`
                }}
            >
                <div className="absolute w-[360px] h-[80px] bg-black/10 blur-xl" style={{ bottom: '-40px', transform: 'rotateX(90deg) translateZ(-20px)' }}></div>

                <div className="absolute bg-slate-200 border border-slate-300 shadow-inner" style={{ width: RACK_W, height: RACK_H, transform: `translateZ(-${RACK_D/2}px)` }}>
                    <div className="absolute top-3 left-4 bg-slate-400 text-white font-black px-2 py-0.5 text-[10px] rounded shadow-sm tracking-widest">RACK {rackId}</div>
                    <div className="w-full h-full opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 20px, #94a3b8 20px, #94a3b8 22px)' }}></div>
                </div>

                <div className="absolute bg-slate-400 border border-slate-500" style={{ width: RACK_D, height: RACK_H, left: 0, transform: `translateX(-${RACK_D/2}px) rotateY(-90deg)` }}></div>
                <div className="absolute bg-slate-100 border border-slate-300" style={{ width: '8px', height: RACK_H, left: 0, transform: `translateZ(${RACK_D/2}px)` }}></div>

                <div className="absolute bg-slate-400 border border-slate-500" style={{ width: RACK_D, height: RACK_H, right: 0, transform: `translateX(${RACK_D/2}px) rotateY(90deg)` }}></div>
                <div className="absolute bg-slate-100 border border-slate-300" style={{ width: '8px', height: RACK_H, right: 0, transform: `translateZ(${RACK_D/2}px)` }}></div>

                {[1, 2, 3, 4, 5].map((shelfNum) => {
                    const bottomPos = (shelfNum - 1) * SHELF_H + 10;

                    return (
                        <div key={shelfNum} className="absolute w-full" style={{ height: SHELF_H, bottom: bottomPos, transformStyle: 'preserve-3d' }}>
                            <div className="absolute bg-slate-100 border-t border-slate-300" style={{ width: RACK_W, height: RACK_D, bottom: '-4px', transform: `rotateX(90deg) translateZ(${RACK_D/2 - 4}px)` }}></div>
                            <div className="absolute bg-sky-500 shadow-sm border-b border-sky-600" style={{ width: RACK_W, height: '8px', bottom: 0, transform: `translateZ(${RACK_D/2}px)` }}></div>
                            <div className="absolute bg-slate-300 border-b border-slate-400" style={{ width: RACK_W, height: RACK_D, bottom: '4px', transform: `rotateX(-90deg) translateZ(${RACK_D/2 + 4}px)` }}></div>
                            <div className="absolute bg-white border border-slate-300 text-slate-500 font-black text-[9px] px-1 rounded shadow-md" style={{ left: '-22px', bottom: '6px', transform: `translateZ(${RACK_D/2 + 10}px) rotateY(25deg)` }}>S{shelfNum}</div>

                            {/* BINS */}
                            <div className="absolute w-full flex justify-evenly px-4 items-end pb-[8px]" style={{ height: '35px', bottom: 0, transformStyle: 'preserve-3d', transform: `translateZ(0px)` }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((binNum) => {
                                    const isTargetBin = targetLoc?.rack === rackId && targetLoc?.shelf === shelfNum && targetLoc?.bin === binNum;
                                    const isOccupied = isTargetBin || rackMeds.some(m => {
                                        const loc = parseLocation(m.rackLocation);
                                        return loc && loc.shelf === shelfNum && loc.bin === binNum;
                                    });

                                    const colorFront = isTargetBin ? 'bg-sky-400' : 'bg-purple-400';
                                    const colorSide  = isTargetBin ? 'bg-sky-500' : 'bg-purple-500';
                                    const colorTop   = isTargetBin ? 'bg-sky-300' : 'bg-purple-300';
                                    const bColor     = isTargetBin ? 'border-sky-600' : 'border-purple-600';

                                    return (
                                        <div key={binNum} className="relative flex items-end justify-center" style={{ width: BOX_W, transformStyle: 'preserve-3d' }}>
                                            {isOccupied && (
                                                <div
                                                    className={`relative flex items-center justify-center transition-all duration-700 ${isTargetBin ? 'z-50 scale-125 -translate-y-3' : 'z-10'}`}
                                                    style={{ width: BOX_W, height: BOX_H, transformStyle: 'preserve-3d' }}
                                                >
                                                    <div className={`absolute w-full h-full ${colorFront} ${bColor} border shadow-sm flex items-center justify-center`} style={{ transform: `translateZ(${BOX_D/2}px)` }}>
                                                        {isTargetBin && <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>}
                                                    </div>
                                                    <div className={`absolute w-full h-full ${colorFront} ${bColor} border`} style={{ transform: `translateZ(-${BOX_D/2}px)` }}></div>
                                                    <div className={`absolute ${colorSide} ${bColor} border`} style={{ width: BOX_D, height: BOX_H, transform: `translateX(${BOX_W/2}px) rotateY(90deg)` }}></div>
                                                    <div className={`absolute ${colorSide} ${bColor} border`} style={{ width: BOX_D, height: BOX_H, transform: `translateX(-${BOX_W/2}px) rotateY(-90deg)` }}></div>
                                                    <div className={`absolute ${colorTop} ${bColor} border`} style={{ width: BOX_W, height: BOX_D, transform: `translateY(-${BOX_H/2}px) rotateX(90deg)` }}></div>

                                                    {isTargetBin && (
                                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[45px] flex flex-col items-center pointer-events-none animate-bounce" style={{ transform: 'rotateX(-15deg) rotateY(25deg)', transformStyle: 'preserve-3d' }}>
                                                            <div className="bg-sky-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg mb-0.5 uppercase tracking-widest border border-sky-600">Target</div>
                                                            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-sky-500"></div>
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

                    <div className="flex flex-col lg:flex-row justify-between items-center gap-4 shrink-0 z-50">
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <div className="w-10 h-10 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm flex items-center justify-center border border-white/80 shrink-0">
                                <Navigation size={20} strokeWidth={2.5} className="text-sky-600" />
                            </div>
                            <div>
                                <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">3D Pharmacy Floor</h1>
                                <p className="text-[13px] font-medium text-slate-500 mt-1.5">Locate medicines on realistic digital racks</p>
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
                            <Layers size={18}/> {targetLoc ? `Focused Target: Rack ${targetLoc.rack}` : 'Store Floor Layout'}
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

                                    <button onClick={() => setSelectedMed(null)} className="w-full py-3.5 mt-4 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[13px] font-bold rounded-2xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2">
                                        <X size={16}/> Clear & View All Racks
                                    </button>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                <div className="w-8 h-8 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin"></div>
                                <span className="text-sky-500 font-bold">Building 3D Racks...</span>
                            </div>
                        ) : (
                            <div className={`w-full h-full overflow-y-auto overflow-x-hidden hide-scrollbar pt-12 pb-24 transition-all duration-500 ${selectedMed ? 'pl-[380px]' : 'px-8'}`}>

                                {targetLoc ? (
                                    <div className="min-h-full flex flex-col items-center justify-center p-10 animate-in fade-in zoom-in duration-500">
                                        <Rack3D rackId={targetLoc.rack} targetLoc={targetLoc} medicines={medicines} scale={1.4} />

                                        <button onClick={() => setSelectedMed(null)} className="mt-24 flex items-center gap-2 px-6 py-3 bg-white/80 border border-slate-200 shadow-sm rounded-xl text-sm font-bold text-slate-600 hover:bg-white transition-colors">
                                            <ArrowLeft size={16}/> Back to Floor View
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex justify-center w-full">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-y-24 gap-x-16 max-w-[1400px] w-full justify-items-center">
                                            {distinctRacks.map(rackId => (
                                                <div key={rackId} className="flex flex-col items-center justify-center">
                                                    <Rack3D rackId={rackId} targetLoc={null} medicines={medicines} scale={0.9} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="absolute bottom-6 right-8 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-200 z-40 flex gap-6 pointer-events-none">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-sky-400 border border-sky-600"></div>
                                <span className="text-[11px] font-bold text-slate-600">Target Medicine</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-purple-400 border border-purple-600"></div>
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
        </AdminLayout>
    );
}