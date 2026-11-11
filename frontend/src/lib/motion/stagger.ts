import type { Action } from 'svelte/action';
import { animateIn } from './index';

/**
 * Fades the children of a list in one after the other.
 *
 * The list items are the ones that change while the page is open: a table that gets
 * its rows from a query, a grid of cards. Putting the action on the container means
 * every list can use it without touching the items themselves.
 *
 * Only the items that are actually added are animated, so the effect does not replay
 * when the list is re-rendered with the same contents.
 */
export const stagger: Action<
    HTMLElement,
    {
        /** Selector for the items inside the container. Defaults to the direct children. */
        selector?: string;
        /** Pixels the items travel while fading. */
        distance?: number;
        /** Seconds between the items. */
        step?: number;
        /** Seconds the animation of a single item takes. */
        duration?: number;
        /** Largest number of items that is animated; the rest appear at once. */
        limit?: number;
    }
> = (node, options) => {
    let settings = { ...options };
    const seen = new WeakSet<Element>();
    let observer: MutationObserver | null = null;

    const animate = (elements: Element[]) => {
        const { selector } = settings;

        // Only the items themselves are animated. Without a selector the direct
        // children are the items; with one, the added nodes are matched against it, so
        // a change deeper inside an item does not animate anything.
        const items = elements.filter(element =>
            selector ? element.matches(selector) : element.parentElement === node,
        );

        const fresh = items.filter(element => !seen.has(element));
        if (!fresh.length) return;

        fresh.forEach(element => seen.add(element));

        const { distance, step = 0.03, duration = 0.26, limit = 12 } = settings;

        animateIn(
            fresh.slice(0, limit).map(element => element as HTMLElement),
            { duration, distance, stagger: step },
        );
    };

    const collect = () => {
        const { selector } = settings;

        return Array.from(selector ? node.querySelectorAll(selector) : node.children);
    };

    const update = () => {
        // Everything already on screen when the action starts is not new, so it is
        // recorded as seen without being animated.
        collect().forEach(element => seen.add(element));

        observer?.disconnect();
        observer = new MutationObserver(mutations => {
            const added: Element[] = [];

            for (const mutation of mutations) {
                for (const record of mutation.addedNodes) {
                    if (record instanceof Element) added.push(record);
                }
            }

            if (added.length) animate(added);
        });

        observer.observe(node, { childList: true, subtree: true });
    };

    update();

    return {
        update(next) {
            settings = { ...settings, ...next };
        },
        destroy() {
            observer?.disconnect();
            observer = null;
        },
    };
};
