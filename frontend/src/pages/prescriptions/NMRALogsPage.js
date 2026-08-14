import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Search, ShieldAlert, Download, FileText, Calendar, CheckCircle, AlertTriangle, Activity } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

export default function NMRALogsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/nmra-logs');
            setLogs(res.data || []);
        } catch (err) {
            toast.error('Failed to load NMRA logs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const drugName = log.medicineName?.toLowerCase() || '';
        const saleId = String(log.saleId).toLowerCase();
        const patient = log.patientName?.toLowerCase() || '';
        return drugName.includes(searchQuery.toLowerCase()) ||
            saleId.includes(searchQuery.toLowerCase()) ||
            patient.includes(searchQuery.toLowerCase());
    });

    const handlePrintReport = () => {
        window.print();
    };

    const getChartOptions = () => {
        const dateMap = {};

        const sortedLogs = [...logs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        sortedLogs.forEach(log => {
            const date = new Date(log.createdAt);
            if (isNaN(date.getTime())) return;

            const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

            if (!dateMap[dateStr]) {
                dateMap[dateStr] = 0;
            }
            dateMap[dateStr] += Number(log.quantity) || 0;
        });

        const categories = Object.keys(dateMap);
        const data = Object.values(dateMap);

        return {
            chart: {
                type: 'spline',
                backgroundColor: 'transparent',
                height: 300,
                style: {
                    fontFamily: 'Inter, sans-serif'
                }
            },
            title: {
                text: ''
            },
            xAxis: {
                categories: categories,
                labels: {
                    style: {
                        color: '#64748b',
                        fontWeight: '500',
                        fontSize: '11px'
                    }
                },
                lineWidth: 0,
                tickWidth: 0
            },
            yAxis: {
                min: 0,
                title: { text: null },
                labels: {
                    style: {
                        color: '#94a3b8',
                        fontWeight: '500',
                        fontSize: '10px'
                    }
                },
                gridLineColor: 'rgba(255,255,255,0.2)',
                gridLineDashStyle: 'Dash'
            },
            tooltip: {
                valueSuffix: ' Units',
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderColor: 'rgba(255,255,255,0.4)',
                borderRadius: 16,
                shadow: {
                    color: 'rgba(0, 0, 0, 0.08)',
                    offsetX: 0,
                    offsetY: 8,
                    width: 20
                },
                style: {
                    color: '#1e293b',
                    fontWeight: '600',
                    fontSize: '13px'
                }
            },
            plotOptions: {
                spline: {
                    lineWidth: 4,
                    color: '#cfa4f5',
                    marker: {
                        enabled: true,
                        symbol: 'circle',
                        radius: 6,
                        fillColor: '#ffffff',
                        lineWidth: 3,
                        lineColor: '#ffb8d1',
                    }
                }
            },
            legend: {
                enabled: false
            },
            credits: {
                enabled: false
            },
            series: [{
                name: 'Total Dispensed',
                data: data
            }]
        };
    };
    return (
        <AdminLayout>
            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4">

                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply"
                     style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}>
                </div>

                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-rose-200/20 to-purple-300/20 blur-[120px] pointer-events-none z-[-2]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-slate-300/20 to-rose-200/20 blur-[140px] pointer-events-none z-[-2]"></div>

                <div className="relative z-10 w-full h-full flex flex-col gap-6 pb-2">

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden mb-2">
                        <div>
                            <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">NMRA Controlled Logs</h1>
                            <p className="text-[13px] text-slate-500 mt-1.5 font-medium">
                                Regulatory compliance and audit trail for controlled substances
                            </p>
                        </div>

                        <button
                            onClick={handlePrintReport}
                            className="flex items-center gap-2 bg-slate-800/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl text-[14px] font-bold hover:bg-slate-900 transition-all shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] border border-slate-700/50 cursor-pointer active:scale-[0.98]"
                        >
                            <Download size={18} strokeWidth={2.5} /> Export NMRA Report
                        </button>
                    </div>

                    <div className="hidden print:block text-center mb-6 border-b border-slate-300 pb-4">
                        <h1 className="text-2xl font-black text-slate-800">Kegalle Rx Pharmacy System</h1>
                        <p className="text-sm font-bold text-rose-600 uppercase tracking-widest mt-1">Official NMRA Controlled Substances Audit Report</p>
                        <p className="text-xs text-slate-500 mt-1">Generated Date: {new Date().toLocaleString()}</p>
                    </div>

                    {logs.length > 0 && (
                        <div className="bg-white/30 backdrop-blur-2xl p-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex flex-col gap-4 print:hidden mt-2">
                            <div className="flex items-center gap-3 mb-2 px-1">
                                <div className="p-2.5 bg-white/50 text-purple-600 rounded-xl border border-white/60 shadow-sm">
                                    <Activity size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h2 className="text-[17px] font-bold text-slate-800 tracking-tight">Dispensing Trend (Controlled Drugs)</h2>
                                    <p className="text-[13px] text-slate-500 font-medium mt-0.5">Daily monitoring of dispensed quantities to identify anomalies</p>
                                </div>
                            </div>
                            <div className="w-full mt-2">
                                <HighchartsReact
                                    highcharts={Highcharts}
                                    options={getChartOptions()}
                                />
                            </div>
                        </div>
                    )}

                    <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden flex flex-col mt-2 print:border-none print:shadow-none print:bg-transparent">

                        <div className="p-6 border-b border-white/30 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/10 print:hidden">
                            <div className="relative w-full md:w-96">
                                <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by Drug Name, Invoice ID or Patient..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/40 shadow-sm backdrop-blur-sm"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto px-8 py-4 print:px-0">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 print:border-slate-800 print:border-b-2">Log ID & Date</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 print:border-slate-800 print:border-b-2">Controlled Drug</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 print:border-slate-800 print:border-b-2">Quantity</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 print:border-slate-800 print:border-b-2">Patient & Doctor</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 print:border-slate-800 print:border-b-2">Status / Dispensed By</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 print:border-slate-800 print:border-b-2">Remarks</th>
                                </tr>
                                </thead>
                                <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center py-16 text-slate-500 font-medium text-[13px]">Loading NMRA logs...</td></tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-16 text-slate-500 font-medium text-[13px]">No controlled drug logs found.</td></tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="group hover:bg-white/20 transition-colors border-b border-white/20 last:border-0 print:border-slate-300">
                                            <td className="py-4 align-top pt-5">
                                                <p className="text-[14px] font-bold text-[#1e293b] font-mono">LOG-{String(log.id).padStart(4, '0')}</p>
                                                <p className="text-[12px] font-medium text-slate-500 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                                            </td>
                                            <td className="py-4 align-top pt-5 text-[14px] font-bold text-rose-700">{log.medicineName || 'Unknown'}</td>
                                            <td className="py-4 align-top pt-5 text-[14px] font-black text-slate-800">{log.quantity} <span className="text-[11px] font-bold text-slate-400">UNITS</span></td>
                                            <td className="py-4 align-top pt-5">
                                                <p className="text-[13px] font-bold text-[#1e293b]">{log.patientName || 'Walk-in'}</p>
                                                <p className="text-[12px] font-medium text-slate-500 mt-1">Dr. {log.doctorName || 'N/A'}</p>
                                            </td>
                                            <td className="py-4 align-top pt-5">
                                                {log.status === 'Voided' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100/80 border border-rose-200/50 text-rose-700 rounded-lg text-[11px] font-bold backdrop-blur-sm shadow-sm print:border-none print:bg-transparent print:p-0">
                                                        <AlertTriangle size={14}/> Voided
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/50 border border-emerald-200/50 text-emerald-700 rounded-lg text-[11px] font-bold backdrop-blur-sm shadow-sm print:border-none print:bg-transparent print:p-0">
                                                        <CheckCircle size={14}/> Completed
                                                    </span>
                                                )}
                                                <p className="text-[12px] font-medium text-slate-500 mt-1.5">By: <span className="font-semibold text-slate-600">{log.dispensedBy || 'Cashier'}</span></p>
                                            </td>
                                            <td className="py-4 align-top pt-5 pr-2 text-[13px] font-medium text-slate-500 italic max-w-[200px] truncate">
                                                {log.remarks || '-'}
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
        </AdminLayout>
    );
}