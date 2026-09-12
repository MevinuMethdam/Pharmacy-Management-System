import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Radar, AlertTriangle, ShieldCheck, TrendingUp, Package, Activity, RefreshCw, BarChart2, CheckCircle, Map } from 'lucide-react';
import axios from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

if (typeof Highcharts === 'object' && !Highcharts.Chart.prototype.mapZoom) {
    const mapModule = require('highcharts/modules/map');
    const initMap = mapModule.default || mapModule;
    if (typeof initMap === 'function') {
        initMap(Highcharts);
    }
}

const slCoordinates = {
    "Colombo": { lat: 6.9271, lon: 79.8612 },
    "Gampaha": { lat: 7.0873, lon: 79.9996 },
    "Kalutara": { lat: 6.5854, lon: 79.9607 },
    "Kandy": { lat: 7.2906, lon: 80.6337 },
    "Galle": { lat: 6.0535, lon: 80.2210 },
    "Matara": { lat: 5.9549, lon: 80.5550 },
    "Kurunegala": { lat: 7.4818, lon: 80.3609 },
    "Ratnapura": { lat: 6.7056, lon: 80.3847 },
    "Anuradhapura": { lat: 8.3114, lon: 80.4037 },
    "Jaffna": { lat: 9.6615, lon: 80.0255 },
    "Badulla": { lat: 6.9934, lon: 81.0550 },
    "Batticaloa": { lat: 7.7170, lon: 81.6999 },
    "Trincomalee": { lat: 8.5874, lon: 81.2152 }
};

