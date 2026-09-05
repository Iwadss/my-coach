import { useEffect, useRef, useState } from 'react';

const CARD_COUNT = 5;

const signedOffset = (delta: number) => {
    let o = delta;
    if (o > CARD_COUNT / 2) o -= CARD_COUNT;
    if (o < -CARD_COUNT / 2) o += CARD_COUNT;
    return o;
};

export default function ImageCoverflow() {
    const [active, setActive] = useState(2);
    const [fading, setFading] = useState<number[]>([]);
    const [paused, setPaused] = useState(false);
    const prevActive = useRef(active);

    useEffect(() => {
        if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const id = setInterval(() => setActive((a) => (a + 1) % CARD_COUNT), 2000);
        return () => clearInterval(id);
    }, [paused]);

    useEffect(() => {
        const prev = prevActive.current;
        prevActive.current = active;
        if (prev === active) return;

        const seam = [];
        for (let i = 0; i < CARD_COUNT; i++) {
            const before = signedOffset(i - prev);
            const after = signedOffset(i - active);
            if (before === -after && Math.abs(before) === 2) seam.push(i);
        }
        setFading(seam);
    }, [active]);

    return (
        <div
            className="relative h-[330px] w-full flex items-center justify-center [perspective:1100px]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {Array.from({ length: CARD_COUNT }, (_, i) => {
                const offset = signedOffset(i - active);
                const dist = Math.abs(offset);
                const isActive = dist === 0;
                const x = offset * 111;
                const z = isActive ? 105 : -(dist * 135);
                const scale = isActive ? 1.12 : 1 - dist * 0.17;
                const rotateY = -offset * 42;
                const boxShadow = isActive
                    ? '0 48px 76px -22px rgba(0,0,0,0.45)'
                    : '0 16px 32px -16px rgba(0,0,0,0.28)';
                const opacity = isActive ? 1 : fading.includes(i) ? 0 : 1 - dist * 0.08;

                return (
                    <div
                        key={i}
                        onClick={() => setActive(i)}
                        className={`absolute w-[240px] h-[186px] rounded-2xl border flex items-center justify-center transition-all duration-[750ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none will-change-transform ${
                            isActive
                                ? 'bg-[#ececdf] border-[#cfcfc0] dark:bg-[#242420] dark:border-[#333330] cursor-default'
                                : 'bg-[#e2e2d9] border-[#d8d8cd] dark:bg-[#1c1c1c] dark:border-[#262626] cursor-pointer'
                        }`}
                        style={{
                            transform: `translate3d(${x}px, 0, ${z}px) scale(${scale}) rotateY(${rotateY}deg)`,
                            boxShadow,
                            zIndex: 10 - dist,
                            opacity,
                            filter: isActive ? 'none' : `brightness(${1 - dist * 0.08})`,
                        }}
                    >
                        <span className="font-['JetBrains_Mono'] text-[9px] font-medium text-[#14140f]/35 dark:text-white/30">
                            IMG
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
