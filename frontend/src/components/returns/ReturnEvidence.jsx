import React, { useEffect, useState } from 'react';
import axios from '../../api/axiosInstance';

export default function ReturnEvidence({ adjustmentId, hasEvidence, reviewVersion }) {
    const [image, setImage] = useState(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setImage(null);
        setError('');
        setLoading(false);
        if (!open || !hasEvidence) return undefined;
        const controller = new AbortController();
        setLoading(true);
        axios.get(`http://localhost:5000/api/returns/${adjustmentId}/evidence`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            signal: controller.signal
        }).then(res => {
            if (!controller.signal.aborted) setImage(res.data.image);
        }).catch(err => {
            if (!controller.signal.aborted) setError(err.response?.data?.error || 'Unable to load image.');
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [open, adjustmentId, hasEvidence, reviewVersion]);

    if (!hasEvidence) return null;
    return (
        <div className="mt-2 no-print">
            <button type="button" onClick={() => setOpen(!open)} className="text-[12px] font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2">
                {open ? 'Hide photo' : 'View attached photo'}
            </button>
            {open && <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2">
                {loading && <p className="text-xs text-slate-500">Loading photo...</p>}
                {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
                {image && <img src={image} alt="Evidence for returned medicine" className="max-h-80 w-full object-contain rounded-lg" />}
            </div>}
        </div>
    );
}