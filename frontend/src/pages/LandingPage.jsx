import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    FileText,
    Receipt,
    Radar,
    Menu,
    X,
    ShieldCheck,
    HeartPulse,
    ArrowRight,
    Sparkles,
    Activity,
    TrendingUp,
    Clock
} from "lucide-react";

import logoImage from "../assets/logo.png";
import landingImage from "../assets/landing.png";

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
};

const floatAnim = {
    initial: { y: 0 },
    animate: { y: [-12, 12, -12], transition: { duration: 6, repeat: Infinity, ease: "easeInOut" } }
};

const floatAnimReverse = {
    initial: { y: 0 },
    animate: { y: [12, -12, 12], transition: { duration: 7, repeat: Infinity, ease: "easeInOut" } }
};


function BrandMark({ src }) {
    if (src) {
        return <img src={src} alt="Kegalle Ph4Life Logo" className="h-10 w-auto object-contain drop-shadow-md" />;
    }
    return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <HeartPulse size={18} className="text-white" strokeWidth={2.5} />
        </div>
    );
}

function BrandLockup({ logoSrc, dark = false }) {
    return (
        <div className="flex items-center gap-2.5 group cursor-pointer">
            <BrandMark src={logoSrc} />
            <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                    <span className={`text-[18px] font-bold tracking-tight transition-colors ${dark ? "text-white" : "text-slate-900 group-hover:text-blue-600"}`}>
                        Kegalle
                    </span>
                    <span className={`text-[18px] font-bold tracking-tight ${dark ? "text-cyan-300" : "bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent"}`}>
                        Ph4Life
                    </span>
                </div>
            </div>
        </div>
    );
}

function AmbientBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-[#F8FAFC]">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

            <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/20 blur-[100px]"
            />
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-cyan-400/20 blur-[100px]"
            />
        </div>
    );
}

function PrimaryButton({ children, className = "", ...props }) {
    return (
        <button
            className={`relative group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold py-3 px-7 rounded-full shadow-[0_8px_25px_-5px_rgba(14,165,233,0.5)] hover:shadow-[0_12px_35px_-5px_rgba(14,165,233,0.6)] hover:scale-[1.02] transition-all duration-300 text-[13.5px] overflow-hidden ${className}`}
            {...props}
        >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-out" />
            <span className="relative flex items-center gap-2">{children}</span>
        </button>
    );
}

