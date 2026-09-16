import React, { useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { loginUser, verifyAdminOtp } from '../../services/authService';
import { Mail, Lock, ShieldCheck, AlertCircle, UserCog, Activity, DollarSign, ArrowLeft } from 'lucide-react';

import loginImage from '../../assets/login.png';
import logoImage from '../../assets/logo.png';
import toast from 'react-hot-toast';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const [step, setStep] = useState('login');

    const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef([]);

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

            if (data.requiresOtp) {
                setStep('otp');
                toast.success('Admin Verified. OTP sent to pharmacy email! 📧');
            } else {
                login(data.user, data.token);
                if (data.user.role === 'Cashier') navigate('/pos');
                else navigate('/admin');
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) {
            const pasteData = value.replace(/\D/g, '').slice(0, 6).split('');
            const newValues = [...otpValues];
            pasteData.forEach((char, idx) => {
                if (index + idx < 6) {
                    newValues[index + idx] = char;
                }
            });
            setOtpValues(newValues);
            const nextIndex = Math.min(index + pasteData.length, 5);
            inputRefs.current[nextIndex]?.focus();
            return;
        }

        if (/^\d*$/.test(value)) {
            const newValues = [...otpValues];
            newValues[index] = value;
            setOtpValues(newValues);

            if (value && index < 5) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');

        const finalOtp = otpValues.join('');
        if (finalOtp.length !== 6) {
            setError('OTP code must be exactly 6 digits.');
            return;
        }

        setLoading(true);
        try {
            const data = await verifyAdminOtp(email, finalOtp);
            login(data.user, data.token);
            toast.success('Admin Authentication Successful! 🎉');
            navigate('/admin');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid or expired OTP code.');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoFill = (demoEmail, demoPassword) => {
        setEmail(demoEmail);
        setPassword(demoPassword);
        setError('');
        setStep('login');
        setOtpValues(['', '', '', '', '', '']);
    };

    return (
        <div className="flex h-screen w-screen bg-slate-50 font-sans overflow-hidden">
            <style>{`
                .hover-scroll::-webkit-scrollbar { width: 6px; background-color: transparent; }
                .hover-scroll::-webkit-scrollbar-thumb { background-color: transparent; border-radius: 10px; }
                .hover-scroll:hover::-webkit-scrollbar-thumb { background-color: #cbd5e1; }
            `}</style>

            <div className="hidden lg:flex lg:w-[55%] relative m-4 rounded-[32px] overflow-hidden shadow-lg border border-slate-200/60">
                <img
                    src={loginImage}
                    alt="Pharmacy System"
                    className="absolute inset-0 w-full h-full object-cover transform scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-800/60 to-slate-900/40"></div>

                <div className="relative z-10 flex flex-col justify-end p-12 pb-32 text-white w-full h-full">

                    <div className="space-y-6 max-w-lg">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-sky-100 text-[11px] font-semibold uppercase tracking-wider">
                            <ShieldCheck size={14} className="text-sky-300" /> Secure Healthcare Management
                        </div>
                        <h2 className="text-4xl font-bold tracking-tight leading-[1.2] text-white">
                            Everything Kegalle Ph4Life runs on, in one place.
                        </h2>
                        <p className="text-[15px] text-slate-300 font-normal leading-relaxed">
                            One secure system for inventory, prescriptions, sales, and comprehensive analytics reporting.
                        </p>
                    </div>

                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-50">

                <div className="absolute top-0 right-0 w-96 h-96 bg-sky-100/40 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none"></div>

                <div className="w-full max-w-[420px] bg-white p-8 lg:p-10 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative z-10 flex flex-col items-center max-h-[90vh] overflow-y-auto hover-scroll">

                    <div className="w-16 h-16 flex items-center justify-center mb-6 flex-shrink-0">
                        <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
                    </div>


                    {step === 'login' ? (
                        <>
                            <div className="text-center mb-6 w-full flex-shrink-0 animate-in fade-in duration-300">
                                <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Welcome back</h1>
                                <p className="text-sm text-slate-500 font-normal">Sign in with your staff account to continue.</p>
                            </div>

                            {error && (
                                <div className="w-full mb-4 text-center">
                                    <span className="text-[13px] font-bold text-rose-500">{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-5 w-full flex-shrink-0 animate-in fade-in duration-300">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide ml-1">Email ID or Username</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Mail size={16} className="text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all placeholder:text-slate-300 placeholder:font-normal"
                                            placeholder="admin@pharmacy.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide ml-1">Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Lock size={16} className="text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all placeholder:text-slate-300 placeholder:font-normal tracking-widest"
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
                                    <span className="hover:text-sky-600 font-bold transition-colors cursor-pointer">Forgot Password?</span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full mt-2 flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-sm cursor-pointer disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Authenticating...' : 'Sign In'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6 w-full flex-shrink-0 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center mb-2 w-full flex-shrink-0">
                                <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Two-Step Verification</h1>
                                <p className="text-[13px] text-slate-500 font-medium leading-relaxed px-4">
                                    We sent a secure 6-digit one-time password to the official pharmacy email.
                                </p>
                            </div>

                            {error && (
                                <div className="w-full text-center -mt-2">
                                    <span className="text-[13px] font-bold text-rose-500">{error}</span>
                                </div>
                            )}

                            <div className="flex justify-center gap-2.5 w-full">
                                {otpValues.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={(el) => (inputRefs.current[idx] = el)}
                                        type="text"
                                        maxLength="6"
                                        value={digit}
                                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                        className="w-12 h-14 bg-slate-50 border border-slate-200 rounded-xl text-2xl font-black text-center text-slate-800 outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm"
                                        required
                                    />
                                ))}
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={loading || otpValues.join('').length !== 6}
                                    className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-sm cursor-pointer disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Verifying...' : 'Verify & Login'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setStep('login'); setOtpValues(['', '', '', '', '', '']); setError(''); }}
                                    className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold py-3.5 rounded-xl transition-all duration-200 text-[13px] cursor-pointer"
                                >
                                    <ArrowLeft size={16} /> Back to Sign In
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 'login' && (
                        <div className="w-full mt-8 pt-6 border-t border-slate-200/50 flex-shrink-0">
                            <div className="text-center mb-4">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Demo Accounts — Tap to autofill
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div
                                    onClick={() => handleDemoFill('admin@pharmacy.com', 'adminpassword123')}
                                    className="flex justify-between items-center p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-200 cursor-pointer transition-colors shadow-sm group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-200 transition-colors">
                                            <ShieldCheck size={16} />
                                        </div>
                                        <span className="text-[13px] font-bold text-slate-700">Administrator (OTP)</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-400 font-mono group-hover:text-slate-500 transition-colors">admin / adminpassword123</span>
                                </div>

                                <div
                                    onClick={() => handleDemoFill('manager@pharmacy.com', 'manager123')}
                                    className="flex justify-between items-center p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-200 cursor-pointer transition-colors shadow-sm group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-sky-100 text-sky-600 rounded-lg group-hover:bg-sky-200 transition-colors">
                                            <UserCog size={16} />
                                        </div>
                                        <span className="text-[13px] font-bold text-slate-700">Manager</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-400 font-mono group-hover:text-slate-500 transition-colors">manager / manager123</span>
                                </div>

                                <div
                                    onClick={() => handleDemoFill('pharmacist@pharmacy.com', 'pharma123')}
                                    className="flex justify-between items-center p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-200 cursor-pointer transition-colors shadow-sm group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-200 transition-colors">
                                            <Activity size={16} />
                                        </div>
                                        <span className="text-[13px] font-bold text-slate-700">Pharmacist</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-400 font-mono group-hover:text-slate-500 transition-colors">pharmacist / pharma123</span>
                                </div>

                                <div
                                    onClick={() => handleDemoFill('cashier', 'cashier123')}
                                    className="flex justify-between items-center p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-200 cursor-pointer transition-colors shadow-sm group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg group-hover:bg-amber-200 transition-colors">
                                            <DollarSign size={16} />
                                        </div>
                                        <span className="text-[13px] font-bold text-slate-700">Cashier</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-400 font-mono group-hover:text-slate-500 transition-colors">cashier / cashier123</span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

        </div>
    );
}