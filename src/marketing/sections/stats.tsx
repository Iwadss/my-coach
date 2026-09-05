// Real, verifiable claims about how MyCoach works — not usage numbers,
// since there's no traffic yet to report honestly. Swap for live metrics
// (or wire to a query) once there's real data behind them.
const stats = [
    { value: '1:1', label: 'Personal coach match' },
    { value: '4-digit', label: 'Coach ID to join a roster' },
    { value: 'Reviewed', label: 'Every coach vetted before clients', accent: true },
    { value: 'Weekly', label: 'Progress tracked, not guessed' },
]

export default function Stats() {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-b border-[#e2e2d9] dark:border-[#1c1c1c] bg-white dark:bg-[#0a0a0a]">
            {stats.map((s, i) => (
                <div
                    key={s.label}
                    className={`px-6 sm:px-10 py-8 ${i % 2 === 0 ? 'border-r border-[#e2e2d9] dark:border-[#1c1c1c]' : ''} ${i < 2 ? 'border-b lg:border-b-0 border-[#e2e2d9] dark:border-[#1c1c1c]' : ''} lg:border-r lg:last:border-r-0`}
                >
                    <div className={`font-['Anton'] text-[32px] sm:text-[42px] leading-none ${s.accent ? 'text-[#6f8c00] dark:text-[#ccff00]' : 'text-[#14140f] dark:text-white'}`}>{s.value}</div>
                    <div className="mt-2 font-['JetBrains_Mono'] text-[10px] font-medium tracking-[1.5px] uppercase text-[#14140f]/45 dark:text-white/45">{s.label}</div>
                </div>
            ))}
        </div>
    )
}
