import React, { useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { LogOut, User, Pill } from 'lucide-react';

export default function CashierLayout({ children }) {
    const { logout, user } = useContext(AuthContext);

    const formattedDate = useMemo(() => {
        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'short' });
        const year = d.getFullYear();
        const weekday = d.toLocaleString('en-US', { weekday: 'long' });
        return `${day} ${month} ${year}, ${weekday}`;
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">

            <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-20 shadow-sm relative">

                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100 shadow-sm">
                        <Pill className="text-sky-600 transform -rotate-12" size={20} />
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-[18px] font-bold text-slate-700 tracking-tight">Kegalle</span>
                            <span className="text-[18px] font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent tracking-tight">Ph4Life</span>
                        </div>
                        <p className="text-[9px] font-bold text-sky-500 uppercase tracking-widest mt-0.5">Cashier Terminal</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:block">
                        <span className="text-[13px] font-bold text-slate-400 tracking-wide">
                            {formattedDate}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
                        <div className="flex flex-col items-end">
                            <span className="text-[13px] font-bold text-slate-700">
                                {user?.name || 'Cashier User'}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Shift
                            </span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-500 shadow-sm">
                            <User size={18} />
                        </div>
                        <button
                            onClick={logout}
                            className="ml-1 w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                            title="Logout"
                        >
                            <LogOut size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-sky-200/20 to-slate-300/20 blur-[100px]"></div>
            </div>

            <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 z-10 relative">
                {children}
            </main>

        </div>
    );
}