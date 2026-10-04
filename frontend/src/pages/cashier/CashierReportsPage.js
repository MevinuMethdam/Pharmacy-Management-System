import React, { useState, useEffect, useMemo } from 'react';
import CashierLayout from '../../components/layout/CashierLayout';
import { salesApi } from '../../api/salesApi';
import axios from '../../api/axiosInstance';
import {
    BarChart3, Download, TrendingUp, TrendingDown, Package,
    CheckCircle, Ban, Search, FileText, CalendarClock, Users, Pill, AlertTriangle, FileSignature, Filter, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

export default function CashierReportsPage() {
    const [allSales, setAllSales] = useState([]);
    const [allCustomers, setAllCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState('today');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const salesRes = await salesApi.list({ page: 0, size: 5000 });
            const salesData = Array.isArray(salesRes.data) ? salesRes.data : (salesRes.data?.content || []);
            setAllSales(salesData);

            const customersRes = await axios.get('http://localhost:5000/api/crm/customers');
            const customersData = customersRes.data || [];
            setAllCustomers(customersData);

        } catch (err) {
            console.error('Failed to load report data', err);
            toast.error('Failed to load report data from server');
        } finally {
            setLoading(false);
        }
    };

    const getStartDate = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        switch (dateRange) {
            case 'today': return d;
            case '7days': return new Date(d.setDate(d.getDate() - 7));
            case '14days': return new Date(d.setDate(d.getDate() - 14));
            case '28days': return new Date(d.setDate(d.getDate() - 28));
            case '30days': return new Date(d.setDate(d.getDate() - 30));
            case '3months': return new Date(d.setMonth(d.getMonth() - 3));
            case '6months': return new Date(d.setMonth(d.getMonth() - 6));
            case '9months': return new Date(d.setMonth(d.getMonth() - 9));
            case '1year': return new Date(d.setFullYear(d.getFullYear() - 1));
            case 'all': return new Date(0);
            default: return d;
        }
    };

    const startDate = getStartDate();

    const displaySales = useMemo(() => {
        return allSales.filter(sale => new Date(sale.saleDate || sale.createdAt) >= startDate);
    }, [allSales, startDate]);

    const rangeNewCustomers = useMemo(() => {
        return allCustomers.filter(c => new Date(c.createdAt || c.created_at) >= startDate).length;
    }, [allCustomers, startDate]);

    const totalCustomersCount = allCustomers.length;

    const completedSales = displaySales.filter(s => s.status === 'Completed');
    const voidedSales = displaySales.filter(s => s.status === 'Voided' || s.status === 'Refunded');

    const totalRevenue = completedSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalBills = completedSales.length;
    const totalReturnsAmount = voidedSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

    const topMedicines = {};
    const voidedMedicines = {};

    displaySales.forEach(sale => {
        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                const medName = item.medicine?.name || item.medicineName || `Medicine #${item.medicineId}`;
                const qty = Number(item.quantity) || 0;
                const price = Number(item.price || item.medicine?.sellingPrice || 0);
                const value = qty * price;

                if (sale.status === 'Completed') {
                    if (!topMedicines[medName]) topMedicines[medName] = { qty: 0, value: 0 };
                    topMedicines[medName].qty += qty;
                    topMedicines[medName].value += value;
                } else if (sale.status === 'Voided' || sale.status === 'Refunded') {
                    if (!voidedMedicines[medName]) voidedMedicines[medName] = { qty: 0, value: 0 };
                    voidedMedicines[medName].qty += qty;
                    voidedMedicines[medName].value += value;
                }
            });
        }
    });

    const sortedTopMedicines = Object.entries(topMedicines)
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, 10);

    const sortedVoidedMedicines = Object.entries(voidedMedicines).sort((a, b) => b[1].qty - a[1].qty);

    const filteredDisplaySales = displaySales.filter(s =>
        (s.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(s.saleId || s.id).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const downloadCSVReport = () => {
        if (displaySales.length === 0) {
            toast.error("No transactions available to download for this period.");
            return;
        }

        const headers = [
            'Invoice ID', 'Date & Time', 'Customer Name', 'Doctor Name',
            'Prescription ID', 'Payment Method', 'Status',
            'Sold Medicines (Name x Qty)', 'Voided Medicines (Name x Qty)',
            'Sub Total', 'Discount/Loyalty', 'Total Amount (LKR)'
        ];

        const csvRows = [headers.join(',')];

        displaySales.forEach(sale => {
            const time = new Date(sale.saleDate || sale.createdAt).toLocaleString();
            const id = String(sale.saleId || sale.id).slice(0, 8).toUpperCase();
            const customer = (sale.customerName || 'Walk-in Customer').replace(/,/g, '');
            const doctor = (sale.doctorName || 'N/A').replace(/,/g, '');
            const rxId = sale.prescriptionId ? `RX-${String(sale.prescriptionId).padStart(4, '0')}` : 'N/A';

            let soldMeds = '-';
            let voidedMeds = '-';

            if (sale.items && Array.isArray(sale.items)) {
                const medStrings = sale.items.map(i => `${i.medicine?.name || i.medicineName || 'Item'} (x${i.quantity})`).join(' | ');
                if (sale.status === 'Completed') soldMeds = medStrings;
                else voidedMeds = medStrings;
            }

            const amount = Number(sale.totalAmount).toFixed(2);
            const subTotal = Number(sale.subTotal || sale.totalAmount).toFixed(2);
            const discount = Number(sale.discount || 0).toFixed(2);

            csvRows.push(`"${id}","${time}","${customer}","${doctor}","${rxId}","${sale.paymentMethod}","${sale.status}","${soldMeds}","${voidedMeds}","${subTotal}","${discount}","${amount}"`);
        });

        const rangeLabels = {
            'today': 'Today', '7days': 'Last 7 Days', '14days': 'Last 14 Days', '28days': 'Last 28 Days',
            '30days': 'Last 30 Days', '3months': 'Last 3 Months', '6months': 'Last 6 Months',
            '9months': 'Last 9 Months', '1year': 'Last 1 Year', 'all': 'All Time'
        };

        csvRows.push('\n');
        csvRows.push('--- ANALYTICS SUMMARY ---');
        csvRows.push(`Report Period,${rangeLabels[dateRange]}`);
        csvRows.push(`New Customers Registered in Period,${rangeNewCustomers}`);
        csvRows.push(`Total Customers in System (Overall),${totalCustomersCount}`);
        csvRows.push(`Total Revenue (LKR),${totalRevenue.toFixed(2)}`);
        csvRows.push(`Total Bills Processed,${totalBills}`);
        csvRows.push(`Total Voided Value (LKR),${totalReturnsAmount.toFixed(2)}`);

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Pharmacy_Report_${rangeLabels[dateRange].replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(`Comprehensive Report for ${rangeLabels[dateRange]} downloaded successfully!`);
    };

    const getChartOptions = () => {
        let categories = [];
        let data = [];

        if (dateRange === 'today') {
            const hourlyData = new Array(24).fill(0);
            completedSales.forEach(sale => {
                const date = new Date(sale.saleDate || sale.createdAt);
                const hour = date.getHours();
                hourlyData[hour] += Number(sale.totalAmount);
            });
            for (let i = 6; i <= 22; i++) {
                categories.push(`${i > 12 ? i - 12 : (i === 0 ? 12 : i)} ${i >= 12 ? 'PM' : 'AM'}`);
                data.push(hourlyData[i]);
            }
        } else {
            const dailyDataMap = {};
            completedSales.forEach(sale => {
                const dStr = new Date(sale.saleDate || sale.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                if (!dailyDataMap[dStr]) dailyDataMap[dStr] = 0;
                dailyDataMap[dStr] += Number(sale.totalAmount);
            });
            categories = Object.keys(dailyDataMap);
            data = Object.values(dailyDataMap);
        }

        return {
            chart: {
                type: 'areaspline',
                backgroundColor: 'transparent',
                height: 320,
                style: { fontFamily: 'Inter, sans-serif' }
            },
            title: { text: '' },
            xAxis: {
                categories: categories.length > 0 ? categories : ['No Data'],
                labels: { style: { color: '#64748b', fontWeight: '600', fontSize: '11px' }, autoRotation: [-45, -90] },
                lineWidth: 0,
                tickWidth: 0,
                crosshair: { color: '#e2e8f0', dashStyle: 'Dash' }
            },
            yAxis: {
                title: { text: 'REVENUE (LKR)', align: 'high', style: { color: '#94a3b8', fontSize: '10px', fontWeight: '700', letterSpacing: '1px' } },
                labels: { style: { color: '#94a3b8', fontWeight: '500' } },
                gridLineColor: 'rgba(255,255,255,0.2)',
                gridLineDashStyle: 'Dash'
            },
            tooltip: {
                valuePrefix: 'LKR ',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderColor: 'rgba(255,255,255,0.5)',
                borderRadius: 12,
                shadow: { color: 'rgba(0, 0, 0, 0.1)', offsetX: 0, offsetY: 4, width: 15 },
                style: { color: '#1e293b', fontWeight: 'bold', fontSize: '13px' }
            },
            plotOptions: {
                areaspline: {
                    fillOpacity: 0.5, lineWidth: 3,
                    marker: { enabled: false, states: { hover: { enabled: true, radius: 5 } } },
                    color: '#0ea5e9',
                    fillColor: { linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 }, stops: [ [0, 'rgba(14, 165, 233, 0.4)'], [1, 'rgba(14, 165, 233, 0.0)'] ] }
                }
            },
            legend: { enabled: false }, credits: { enabled: false },
            series: [{ name: dateRange === 'today' ? 'Hourly Revenue' : 'Daily Revenue', data: data.length > 0 ? data : [0] }]
        };
    };

    const getTopMedicinesDonutOptions = () => {
        const colors = ['#0ea5e9', '#10b981', '#8b5cf6', '#f43f5e', '#f59e0b'];
        const data = sortedTopMedicines.slice(0, 4).map((med, index) => ({
            name: med[0],
            y: med[1].qty,
            color: colors[index % colors.length]
        }));

        const topPercentage = data.length > 0 ? Math.round((data[0].y / data.reduce((s, i) => s + i.y, 0)) * 100) : 0;

        return {
            chart: {
                type: 'pie',
                backgroundColor: 'transparent',
                height: 320,
                style: { fontFamily: 'Inter, sans-serif' },
                events: {
                    load: function() {
                        const target = topPercentage;
                        if (target === 0) return;

                        const duration = 1500;
                        const start = performance.now();

                        const animate = (currentTime) => {
                            const elapsed = currentTime - start;
                            const progress = Math.min(elapsed / duration, 1);
                            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                            const currentVal = Math.round(easeOutQuart * target);

                            const element = document.getElementById('animated-percentage-donut');
                            if (element) {
                                element.innerText = currentVal;
                            }

                            if (progress < 1) {
                                requestAnimationFrame(animate);
                            }
                        };
                        requestAnimationFrame(animate);
                    }
                }
            },
            title: {
                text: `<div style="text-align:center; line-height:1;"><span id="animated-percentage-donut" style="font-size:46px; font-weight:900; color:#1e293b; letter-spacing:-1px;">0</span><br/><span style="font-size:10px; color:#94a3b8; font-weight:800; letter-spacing:1.5px; text-transform:uppercase;">Percentage</span></div>`,
                align: 'center',
                verticalAlign: 'middle',
                y: 10,
                useHTML: true
            },
            tooltip: {
                pointFormat: '<b>{point.y} Units</b> ({point.percentage:.1f}%)',
                backgroundColor: 'rgba(255,255,255,0.95)',
                borderColor: 'rgba(255,255,255,0.5)',
                borderRadius: 12,
                shadow: { color: 'rgba(0, 0, 0, 0.1)', offsetX: 0, offsetY: 4, width: 15 },
                style: { color: '#1e293b', fontWeight: 'bold', fontSize: '13px' }
            },
            plotOptions: {
                pie: {
                    animation: {
                        duration: 1500
                    },
                    size: '95%',
                    innerSize: '78%',
                    borderWidth: 4,
                    borderColor: '#ffffff',
                    dataLabels: {
                        enabled: false
                    },
                    showInLegend: true,
                    states: {
                        hover: {
                            halo: {
                                size: 10,
                                opacity: 0.25
                            }
                        }
                    }
                }
            },
            legend: {
                itemStyle: { color: '#64748b', fontWeight: '600', fontSize: '11px' },
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                itemMarginTop: 5
            },
            credits: { enabled: false },
            series: [{ name: 'Quantity Sold', data: data.length > 0 ? data : [{ name: 'No Data', y: 1, color: '#e2e8f0' }] }]
        };
    };

    return (
        <CashierLayout>
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(14, 165, 233, 0.3); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(14, 165, 233, 0.6); }
            `}</style>

            <div className="relative font-sans z-0 min-h-[calc(100vh-6rem)] bg-slate-50/80 backdrop-blur-[24px] rounded-[32px] border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden p-6 mb-4">

                <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply"
                     style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}>
                </div>

                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-sky-200/20 to-slate-300/20 blur-[120px] pointer-events-none z-[-2]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-slate-300/20 to-sky-200/20 blur-[140px] pointer-events-none z-[-2]"></div>

                <div className="relative z-10 w-full h-full flex flex-col gap-6 pb-2">

                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/40 backdrop-blur-md shadow-sm flex items-center justify-center border border-white/60">
                                    <BarChart3 size={20} strokeWidth={2.5} className="text-sky-600" />
                                </div>
                                <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-none">Reports & Analytics</h1>
                            </div>
                            <p className="text-[13px] text-slate-500 mt-1.5 font-medium ml-14">
                                Comprehensive overview of sales, items, customers, and returns
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                    <Filter size={16} strokeWidth={2.5}/>
                                </div>
                                <select
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                    className="appearance-none bg-white/70 border border-white/80 pl-10 pr-10 py-3 rounded-2xl text-[13px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm cursor-pointer"
                                >
                                    <option value="today">Today</option>
                                    <option value="7days">Last 7 Days</option>
                                    <option value="14days">Last 14 Days</option>
                                    <option value="28days">Last 28 Days</option>
                                    <option value="30days">Last 30 Days</option>
                                    <option value="3months">Last 3 Months</option>
                                    <option value="6months">Last 6 Months</option>
                                    <option value="9months">Last 9 Months</option>
                                    <option value="1year">Last 1 Year</option>
                                    <option value="all">All Time</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                </div>
                            </div>
                            <button
                                onClick={downloadCSVReport}
                                className="flex items-center gap-2 bg-sky-500/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl text-[14px] font-bold hover:bg-sky-600 transition-all shadow-[0_10px_25px_-5px_rgba(14,165,233,0.3)] border border-sky-400/50 cursor-pointer active:scale-[0.98]"
                            >
                                <Download size={18} strokeWidth={2.5} /> Download Full Report
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/40 backdrop-blur-md p-5 rounded-[24px] border border-white/60 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp size={18} className="text-emerald-500" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Revenue ({dateRange === 'today' ? 'Today' : 'Period'})</p>
                            </div>
                            <p className="text-[24px] font-black text-slate-800">LKR {totalRevenue.toFixed(2)}</p>
                        </div>

                        <div className="bg-white/40 backdrop-blur-md p-5 rounded-[24px] border border-white/60 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <Package size={18} className="text-indigo-500" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bills Processed</p>
                            </div>
                            <p className="text-[24px] font-black text-slate-800">{totalBills}</p>
                        </div>

                        <div className="bg-white/40 backdrop-blur-md p-5 rounded-[24px] border border-white/60 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <Users size={18} className="text-sky-500" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">New / Total CRM</p>
                            </div>
                            <p className="text-[24px] font-black text-slate-800" title={`New Customers in Period / Total System Customers`}>{rangeNewCustomers} <span className="text-[14px] text-slate-400 font-bold">/ {totalCustomersCount}</span></p>
                        </div>

                        <div className="bg-white/40 backdrop-blur-md p-5 rounded-[24px] border border-white/60 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingDown size={18} className="text-rose-500" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Voided Amount</p>
                            </div>
                            <p className="text-[24px] font-black text-slate-800">LKR {totalReturnsAmount.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 bg-white/30 backdrop-blur-2xl p-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex flex-col gap-2">
                            <div className="flex items-center gap-3 mb-2 px-1">
                                <div className="p-2 bg-white/50 text-sky-600 rounded-xl border border-white/60 shadow-sm">
                                    <CalendarClock size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h2 className="text-[17px] font-bold text-slate-800 tracking-tight">Revenue Trend ({dateRange === 'today' ? 'Hourly' : 'Daily'})</h2>
                                </div>
                            </div>
                            <div className="w-full mt-2">
                                <HighchartsReact highcharts={Highcharts} options={getChartOptions()} />
                            </div>
                        </div>

                        <div className="xl:col-span-1 bg-white/30 backdrop-blur-2xl p-7 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex flex-col gap-2">
                            <div className="flex items-center gap-3 mb-2 px-1">
                                <div className="p-2 bg-white/50 text-emerald-600 rounded-xl border border-white/60 shadow-sm">
                                    <Activity size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h2 className="text-[17px] font-bold text-slate-800 tracking-tight">Top Selling</h2>
                                </div>
                            </div>
                            <div className="w-full mt-2 flex-1 flex items-center justify-center">
                                <div className="w-full">
                                    <HighchartsReact
                                        key={`donut-chart-${dateRange}`}
                                        highcharts={Highcharts}
                                        options={getTopMedicinesDonutOptions()}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                        <div className="bg-white/30 backdrop-blur-2xl p-5 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-white/50 flex-1 overflow-hidden flex flex-col">
                            <h3 className="text-[13px] font-bold text-slate-800 flex items-center gap-2 mb-3"><Pill size={16} className="text-indigo-500"/> Top Selling Medicines (List)</h3>
                            <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 max-h-[160px]">
                                {sortedTopMedicines.length === 0 ? <p className="text-xs text-slate-500">No sales data yet.</p> :
                                    sortedTopMedicines.map(([name, data], idx) => (
                                        <div key={idx} className="flex justify-between items-center mb-2 bg-white/40 p-2 rounded-lg border border-white/60">
                                            <span className="text-[12px] font-bold text-slate-700 truncate w-[200px]">{name}</span>
                                            <div className="text-right">
                                                <span className="text-[12px] font-black text-sky-600 block">{data.qty} Units</span>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        <div className="bg-rose-50/40 backdrop-blur-2xl p-5 rounded-[32px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] border border-rose-100/50 flex-1 overflow-hidden flex flex-col">
                            <h3 className="text-[13px] font-bold text-slate-800 flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-rose-500"/> Voided Medicines (List)</h3>
                            <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 max-h-[160px]">
                                {sortedVoidedMedicines.length === 0 ? <p className="text-xs text-slate-500">No voids in this period.</p> :
                                    sortedVoidedMedicines.map(([name, data], idx) => (
                                        <div key={idx} className="flex justify-between items-center mb-2 bg-white/50 p-2 rounded-lg border border-rose-100/50">
                                            <span className="text-[12px] font-bold text-slate-700 truncate w-[200px]">{name}</span>
                                            <div className="text-right">
                                                <span className="text-[12px] font-black text-rose-600 block">{data.qty} Units</span>
                                                <span className="text-[10px] font-bold text-slate-400">LKR {data.value.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] border border-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] overflow-hidden flex flex-col mt-2">
                        <div className="p-6 border-b border-white/30 flex flex-col lg:flex-row justify-between gap-4 bg-white/10">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[16px] font-bold text-slate-800 ml-2">Transactions Log</h2>
                                <span className="text-[11px] font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-md border border-sky-200">{displaySales.length} Total</span>
                            </div>
                            <div className="relative w-full lg:w-80">
                                <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search Invoice or Customer..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/60 border border-white/80 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto px-8 py-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                <tr>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md">Invoice #</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md">Time / Date</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md">Customer / RX Info</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md">Items Qty</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md text-right">Total (LKR)</th>
                                    <th className="pb-4 pt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/30 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md text-right">Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center py-16 text-slate-500 font-medium text-[13px]">Loading transactions...</td></tr>
                                ) : filteredDisplaySales.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-16 text-slate-500 font-medium text-[13px]"><div className="flex items-center justify-center gap-2"><FileText size={16}/> No transactions found for this period.</div></td></tr>
                                ) : (
                                    filteredDisplaySales.map((sale) => {
                                        const itemCount = sale.items && Array.isArray(sale.items) ? sale.items.reduce((sum, item) => sum + Number(item.quantity), 0) : 0;

                                        return (
                                            <tr key={sale.saleId || sale.id} className={`group hover:bg-white/40 transition-colors border-b border-white/30 last:border-0 ${sale.status === 'Voided' ? 'opacity-60 bg-rose-50/20' : ''}`}>
                                                <td className="py-4 font-mono text-[13px] font-bold text-slate-800 align-top pt-5">
                                                    {String(sale.saleId || sale.id).slice(0, 8).toUpperCase()}
                                                </td>
                                                <td className="py-4 text-[13px] font-medium text-slate-600 align-top pt-5">
                                                    {new Date(sale.saleDate || sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    <span className="block text-[10px] text-slate-400 font-bold mt-0.5">{new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</span>
                                                </td>
                                                <td className="py-4 align-top pt-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[13px] font-semibold text-slate-700">
                                                            {sale.customerName || 'Walk-in Customer'}
                                                        </span>
                                                        {sale.prescriptionId && (
                                                            <span className="text-[10px] font-bold flex items-center gap-1 text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded w-fit border border-indigo-100">
                                                                <FileSignature size={12}/> RX-{String(sale.prescriptionId).padStart(4, '0')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 align-top pt-5">
                                                    <span className="text-[13px] font-bold text-slate-600 bg-white/50 px-2.5 py-1 rounded-lg border border-white/80 shadow-sm">
                                                        {itemCount} Items
                                                    </span>
                                                </td>
                                                <td className="py-4 text-[14px] font-bold text-sky-700 text-right pr-4 align-top pt-5">
                                                    {Number(sale.totalAmount).toFixed(2)}
                                                </td>
                                                <td className="py-4 text-right align-top pt-5">
                                                    {sale.status === 'Completed' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100/50 border border-emerald-200/50 text-emerald-600 rounded-lg text-[11px] font-bold shadow-sm">
                                                            <CheckCircle size={12}/> Completed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100/50 border border-rose-200/50 text-rose-600 rounded-lg text-[11px] font-bold shadow-sm">
                                                            <Ban size={12}/> Voided
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </CashierLayout>
    );
}