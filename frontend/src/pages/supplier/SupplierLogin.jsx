import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Mail, Lock, ArrowRight, Truck, ShieldCheck, HeartPulse } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import supplyImage from '../../assets/ChatGPT-Image-Mar-16-2026-12_53_08-AM-1.jpg';

export default function SupplierLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await axios.post('http://localhost:5000/api/auth/supplier-login', {
                email,
                password
            });

            login(res.data.user, res.data.token);
            navigate('/supplier/dashboard');
            toast.success('Welcome to Supplier Portal! 🎉');

        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-screen bg-slate-50 font-sans overflow-hidden">
            <div className="hidden lg:flex lg:w-1/2 relative m-4 mr-0 rounded-[32px] overflow-hidden border border-slate-200 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]">
                <img
                    src={supplyImage}
                    alt="Hospital & Pharmacy Supply"
                    className="absolute inset-0 w-full h-full object-cover transform scale-105 filter brightness-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-sky-900/30 backdrop-blur-[2px]"></div>

                <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full h-full">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                            <Truck className="text-sky-300" size={24} />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-[20px] font-bold text-white tracking-tight">Kegalle</span>
                                <span className="text-[20px] font-black bg-gradient-to-r from-sky-400 to-pink-400 bg-clip-text text-transparent tracking-tight">Ph4Life</span>
                            </div>
                            <p className="text-[9px] font-bold text-sky-300 uppercase tracking-[0.2em]">Supply Chain Portal</p>
                        </div>
                    </div>

                    <div className="space-y-4 max-w-md mb-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-sky-200 text-[11px] font-bold">
                            <ShieldCheck size={14} /> Secure Vendor Management
                        </div>
                        <h2 className="text-[32px] font-extrabold tracking-tight leading-tight">
                            Streamline Your Pharmacy Deliveries & Orders.
                        </h2>
                        <p className="text-[13px] text-slate-300 font-medium leading-relaxed">
                            Connect directly with Kegalle Ph4Life inventory systems, track purchase orders, manage GRNs, and maintain seamless healthcare distribution.
                        </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium border-t border-white/10 pt-4">
                        <span>© 2026 Kegalle Ph4Life System</span>
                        <div className="flex items-center gap-1 text-sky-300">
                            <HeartPulse size={14} /> Verified Secure Portal
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                <div className="w-full max-w-[420px] bg-white p-10 rounded-[32px] border border-slate-200 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] relative z-10 flex flex-col items-center">

                    <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mb-6 border border-sky-100/80 shadow-sm text-sky-600">
                        <Truck size={28} strokeWidth={2.2} />
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-[24px] font-extrabold text-slate-800 tracking-tight mb-1.5">Supplier Portal</h1>
                        <p className="text-[13px] text-slate-400 font-medium">Sign in to manage your pharmaceutical orders.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4 w-full">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail size={18} className="text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-2xs"
                                    placeholder="supplier@company.com"
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
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-2xs tracking-widest"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 flex items-center justify-center gap-2 bg-sky-600 text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(14,165,233,0.3)] hover:bg-sky-700 transition-all active:scale-[0.98] text-[14px] cursor-pointer disabled:opacity-70 border border-sky-500"
                        >
                            {loading ? 'Signing in...' : 'SIGN IN TO PORTAL'}
                            {!loading && <ArrowRight size={18} strokeWidth={2.5} />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}