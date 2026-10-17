import React, { useContext, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { LogOut, User, ChevronLeft, ChevronRight, ShoppingCart, Bell, LayoutDashboard, Star, FileText, BarChart, X, CheckCircle } from 'lucide-react';

import api from '../../api/axiosInstance';
import io from 'socket.io-client';
import profileImg from '../../assets/profile.png';
import logoImage from '../../assets/logo.png';

const CASHIER_LINKS = [
    { to: '/cashier-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/cashier-crm', label: 'CRM & Loyalty', icon: Star },
    { to: '/cashier-prescriptions', label: 'Prescriptions', icon: FileText },
    { to: '/pos', label: 'POS Billing', icon: ShoppingCart },
    { to: '/cashier-reports', label: 'Reports & Analytics', icon: BarChart }
];

export default function CashierLayout({ children }) {
    const { logout, user } = useContext(AuthContext);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try { return sessionStorage.getItem('cashierSidebarCollapsed') === 'true'; }
        catch { return false; }
    });

    const toggleSidebar = () => {
        const next = !isCollapsed;
        try { sessionStorage.setItem('cashierSidebarCollapsed', String(next)); } catch {}
        setIsCollapsed(next);
    };

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notificationError, setNotificationError] = useState('');
    const unreadCount = notifications.length;

    useEffect(() => { setNotifications([]); }, [user?.id]);

    useEffect(() => {
        let active = true;
        let pending = false;
        const controller = new AbortController();

        const fetchNotifications = async () => {
            if (pending) return;
            pending = true;

            try {
                const token = localStorage.getItem('token');
                const response = await api.get('http://localhost:5000/api/notifications/unread', {
                    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
                    signal: controller.signal
                });

                if (active) {
                    if (!Array.isArray(response.data)) throw new Error('Invalid notifications response');
                    setNotifications(response.data);
                    setNotificationError('');
                }
            } catch (error) {
                if (active && !controller.signal.aborted) {
                    setNotificationError('Unable to load notifications. Please try again.');
                }
            } finally {
                pending = false;
            }
        };

        fetchNotifications();

        const socket = io('http://localhost:5000', {
            transports: ['websocket'],
            reconnection: true
        });

        socket.on('receive_notification', fetchNotifications);

        const interval = setInterval(fetchNotifications, 300000);

        return () => {
            active = false;
            controller.abort();
            clearInterval(interval);
            socket.off('receive_notification', fetchNotifications);
            socket.disconnect();
        };
    }, [user?.id, isDropdownOpen]);

    const handleNotificationClick = async (id) => {
        try {
            const token = localStorage.getItem('token');

            await api.put(
                `http://localhost:5000/api/notifications/${id}/read`,
                {},
                token ? { headers: { Authorization: `Bearer ${token}` } } : {}
            );

            setNotifications(previous => previous.filter(note => note.id !== id));
            setNotificationError('');
        } catch {
            setNotificationError('Unable to clear notification. Please try again.');
        }
    };

    const toggleDropdown = () => {
        setIsProfileOpen(false);
        setIsDropdownOpen(open => !open);
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
            <style>{`
                .hover-scroll::-webkit-scrollbar { width: 6px; background-color: transparent; }
                .hover-scroll::-webkit-scrollbar-thumb { background-color: transparent; border-radius: 10px; }
                .hover-scroll:hover::-webkit-scrollbar-thumb { background-color: #cbd5e1; }
            `}</style>

            <aside
                className={`relative my-4 ml-4 h-[calc(100vh-32px)] bg-[#343638] rounded-[32px] border border-white/10 transition-all duration-300 ease-in-out flex flex-col flex-shrink-0 z-40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] ${
                    isCollapsed ? 'w-24' : 'w-72'
                }`}
            >
                <button
                    onClick={toggleSidebar}
                    className="absolute -right-3.5 top-10 bg-[#414345] border border-white/10 rounded-full p-1.5 shadow-sm hover:bg-white/5 transition-all z-50 hover:scale-110 cursor-pointer flex items-center justify-center text-slate-200 hover:text-white"
                >
                    {isCollapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronLeft size={18} strokeWidth={2.5} />}
                </button>

                <div className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-8'} mb-8 mt-8 transition-all duration-300`}>
                    {!isCollapsed ? (
                        <div className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap transition-opacity duration-300 w-full">
                            <img src={logoImage} alt="Ph4Life Logo" className="w-9 h-9 object-contain flex-shrink-0 drop-shadow-sm" />
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-1.5 pb-0.5">
                                    <span className="text-[22px] font-bold text-white tracking-tight">Kegalle</span>
                                    <span className="text-[22px] font-black bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent tracking-tight pr-1 pb-1">Ph4Life</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.15em] ml-0.5">Cashier Terminal</p>
                            </div>
                        </div>
                    ) : (
                        <img src={logoImage} alt="Ph4Life Logo" className="w-9 h-9 object-contain flex-shrink-0 drop-shadow-sm" />
                    )}
                </div>

                <nav className="space-y-1.5 px-4 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {CASHIER_LINKS.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            title={isCollapsed ? label : ""}
                            className={({ isActive }) =>
                                `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3.5 px-5'} py-3.5 rounded-2xl text-[14px] font-bold transition-all duration-200 group ${
                                    isActive
                                        ? 'bg-transparent text-sky-200 shadow-[inset_3px_0_0_0_#7dd3fc] border border-transparent'
                                        : 'text-slate-200 hover:bg-white/5 hover:text-white border border-transparent'
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

                <div className="p-4 mt-auto border-t border-white/10 flex flex-col gap-2">
                    <button
                        onClick={logout}
                        title="Logout"
                        className={`flex items-center justify-center gap-2 w-full py-3 bg-transparent text-rose-200 rounded-2xl hover:bg-white/5 hover:text-rose-100 transition-colors font-bold text-[14px] cursor-pointer border border-transparent ${isCollapsed ? 'px-0' : 'px-4'}`}
                    >
                        <LogOut size={18} strokeWidth={2.5} />
                        {!isCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden relative">

                <header className="flex justify-end items-center px-8 pt-6 pb-2 z-30 bg-transparent">
                    <div className="flex items-center gap-5">

                        <div className="hidden md:block mr-2">
                            <span className="text-[13px] font-bold text-slate-500 tracking-wide">
                                {formattedDate}
                            </span>
                        </div>

                        <div className="relative">
                            <button
                                onClick={toggleDropdown}
                                className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all relative cursor-pointer text-slate-500 hover:text-sky-600"
                            >
                                <Bell size={18} strokeWidth={2.5} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-blue-600 border-2 border-white text-white text-[10px] font-bold flex items-center justify-center" aria-live="polite">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_12px_40px_-10px_rgba(15,23,42,0.15)] border border-slate-200 overflow-hidden z-50">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shadow-sm">{unreadCount} New</span>
                                        )}
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto hover-scroll">
                                        {notificationError && (
                                            <p role="alert" className="p-4 text-xs text-rose-600">
                                                {notificationError}
                                            </p>
                                        )}
                                        {notifications.length === 0 && !notificationError ? (
                                            <div className="p-6 text-center text-sm text-slate-400 font-medium">No new notifications</div>
                                        ) : (
                                            notifications.map((note) => (
                                                <div key={note.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                                                    <p className="text-xs font-bold text-slate-700 mb-0.5">{note.title}</p>
                                                    <p className="text-[11px] text-slate-500 leading-relaxed">{note.message}</p>

                                                    <div className="flex items-center justify-between mt-3">
                                                        <p className="text-[9px] text-sky-500 font-semibold">
                                                            {new Date(note.createdAt || note.time || new Date()).toLocaleString()}
                                                        </p>
                                                        <button
                                                            onClick={() => handleNotificationClick(note.id)}
                                                            className="flex items-center gap-1.5 text-[10px] font-bold text-sky-600 hover:text-white bg-sky-50 hover:bg-sky-500 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
                                                        >
                                                            <CheckCircle size={12} strokeWidth={2.5} /> Clear
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => { setIsDropdownOpen(false); setIsProfileOpen(true); }}
                            className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center cursor-pointer hover:bg-slate-50 hover:text-sky-600 text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                        >
                            <User size={18} strokeWidth={2.5} />
                        </button>

                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 pb-8 pt-2 z-10 custom-scrollbar">
                    <div className="mx-auto w-full h-full">
                        {children}
                    </div>
                </main>
            </div>

            {isProfileOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-sm"
                        onClick={() => setIsProfileOpen(false)}
                    />
                    <aside
                        role="dialog"
                        aria-modal="true"
                        aria-label="Cashier profile"
                        className="fixed top-4 right-4 h-[calc(100vh-32px)] w-80 bg-white rounded-[32px] border border-slate-200 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] z-50"
                    >
                        <div className="p-6 h-full flex flex-col overflow-y-auto">
                            <div className="flex justify-between items-center mb-8">
                                <button
                                    aria-label="Close profile"
                                    onClick={() => setIsProfileOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                                <button
                                    onClick={logout}
                                    className="flex items-center gap-2 text-slate-500 hover:text-sky-600 font-bold text-[13px] cursor-pointer"
                                >
                                    Logout <LogOut size={16} />
                                </button>
                            </div>
                            <div className="flex flex-col items-center mb-8">
                                <img
                                    src={profileImg}
                                    alt="Profile"
                                    className="w-[100px] h-[100px] object-cover rounded-full border-4 border-white shadow-[0_8px_24px_rgba(14,165,233,0.15)] mb-4"
                                />
                                <h2 className="text-[18px] font-extrabold text-slate-800">
                                    {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'Cashier'}
                                </h2>
                                <p className="text-[13px] font-medium text-slate-400 mt-0.5">
                                    {user?.role || 'Cashier'}
                                </p>
                                {user?.email && (
                                    <p className="text-sm text-slate-500 mt-3 break-all text-center">
                                        {user.email}
                                    </p>
                                )}
                            </div>
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
}