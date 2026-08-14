import React from 'react';

const Badge = ({ children, variant = 'green' }) => {
    const colors = {
        green: 'bg-emerald-50 text-emerald-600 border-emerald-200/50',
        yellow: 'bg-amber-50 text-amber-600 border-amber-200/50',
        red: 'bg-rose-50 text-rose-600 border-rose-200/50'
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${colors[variant] || colors.green}`}>
            {children}
        </span>
    );
};

export default Badge;