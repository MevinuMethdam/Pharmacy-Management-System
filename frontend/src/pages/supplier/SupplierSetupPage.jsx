import React, { useState, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Lock, CheckCircle, ShieldCheck, Pill } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function SupplierSetupPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handlePasswordSetup = async (e) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (!token) {
            toast.error('Invalid or missing invitation token');
            return;
        }

        setLoading(true);
        try {
            await axios.post('http://localhost:5000/api/suppliers/setup-password', {
                token,
                password
            });

            setSuccess(true);
            toast.success('Password successfully configured! Logging you in... 🎉');

            setTimeout(() => {
                navigate('/supplier/login');
            }, 2000);

        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to setup password. Link may be expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-sky-200/30 to-slate-300/30 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-slate-300/30 to-indigo-200/30 blur-[140px] pointer-events-none"></div>

            <div className="w-full max-w-[440px] bg-white/80 backdrop-blur-2xl p-10 rounded-[40px] border border-white shadow-[0_20px_60px_-10px_rgba(31,38,135,0.08)] relative z-10 flex flex-col items-center">

                <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mb-6 border border-sky-100 shadow-sm">
                    <Pill className="text-sky-600 transform -rotate-12" size={30} />
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-[24px] font-extrabold text-slate-800 tracking-tight mb-2">Supplier Portal Setup</h1>
                    <p className="text-[13px] text-slate-500 font-medium">Create a secure password to access your dedicated distributor dashboard.</p>
                </div>

                {success ? (
                    <div className="w-full text-center py-8 space-y-4">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle size={32} />
                        </div>
                        <h2 className="text-[18px] font-bold text-slate-800">Setup Complete!</h2>
                        <p className="text-[13px] text-slate-500">Redirecting to Supplier Login portal...</p>
                    </div>
                ) : (
                    <form onSubmit={handlePasswordSetup} className="space-y-4 w-full">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">New Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock size={18} className="text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">Confirm Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <ShieldCheck size={18} className="text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-white/60 border border-white/80 rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/40 shadow-sm"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-4 bg-sky-500/90 backdrop-blur-md text-white font-bold py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(14,165,233,0.4)] hover:bg-sky-600 transition-all active:scale-[0.98] text-[15px] cursor-pointer disabled:opacity-70 border border-sky-400/50"
                        >
                            {loading ? 'Securing Account...' : 'Save & Set Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}