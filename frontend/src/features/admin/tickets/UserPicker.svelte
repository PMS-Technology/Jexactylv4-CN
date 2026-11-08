<script lang="ts">
    import { Search, X } from '@lucide/svelte';
    import { searchUsers, type UserSummary } from '$lib/api/admin/modules';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Spinner } from '$lib/ui';
    import Avatar from '$lib/components/Avatar.svelte';

    /**
     * Searchable user picker, ported from tickets/UserSelect.tsx. `adminsOnly` narrows the
     * results to admins (root or role-based) for the assignee field; the legacy picker
     * labelled the field "administrator" but listed every account.
     */
    type Props = {
        id: string;
        label: string;
        selected?: UserSummary | null;
        adminsOnly?: boolean;
        disabled?: boolean;
        onSelect: (user: UserSummary | null) => void;
    };
    let { id, label, selected = null, adminsOnly = false, disabled = false, onSelect }: Props = $props();

    let query = $state('');
    let results = $state<UserSummary[]>([]);
    /** The text the current `results` belong to; the list stays hidden until it matches. */
    let searchedFor = $state('');
    let loading = $state(false);
    let error = $state('');
    let open = $state(false);
    let active = $state(0);

    $effect(() => {
        const q = query.trim();
        if (q.length < 2) {
            results = [];
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            loading = true;
            error = '';
            try {
                const users = await searchUsers(q);
                if (!cancelled) {
                    results = adminsOnly ? users.filter(u => u.isAdmin) : users;
                    searchedFor = q;
                    active = 0;
                }
            } catch (e) {
                if (!cancelled) {
                    error = httpErrorToHuman(e);
                    results = [];
                    searchedFor = q;
                }
            } finally {
                if (!cancelled) loading = false;
            }
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    });

    function pick(user: UserSummary) {
        onSelect(user);
        query = '';
        results = [];
        open = false;
    }

    function onKeydown(event: KeyboardEvent) {
        if (!results.length) return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            active = (active + 1) % results.length;
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            active = (active - 1 + results.length) % results.length;
        } else if (event.key === 'Enter') {
            event.preventDefault();
            pick(results[active]!);
        } else if (event.key === 'Escape') {
            open = false;
        }
    }

    const listId = $derived(`${id}-results`);
</script>

<div class="space-y-1.5">
    <label for={id} class="text-sm font-medium">{label}</label>

    {#if selected}
        <div class="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-2 text-sm">
            <Avatar src={selected.avatarUrl} name={selected.uuid} size={20} />
            <span class="min-w-0 flex-1 truncate">{selected.username} <span class="text-muted-foreground">({selected.email})</span></span>
            {#if !disabled}
                <button
                    type="button"
                    class="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="清除{label}"
                    onclick={() => onSelect(null)}
                >
                    <X class="size-4" />
                </button>
            {/if}
        </div>
    {:else}
        <div class="relative">
            <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
                {id}
                type="text"
                role="combobox"
                aria-expanded={open && results.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                autocomplete="off"
                placeholder="输入用户名或邮箱搜索"
                bind:value={query}
                {disabled}
                onfocus={() => (open = true)}
                oninput={() => (open = true)}
                onblur={() => setTimeout(() => (open = false), 150)}
                onkeydown={onKeydown}
                class="h-9 w-full rounded-md border border-input bg-background pr-8 pl-8 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
            />
            {#if loading}
                <div class="absolute inset-y-0 right-2.5 flex items-center"><Spinner size="sm" /></div>
            {/if}
            {#if open && query.trim().length >= 2 && searchedFor === query.trim() && !loading}
                <ul
                    id={listId}
                    role="listbox"
                    class="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md"
                >
                    {#each results as user, i (user.id)}
                        <li
                            role="option"
                            aria-selected={i === active}
                            class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 {i === active ? 'bg-accent' : ''}"
                            onmousedown={e => {
                                e.preventDefault();
                                pick(user);
                            }}
                            onmouseenter={() => (active = i)}
                        >
                            <Avatar src={user.avatarUrl} name={user.uuid} size={20} />
                            <span class="truncate">{user.username} <span class="text-muted-foreground">({user.email})</span></span>
                        </li>
                    {:else}
                        <li class="px-2 py-1.5 text-muted-foreground">{error || (adminsOnly ? '没有匹配的管理员。' : '没有匹配的用户。')}</li>
                    {/each}
                </ul>
            {/if}
        </div>
    {/if}
</div>
