// src/components/coach/time-slot-management.tsx
// Full-page version of hours management (the Schedule tab also opens the
// same HoursManager in a Drawer) — kept as its own route since the old
// coach nav still links here directly.
import CoachShell from '@/components/coach/coach-shell'
import HoursManager from '@/components/coach/hours-manager'

export default function TimeSlots() {
    return (
        <CoachShell active="schedule" kicker="Availability" title="Time slots" blurb="Enable the hours you work from the fixed catalog below, and take specific days off as you need to.">
            <div className="max-w-2xl bg-[#111] border border-[#1f1f1f] rounded-[20px] p-[22px]">
                <HoursManager />
            </div>
        </CoachShell>
    )
}
