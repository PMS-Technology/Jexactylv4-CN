/**
 * Motion helpers for the Panel, built on GSAP.
 *
 * GSAP writes inline styles, so the `prefers-reduced-motion` rule in app.css does not
 * cover it: every helper checks the preference itself and leaves the element alone when
 * the user asked for less motion.
 *
 * The library is loaded on demand. `preloadMotion()` fetches it once a signed-in user
 * is in, so the first transition does not wait on the network; helpers that run before
 * it is ready do nothing rather than animating late.
 */

export type MotionOptions = {
    /** Seconds. */
    duration?: number;
    /**
     * Pixels the element travels while fading. Leave it out for a plain fade: the
     * floating elements (tooltips, dropdown menus) are positioned with an inline
     * transform, which GSAP would overwrite when it animates `y`.
     */
    distance?: number;
    /** Seconds to wait before the animation starts. */
    delay?: number;
    ease?: string;
    /** Seconds between the elements of a group. */
    stagger?: number;
};

const DEFAULTS = {
    duration: 0.28,
    delay: 0,
    ease: 'power2.out',
    stagger: 0,
};

/**
 * Only the properties GSAP itself writes are cleared once an animation ends. Clearing
 * everything would also drop the inline styles bits-ui puts on its dialog content.
 */
const CLEARED = 'opacity,visibility,transform';

type Gsap = typeof import('gsap').gsap;

let gsapPromise: Promise<Gsap> | null = null;
let gsap: Gsap | null = null;

function loadGsap(): Promise<Gsap> {
    gsapPromise ??= import('gsap').then(module => {
        gsap = module.gsap;

        return gsap;
    });

    return gsapPromise;
}

/**
 * Fetches the animation library ahead of the first transition. Call it once the Panel
 * is interactive; until it resolves, transitions are skipped instead of starting late.
 */
export function preloadMotion(): void {
    void loadGsap();
}

/** Whether the user asked the system for less motion. */
export function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

/** Whether the animation library is loaded and animations may run. */
export function motionReady(): boolean {
    return gsap !== null && !prefersReducedMotion();
}

/**
 * Fades an element in while lifting it a few pixels. The inline styles are cleared when
 * the animation ends, so the element keeps whatever the stylesheet gives it.
 *
 * This runs synchronously once the library is loaded: the element is moved to its
 * starting state in the same frame, so it is never painted before the animation.
 */
export function animateIn(
    element: HTMLElement | HTMLElement[] | null | undefined,
    options: MotionOptions = {},
): void {
    if (!gsap || prefersReducedMotion() || !element) return;

    const { duration, distance, delay, ease, stagger } = { ...DEFAULTS, ...options };
    const targets = Array.isArray(element) ? element : [element];
    if (!targets.length) return;

    // A second transition on the same element replaces the first one.
    gsap.killTweensOf(targets);
    gsap.fromTo(
        targets,
        { autoAlpha: 0, ...(distance === undefined ? {} : { y: distance }) },
        {
            autoAlpha: 1,
            ...(distance === undefined ? {} : { y: 0 }),
            duration,
            delay,
            ease,
            stagger,
            clearProps: CLEARED,
            overwrite: 'auto',
        },
    );
}

/**
 * Fades an element out. The element keeps its hidden state afterwards, so the caller
 * decides whether it is unmounted or hidden.
 */
export function animateOut(
    element: HTMLElement | null | undefined,
    options: MotionOptions = {},
): Promise<void> {
    const { duration, ease = 'power2.in' } = { ...DEFAULTS, ...options };

    if (!gsap || prefersReducedMotion() || !element) return Promise.resolve();

    // Narrowed into a local: the check above does not carry into the callback.
    const animation = gsap;

    return new Promise<void>(resolve => {
        animation.killTweensOf(element);
        animation.to(element, {
            autoAlpha: 0,
            duration,
            ease,
            onComplete: resolve,
        });
    });
}

/**
 * Fades the content area in when the route changes.
 *
 * The path is remembered globally rather than per element: the areas are swapped as
 * whole components, so a per-element record would replay the animation on the first
 * route change inside every area. The first path seen is only recorded, so the panel
 * does not fade in on the initial page load.
 */
let lastRoutePath: string | null = null;

export function animateRouteChange(element: HTMLElement | null | undefined, path: string): void {
    if (!element) return;

    if (lastRoutePath === null) {
        lastRoutePath = path;

        return;
    }

    if (lastRoutePath === path) return;

    lastRoutePath = path;

    animateIn(element, { duration: 0.24, distance: 6 });
}
