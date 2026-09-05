import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";

// "Single action back" 404 from the MyCoach design file — mobile reads
// "Rep not found", desktop reads "This page isn't on the plan". Same
// theme-aware white/#0a0a0a + lime palette as Login.tsx and every other
// public page, centered (the design's own frames are left-aligned, but
// that reads as off-balance on a real full-width viewport) with a
// header/footer bar on desktop only (mirrors the design's ChromeWindow
// vs IOSDevice frames) and a generated error ref for support correlation.
const NotFound = () => {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        console.error(
            "404 Error: User attempted to access non-existent route:",
            location.pathname
        );
    }, [location.pathname]);

    // Session-stable reference so a reported 404 can be matched back to
    // the console log above — same role as the design's {{ ref }}, just
    // generated instead of hardcoded.
    const ref = useMemo(() => {
        const group = () =>
            Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, "0");
        return `REQ-${group()}-${group()}`;
    }, []);

    // "Go back" is the design's only affordance — fall back to home only
    // when there's nowhere to go back to (e.g. the 404 was opened directly).
    const goBack = () => {
        if (window.history.length > 1) navigate(-1);
        else navigate("/");
    };

    return (
        <div className="min-h-screen w-full flex flex-col bg-white dark:bg-[#0a0a0a] text-[#14140f] dark:text-white">
            {/* Header — desktop only */}
            <div className="hidden lg:flex items-center justify-between px-[34px] py-5 border-b border-[#e2e2d9] dark:border-[#1c1c1c]">
                <Link to="/" className="font-['Anton'] text-xl tracking-wide uppercase">
                    MyCoach
                </Link>
                <span className="font-['JetBrains_Mono'] text-[10.5px] font-medium tracking-[.14em] uppercase text-[#14140f]/40 dark:text-white/40">
                    Error 404
                </span>
            </div>

            {/* Hero */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-10 lg:px-[60px] py-14 lg:py-10">
                <div className="font-['Anton'] leading-[0.8] tracking-wide text-[#6f8c00] dark:text-[#ccff00] text-[108px] lg:text-[152px]">
                    404
                </div>

                <h1 className="mt-[22px] font-['Anton'] uppercase tracking-wide leading-[1.05] lg:leading-none text-[30px] lg:text-[50px]">
                    <span className="lg:hidden">Rep not found</span>
                    <span className="hidden lg:inline">This page isn't on the plan</span>
                </h1>

                <p className="mt-3 lg:mt-[22px] max-w-[48ch] mx-auto text-[13px] lg:text-sm leading-relaxed text-[#14140f]/60 dark:text-white/50">
                    <span className="lg:hidden">This page has been moved, cancelled or never existed. Your sessions and progress are untouched.</span>
                    <span className="hidden lg:inline">The link is broken, expired, or the session it pointed to was rescheduled. Nothing was lost.</span>
                </p>

                <button
                    type="button"
                    onClick={goBack}
                    className="mt-8 lg:mt-[30px] bg-[#ccff00] text-[#0a0a0a] rounded-full py-[18px] lg:py-[15px] px-10 lg:px-[30px] font-semibold text-[15px] lg:text-sm hover:bg-[#d9ff33] active:bg-[#b8e600] transition-colors"
                >
                    Go back
                </button>

                <div className="mt-4 lg:hidden text-[12.5px] text-[#14140f]/45 dark:text-white/45">
                    Error ref <span className="font-['JetBrains_Mono'] text-[#14140f]/70 dark:text-white/70">{ref}</span>
                </div>
            </div>

            {/* Footer — desktop only */}
            <div className="hidden lg:block px-[34px] py-5 border-t border-[#e2e2d9] dark:border-[#1c1c1c] text-center text-[12.5px] text-[#14140f]/45 dark:text-white/45">
                Error ref <span className="font-['JetBrains_Mono'] text-[#14140f]/70 dark:text-white/70">{ref}</span>
            </div>
        </div>
    );
};

export default NotFound;
