<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { ArrowLeft, Layers, ShoppingBasket, ShoppingCart, Trash2 } from '@lucide/svelte';
    import {
        adminBillingKeys,
        createCategory,
        deleteCategory,
        getCategory,
        getEggOptions,
        getNestOptions,
        updateCategory,
        type AdminCategory,
    } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Switch from '$lib/ui/Switch.svelte';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import ProductsTable from './ProductsTable.svelte';

    /**
     * New/edit category, ported from products/CategoryForm.tsx, CategoryContainer.tsx,
     * CategoryNestEggSelect.tsx and CategoryDeleteButton.tsx. An existing category also
     * lists its products underneath. The legacy nest select only read the first page.
     */
    let { id }: { id: number | null } = $props();

    const queryClient = useQueryClient();

    const category = createQuery(() => ({
        queryKey: adminBillingKeys.category(id ?? 0),
        queryFn: () => getCategory(id!),
        enabled: id !== null,
    }));

    const nests = createQuery(() => ({ queryKey: ['admin', 'nests', 'options'], queryFn: getNestOptions }));

    let name = $state('');
    let description = $state('');
    let icon = $state('');
    let visible = $state(false);
    let nestId = $state<number | null>(null);
    let eggId = $state<number | null>(null);
    let loaded = $state(false);

    function fill(c: AdminCategory | null) {
        name = c?.name ?? '';
        description = c?.description ?? '';
        icon = c?.icon ?? '';
        visible = c?.visible ?? false;
        nestId = c?.nestId ?? null;
        eggId = c?.eggId ?? null;
        loaded = true;
    }

    $effect(() => {
        if (loaded) return;
        if (id === null) fill(null);
        else if (category.data) fill(category.data);
    });

    // Default to the first nest, as the legacy select did.
    $effect(() => {
        if (loaded && nestId === null && nests.data?.length) nestId = nests.data[0]!.id;
    });

    const eggs = createQuery(() => ({
        queryKey: ['admin', 'nests', nestId, 'eggs', 'options'],
        queryFn: () => getEggOptions(nestId!),
        enabled: nestId !== null,
    }));

    // Category::$validationRules: name 3–191; icon and description are nullable strings.
    const errors = $derived({
        name: name.trim().length < 3 || name.trim().length > 191 ? '名称需要 3–191 个字符。' : undefined,
        description: description.trim().length > 191 ? '描述不能超过 191 个字符。' : undefined,
        icon: icon.trim().length > 191 ? '图标地址不能超过 191 个字符。' : undefined,
        nest: nestId === null ? '请选择一个 Nest。' : undefined,
    });
    const valid = $derived(!Object.values(errors).some(Boolean));
    const canSave = $derived(app.can(id === null ? 'billing.category-create' : 'billing.category-update'));

    let saving = $state(false);
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);

    async function save(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        notice = null;
        const values = {
            name: name.trim(),
            description: description.trim() || null,
            icon: icon.trim() || null,
            visible,
            nestId: nestId!,
            eggId,
        };
        try {
            if (id === null) {
                const created = await createCategory(values);
                await queryClient.invalidateQueries({ queryKey: adminBillingKeys.categories });
                navigate(`/admin/billing/categories/${created.id}`);
                return;
            }
            await updateCategory(id, values);
            await queryClient.invalidateQueries({ queryKey: adminBillingKeys.categories });
            notice = { variant: 'success', text: '分类已保存。' };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            saving = false;
        }
    }

    let deleteOpen = $state(false);
    let confirmName = $state('');

    const remove = async () => {
        await deleteCategory(id!);
        queryClient.removeQueries({ queryKey: adminBillingKeys.category(id!) });
        await queryClient.invalidateQueries({ queryKey: adminBillingKeys.categories });
        navigate('/admin/billing/categories');
    };

    const select =
        'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50';
</script>

