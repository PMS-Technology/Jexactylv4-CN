/**
 * Motion helpers for the Panel, built on GSAP.
 *
 * GSAP writes inline styles, so the `prefers-reduced-motion` rule in app.css does not
 * cover it: every helper checks the preference itself and leaves the element alone when
 * the user asked for less motion.
 *
 * GSAP also owns the `transform` property of everything it animates, so an element
 * that is centred with Tailwind's `-translate-x-1/2` must not be centred twice; see
 * `readCentering` for how the two are kept apart.
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

/**
 * The centring an element carries in the independent `translate` property.
 *
 * GSAP takes over the `transform` property of whatever it animates and clears the
 * independent `translate`, `rotate` and `scale` properties on it. It reads the
 * element's own transform when the tween is created and folds that into the new one,
 * but an element that is not laid out yet — a dialog that is still `display: none` —
 * reports no matrix. A centring written as `translate: -50% -50%`, which is what
 * Tailwind's `-translate-x-1/2` produces, would then be dropped: the element would sit
 * with its corner at the middle of the screen for the whole animation and jump into
 * place when the tween cleared its props.
 *
 * Reading the property here and handing the values to GSAP as percentages keeps the
 * centring in the transform it writes itself.
 */
type Centering = {
    xPercent?: number;
    yPercent?: number;
    x?: number;
    y?: number;
};

function readCentering(element: HTMLElement): Centering {
    const value = getComputedStyle(element).translate;
    if (!value || value === 'none') return {};

    const centering: Centering = {};

    // The property takes one, two or three lengths; the third one is the z offset,
    // which the panel does not use.
    for (const [index, part] of value.trim().split(/\s+/).slice(0, 2).entries()) {
        const number = parseFloat(part);
        if (Number.isNaN(number)) continue;

        if (part.endsWith('%')) {
            if (index === 0) centering.xPercent = number;
            else centering.yPercent = number;
        } else if (index === 0) {
            centering.x = number;
        } else {
            centering.y = number;
        }
    }

    return centering;
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
 *
 * An element that is still `display: none` has no box to measure, so the centring it
 * carries in the `translate` property is read here and given to GSAP as percentages;
 * without that the element would sit at the wrong place until the tween ended.
 */
export function animateIn(
    element: HTMLElement | HTMLElement[] | null | undefined,
    options: MotionOptions = {},
): void {
    if (!gsap || prefersReducedMotion() || !element) return;

    const { duration, distance, delay, ease, stagger } = { ...DEFAULTS, ...options };
    const targets = Array.isArray(element) ? element : [element];
    if (!targets.length) return;

    // An element without a box reports no transform, so GSAP would drop a centring
    // that lives in the `translate` property. It is read here and handed over.
    const first = targets[0];
    const centering =
        targets.length === 1 && first && !first.getClientRects().length
            ? readCentering(first)
            : {};

    const from: Record<string, number> = { autoAlpha: 0 };
    const to: Record<string, number> = { autoAlpha: 1 };

    // The offsets the element already carries are the base the animation moves from.
    if (distance !== undefined) {
        from.y = (centering.y ?? 0) + distance;
        to.y = centering.y ?? 0;
    } else if (centering.y !== undefined) {
        from.y = centering.y;
        to.y = centering.y;
    }

    if (centering.x !== undefined) {
        from.x = centering.x;
        to.x = centering.x;
    }

    if (centering.xPercent !== undefined) {
        from.xPercent = centering.xPercent;
        to.xPercent = centering.xPercent;
    }

    if (centering.yPercent !== undefined) {
        from.yPercent = centering.yPercent;
        to.yPercent = centering.yPercent;
    }

    // A second transition on the same element replaces the first one.
    gsap.killTweensOf(targets);
    gsap.fromTo(targets, from, {
        ...to,
        duration,
        delay,
        ease,
        stagger,
        clearProps: CLEARED,
        overwrite: 'auto',
    });
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
