import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { loginUser } from '../../services/authService';
import { Mail, Lock, ArrowRight, ShieldCheck, UserCog, Pill, Activity, User } from 'lucide-react';

const Login = () => {
    const { login } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await loginUser(email, password);
            login(data.user, data.token);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoFill = (demoEmail, demoPassword) => {
        setEmail(demoEmail);
        setPassword(demoPassword);
        setError('');
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans overflow-hidden relative z-0">

            <div className="absolute inset-0 z-[-3] opacity-[0.03] pointer-events-none mix-blend-multiply"
                 style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzBmMzQ2MCIvPjwvc3ZnPg==')" }}>
            </div>

            <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-sky-200/30 to-slate-300/30 blur-[120px] pointer-events-none z-[-2]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-slate-300/30 to-indigo-200/30 blur-[140px] pointer-events-none z-[-2]"></div>

            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center p-16 z-10 border-r border-white/40 bg-white/20 backdrop-blur-sm">

                <div className="absolute top-10 left-12 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-sky-50 flex items-center justify-center border border-sky-100 shadow-sm">
                        <Pill className="text-sky-600 transform -rotate-12" size={22} />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-1.5 pb-0.5">
                            <span className="text-[22px] font-bold text-slate-700 tracking-tight">Kegalle</span>
                            <span className="text-[22px] font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent tracking-tight pr-1 pb-1">Ph4Life</span>
                        </div>
                        <p className="text-[10px] font-bold text-sky-500 uppercase tracking-[0.15em] ml-0.5">Pharmacy System</p>
                    </div>
                </div>

                <div className="relative w-full max-w-lg mt-12 flex flex-col">
                    <div className="relative w-full aspect-square max-h-[350px] mb-8 flex justify-center items-center">
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-2xl rounded-[40px] border border-white/60 shadow-[0_32px_64px_-12px_rgba(31,38,135,0.1)] transform -rotate-6 transition-transform duration-700 hover:rotate-0 flex flex-col p-6 overflow-hidden">

                            <div className="w-full h-12 bg-white/60 rounded-xl mb-4 flex items-center px-4 gap-3 border border-white/80">
                                <div className="w-3 h-3 rounded-full bg-rose-400 text-rose-500"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                            </div>
                            <div className="flex gap-4 flex-1">
                                <div className="w-1/3 bg-white/50 rounded-xl border border-white/80 flex items-center justify-center">
                                    <Activity className="text-sky-500/50 w-12 h-12" />
                                </div>
                                <div className="w-2/3 flex flex-col gap-4">
                                    <div className="h-1/2 bg-white/50 rounded-xl border border-white/80 p-4 relative overflow-hidden">
                                        <div className="w-16 h-16 rounded-full border-4 border-indigo-300/50 absolute -bottom-4 -right-4"></div>
                                    </div>
                                    <div className="h-1/2 bg-white/50 rounded-xl border border-white/80 flex items-center px-4">
                                        <div className="w-full h-2 bg-slate-200/50 rounded-full overflow-hidden">
                                            <div className="w-[70%] h-full bg-sky-400"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-6 bg-sky-500/90 backdrop-blur-md rounded-full shadow-[0_10px_30px_rgba(14,165,233,0.3)] border border-sky-400/50">
                                <ShieldCheck className="text-white w-16 h-16" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-800 leading-[1.1] tracking-tight mb-4 drop-shadow-sm">
                            Everything Kegalle Ph4Life runs on, in one place.
                        </h1>
                        <p className="text-slate-500 text-lg font-medium max-w-md leading-relaxed">
                            One secure system for inventory, prescriptions, sales, and comprehensive analytics reporting.
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">

                <div className="lg:hidden absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-sky-200/40 blur-[80px] pointer-events-none z-0"></div>

                <div className="w-full max-w-[420px] bg-white/60 backdrop-blur-2xl p-10 py-12 rounded-[40px] border border-white/80 shadow-[0_20px_60px_-10px_rgba(31,38,135,0.05)] flex flex-col items-center">

                    <div className="w-24 h-24 rounded-full bg-white/80 flex items-center justify-center mb-8 border border-white shadow-sm">
                        <User size={48} className="text-slate-300" strokeWidth={1.5} />
                    </div>

                    <div className="w-full mb-6 text-center">
                        <h2 className="text-[28px] font-extrabold text-[#1e293b] tracking-tight leading-tight mb-2">Welcome back</h2>
                        <p className="text-[14px] text-slate-500 font-medium">Sign in with your staff account to continue.</p>
                    </div>

                    <div className="w-full">
                        {error && (
                            <div className="bg-rose-50 border border-rose-200/60 text-rose-600 px-4 py-3 rounded-2xl mb-6 text-[13px] font-bold text-center flex items-center justify-center gap-2 shadow-sm animate-in fade-in zoom-in duration-200">
                                <ShieldCheck size={16} /> {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4 w-full">

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">Email ID or Username</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail size={18} className="text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm"
                                        placeholder="admin@pharmacy.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-slate-400" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm backdrop-blur-sm tracking-widest"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[12px] font-medium text-slate-500 pt-1 px-1">
                                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 transition-colors">
                                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-sky-500 focus:ring-sky-500 cursor-pointer" />
                                    Remember me
                                </label>
                                <a href="#" className="hover:text-sky-600 font-bold transition-colors cursor-pointer">Forgot Password?</a>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 flex items-center justify-center gap-2 bg-sky-500/90 backdrop-blur-md text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(14,165,233,0.4)] hover:bg-sky-600 transition-all active:scale-[0.98] text-[15px] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed border border-sky-400/50"
                            >
                                {loading ? 'Authenticating...' : 'LOGIN'}
                                {!loading && <ArrowRight size={18} strokeWidth={2.5} />}
                            </button>
                        </form>
                    </div>

                    <div className="w-full mt-8 pt-6 border-t border-slate-200/50">
                        <div className="text-center mb-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Demo Accounts — Tap to autofill
                            </span>
                        </div>

                        <div className="space-y-3">
                            <div
                                onClick={() => handleDemoFill('admin@pharmacy.com', 'adminpassword123')}
                                className="flex justify-between items-center p-3 rounded-xl border border-white/60 bg-white/40 hover:bg-white/80 cursor-pointer transition-colors shadow-sm group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                        <ShieldCheck size={16} />
                                    </div>
                                    <span className="text-[13px] font-bold text-slate-700">Administrator</span>
                                </div>
                                <span className="text-[11px] font-medium text-slate-400 font-mono">admin / adminpassword123</span>
                            </div>

                            <div
                                onClick={() => handleDemoFill('manager@pharmacy.com', 'manager123')}
                                className="flex justify-between items-center p-3 rounded-xl border border-white/60 bg-white/40 hover:bg-white/80 cursor-pointer transition-colors shadow-sm group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg group-hover:bg-sky-100 transition-colors">
                                        <UserCog size={16} />
                                    </div>
                                    <span className="text-[13px] font-bold text-slate-700">Manager</span>
                                </div>
                                <span className="text-[11px] font-medium text-slate-400 font-mono">manager / manager123</span>
                            </div>

                            <div
                                onClick={() => handleDemoFill('pharmacist@pharmacy.com', 'pharma123')}
                                className="flex justify-between items-center p-3 rounded-xl border border-white/60 bg-white/40 hover:bg-white/80 cursor-pointer transition-colors shadow-sm group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors">
                                        <Activity size={16} />
                                    </div>
                                    <span className="text-[13px] font-bold text-slate-700">Pharmacist</span>
                                </div>
                                <span className="text-[11px] font-medium text-slate-400 font-mono">pharmacist / pharma123</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
};

export default Login;