export default function AIOutbreakRadar() {
    const [loading, setLoading] = useState(false);
    const [aiData, setAiData] = useState(null);
    const [slMapData, setSlMapData] = useState(null);

    useEffect(() => {
        const fetchMap = async () => {
            try {
                const response = await fetch('https://code.highcharts.com/mapdata/countries/lk/lk-all.topo.json');
                const data = await response.json();
                setSlMapData(data);
            } catch (error) {
                console.error("Failed to load map data", error);
            }
        };
        fetchMap();

        const loadInitialData = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/ai-outbreak/history');
                if (res.data && res.data.length > 0) {
                    setAiData(res.data[0]);
                }
            } catch (err) {
                console.error("Failed to load initial history", err);
            }
        };
        loadInitialData();
    }, []);

    const fetchAIAnalysis = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/ai-outbreak/analyze');
            setAiData(res.data);
            toast.success('Live News Scanned & AI Analysis Updated!', { icon: '🤖' });
        } catch (err) {
            if (!axios.isCancel(err)) {
                toast.error('Failed to load new Analysis. Showing latest saved data.');
                console.error(err);
            }
        } finally {
            setLoading(false);
        }
    };

    const getRiskColors = (level) => {
        switch (level?.toLowerCase()) {
            case 'critical': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'low': return 'bg-teal-100 text-teal-700 border-teal-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getMapOptions = () => {
        const mapDataPoints = [];

        if (aiData?.identifiedTrends && slMapData) {
            aiData.identifiedTrends.forEach(trend => {
                const desc = String(trend.trendDescription).toLowerCase();
                let foundMatch = false;

                const confidenceNum = parseFloat(String(trend.confidenceLevel).replace(/[^0-9.]/g, '')) || 50;
                let bubbleColor = 'rgba(245, 158, 11, 0.6)';
                if (confidenceNum > 85) bubbleColor = 'rgba(225, 29, 72, 0.7)';
                else if (confidenceNum > 70) bubbleColor = 'rgba(249, 115, 22, 0.7)';

                Object.keys(slCoordinates).forEach(city => {
                    if (desc.includes(city.toLowerCase())) {
                        mapDataPoints.push({
                            name: city,
                            lat: slCoordinates[city].lat,
                            lon: slCoordinates[city].lon,
                            z: confidenceNum,
                            disease: trend.disease,
                            color: bubbleColor
                        });
                        foundMatch = true;
                    }
                });

                if (!foundMatch) {
                    mapDataPoints.push({
                        name: "Nationwide",
                        lat: 7.8731,
                        lon: 80.7718,
                        z: confidenceNum,
                        disease: trend.disease,
                        color: bubbleColor
                    });
                }
            });
        }

        return {
            chart: {
                type: 'map',
                backgroundColor: 'transparent',
                height: 400,
                style: { fontFamily: 'Inter, sans-serif' }
            },
            title: { text: '' },
            mapNavigation: {
                enabled: true,
                buttonOptions: { verticalAlign: 'bottom' }
            },
            tooltip: {
                useHTML: true,
                backgroundColor: 'rgba(255,255,255,0.95)',
                borderColor: 'rgba(255,255,255,0.5)',
                borderRadius: 16,
                shadow: { color: 'rgba(0, 0, 0, 0.1)', offsetX: 0, offsetY: 8, width: 20 },
                formatter: function () {
                    if (this.point.disease) {
                        return `<div style="padding: 5px;">
                                  <span style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Location: ${this.point.name}</span><br/>
                                  <span style="font-size: 15px; font-weight: 900; color: #1e293b;">${this.point.disease}</span><br/>
                                  <span style="font-size: 12px; font-weight: bold; color: #ef4444;">Confidence: ${this.point.z}%</span>
                                </div>`;
                    }
                    return false;
                }
            },
            series: [
                {
                    name: 'Sri Lanka Base',
                    mapData: slMapData,
                    color: '#e2e8f0',
                    borderColor: '#cbd5e1',
                    borderWidth: 1.5,
                    states: { hover: { color: '#cbd5e1' } },
                    dataLabels: { enabled: false },
                    showInLegend: false
                },
                {
                    type: 'mapbubble',
                    name: 'Outbreak Clusters',
                    data: mapDataPoints,
                    maxSize: '15%',
                    minSize: '5%',
                    marker: {
                        fillOpacity: 0.8,
                        lineWidth: 1,
                        lineColor: '#ffffff'
                    },
                    dataLabels: {
                        enabled: true,
                        format: '{point.name}',
                        style: { color: '#475569', fontSize: '10px', fontWeight: 'bold', textOutline: '2px #ffffff' }
                    },
                    showInLegend: false
                }
            ],
            credits: { enabled: false }
        };
    };

    const getChartOptions = () => {
        const trends = aiData?.identifiedTrends || [];
        const categories = trends.map(t => t.disease || 'Unknown');

        const data = trends.map(t => {
            const conf = t.confidenceLevel || '0%';
            return parseFloat(conf.replace('%', '')) || 0;
        });

        return {
            chart: {
                type: 'column',
                backgroundColor: 'transparent',
                height: 280,
                style: { fontFamily: 'Inter, sans-serif' }
            },
            title: { text: '' },
            xAxis: {
                categories: categories.length > 0 ? categories : ['No Active Trends'],
                labels: { style: { color: '#64748b', fontWeight: '600', fontSize: '11px' } },
                lineWidth: 0,
                tickWidth: 0
            },
            yAxis: {
                min: 0,
                max: 100,
                title: { text: 'CONFIDENCE (%)', style: { color: '#94a3b8', fontSize: '10px', fontWeight: '700' } },
                labels: { style: { color: '#94a3b8', fontWeight: '500' } },
                gridLineColor: 'rgba(255,255,255,0.2)',
                gridLineDashStyle: 'Dash'
            },
            tooltip: {
                valueSuffix: '% Confidence',
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderColor: 'rgba(255,255,255,0.4)',
                borderRadius: 16,
                style: { color: '#1e293b', fontWeight: '600', fontSize: '13px' }
            },
            plotOptions: {
                column: {
                    borderRadius: 10,
                    borderWidth: 0,
                    pointWidth: 40,
                    color: '#60a5fa',
                    dataLabels: {
                        enabled: true,
                        format: '{y}%',
                        style: { color: '#475569', textOutline: 'none', fontWeight: '600' }
                    }
                }
            },
            legend: { enabled: false },
            credits: { enabled: false },
            series: [{ name: 'Confidence', data: data.length > 0 ? data : [0] }]
        };
    };

    return (
        <AdminLayout>
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4">

                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply"
                     style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}>
                </div>

                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-blue-200/20 to-slate-300/20 blur-[120px] pointer-events-none z-[-2]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-slate-300/20 to-blue-200/20 blur-[140px] pointer-events-none z-[-2]"></div>

                <div className="relative z-10 w-full h-full flex flex-col gap-6 pb-2">

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                        <div>
                            <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">AI Outbreak Radar</h1>
                            <p className="text-[13px] text-slate-500 mt-1.5 font-medium">
                                Real-time Sri Lankan News analysis & intelligent stock forecasting
                            </p>
                        </div>

                        <button
                            onClick={fetchAIAnalysis}
                            disabled={loading}
                            className="flex items-center gap-2 bg-blue-500/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl text-[14px] font-bold hover:bg-blue-600 transition-all shadow-[0_10px_25px_-5px_rgba(59,130,246,0.3)] border border-blue-400/50 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                        >
                            <RefreshCw size={18} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Analyzing Live News...' : 'Run Live AI Scan'}
                        </button>
                    </div>

                    {loading && !aiData ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-20">
                            <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                                <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                                <Radar className="text-blue-500 animate-pulse" size={28} />
                            </div>
                            <h2 className="text-[18px] font-bold text-slate-700">AI is analyzing Sri Lankan Health News...</h2>
                            <p className="text-[13px] text-slate-500 font-medium mt-1">Cross-referencing live data with Pharmacy Inventory</p>
                        </div>
                    ) : aiData ? (
                        <div className="space-y-6">

                            <div className="bg-white/30 backdrop-blur-2xl p-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex flex-col md:flex-row gap-6 items-center">
                                <div className={`flex flex-col items-center justify-center min-w-[150px] p-5 rounded-2xl border shadow-sm ${getRiskColors(aiData.riskLevel)}`}>
                                    <Activity size={32} strokeWidth={2.5} className="mb-2" />
                                    <span className="text-[11px] uppercase tracking-wider font-bold opacity-80">Risk Level</span>
                                    <span className="text-[22px] font-black">{aiData.riskLevel}</span>
                                </div>
                                <div>
                                    <h2 className="text-[18px] font-bold text-slate-800 mb-2 flex items-center gap-2">
                                        <ShieldCheck className="text-blue-500" size={20} /> Real-World Executive Summary
                                    </h2>
                                    <p className="text-[14px] text-slate-600 font-medium leading-relaxed">
                                        {aiData.summaryMessage}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                                <div className="bg-white/30 backdrop-blur-2xl p-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex flex-col">
                                    <div className="flex items-center gap-3 mb-2 px-1">
                                        <div className="p-2.5 bg-white/50 text-rose-500 rounded-xl border border-white/60 shadow-sm">
                                            <Map size={20} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h2 className="text-[17px] font-bold text-slate-800 tracking-tight">Sri Lanka Outbreak Spread Map</h2>
                                            <p className="text-[12.5px] text-slate-500 font-medium mt-0.5">Geographical visualization of identified health threats</p>
                                        </div>
                                    </div>
                                    <div className="w-full flex-1 mt-4 bg-slate-50/50 rounded-2xl border border-white relative overflow-hidden">
                                        {slMapData ? (
                                            <HighchartsReact
                                                highcharts={Highcharts}
                                                constructorType={'mapChart'}
                                                options={getMapOptions()}
                                                containerProps={{ style: { width: '100%', height: '100%' } }}
                                            />
                                        ) : (
                                            <div className="w-full h-[400px] flex flex-col items-center justify-center text-slate-400">
                                                <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin mb-3"></div>
                                                <p className="text-xs font-medium">Loading Map Data...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white/30 backdrop-blur-2xl p-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex flex-col">
                                    <div className="flex items-center gap-3 mb-2 px-1">
                                        <div className="p-2.5 bg-white/50 text-blue-600 rounded-xl border border-white/60 shadow-sm">
                                            <BarChart2 size={20} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h2 className="text-[17px] font-bold text-slate-800 tracking-tight">Outbreak Confidence Overview</h2>
                                            <p className="text-[12.5px] text-slate-500 font-medium mt-0.5">Confidence levels for detected medical patterns</p>
                                        </div>
                                    </div>
                                    <div className="w-full flex-1 mt-4">
                                        <HighchartsReact
                                            highcharts={Highcharts}
                                            options={getChartOptions()}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] flex flex-col mt-6 overflow-hidden">
                                <div className="p-6 border-b border-white/30 flex items-center justify-between bg-white/20">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/50 text-blue-600 rounded-xl border border-white/60 shadow-sm">
                                            <Radar size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-[17px] font-bold text-[#1e293b] tracking-tight">Live Outbreak & Stock Intelligence</h2>
                                            <p className="text-[13px] text-slate-500 mt-0.5 font-medium">Real-time mapping of identified diseases to our current pharmacy inventory</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <table className="w-full text-left border-collapse table-fixed">
                                        <thead>
                                        <tr>
                                            <th className="w-[35%] pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight pr-6">Disease / Pattern</th>
                                            <th className="w-[10%] pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight">Severity /<br/>Confidence</th>
                                            <th className="w-[20%] pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight pr-6">Required<br/>Medicines</th>
                                            <th className="w-[12%] pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight text-center">Inventory<br/>Status</th>
                                            <th className="w-[10%] pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight text-center">Alerts</th>
                                            <th className="w-[13%] pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 align-bottom leading-tight text-right">Action</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {aiData.identifiedTrends && aiData.identifiedTrends.length > 0 ? (
                                            aiData.identifiedTrends.map((trend, idx) => {

                                                const stockRec = aiData.stockRecommendations?.find(s =>
                                                    trend.affectedMedicines?.toLowerCase().includes(s.medicineType?.toLowerCase()) ||
                                                    s.medicineType?.toLowerCase().includes(trend.affectedMedicines?.toLowerCase())
                                                );

                                                const currentStock = stockRec ? stockRec.currentStock : 'N/A';
                                                const requiredStock = stockRec ? stockRec.requiredStock : 'N/A';

                                                const cleanCurrent = parseFloat(String(currentStock).replace(/[^0-9.]/g, ''));
                                                const cleanRequired = parseFloat(String(requiredStock).replace(/[^0-9.]/g, ''));
                                                const isStockLow = isNaN(cleanCurrent) || currentStock?.toLowerCase() === 'not in stock' || cleanCurrent < cleanRequired;

                                                return (
                                                    <tr key={idx} className="group hover:bg-white/40 transition-colors border-b border-white/40 last:border-0">
                                                        <td className="py-6 align-top pr-6">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <p className="font-bold text-[15px] text-[#1e293b]">
                                                                    {trend.disease}
                                                                </p>
                                                            </div>
                                                            <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                                                                {trend.trendDescription}
                                                            </p>
                                                        </td>
                                                        <td className="py-6 align-top">
                                                            <div className="flex flex-col gap-1.5 items-start mt-1">
                                                                <span className="text-[12px] font-bold text-blue-700">
                                                                    {trend.confidenceLevel} Match
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-6 align-top pr-6">
                                                            <p className="text-[13px] font-bold text-slate-700 leading-relaxed mt-1">
                                                                {trend.affectedMedicines}
                                                            </p>
                                                        </td>
                                                        <td className="py-6 align-top text-center">
                                                            {stockRec ? (
                                                                <div className="flex flex-col gap-1.5 items-center mt-1">
                                                                    <span className="text-[10px] uppercase font-bold text-slate-400">Current vs Req</span>
                                                                    <span className={`text-[13px] font-black flex items-center justify-center gap-2 ${isStockLow ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                        {currentStock === '0' || currentStock?.toLowerCase() === 'not in stock' ? 'Not in Stock' : cleanCurrent}
                                                                        <span className="text-slate-400 text-[10px] font-bold">→</span>
                                                                        {cleanRequired || requiredStock}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[13px] font-medium text-slate-400 mt-1 block">-</span>
                                                            )}
                                                        </td>
                                                        <td className="py-6 align-top text-center">
                                                            {isStockLow ? (
                                                                <div className="flex flex-col items-center justify-center group w-full mt-1" title={stockRec?.reason || 'Stock is running low for this outbreak'}>
                                                                    <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg border border-rose-200 shadow-sm transition-colors">
                                                                        <AlertTriangle size={18} strokeWidth={2.5} />
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-rose-600 mt-1.5 whitespace-nowrap">
                                                                        Low Stock
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center group w-full mt-1" title="Stock is sufficient">
                                                                    <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg border border-emerald-200 shadow-sm transition-colors">
                                                                        <CheckCircle size={18} strokeWidth={2.5} />
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-emerald-600 mt-1.5 whitespace-nowrap">
                                                                        Sufficient
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-6 align-top text-right">
                                                            <div className="flex justify-end mt-1">
                                                                <button className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-blue-50 transition-colors border border-blue-200 shadow-sm cursor-pointer">
                                                                    <Package size={14} strokeWidth={2.5} /> Order Stock
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="text-center py-16 text-slate-500 font-medium text-[13px]">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <ShieldCheck size={24} className="text-slate-400 opacity-50"/>
                                                        No active outbreak trends identified in the database.
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <Radar size={48} className="opacity-20 mb-4" />
                            <p>No data loaded. Click 'Run Live AI Scan' to begin.</p>
                        </div>
                    )}

                </div>
            </div>
        </AdminLayout>
    );
}