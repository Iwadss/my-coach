import { useEffect, useState } from 'react'
import supabase from '@/supabase/supabase'
import { UserRound, Check } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

export interface CoachOption {
    coach_id: string
    full_name: string | null
    bio: string | null
}

interface CoachPickerProps {
    value: string
    onChange: (coachId: string) => void
    disabled?: boolean
}

/**
 * Lists approved coaches from the public `coach_directory` view (readable
 * pre-auth, by design — this is what a client picks from at sign-up, and
 * what a rejected client picks from again to re-request).
 *
 * Filtered to accepting_clients = true here rather than in the view itself:
 * this is a "pick one of many" list, so a closed coach should just not be
 * an option — unlike SignUp.tsx's direct coach-code entry, where a closed
 * coach still needs to resolve so it can show "not accepting clients"
 * instead of a generic "no such coach."
 */
export default function CoachPicker({ value, onChange, disabled }: CoachPickerProps) {
    const [coaches, setCoaches] = useState<CoachOption[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadCoaches = async () => {
            const { data, error } = await supabase
                .from('coach_directory')
                .select('coach_id, full_name, bio')
                .eq('accepting_clients', true)
                .order('full_name')

            if (error) {
                setError('Could not load the coach list. Please try again.')
            } else {
                setCoaches(data ?? [])
            }
            setLoading(false)
        }
        loadCoaches()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground h-11">
                <Spinner className="w-4 h-4" />
                Loading coaches...
            </div>
        )
    }

    if (error) {
        return <p className="text-sm text-destructive">{error}</p>
    }

    if (coaches.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                No coaches are accepting new clients right now. Please check back later.
            </p>
        )
    }

    return (
        <div role="radiogroup" aria-label="Choose a coach" className="grid gap-2 sm:grid-cols-2">
            {coaches.map((coach) => {
                const selected = value === coach.coach_id
                return (
                    <button
                        key={coach.coach_id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled}
                        onClick={() => onChange(coach.coach_id)}
                        className={`relative flex items-start gap-3 rounded-lg border p-3 text-left transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${selected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:bg-accent hover:border-accent-foreground/20'
                            }`}
                    >
                        <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                            <UserRound className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{coach.full_name ?? 'Unnamed coach'}</p>
                            {coach.bio && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{coach.bio}</p>
                            )}
                        </div>
                        {selected && (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                    </button>
                )
            })}
        </div>
    )
}
