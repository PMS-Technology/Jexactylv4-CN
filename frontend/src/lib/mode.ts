import type { PanelMode } from '$types/bootstrap';

/**
 * Panel mode helpers.
 *
 * Standard mode is the full feature set aimed at hosting providers. Personal mode
 * drops the features that only matter at that scale: the billing system, tickets,
 * public registration, the application API and the database host management.
 */
export const PERSONAL_MODE = 'personal';

/** Whether the panel currently runs in personal mode. */
export function isPersonalMode(mode: PanelMode): boolean {
    return mode === PERSONAL_MODE;
}

/**
 * Whether a feature that only exists in standard mode may be used.
 *
 * The module's own switch is checked separately; this only covers the mode.
 */
export function standardOnly(mode: PanelMode): boolean {
    return !isPersonalMode(mode);
}
