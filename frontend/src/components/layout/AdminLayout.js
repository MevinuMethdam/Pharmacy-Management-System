import React, { useState, useContext, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Package,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Bell,
    ShoppingCart,
    FileText,
    ShieldAlert,
    Star,
    Truck,
    X,
    Activity,
    CheckCircle,
    User,
    Radar
} from 'lucide-react';
import io from 'socket.io-client';

import profileImg from '../../assets/profile.png';

const socket = io('http://localhost:5000');

const ADMIN_LINKS = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/suppliers', label: 'Suppliers', icon: Truck },
    { to: '/admin/inventory', label: 'Inventory', icon: Package },
    { to: '/admin/crm', label: 'CRM & Loyalty', icon: Star },
    { to: '/admin/prescriptions', label: 'Prescriptions', icon: FileText },
    { to: '/pos', label: 'POS Billing', icon: ShoppingCart },
    { to: '/admin/nmra-logs', label: 'NMRA Logs', icon: ShieldAlert },
    { to: '/admin/ai-outbreak', label: 'AI Outbreak Radar', icon: Radar }
];

export default function AdminLayout({ children }) {
    const { logout, user } = useContext(AuthContext);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const [notifications, setNotifications] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        socket.on('receive_notification', (data) => {
            setNotifications((prev) => [data, ...prev]);
            setUnreadCount((prev) => prev + 1);
        });

        return () => {
            socket.off('receive_notification');
        };
    }, []);

    const markAsRead = () => {
        setUnreadCount(0);
        setIsDropdownOpen(!isDropdownOpen);
    };
    const getInitials = () => {
        if (!user) return 'AD';
        const first = user.firstName ? user.firstName[0] : '';
        const last = user.lastName ? user.lastName[0] : '';
        return (first + last).toUpperCase() || 'AD';
    };

    const formattedDate = useMemo(() => {
        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'short' });
        const year = d.getFullYear();
        const weekday = d.toLocaleString('en-US', { weekday: 'long' });
        return `${day} ${month} ${year}, ${weekday}`;
    }, []);

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">

            <aside
                className={`relative my-4 ml-4 h-[calc(100vh-32px)] bg-white rounded-[32px] border border-slate-200 transition-all duration-300 ease-in-out flex flex-col flex-shrink-0 z-40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] ${
                    isCollapsed ? 'w-24' : 'w-72'
                }`}
            >
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3.5 top-10 bg-white border border-slate-200 rounded-full p-1.5 shadow-sm hover:bg-slate-50 transition-all z-50 hover:scale-110 cursor-pointer flex items-center justify-center text-slate-400 hover:text-sky-600"
                >
                    {isCollapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronLeft size={18} strokeWidth={2.5} />}
                </button>

                <div className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-8'} mb-8 mt-8 transition-all duration-300`}>

                    {!isCollapsed && (
                        <div className="overflow-hidden whitespace-nowrap transition-opacity duration-300 w-full">
                            <div className="flex items-baseline gap-1.5 pb-0.5">
                                <span className="text-[22px] font-bold text-slate-700 tracking-tight">Kegalle</span>
                                <span className="text-[22px] font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent tracking-tight pr-1 pb-1">Ph4Life</span>
                            </div>
                            <p className="text-[10px] font-bold text-sky-500 uppercase tracking-[0.15em] ml-0.5">Pharmacy System</p>
                        </div>
                    )}

                    {isCollapsed && (
                        <span className="font-black text-[22px] bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent pb-1 pr-1">
                            Ph
                        </span>
                    )}
                </div>

                <nav className="space-y-1.5 px-4 flex-1 overflow-y-auto hide-scrollbar">
                    {ADMIN_LINKS.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/admin'}
                            title={isCollapsed ? label : ""}
                            className={({ isActive }) =>
                                `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3.5 px-5'} py-3.5 rounded-2xl text-[14px] font-bold transition-all duration-200 group ${
                                    isActive
                                        ? 'bg-sky-50 text-sky-700 shadow-sm border border-sky-100/50'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
                                }`
                            }
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${!isCollapsed && 'group-hover:scale-110'}`} />
                            {!isCollapsed && (
                                <span className="whitespace-nowrap">{label}</span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 mt-auto border-t border-slate-100 flex flex-col gap-2">
                    <button
                        onClick={logout}
                        title="Logout"
                        className={`flex items-center justify-center gap-2 w-full py-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 hover:text-rose-700 transition-colors font-bold text-[14px] cursor-pointer border border-rose-100/50 ${isCollapsed ? 'px-0' : 'px-4'}`}
                    >
                        <LogOut size={18} strokeWidth={2.5} />
                        {!isCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden relative">

                <div className="flex justify-end items-center px-8 pt-6 pb-2 z-30 bg-transparent">
                    <div className="flex items-center gap-5">

                        <div className="hidden md:block mr-2">
                            <span className="text-[13px] font-bold text-slate-400 tracking-wide">
                                {formattedDate}
                            </span>
                        </div>

                        <div className="relative">
                            <button
                                onClick={markAsRead}
                                className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all relative cursor-pointer text-slate-500 hover:text-sky-600"
                            >
                                <Bell size={18} strokeWidth={2.5} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white"></span>
                                    </span>
                                )}
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_12px_40px_-10px_rgba(15,23,42,0.15)] border border-slate-200 overflow-hidden z-50">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                                        <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full shadow-sm">{notifications.length} New</span>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-6 text-center text-sm text-slate-400 font-medium">No new notifications</div>
                                        ) : (
                                            notifications.map((note) => (
                                                <div key={note.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                    <p className="text-xs font-bold text-slate-700 mb-0.5">{note.title}</p>
                                                    <p className="text-[11px] text-slate-500 leading-relaxed">{note.message}</p>
                                                    <p className="text-[9px] text-sky-500 mt-2 font-semibold">{new Date(note.time).toLocaleTimeString()}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setIsProfileOpen(true)}
                            className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center cursor-pointer hover:bg-slate-50 hover:text-sky-600 text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                        >
                            <User size={18} strokeWidth={2.5} />
                        </button>

                    </div>
                </div>

                <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 pb-8 pt-2">
                    {children}
                </main>
            </div>

            {isProfileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsProfileOpen(false)}
                ></div>
            )}

            <aside
                className={`fixed top-4 right-4 h-[calc(100vh-32px)] w-80 bg-white rounded-[32px] border border-slate-200 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] z-50 transform transition-transform duration-300 ease-in-out ${isProfileOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}
            >
                <div className="p-6 h-full flex flex-col overflow-y-auto hide-scrollbar">

                    <div className="flex justify-between items-center mb-8">
                        <button onClick={() => setIsProfileOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                            <X size={20} />
                        </button>
                        <button onClick={logout} className="flex items-center gap-2 text-slate-500 hover:text-sky-600 font-bold text-[13px] transition-colors cursor-pointer">
                            Logout <LogOut size={16} />
                        </button>
                    </div>

                    <div className="flex flex-col items-center mb-8">
                        <div className="relative w-[100px] h-[100px] rounded-full border-4 border-white shadow-[0_8px_24px_rgba(14,165,233,0.15)] mb-4">
                            <img src={profileImg} alt="Profile" className="w-full h-full object-cover rounded-full bg-slate-50" />

                            <div className="absolute bottom-1 right-0 w-6 h-6 bg-sky-500 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-lg leading-none shadow-sm cursor-pointer hover:bg-sky-600 transition-colors">
                                +
                            </div>
                        </div>
                        <h2 className="text-[18px] font-extrabold text-slate-800 tracking-tight">
                            {user?.firstName ? `${user.firstName} ${user.lastName}` : 'Anna Morrison'}
                        </h2>
                        <p className="text-[13px] font-medium text-slate-400 mt-0.5">
                            {user?.role || 'Administrator'}
                        </p>
                    </div>

                    <div className="space-y-5 mb-8 px-2">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <div className="flex gap-3 items-center">
                                    <span className="text-[12px] font-bold text-slate-800">EFF</span>
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-bold text-slate-700">System Efficiency</span>
                                        <span className="text-[10px] text-slate-400 font-medium">High performance</span>
                                    </div>
                                </div>
                                <div className="w-16 bg-slate-100 rounded-full h-1.5">
                                    <div className="bg-sky-500 h-1.5 rounded-full w-[85%]"></div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <div className="flex gap-3 items-center">
                                    <span className="text-[12px] font-bold text-slate-800">TSK</span>
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-bold text-slate-700">Tasks Completed</span>
                                        <span className="text-[10px] text-slate-400 font-medium">Advanced</span>
                                    </div>
                                </div>
                                <div className="w-16 bg-slate-100 rounded-full h-1.5">
                                    <div className="bg-indigo-500 h-1.5 rounded-full w-[65%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-2">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[14px] font-extrabold text-slate-800 tracking-tight">Reminders</h3>
                            <Bell size={14} className="text-rose-400" />
                        </div>
                        <div className="space-y-4">

                            {notifications.length > 0 ? (
                                notifications.slice(0, 3).map((note, idx) => (
                                    <div key={idx} className="flex gap-3 items-start p-1 cursor-pointer group">
                                        <div className="p-1.5 bg-rose-50 text-rose-500 rounded-full mt-0.5 group-hover:scale-110 transition-transform"><ShieldAlert size={12} /></div>
                                        <div>
                                            <p className="text-[12px] font-bold text-slate-700 group-hover:text-sky-600 transition-colors">{note.title}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{new Date(note.time).toLocaleDateString()}, {new Date(note.time).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <>
                                    <div className="flex gap-3 items-start p-1 cursor-pointer group">
                                        <div className="p-1.5 bg-rose-50 text-rose-400 rounded-full mt-0.5 group-hover:scale-110 transition-transform"><ShieldAlert size={12} /></div>
                                        <div>
                                            <p className="text-[12px] font-bold text-slate-700 group-hover:text-sky-600 transition-colors">Sys - Check Low Stock</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">24 Sep 2026, Friday</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start p-1 cursor-pointer group">
                                        <div className="p-1.5 bg-sky-50 text-sky-400 rounded-full mt-0.5 group-hover:scale-110 transition-transform"><FileText size={12} /></div>
                                        <div>
                                            <p className="text-[12px] font-bold text-slate-700 group-hover:text-sky-600 transition-colors">Rx - Verify Prescriptions</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">29 Sep 2026, Wednesday</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start p-1 cursor-pointer group">
                                        <div className="p-1.5 bg-indigo-50 text-indigo-400 rounded-full mt-0.5 group-hover:scale-110 transition-transform"><Activity size={12} /></div>
                                        <div>
                                            <p className="text-[12px] font-bold text-slate-700 group-hover:text-sky-600 transition-colors">Admin - System Audit</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">05 Oct 2026, Monday</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                </div>
            </aside>

        </div>
    );
}