{#if id !== null && category.error}
    <Alert variant="destructive">{httpErrorToHuman(category.error)}</Alert>
{:else if !loaded}
    <Spinner centered />
{:else}
    {#if id !== null}
        <ConfirmDialog
            bind:open={deleteOpen}
            title="删除分类"
            confirmLabel="删除分类和商品"
            disabled={confirmName !== category.data?.name}
            onConfirm={remove}
        >
            <p>此分类下的所有商品会被一并永久删除。请输入分类名称 <code class="rounded bg-muted px-1 font-mono">{category.data?.name}</code> 确认：</p>
            <Input bind:value={confirmName} aria-label="输入分类名称确认删除" autocomplete="off" />
        </ConfirmDialog>
    {/if}

    <div class="mb-4 flex flex-wrap items-center gap-3">
        {#if id !== null && category.data?.icon}
            <img src={category.data.icon} alt="" class="size-8 rounded-full object-cover" />
        {:else}
            <ShoppingCart class="size-8 text-muted-foreground" />
        {/if}
        <div class="min-w-0 flex-1">
            <h2 class="truncate text-lg font-semibold">{id === null ? '新建分类' : category.data?.name}</h2>
            <p class="truncate font-mono text-xs text-muted-foreground">{id === null ? '为商店添加一个新的商品分类。' : category.data?.uuid}</p>
        </div>
        <Button variant="ghost" href="/admin/billing/categories"><ArrowLeft />返回分类列表</Button>
    </div>

    {#if notice}<Alert variant={notice.variant} class="mb-4">{notice.text}</Alert>{/if}

    <form onsubmit={save} class="grid gap-4 lg:grid-cols-2">
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><ShoppingBasket class="size-4" />分类信息</CardTitle></CardHeader>
            <CardContent class="space-y-4 text-sm">
                <div class="space-y-1.5">
                    <Label for="category-name">名称</Label>
                    <Input id="category-name" bind:value={name} placeholder="Minecraft Java" disabled={!canSave || saving} error={name ? errors.name : undefined} />
                </div>
                <div class="space-y-1.5">
                    <Label for="category-description">描述</Label>
                    <Input id="category-description" bind:value={description} placeholder="支持 1.21" disabled={!canSave || saving} error={errors.description} />
                    <p class="text-xs text-muted-foreground">分类的简短介绍，可选。</p>
                </div>
                <div class="space-y-1.5">
                    <Label for="category-icon">图标地址</Label>
                    <Input id="category-icon" bind:value={icon} placeholder="https://…/icon.png" disabled={!canSave || saving} error={errors.icon} />
                    <p class="text-xs text-muted-foreground">与分类一起显示的图片地址，可选。</p>
                </div>
                <label class="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3">
                    <span>
                        <span class="font-medium">对用户可见</span>
                        <span class="block text-xs text-muted-foreground">关闭时用户在商店里看不到这个分类。</span>
                    </span>
                    <Switch bind:checked={visible} aria-label="对用户可见" disabled={!canSave || saving} />
                </label>
            </CardContent>
        </Card>

        <div class="flex flex-col gap-4">
            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><Layers class="size-4" />服务配置</CardTitle></CardHeader>
                <CardContent class="space-y-4 text-sm">
                    <div class="space-y-1.5">
                        <Label for="category-nest">Nest</Label>
                        <select
                            id="category-nest"
                            class={select}
                            value={nestId === null ? '' : String(nestId)}
                            disabled={!canSave || saving || !nests.data}
                            onchange={e => {
                                nestId = Number(e.currentTarget.value);
                                eggId = null;
                            }}
                        >
                            {#if !nests.data}<option value="">加载中…</option>{/if}
                            {#each nests.data ?? [] as nest (nest.id)}
                                <option value={String(nest.id)}>{nest.name}</option>
                            {/each}
                        </select>
                        {#if nests.error}<p class="text-xs text-destructive">{httpErrorToHuman(nests.error)}</p>{/if}
                        <p class="text-xs text-muted-foreground">此分类下的商品从这个 Nest 部署服务器。</p>
                    </div>
                    <div class="space-y-1.5">
                        <Label for="category-egg">Egg</Label>
                        <select
                            id="category-egg"
                            class={select}
                            value={eggId === null ? '' : String(eggId)}
                            disabled={!canSave || saving || nestId === null}
                            onchange={e => (eggId = e.currentTarget.value ? Number(e.currentTarget.value) : null)}
                        >
                            <option value="">此 Nest 中的任意 Egg（由用户选择）</option>
                            {#each eggs.data ?? [] as egg (egg.id)}
                                <option value={String(egg.id)}>{egg.name}</option>
                            {/each}
                        </select>
                        <p class="text-xs text-muted-foreground">不指定时，用户结账时可以自己选择要部署的 Egg。</p>
                    </div>
                </CardContent>
            </Card>

            <div class="flex flex-wrap justify-end gap-2">
                {#if id !== null && app.can('billing.category-delete')}
                    <Button
                        type="button"
                        variant="destructive"
                        onclick={() => {
                            confirmName = '';
                            deleteOpen = true;
                        }}
                    >
                        <Trash2 />删除分类和商品
                    </Button>
                {/if}
                {#if canSave}
                    <Button type="submit" loading={saving} disabled={!valid}>{id === null ? '创建' : '保存'}</Button>
                {/if}
            </div>
        </div>
    </form>

    {#if id !== null}
        <div class="mt-10">
            <h2 class="mb-1 text-lg font-semibold">商品</h2>
            <p class="mb-4 text-sm text-muted-foreground">{category.data?.name} 分类下的商品。</p>
            <ProductsTable categoryId={id} />
        </div>
    {/if}
{/if}
