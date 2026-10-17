const CATEGORIES = {
    customer_receipts: { label: 'Cash receipts from customers', activity: 'Operating', direction: 'in' },
    supplier_refunds: { label: 'Cash refunds from suppliers', activity: 'Operating', direction: 'in' },
    supplier_payments: { label: 'Cash payments to suppliers', activity: 'Operating', direction: 'out' },
    wages: { label: 'Cash payments to employees', activity: 'Operating', direction: 'out' },
    rent_utilities: { label: 'Rent and utilities paid', activity: 'Operating', direction: 'out' },
    income_taxes: { label: 'Income taxes paid (operating)', activity: 'Operating', direction: 'out' },
    other_operating_in: { label: 'Other operating receipts', activity: 'Operating', direction: 'in' },
    other_operating_out: { label: 'Other operating payments', activity: 'Operating', direction: 'out' },
    asset_purchases: { label: 'Acquisition of long-term assets', activity: 'Investing', direction: 'out' },
    asset_proceeds: { label: 'Proceeds from long-term asset disposals', activity: 'Investing', direction: 'in' },
    other_investing_in: { label: 'Other investing receipts', activity: 'Investing', direction: 'in' },
    other_investing_out: { label: 'Other investing payments', activity: 'Investing', direction: 'out' },
    capital: { label: 'Capital contributions received', activity: 'Financing', direction: 'in' },
    borrowings: { label: 'Borrowings received', activity: 'Financing', direction: 'in' },
    loan_repayments: { label: 'Loan principal repayments', activity: 'Financing', direction: 'out' },
    distributions: { label: 'Owner distributions paid', activity: 'Financing', direction: 'out' },
    other_financing_in: { label: 'Other financing receipts', activity: 'Financing', direction: 'in' },
    other_financing_out: { label: 'Other financing payments', activity: 'Financing', direction: 'out' }
};
function cents(value) {
    const text = String(value ?? '');
    if (!/^-?\d+(\.\d{1,2})?$/.test(text)) throw new Error('Invalid monetary value: expected up to two decimal places.');
    const negative = text.startsWith('-');
    const [whole, fraction = ''] = text.replace(/^-/, '').split('.');
    return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))) * (negative ? -1n : 1n);
}
function decimal(value) {
    const sign = value < 0n ? '-' : '';
    const abs = value < 0n ? -value : value;
    return `${sign}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
}
function validDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
}
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
function localDate(value) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
function cashStatement(setup, entries, start, end) {
    const usable = !!setup && setup.openingDate <= start;
    let opening = usable ? cents(setup.openingAmount) : 0n;
    const totals = Object.fromEntries(Object.keys(CATEGORIES).map(k => [k, 0n]));
    for (const e of entries) {
        const category = CATEGORIES[e.category];
        if (!category) throw new Error('Unknown cash category.');
        const signed = cents(e.amount) * (category.direction === 'in' ? 1n : -1n) * (e.reversalOf ? -1n : 1n);
        if (e.entryDate < start) opening += signed;
        else if (e.entryDate <= end) totals[e.category] += signed;
    }
    const groups = ['Operating', 'Investing', 'Financing'].map(activity => {
        const lines = Object.entries(CATEGORIES).filter(([, c]) => c.activity === activity)
            .map(([key, c]) => ({ key, label: c.label, amount: decimal(totals[key]) }));
        return { activity, lines, total: decimal(lines.reduce((s, row) => s + cents(row.amount), 0n)) };
    });
    const net = groups.reduce((s, g) => s + cents(g.total), 0n);
    return { available: usable, groups, net: decimal(net), opening: usable ? decimal(opening) : null,
        closing: usable ? decimal(opening + net) : null,
        entries: entries.filter(e => e.entryDate >= start && e.entryDate <= end) };
}
module.exports = { CATEGORIES, cents, decimal, validDate, today, localDate, cashStatement };