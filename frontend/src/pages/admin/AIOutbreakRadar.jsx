import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Radar, AlertTriangle, ShieldCheck, TrendingUp, Package, Activity, RefreshCw, BarChart2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

export default function AIOutbreakRadar() {
    const [loading, setLoading] = useState(false);
    const [aiData, setAiData] = useState(null);

    useEffect(() => {
        fetchAIAnalysis();
    }, []);

    const fetchAIAnalysis = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/ai-outbreak/analyze');
            setAiData(res.data);
            toast.success('AI Health Analysis Updated!', { icon: '🤖' });
        } catch (err) {
            toast.error('Failed to load AI Analysis. Check backend connection.');
            console.error(err);
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
                    color: '#818cf8',
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
            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4">

                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply"
                     style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}>
                </div>

                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-indigo-200/20 to-purple-300/20 blur-[120px] pointer-events-none z-[-2]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-slate-300/20 to-sky-200/20 blur-[140px] pointer-events-none z-[-2]"></div>

                <div className="relative z-10 w-full h-full flex flex-col gap-6 pb-2">

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                        <div>
                            <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">AI Outbreak Radar</h1>
                            <p className="text-[13px] text-slate-500 mt-1.5 font-medium">
                                Predictive disease analysis & intelligent stock forecasting
                            </p>
                        </div>

                        <button
                            onClick={fetchAIAnalysis}
                            disabled={loading}
                            className="flex items-center gap-2 bg-indigo-500/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl text-[14px] font-bold hover:bg-indigo-600 transition-all shadow-[0_10px_25px_-5px_rgba(99,102,241,0.3)] border border-indigo-400/50 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                        >
                            <RefreshCw size={18} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Analyzing Data...' : 'Run AI Scan'}
                        </button>
                    </div>

                    {loading && !aiData ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-20">
                            <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                                <Radar className="text-indigo-500 animate-pulse" size={28} />
                            </div>
                            <h2 className="text-[18px] font-bold text-slate-700">AI is analyzing prescriptions...</h2>
                            <p className="text-[13px] text-slate-500 font-medium mt-1">Cross-referencing 14-day local medical trends</p>
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
                                        <ShieldCheck className="text-indigo-500" size={20} /> AI Executive Summary
                                    </h2>
                                    <p className="text-[14px] text-slate-600 font-medium leading-relaxed">
                                        {aiData.summaryMessage}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white/30 backdrop-blur-2xl p-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex flex-col gap-2">
                                <div className="flex items-center gap-3 mb-2 px-1">
                                    <div className="p-2.5 bg-white/50 text-indigo-600 rounded-xl border border-white/60 shadow-sm">
                                        <BarChart2 size={20} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h2 className="text-[17px] font-bold text-slate-800 tracking-tight">Outbreak Confidence Overview</h2>
                                        <p className="text-[12.5px] text-slate-500 font-medium mt-0.5">Visual representation of confidence levels for detected medical patterns</p>
                                    </div>
                                </div>
                                <div className="w-full mt-2">
                                    <HighchartsReact
                                        highcharts={Highcharts}
                                        options={getChartOptions()}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white/30 backdrop-blur-2xl p-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50">
                                    <h2 className="text-[17px] font-bold text-slate-800 tracking-tight flex items-center gap-2 mb-5">
                                        <TrendingUp className="text-rose-500" size={20} /> Identified Disease Trends
                                    </h2>

                                    <div className="space-y-4">
                                        {aiData.identifiedTrends && aiData.identifiedTrends.length > 0 ? (
                                            aiData.identifiedTrends.map((trend, index) => (
                                                <div key={index} className="bg-white/60 p-5 rounded-2xl border border-white/80 shadow-sm transition-all hover:bg-white/80">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="text-[15px] font-bold text-slate-800">{trend.disease}</h3>
                                                        <span className="text-[11px] font-black bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full shadow-sm">
                                                            {trend.confidenceLevel} Confidence
                                                        </span>
                                                    </div>
                                                    <p className="text-[13px] text-slate-600 mb-3">{trend.trendDescription}</p>
                                                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Trigger Medicines:</span>
                                                        <p className="text-[13px] font-semibold text-indigo-700 mt-0.5">{trend.affectedMedicines}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-[13px] text-slate-500 font-medium text-center py-6">No significant disease trends detected in the last 14 days.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white/30 backdrop-blur-2xl p-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50">
                                    <h2 className="text-[17px] font-bold text-slate-800 tracking-tight flex items-center gap-2 mb-5">
                                        <Package className="text-amber-500" size={20} /> Smart Stock Predictions
                                    </h2>

                                    <div className="space-y-4">
                                        {aiData.stockRecommendations && aiData.stockRecommendations.length > 0 ? (
                                            aiData.stockRecommendations.map((stock, index) => (
                                                <div key={index} className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 shadow-sm transition-all hover:bg-amber-50">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                                                            <AlertTriangle size={14} strokeWidth={2.5} />
                                                        </div>
                                                        <h3 className="text-[15px] font-bold text-slate-800">{stock.medicineType}</h3>
                                                    </div>
                                                    <p className="text-[13px] text-slate-600 font-medium ml-11">{stock.reason}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-[13px] text-slate-500 font-medium text-center py-6">Stock levels appear stable based on current trends.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden flex flex-col mt-6">
                                <div className="p-6 border-b border-white/30 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/50 text-indigo-600 rounded-xl border border-white/60 shadow-sm">
                                            <Radar size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-[17px] font-bold text-[#1e293b] tracking-tight">Comprehensive Outbreak Audit Table</h2>
                                            <p className="text-[13px] text-slate-500 mt-0.5 font-medium">Tabular breakdown of all forecasted indicators and triggers</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto px-8 py-4">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                        <tr>
                                            <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Disease / Pattern</th>
                                            <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Confidence Rating</th>
                                            <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30">Associated Triggers</th>
                                            <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 text-right">Recommended Action</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {aiData.identifiedTrends && aiData.identifiedTrends.length > 0 ? (
                                            aiData.identifiedTrends.map((trend, idx) => (
                                                <tr key={idx} className="group hover:bg-white/20 transition-colors border-b border-white/20 last:border-0">
                                                    <td className="py-4 align-top pt-5 text-[14px] font-bold text-[#1e293b]">{trend.disease}</td>
                                                    <td className="py-4 align-top pt-5 text-[13px] font-bold text-indigo-600">{trend.confidenceLevel}</td>
                                                    <td className="py-4 align-top pt-5 text-[13px] font-medium text-slate-600">{trend.affectedMedicines}</td>
                                                    <td className="py-4 align-top pt-4 text-right">
                                                        <span className="px-3 py-1 bg-teal-100/70 border border-teal-200 text-teal-700 rounded-lg text-[11px] font-bold backdrop-blur-sm shadow-sm">
                                                            Monitor Stock
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="text-center py-12 text-slate-500 text-[13px] font-medium">No records available in audit log.</td>
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
                            <p>No data loaded. Click 'Run AI Scan' to begin.</p>
                        </div>
                    )}

                </div>
            </div>
        </AdminLayout>
    );
}