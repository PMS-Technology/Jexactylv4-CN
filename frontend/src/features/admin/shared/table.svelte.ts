/**
 * Page, debounced search and single-column sort for the billing tables, the state the
 * legacy `useTableHooks` context held. Sorting cycles ascending → descending → off.
 */
export class TableState<SortKey extends string> {
    page = $state(1);
    search = $state('');
    /** The search text once it has settled; shorter than two characters counts as empty. */
    query = $state('');
    sort = $state<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);

    constructor() {
        $effect(() => {
            const value = this.search.trim();
            const timer = setTimeout(() => {
                const next = value.length >= 2 ? value : '';
                if (next !== this.query) {
                    this.query = next;
                    this.page = 1;
                }
            }, 300);

            return () => clearTimeout(timer);
        });
    }

    get sorts(): Partial<Record<SortKey, 'asc' | 'desc'>> {
        return this.sort ? ({ [this.sort.key]: this.sort.dir } as Partial<Record<SortKey, 'asc' | 'desc'>>) : {};
    }

    toggleSort = (key: SortKey) => {
        const s = this.sort;
        this.sort = s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null;
        this.page = 1;
    };
}