function SecondaryButton({ children, className = "", ...props }) {
    return (
        <button
            className={`inline-flex items-center justify-center gap-2 bg-white/80 backdrop-blur-md border border-slate-200/80 text-slate-700 hover:bg-blue-50/80 hover:text-blue-700 hover:border-blue-200 font-semibold py-3 px-7 rounded-full transition-all duration-300 text-[13.5px] shadow-sm hover:shadow-md ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

function Navbar({ logoSrc }) {
    const [open, setOpen] = useState(false);
    const links = [
        { label: "Features", href: "#features" },
        { label: "Intelligence", href: "#ai-intelligence" },
        { label: "Security", href: "#security" },
    ];
    return (
        <header className="fixed top-4 left-0 right-0 z-50 px-4 lg:px-8">
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="mx-auto max-w-6xl rounded-full border border-white/40 bg-white/60 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]"
            >
                <div className="flex h-16 items-center justify-between px-6">
                    <BrandLockup logoSrc={logoSrc} />

                    <nav className="hidden items-center gap-8 lg:flex">
                        {links.map((l) => (
                            <a key={l.label} href={l.href} className="text-[14px] font-bold text-slate-600 hover:text-blue-600 transition-colors">
                                {l.label}
                            </a>
                        ))}
                    </nav>

                    <div className="hidden items-center gap-4 lg:flex">
                        <Link to="/auth/login" className="text-[14px] font-bold text-slate-600 hover:text-blue-600 transition-colors px-4 py-2 rounded-full hover:bg-blue-50">
                            Sign In
                        </Link>
                        <Link to="/auth/login">
                            <PrimaryButton className="!py-2.5 !px-6">Get Started</PrimaryButton>
                        </Link>
                    </div>

                    <button onClick={() => setOpen(!open)} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 bg-white shadow-sm border border-slate-100 lg:hidden hover:bg-blue-50 hover:text-blue-600 transition-colors">
                        {open ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden lg:hidden"
                        >
                            <div className="border-t border-slate-200/50 px-6 py-5 bg-white/50 backdrop-blur-md rounded-b-[2rem]">
                                <div className="flex flex-col gap-4">
                                    {links.map((l) => (
                                        <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="text-[15px] font-bold text-slate-700">
                                            {l.label}
                                        </a>
                                    ))}
                                    <div className="mt-4 flex flex-col gap-3 border-t border-slate-200/50 pt-5">
                                        <Link to="/auth/login"><SecondaryButton className="w-full">Sign In</SecondaryButton></Link>
                                        <Link to="/auth/login"><PrimaryButton className="w-full">Get Started</PrimaryButton></Link>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </header>
    );
}

function SectionHeading({ eyebrow, title, description, align = "left" }) {
    const wrap = align === "center" ? "text-center mx-auto" : "text-left";
    return (
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className={`max-w-2xl ${wrap} mb-14`}>
            {eyebrow && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-4">
                    <Sparkles size={13} /> {eyebrow}
                </span>
            )}
            <h2 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-[1.2] text-slate-900">
                {title}
            </h2>
            {description && (
                <p className="mt-4 text-[16px] leading-relaxed text-slate-500 font-normal max-w-xl mx-auto">
                    {description}
                </p>
            )}
        </motion.div>
    );
}

function Hero() {
    return (
        <section id="home" className="relative px-4 lg:px-8 pt-32 pb-24 overflow-hidden min-h-[95vh] flex items-center">
            <AmbientBackground />

            <div className="relative z-10 mx-auto max-w-7xl w-full">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                        className="max-w-2xl text-center lg:text-left mx-auto lg:mx-0"
                    >
                        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50/80 backdrop-blur-sm px-4 py-1.5 mb-6 shadow-sm">
                            <ShieldCheck size={14} className="text-blue-600" />
                            <span className="text-[11px] font-semibold tracking-wider uppercase text-blue-700">
                                The Future of Pharmacy Management
                            </span>
                        </motion.div>

                        <motion.h1 variants={fadeUp} className="text-[40px] sm:text-[48px] lg:text-[54px] font-bold tracking-tight leading-[1.15] text-slate-900">
                            Run your pharmacy <br className="hidden sm:block"/>
                            <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500 bg-clip-text text-transparent">with quiet precision.</span>
                        </motion.h1>

                        <motion.p variants={fadeUp} className="mt-5 text-[16px] sm:text-[17px] leading-relaxed text-slate-500 font-normal max-w-lg mx-auto lg:mx-0">
                            A completely calm, highly intelligent workspace. Manage inventory, process sales, and let AI monitor your risks in the background.
                        </motion.p>

                        <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                            <Link to="/auth/login"><PrimaryButton>Start Operations <ArrowRight size={16} strokeWidth={2}/></PrimaryButton></Link>
                            <a href="#features"><SecondaryButton>Explore Platform</SecondaryButton></a>
                        </motion.div>

                        <motion.div variants={fadeUp} className="mt-10 flex items-center justify-center lg:justify-start gap-5 border-t border-slate-200/60 pt-5">
                            <div className="flex -space-x-3">
                                {[
                                    "https://randomuser.me/api/portraits/women/44.jpg",
                                    "https://randomuser.me/api/portraits/men/32.jpg",
                                    "https://randomuser.me/api/portraits/women/68.jpg",
                                    "https://randomuser.me/api/portraits/men/46.jpg"
                                ].map((url, i) => (
                                    <img
                                        key={i}
                                        src={url}
                                        alt={`User ${i+1}`}
                                        className="w-9 h-9 rounded-full border-2 border-[#F8FAFC] object-cover shadow-sm bg-slate-200"
                                    />
                                ))}
                            </div>
                            <div className="text-left">
                                <div className="flex items-center gap-1 text-amber-400">
                                    {[1,2,3,4,5].map(i => <Sparkles key={i} size={12} className="fill-current"/>)}
                                </div>
                                <p className="text-[12px] font-medium text-slate-500 mt-1">Trusted by 100+ Pharmacies</p>
                            </div>
                        </motion.div>
                    </motion.div>

                    <div className="relative hidden lg:flex justify-center items-center h-[550px]">
                        <div className="absolute inset-0 bg-blue-400/10 rounded-full blur-[80px] transform scale-75" />

                        <motion.img
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            src={landingImage}
                            alt="Pharmacy Management Illustration"
                            className="relative z-10 w-full max-w-[500px] object-contain drop-shadow-2xl"
                        />

                        <motion.div
                            variants={floatAnim}
                            initial="initial"
                            animate="animate"
                            className="absolute -right-4 top-16 z-20 bg-white/90 backdrop-blur-xl p-3.5 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 flex items-center gap-3 w-52"
                        >
                            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center flex-shrink-0">
                                <TrendingUp size={20} strokeWidth={2}/>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sales Trend</p>
                                <p className="text-[14px] font-bold text-slate-800">+24.5% This Week</p>
                            </div>
                        </motion.div>

                        <motion.div
                            variants={floatAnimReverse}
                            initial="initial"
                            animate="animate"
                            className="absolute -left-8 bottom-24 z-20 bg-white/90 backdrop-blur-xl p-3.5 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 flex items-center gap-3 w-52"
                        >
                            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
                                <Clock size={20} strokeWidth={2}/>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expiry Alert</p>
                                <p className="text-[14px] font-bold text-slate-800">2 Batches Expiring</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Features() {
    return (
        <section id="features" className="relative px-4 lg:px-8 py-32 bg-white">
            <div className="mx-auto max-w-6xl">
                <SectionHeading
                    align="center"
                    eyebrow="The Platform"
                    title="Everything in its right place."
                    description="We stripped away the clutter. What remains is a powerful, focused set of tools in a stunning layout."
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="md:col-span-2 group relative overflow-hidden p-8 sm:p-10 rounded-[28px] bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100 to-transparent rounded-full opacity-40 blur-3xl group-hover:scale-150 transition-transform duration-700" />
                        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200 text-blue-600 group-hover:scale-110 transition-transform duration-500 relative z-10">
                            <Package size={22} strokeWidth={2} />
                        </span>
                        <h3 className="text-[20px] font-bold text-slate-900 relative z-10">Intelligent Inventory</h3>
                        <p className="mt-3 text-[15px] leading-relaxed text-slate-500 font-normal relative z-10 max-w-md">
                            Real-time stock monitoring with automated low-stock and expiry risk detection. Never run out of critical medications again.
                        </p>
                    </motion.div>

                    <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="group relative overflow-hidden p-8 rounded-[28px] bg-gradient-to-br from-blue-600 to-cyan-500 text-white hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-500">
                        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                            <Radar size={22} strokeWidth={2} />
                        </span>
                        <h3 className="text-[20px] font-bold">Background AI</h3>
                        <p className="mt-3 text-[14.5px] leading-relaxed text-blue-50 font-normal">
                            Subtle insights that surface only when you need to make critical decisions.
                        </p>
                    </motion.div>

                    <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="group relative overflow-hidden p-8 rounded-[28px] bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
                        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200 text-cyan-600 group-hover:scale-110 transition-transform duration-500">
                            <ShoppingCart size={22} strokeWidth={2} />
                        </span>
                        <h3 className="text-[18px] font-bold text-slate-900">Seamless POS</h3>
                        <p className="mt-3 text-[14.5px] leading-relaxed text-slate-500 font-normal">
                            A clean, distraction-free billing interface designed for high-speed transactions.
                        </p>
                    </motion.div>

                    <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="md:col-span-2 group relative overflow-hidden p-8 sm:p-10 rounded-[28px] bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-500">
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-cyan-100 to-transparent rounded-full opacity-40 blur-3xl group-hover:scale-150 transition-transform duration-700" />
                        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200 text-blue-600 group-hover:scale-110 transition-transform duration-500 relative z-10">
                            <FileText size={22} strokeWidth={2} />
                        </span>
                        <h3 className="text-[20px] font-bold text-slate-900 relative z-10">Prescription Workflows</h3>
                        <p className="mt-3 text-[15px] leading-relaxed text-slate-500 font-normal relative z-10 max-w-md">
                            Securely digitize, track, and manage patient prescriptions with clinical accuracy. Everything verified and stored safely.
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

function FinalCTA() {
    return (
        <section className="px-4 lg:px-8 py-32 bg-[#F8FAFC]">
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="mx-auto max-w-5xl"
            >
                <div className="rounded-[40px] bg-slate-900 px-6 py-20 sm:px-16 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 opacity-30" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-400 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/2 opacity-20" />

                    <div className="relative z-10 mx-auto inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 mb-8">
                        <HeartPulse size={14} className="text-cyan-300" />
                        <span className="text-[11px] font-semibold tracking-widest uppercase text-white">Join The Network</span>
                    </div>

                    <h2 className="relative z-10 text-[32px] sm:text-[44px] font-bold tracking-tight text-white leading-[1.15]">
                        Ready to experience <br className="hidden sm:block"/> quiet efficiency?
                    </h2>
                    <p className="relative z-10 mx-auto mt-6 max-w-md text-[16px] leading-relaxed text-slate-300 font-normal">
                        Upgrade your pharmacy to a system designed for clarity, security, and effortless daily operations.
                    </p>
                    <div className="relative z-10 mt-10 flex flex-wrap justify-center gap-4">
                        <Link to="/auth/login">
                            <button className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-cyan-50 font-semibold py-3.5 px-8 rounded-full shadow-lg hover:scale-105 transition-all duration-300 text-[14px]">
                                Get Started Free <ArrowRight size={16} strokeWidth={2}/>
                            </button>
                        </Link>
                        <Link to="/auth/login">
                            <button className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white hover:bg-white/20 font-semibold py-3.5 px-8 rounded-full transition-all duration-300 text-[14px]">
                                Contact Sales
                            </button>
                        </Link>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}

function Footer({ logoSrc }) {
    return (
        <footer className="px-4 lg:px-8 pt-20 pb-10 bg-white border-t border-slate-100">
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-col md:flex-row justify-between items-start gap-12 pb-16">
                    <div className="max-w-xs">
                        <BrandLockup logoSrc={logoSrc} />
                        <p className="mt-5 text-[14px] leading-relaxed text-slate-500 font-normal">
                            Designed for modern pharmacy teams who value focus, security, and reliability above all else.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-16">
                        <div>
                            <p className="text-[12px] font-bold text-slate-900 uppercase tracking-widest mb-5">Platform</p>
                            <ul className="space-y-3.5">
                                {["Features", "Intelligence", "Security", "Pricing"].map((l) => (
                                    <li key={l}><a href={`#${l.toLowerCase()}`} className="text-[14px] font-medium text-slate-500 hover:text-blue-600 transition-colors">{l}</a></li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-slate-900 uppercase tracking-widest mb-5">System</p>
                            <ul className="space-y-3.5">
                                <li><Link to="/auth/login" className="text-[14px] font-medium text-slate-500 hover:text-blue-600 transition-colors">Sign In</Link></li>
                                <li><a href="#support" className="text-[14px] font-medium text-slate-500 hover:text-blue-600 transition-colors">Support Portal</a></li>
                                <li><a href="#docs" className="text-[14px] font-medium text-slate-500 hover:text-blue-600 transition-colors">Documentation</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-8">
                    <span className="text-[13px] text-slate-400 font-medium">© 2026 Kegalle Ph4Life. All rights reserved.</span>
                    <div className="flex items-center gap-1.5 bg-blue-50/80 px-3 py-1.5 rounded-full text-blue-600 text-[12px] font-semibold border border-blue-100">
                        <ShieldCheck size={14} strokeWidth={2} /> 256-bit Encrypted Platform
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased selection:bg-blue-500/30 selection:text-blue-900 overflow-x-hidden">
            <Navbar logoSrc={logoImage} />
            <Hero />
            <Features />
            <FinalCTA />
            <Footer logoSrc={logoImage} />
        </div>
    );
}