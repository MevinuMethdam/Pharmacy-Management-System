import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Search, MapPin, Package, Box, Navigation, Layers, X, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

import rackImg1 from '../../assets/pharmacy_rack.png';
import rackImg2 from '../../assets/pharmacy_rack02.png';
import rackImg3 from '../../assets/pharmacy_rack03.png';
import rackImg4 from '../../assets/pharmacy_rack04.png';
import rackImg5 from '../../assets/pharmacy_rack05.png';

import pic1 from '../../assets/Pic1.png';
import pic2 from '../../assets/Pic2.png';
import pic3 from '../../assets/Pic3.jpg';
import pic4 from '../../assets/Pic4.png';
import pic5 from '../../assets/Pic5.png';

const RACK_IMAGES = [rackImg1, rackImg2, rackImg3, rackImg4, rackImg5];

const getCategoryImage = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('cap')) return pic2;
    if (cat.includes('syr') || cat.includes('liq')) return pic3;
    if (cat.includes('inj') || cat.includes('vial') || cat.includes('amp')) return pic4;
    if (cat.includes('cre') || cat.includes('oint') || cat.includes('gel') || cat.includes('lot')) return pic5;
    return pic1;
};

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

const RealisticRack = ({ rackId, medicines, targetLoc, imageIndex, isActive }) => {

    const rackMeds = useMemo(() => {
        return medicines.filter(m => {
            const loc = parseLocation(m.rackLocation);
            return loc && loc.rack === rackId;
        });
    }, [medicines, rackId]);

    const bgImage = RACK_IMAGES[imageIndex % RACK_IMAGES.length];

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center font-sans">

            <div className={`absolute -top-14 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-6 py-2.5 rounded-full shadow-lg border border-slate-200 font-bold text-[15px] flex items-center gap-2 z-30 tracking-widest uppercase transition-all duration-700 ${isActive ? 'text-slate-800 scale-100' : 'text-slate-400 scale-90 opacity-0'}`}>
                <Layers className={`w-5 h-5 ${isActive ? 'text-sky-500' : 'text-slate-300'}`} /> RACK {String(rackId).padStart(2, '0')}
            </div>

            <img
                src={bgImage}
                alt={`Rack ${rackId}`}
                className="w-full h-auto object-contain pointer-events-none drop-shadow-2xl"
                style={{ backfaceVisibility: 'hidden' }}
            />

            <div className="absolute z-20" style={{
                top: '22%',
                bottom: '12%',
                left: '11.5%',
                right: '11.5%',
                display: 'flex',
                flexDirection: 'column-reverse',
                justifyContent: 'space-between',
                transform: 'translateZ(2px)'
            }}>
                {[1, 2, 3, 4, 5].map((shelfNum) => (
                    <div key={shelfNum} className="flex justify-between items-end w-full h-[18%] mb-[0.2%]">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((binNum) => {

                            const isTargetBin = targetLoc?.rack === rackId && targetLoc?.shelf === shelfNum && targetLoc?.bin === binNum;
                            const isOccupied = isTargetBin || rackMeds.some(m => {
                                const loc = parseLocation(m.rackLocation);
                                return loc && loc.shelf === shelfNum && loc.bin === binNum;
                            });

                            return (
                                <div key={binNum} className="relative flex-1 flex justify-center items-end h-full px-[2px] pb-[3%] group">
                                    {isOccupied && (
                                        <div className={`relative flex flex-col items-center justify-end w-full h-[80%] transition-all duration-500 cursor-pointer ${isTargetBin && isActive ? 'z-50' : 'z-10 hover:-translate-y-1 opacity-85 hover:opacity-100'}`}>

                                            {isTargetBin && isActive && (
                                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-50 pointer-events-none font-sans">
                                                    <div className="bg-sky-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded shadow-xl uppercase tracking-widest border border-sky-300 whitespace-nowrap">
                                                        Target
                                                    </div>
                                                    <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-sky-500"></div>
                                                </div>
                                            )}

                                            {isTargetBin && isActive && (
                                                <div className="absolute bottom-[5%] w-[80%] h-[120%] bg-gradient-to-t from-sky-400/60 via-sky-400/10 to-transparent blur-[6px] animate-pulse pointer-events-none rounded-t-full"></div>
                                            )}

                                            <div className={`w-[95%] h-[30%] rounded-[50%] blur-[4px] absolute bottom-0 
                                                ${isTargetBin && isActive
                                                ? 'bg-sky-400/80 shadow-[0_0_25px_8px_rgba(56,189,248,0.8)] animate-pulse'
                                                : 'bg-purple-500/70 shadow-[0_0_15px_4px_rgba(168,85,247,0.6)] group-hover:bg-purple-400/90 group-hover:shadow-[0_0_20px_6px_rgba(168,85,247,0.8)] transition-all'
                                            }`}>
                                            </div>

                                            <div className={`w-[50%] h-[15%] rounded-[50%] absolute bottom-[5%] blur-[1px]
                                                ${isTargetBin && isActive
                                                ? 'bg-white shadow-[0_0_15px_3px_rgba(255,255,255,1)] animate-pulse'
                                                : 'bg-purple-200 shadow-[0_0_10px_2px_rgba(216,180,254,1)] group-hover:bg-white'
                                            }`}>
                                            </div>

                                            <div className={`w-[60%] h-[2px] absolute bottom-[2%] rounded-full blur-[0.5px]
                                                ${isTargetBin && isActive
                                                ? 'bg-sky-200 shadow-[0_0_8px_2px_rgba(56,189,248,1)]'
                                                : 'bg-purple-300 shadow-[0_0_5px_1px_rgba(168,85,247,0.8)]'
                                            }`}>
                                            </div>

                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};


export default function RackLocatorPage() {
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMed, setSelectedMed] = useState(null);

    const [currentIndex, setCurrentIndex] = useState(0);

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

    const N = distinctRacks.length;

    const getRelativeOffset = (index) => {
        const actualCurrent = ((currentIndex % N) + N) % N;
        let diff = index - actualCurrent;
        if (diff > N / 2) diff -= N;
        if (diff < -N / 2) diff += N;
        return diff;
    };

    const handleSearchSelect = (med) => {
        setSelectedMed(med);
        setSearchQuery('');
        const loc = parseLocation(med.rackLocation);
        if (loc && loc.rack) {
            const targetIndex = distinctRacks.indexOf(loc.rack);
            if (targetIndex !== -1) {
                const actualIndex = ((currentIndex % N) + N) % N;
                let diff = targetIndex - actualIndex;
                if (diff > N / 2) diff -= N;
                if (diff < -N / 2) diff += N;

                setCurrentIndex(prev => prev + diff);
            }
        }
    };

    const handlePrevRack = () => setCurrentIndex(prev => prev - 1);
    const handleNextRack = () => setCurrentIndex(prev => prev + 1);

    const filteredSuggestions = searchQuery.length > 1
        ? medicines.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || (m.barcode && m.barcode.includes(searchQuery)))
        : [];

    const activeRackId = distinctRacks[((currentIndex % N) + N) % N];

    return (
        <AdminLayout>
            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4 flex flex-col">

                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}></div>
                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-sky-200/20 to-slate-300/20 blur-[120px] pointer-events-none z-[-2]"></div>

                <div className="relative z-10 w-full flex-1 flex flex-col gap-6">

                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm flex items-center justify-center border border-white/80 shrink-0">
                                <Navigation size={20} strokeWidth={2.5} className="text-sky-600" />
                            </div>
                            <div>
                                <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">Pharmacy Store Floor</h1>
                                <p className="text-[13px] font-medium text-slate-500 mt-1.5">Locate medicines directly on realistic digital racks</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative w-full z-50">
                        <div className="bg-white/40 backdrop-blur-xl p-4 rounded-[24px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] flex items-center gap-3 transition-all">
                            <Search size={18} className="text-slate-400 ml-2 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search medicine to locate..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full outline-none text-slate-700 text-sm font-bold bg-transparent placeholder-slate-400"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="shrink-0 p-1.5 mr-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                                    <X size={16} className="text-slate-400 hover:text-slate-600"/>
                                </button>
                            )}
                        </div>

                        {filteredSuggestions.length > 0 && (
                            <div className="absolute top-[115%] left-0 w-full bg-white/95 backdrop-blur-3xl border border-slate-200 shadow-2xl rounded-[24px] max-h-[300px] overflow-y-auto z-[100] py-3 font-sans">
                                {filteredSuggestions.map(m => (
                                    <div key={m.id} onClick={() => handleSearchSelect(m)} className="px-6 py-3.5 hover:bg-sky-50/80 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center transition-colors">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{m.name} <span className="text-[11px] text-slate-500 font-medium">({m.dosage})</span></p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 w-full bg-white/40 backdrop-blur-3xl rounded-[32px] border border-white/80 shadow-[inset_0_0_80px_rgba(203,213,225,0.4)] overflow-hidden relative flex flex-col min-h-[600px]">

                        {selectedMed && (
                            <div className="absolute top-6 left-6 w-[350px] flex flex-col gap-4 z-[60] pointer-events-none font-sans">

                                <div className="bg-white/95 backdrop-blur-2xl p-6 rounded-[32px] border border-slate-200 shadow-2xl flex flex-col pointer-events-auto animate-in fade-in slide-in-from-left-8 duration-300 relative overflow-hidden">

                                    <div className="absolute top-0 left-0 w-full h-[180px] z-0 pointer-events-none overflow-hidden rounded-t-[32px]">
                                        <img
                                            src={getCategoryImage(selectedMed.category)}
                                            alt="Category Background"
                                            className="w-full h-full object-cover object-right opacity-80 blur-[1px] saturate-150"
                                        />

                                        <div className="absolute top-0 left-0 w-[80%] h-full bg-gradient-to-r from-white via-white/90 to-transparent backdrop-blur-[3px]"></div>

                                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent"></div>
                                    </div>

                                    <div className="relative z-10 flex flex-col mb-6 mt-6">
                                        <h2 className="text-[24px] font-bold text-slate-800 tracking-tight leading-tight">{selectedMed.name}</h2>
                                        <p className="text-[14px] font-bold text-slate-600 mt-1">{selectedMed.dosage}</p>
                                    </div>

                                    <div className="relative z-10 space-y-3">
                                        <div className="flex justify-between items-center p-4 bg-white/60 rounded-2xl border border-slate-100 shadow-sm">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Layers size={14}/> Rack Code</span>
                                            <span className="text-[14px] font-bold text-slate-800">{targetLoc.category}-R{String(targetLoc.rack).padStart(2,'0')}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-[#0ea5e9] text-white rounded-2xl shadow-[0_8px_20px_-6px_rgba(14,165,233,0.5)] border border-[#38bdf8] relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-10 translate-x-10 pointer-events-none"></div>
                                            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 z-10"><MapPin size={14}/> Exact Position</span>
                                            <span className="text-[15px] font-bold z-10 text-right">
                                                Shelf {targetLoc.shelf} <br/> Bin {targetLoc.bin}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-white/60 rounded-2xl border border-slate-100 shadow-sm mt-2">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Box size={14}/> Current Stock</span>
                                            <span className="text-[14px] font-bold text-slate-800">{selectedMed.quantity} Units</span>
                                        </div>
                                    </div>

                                    <button onClick={() => setSelectedMed(null)} className="w-full py-3.5 mt-4 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[13px] font-bold rounded-2xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer relative z-10">
                                        <X size={16}/> Clear Search
                                    </button>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-50 font-sans">
                                <div className="w-8 h-8 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin"></div>
                                <span className="text-sky-500 font-bold text-[13px]">Building 3D Racks...</span>
                            </div>
                        ) : (
                            <div className={`w-full h-full flex flex-col items-center justify-center relative transition-all duration-500 pb-20 ${selectedMed ? 'pl-[350px]' : ''}`}>

                                <div className="absolute top-[82%] left-1/2 -translate-x-1/2 w-[70%] max-w-[800px] h-[40px] bg-slate-400/50 blur-[24px] rounded-[100%] pointer-events-none z-0 transition-all duration-500"></div>

                                <div className="relative flex items-center justify-center w-full h-[500px]" style={{ perspective: '1200px' }}>

                                    {distinctRacks.map((rackId, index) => {
                                        const offset = getRelativeOffset(index);
                                        const isCenter = offset === 0;
                                        const isLeft = offset === -1;
                                        const isRight = offset === 1;

                                        let transform = 'translate(-50%, -50%) translateZ(-800px) scale(0.4)';
                                        let opacity = 0;
                                        let zIndex = 0;

                                        if (isCenter) {
                                            transform = 'translate(-50%, -50%) translateX(0px) translateZ(0px) rotateY(0deg) scale(1)';
                                            opacity = 1;
                                            zIndex = 30;
                                        } else if (isLeft) {
                                            transform = 'translate(-50%, -50%) translateX(-65%) translateZ(-250px) rotateY(35deg) scale(0.8)';
                                            opacity = 0.55;
                                            zIndex = 20;
                                        } else if (isRight) {
                                            transform = 'translate(-50%, -50%) translateX(65%) translateZ(-250px) rotateY(-35deg) scale(0.8)';
                                            opacity = 0.55;
                                            zIndex = 20;
                                        }

                                        return (
                                            <div
                                                key={rackId}
                                                className="absolute top-1/2 left-1/2 w-full max-w-[460px] transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
                                                style={{
                                                    transform,
                                                    opacity,
                                                    zIndex,
                                                    transformStyle: 'preserve-3d',
                                                    pointerEvents: isCenter ? 'auto' : 'none'
                                                }}
                                            >
                                                <RealisticRack
                                                    rackId={rackId}
                                                    targetLoc={selectedMed ? targetLoc : null}
                                                    medicines={medicines}
                                                    imageIndex={index}
                                                    isActive={isCenter}
                                                />
                                            </div>
                                        );
                                    })}

                                    <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3.5 z-[60] font-sans w-max">

                                        <div className="flex items-center gap-8 bg-white/95 backdrop-blur-xl px-8 py-3.5 rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-white">
                                            <button
                                                onClick={handlePrevRack}
                                                className="p-3 bg-white border border-slate-200 text-slate-500 rounded-xl hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                                            >
                                                <ChevronLeft size={24} strokeWidth={2.5}/>
                                            </button>

                                            <div className="flex flex-col items-center min-w-[140px]">
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current View</span>
                                                <span className="text-[17px] font-bold text-slate-800">Rack {String(activeRackId).padStart(2, '0')}</span>
                                            </div>

                                            <button
                                                onClick={handleNextRack}
                                                className="p-3 bg-white border border-slate-200 text-slate-500 rounded-xl hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                                            >
                                                <ChevronRight size={24} strokeWidth={2.5}/>
                                            </button>
                                        </div>

                                        <div className="bg-white/90 backdrop-blur-md px-6 py-2.5 rounded-[20px] shadow-sm border border-slate-200 flex items-center justify-center gap-6 pointer-events-none w-max">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3.5 h-3.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)] border border-sky-200"></div>
                                                <span className="text-[11px] font-bold text-slate-600">Target Medicine</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3.5 h-3.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)] border border-purple-300"></div>
                                                <span className="text-[11px] font-bold text-slate-600">Occupied Bin</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200/80 bg-slate-100/50 shadow-sm"></div>
                                                <span className="text-[11px] font-bold text-slate-600">Empty Space</span>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}