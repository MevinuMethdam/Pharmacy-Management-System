import React, { useContext, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { LogOut, User, Pill, ChevronLeft, ChevronRight, ShoppingCart, Bell, LayoutDashboard } from 'lucide-react';

const CASHIER_LINKS = [
    { to: '/cashier-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/pos', label: 'POS Billing', icon: ShoppingCart }
];

export default function CashierLayout({ children }) {
    const { logout, user } = useContext(AuthContext);
    const [isCollapsed, setIsCollapsed] = useState(false);

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
                    {!isCollapsed ? (
                        <div className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap transition-opacity duration-300 w-full">
                            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100 flex-shrink-0">
                                <Pill className="text-sky-600 transform -rotate-12" size={18} />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-1.5 pb-0.5">
                                    <span className="text-[22px] font-bold text-slate-700 tracking-tight">Kegalle</span>
                                    <span className="text-[22px] font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent tracking-tight pr-1 pb-1">Ph4Life</span>
                                </div>
                                <p className="text-[10px] font-bold text-sky-500 uppercase tracking-[0.15em] ml-0.5">Cashier Terminal</p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100 flex-shrink-0">
                            <Pill className="text-sky-600 transform -rotate-12" size={18} />
                        </div>
                    )}
                </div>

                <nav className="space-y-1.5 px-4 flex-1 overflow-y-auto hover-scroll">
                    {CASHIER_LINKS.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
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
                        className={`flex items-center justify-center gap-2 w-full py-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 hover:text-rose-600 transition-colors font-bold text-[14px] cursor-pointer border border-rose-100/50 ${isCollapsed ? 'px-0' : 'px-4'}`}
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
                            <button className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all cursor-pointer text-slate-500 hover:text-sky-600">
                                <Bell size={18} strokeWidth={2.5} />
                                <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-400 border-2 border-white"></span>
                                </span>
                            </button>
                        </div>

                        <button className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center cursor-pointer hover:bg-slate-50 hover:text-sky-600 text-slate-500 transition-all">
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
        </div>
    );
}