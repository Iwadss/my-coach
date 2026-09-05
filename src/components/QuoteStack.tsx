import { useEffect, useState } from 'react'

interface Quote {
    text: string
    author: string
}

const QUOTES: Quote[] = [
    { text: 'The clock is ticking. Are you becoming the person you want to be?', author: 'Greg Plitt' },
    { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle' },
    { text: "Success isn't always about greatness. It's about consistency. Consistent hard work leads to success.", author: 'Dwayne "The Rock" Johnson' },
    { text: "Your body can stand almost anything. It's your mind that you have to convince.", author: 'Anonymous' },
    { text: "The only bad workout is the one that didn't happen.", author: 'Anonymous' },
    { text: "We don't stop exercising because we grow old—we grow old because we stop exercising.", author: 'Dr. Kenneth Cooper' },
    { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
    { text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
    { text: "You don't have to be extreme, just consistent.", author: 'Anonymous' },
    { text: 'Pain is temporary. Quitting lasts forever.', author: 'Lance Armstrong' },
]

const N = QUOTES.length

// iOS-lock-screen-style notification stack: the front card is fully
// readable, two more sit stacked behind it (scaled down, faded, nudged
// down), and the rest wait off-stage below. Every tick the front card
// exits upward and fades out while the stack advances and a new card
// slides up into the back slot — a continuous, one-directional loop.
export default function QuoteStack() {
    const [active, setActive] = useState(0)
    const [paused, setPaused] = useState(false)

    useEffect(() => {
        if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const id = setInterval(() => setActive((a) => (a + 1) % N), 6500)
        return () => clearInterval(id)
    }, [paused])

    return (
        <div
            className="relative h-[150px] w-full max-w-[420px]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {QUOTES.map((quote, i) => {
                const delta = (i - active + N) % N

                let y: number, scale: number, opacity: number, blur: number
                if (delta === 0) { y = 0; scale = 1; opacity = 1; blur = 0 } // front card
                else if (delta === 1) { y = 14; scale = 0.95; opacity = 0.55; blur = 0 } // 1st behind
                else if (delta === 2) { y = 26; scale = 0.9; opacity = 0.28; blur = 0.5 } // 2nd behind
                else if (delta === N - 1) { y = -22; scale = 0.82; opacity = 0; blur = 1 } // just exited, up + out
                else { y = 38; scale = 0.87; opacity = 0; blur = 1 } // waiting off-stage below

                return (
                    <div
                        key={i}
                        aria-hidden={delta !== 0}
                        className="absolute inset-x-0 top-0 rounded-2xl border border-[#e2e2d9] dark:border-[#232323] bg-white/70 dark:bg-[#141414]/70 backdrop-blur-md shadow-lg px-5 py-4 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none will-change-transform"
                        style={{
                            transform: `translateY(${y}px) scale(${scale})`,
                            opacity,
                            filter: blur ? `blur(${blur}px)` : 'none',
                            zIndex: N - delta,
                        }}
                    >
                        <p className="text-[13.5px] leading-relaxed text-[#14140f]/75 dark:text-white/75">
                            "{quote.text}"
                        </p>
                        <p className="mt-2 font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[1.2px] text-[#14140f]/45 dark:text-white/40">
                            — {quote.author}
                        </p>
                    </div>
                )
            })}
        </div>
    )
}
