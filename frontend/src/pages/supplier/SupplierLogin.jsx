import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Mail, Lock, ShieldCheck, HeartPulse, AlertCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

import supplyImage from '../../assets/ChatGPT-Image-Mar-16-2026-12_53_08-AM-1.webp';
import logoImage from '../../assets/logo.png';

export default function SupplierLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [authError, setAuthError] = useState('');

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');

        try {
            const res = await axios.post('http://localhost:5000/api/auth/supplier-login', {
                email,
                password
            });

            login(res.data.user, res.data.token);
            navigate('/supplier/dashboard');
            toast.success('Welcome to Supplier Portal! 🎉');

        } catch (err) {
            console.error("Login Error:", err.response?.data);
            const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Login failed. Check your credentials.';

            setAuthError(errorMsg);
            toast.error('Login request failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-screen bg-slate-50 font-sans overflow-hidden">

            <div className="hidden lg:flex lg:w-1/2 relative m-4 rounded-[32px] overflow-hidden shadow-lg border border-slate-200/60">
                <img
                    src={supplyImage}
                    alt="Hospital & Pharmacy Supply"
                    className="absolute inset-0 w-full h-full object-cover transform scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-800/60 to-slate-900/40"></div>

                <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full h-full">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
                            <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl font-bold text-white tracking-tight">Kegalle</span>
                                <span className="text-xl font-black text-sky-400 tracking-tight">Ph4Life</span>
                            </div>
                            <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest mt-0.5">Supply Chain Portal</p>
                        </div>
                    </div>

                    <div className="space-y-6 max-w-lg mb-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-sky-100 text-[11px] font-semibold uppercase tracking-wider">
                            <ShieldCheck size={14} className="text-sky-300" /> Secure Vendor Management
                        </div>
                        <h2 className="text-4xl font-bold tracking-tight leading-[1.2] text-white">
                            Streamline Your Pharmacy Deliveries.
                        </h2>
                        <p className="text-[15px] text-slate-300 font-normal leading-relaxed">
                            Connect directly with Kegalle Ph4Life inventory systems, track purchase orders, manage GRNs, and maintain seamless healthcare distribution.
                        </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium border-t border-white/10 pt-6">
                        <span>© 2026 Kegalle Ph4Life System</span>
                        <div className="flex items-center gap-1.5 text-sky-400/80">
                            <HeartPulse size={14} /> Verified Secure Portal
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-50">

                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-100/40 rounded-full blur-3xl pointer-events-none"></div>

                <div className="w-full max-w-[420px] bg-white p-10 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative z-10 flex flex-col items-center">

                    <div className="w-16 h-16 flex items-center justify-center mb-6">
                        <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
                    </div>

                    <div className="text-center mb-6 w-full">
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Supplier Portal</h1>
                        <p className="text-sm text-slate-500 font-normal">Sign in to manage your pharmaceutical orders.</p>
                    </div>

                    {authError && (
                        <div className="w-full mb-6 p-4 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-start gap-3 text-rose-600 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-rose-500" />
                            <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-rose-700 mb-0.5">Access Denied</span>
                                <span className="text-[12px] font-medium leading-relaxed opacity-90">{authError}</span>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5 w-full">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide ml-1">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 placeholder:font-normal"
                                    placeholder="supplier@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 placeholder:font-normal"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-sm cursor-pointer disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Signing in...' : 'Sign In To Portal'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}