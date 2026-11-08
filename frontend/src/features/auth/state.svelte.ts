/**
 * Hand-off between auth pages. The checkpoint token stays in memory (the legacy page used
 * router state), so a refresh on the checkpoint sends the user back to sign in.
 */
export const authState = $state<{ checkpointToken: string; notice: string; from: string }>({ checkpointToken: '', notice: '', from: '' });

/** Where to go after signing in: the page a guest was sent away from, else the backend's choice. */
export function afterLogin(intended?: string): string {
    const from = authState.from;
    // Same-origin paths only, so the value cannot be used as an open redirect.
    return from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/auth') ? from : intended || '/';
}
