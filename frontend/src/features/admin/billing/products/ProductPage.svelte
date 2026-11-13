<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { ArrowLeft, Bell, Box, Cpu, Puzzle, Trash2 } from '@lucide/svelte';
    import {
        adminBillingKeys,
        createProduct,
        deleteProduct,
        getProduct,
        type AdminProduct,
        type ProductLimits,
        updateProduct,
    } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * New/edit product, ported from products/ProductForm.tsx, ProductContainer.tsx and
     * ProductDeleteButton.tsx. The backend stores whatever it is sent (the product
     * requests have no rules), so the legacy Yup limits are enforced here before saving.
     */
    let { categoryId, productId }: { categoryId: number; productId: number | null } = $props();

    const queryClient = useQueryClient();

    const product = createQuery(() => ({
        queryKey: adminBillingKeys.product(productId ?? 0),
        queryFn: () => getProduct(productId!),
        enabled: productId !== null,
    }));

    type LimitKey = keyof ProductLimits;
    const limitFields: { key: LimitKey; label: string; hint: string; min: number; group: 'resource' | 'feature' }[] = [
        { key: 'cpu', label: 'CPU 限制 (%)', hint: '100% 相当于一个完整线程。', min: 10, group: 'resource' },
        { key: 'memory', label: '内存限制 (MiB)', hint: '服务器可以使用的内存。', min: 128, group: 'resource' },
        { key: 'disk', label: '磁盘限制 (MiB)', hint: '服务器可以使用的磁盘空间。', min: 128, group: 'resource' },
        { key: 'backup', label: '备份数量', hint: '服务器可以创建的备份数。', min: 0, group: 'feature' },
        { key: 'database', label: '数据库数量', hint: '服务器可以创建的数据库数。', min: 0, group: 'feature' },
        { key: 'allocation', label: '端口数量', hint: '服务器可以拥有的端口分配数。', min: 1, group: 'feature' },
    ];

    let name = $state('');
    let description = $state('');
    let icon = $state('');
    let price = $state('');
    /** The product id the payment gateway knows this product by. */
    let externalId = $state('');
    let limits = $state<Record<LimitKey, string>>({ cpu: '', memory: '', disk: '', backup: '', database: '', allocation: '' });
    let loaded = $state(false);

    function fill(p: AdminProduct | null) {
        name = p?.name ?? '';
        description = p?.description ?? '';
        icon = p?.icon ?? '';
        price = p ? String(p.price) : '9.99';
        externalId = p?.externalId ?? '';
        const l = p?.limits ?? { cpu: 100, memory: 1024, disk: 4096, backup: 0, database: 0, allocation: 1 };
        limits = {
            cpu: String(l.cpu),
            memory: String(l.memory),
            disk: String(l.disk),
            backup: String(l.backup),
            database: String(l.database),
            allocation: String(l.allocation),
        };
        loaded = true;
    }

    $effect(() => {
        if (loaded) return;
        if (productId === null) fill(null);
        else if (product.data) fill(product.data);
    });

    const priceValue = $derived(/^\d+(\.\d{1,2})?$/.test(price.trim()) ? Number(price) : null);
    const limitError = (key: LimitKey) => {
        const field = limitFields.find(f => f.key === key)!;
        const v = limits[key].trim();
        return /^\d+$/.test(v) && Number(v) >= field.min ? undefined : `请输入不小于 ${field.min} 的整数。`;
    };

    // Product::$validationRules: name 3–191, icon 3–300, description ≤ 300.
    const errors = $derived({
        name: name.trim().length < 3 || name.trim().length > 191 ? '名称需要 3–191 个字符。' : undefined,
        description: description.trim().length > 300 ? '描述不能超过 300 个字符。' : undefined,
        icon: icon.trim() && (icon.trim().length < 3 || icon.trim().length > 300) ? '图标地址需要 3–300 个字符。' : undefined,
        price: priceValue === null ? '请输入不小于 0 的金额，最多两位小数。' : undefined,
        ...Object.fromEntries(limitFields.map(f => [f.key, limitError(f.key)])),
    });
    const valid = $derived(!Object.values(errors).some(Boolean));
    const canSave = $derived(app.can(productId === null ? 'billing.product-create' : 'billing.product-update'));

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
            price: priceValue!,
            externalId: externalId.trim() || null,
            limits: Object.fromEntries(limitFields.map(f => [f.key, Number(limits[f.key])])) as unknown as ProductLimits,
        };
        try {
            if (productId === null) {
                const created = await createProduct(categoryId, values);
                await queryClient.invalidateQueries({ queryKey: adminBillingKeys.products(categoryId) });
                navigate(`/admin/billing/categories/${categoryId}/products/${created.id}`, { replace: true });
                return;
            }
            await updateProduct(categoryId, productId, values);
            await queryClient.invalidateQueries({ queryKey: adminBillingKeys.product(productId) });
            await queryClient.invalidateQueries({ queryKey: adminBillingKeys.products(categoryId) });
            notice = { variant: 'success', text: '商品已保存。' };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            saving = false;
        }
    }

    let deleteOpen = $state(false);
    let confirmName = $state('');

    const remove = async () => {
        await deleteProduct(categoryId, productId!);
        queryClient.removeQueries({ queryKey: adminBillingKeys.product(productId!) });
        await queryClient.invalidateQueries({ queryKey: adminBillingKeys.products(categoryId) });
        navigate(`/admin/billing/categories/${categoryId}`);
    };
</script>

{#snippet limitInput(key: LimitKey)}
    {@const field = limitFields.find(f => f.key === key)!}
    <div class="space-y-1.5">
        <Label for="product-{key}">{field.label}</Label>
        <Input id="product-{key}" inputmode="numeric" bind:value={limits[key]} disabled={!canSave || saving} error={errors[key as keyof typeof errors]} />
        <p class="text-xs text-muted-foreground">{field.hint}</p>
    </div>
{/snippet}

{#if productId !== null && product.error}
    <Alert variant="destructive">{httpErrorToHuman(product.error)}</Alert>
{:else if !loaded}
    <Spinner centered />
{:else}
    {#if productId !== null}
        <ConfirmDialog bind:open={deleteOpen} title="删除商品" confirmLabel="删除" disabled={confirmName !== product.data?.name} onConfirm={remove}>
            <p>删除后用户无法再购买这个商品。请输入商品名称 <code class="rounded bg-muted px-1 font-mono">{product.data?.name}</code> 确认：</p>
            <Input bind:value={confirmName} aria-label="输入商品名称确认删除" autocomplete="off" />
        </ConfirmDialog>
    {/if}

    <div class="mb-4 flex flex-wrap items-center gap-3">
        {#if productId !== null && product.data?.icon}
            <img src={product.data.icon} alt="" class="size-8 rounded-full object-cover" />
        {:else}
            <Box class="size-8 text-muted-foreground" />
        {/if}
        <div class="min-w-0 flex-1">
            <h2 class="truncate text-lg font-semibold">{productId === null ? '新建商品' : product.data?.name}</h2>
            <p class="truncate font-mono text-xs text-muted-foreground">{productId === null ? '为这个分类添加一个新的套餐。' : product.data?.uuid}</p>
        </div>
        <Button variant="ghost" href="/admin/billing/categories/{categoryId}"><ArrowLeft />返回分类</Button>
    </div>

    {#if notice}<Alert variant={notice.variant} class="mb-4">{notice.text}</Alert>{/if}

    <form onsubmit={save} class="grid gap-4 lg:grid-cols-2">
        <div class="flex flex-col gap-4">
            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><Puzzle class="size-4" />基本信息</CardTitle></CardHeader>
                <CardContent class="space-y-4 text-sm">
                    <div class="space-y-1.5">
                        <Label for="product-name">名称</Label>
                        <Input id="product-name" bind:value={name} placeholder="基础套餐" disabled={!canSave || saving} error={name ? errors.name : undefined} />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="product-description">描述</Label>
                        <Input id="product-description" bind:value={description} placeholder="适合小型服务器" disabled={!canSave || saving} error={errors.description} />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="product-icon">图标地址</Label>
                        <Input id="product-icon" bind:value={icon} placeholder="https://…/icon.png" disabled={!canSave || saving} error={errors.icon} />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="product-price">月费（{app.flags?.billing.currency.code?.toUpperCase()}）</Label>
                        <Input id="product-price" inputmode="decimal" bind:value={price} disabled={!canSave || saving} error={errors.price} />
                        <p class="text-xs text-muted-foreground">每个续期周期向用户收取的金额。</p>
                    </div>
                    <div class="space-y-1.5">
                        <Label for="product-external-id">支付渠道商品编号</Label>
                        <Input
                            id="product-external-id"
                            bind:value={externalId}
                            placeholder="prod_xxx"
                            class="font-mono"
                            disabled={!canSave || saving}
                        />
                        <p class="text-xs text-muted-foreground">
                            使用 Creem 或 Pancake 收款时必填：填上对方平台里这个商品的编号。Stripe 不需要，它会自己创建商品。
                        </p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><Cpu class="size-4" />资源限制</CardTitle></CardHeader>
                <CardContent class="grid gap-4 text-sm sm:grid-cols-3">
                    {#each limitFields.filter(f => f.group === 'resource') as field (field.key)}
                        {@render limitInput(field.key)}
                    {/each}
                </CardContent>
            </Card>
        </div>

        <div class="flex flex-col gap-4">
            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><Bell class="size-4" />功能限制</CardTitle></CardHeader>
                <CardContent class="grid gap-4 text-sm sm:grid-cols-3">
                    {#each limitFields.filter(f => f.group === 'feature') as field (field.key)}
                        {@render limitInput(field.key)}
                    {/each}
                </CardContent>
            </Card>

            {#if priceValue === 0}
                <Alert variant="warning">这个商品设置为免费。用户无需付款即可使用，请确认这是你想要的。为防止滥用，每个用户只能使用一次免费商品。</Alert>
            {/if}

            <div class="flex flex-wrap justify-end gap-2">
                {#if productId !== null && app.can('billing.product-delete')}
                    <Button
                        type="button"
                        variant="destructive"
                        onclick={() => {
                            confirmName = '';
                            deleteOpen = true;
                        }}
                    >
                        <Trash2 />删除
                    </Button>
                {/if}
                {#if canSave}
                    <Button type="submit" loading={saving} disabled={!valid}>{productId === null ? '创建商品' : '保存'}</Button>
                {/if}
            </div>
        </div>
    </form>
{/if}
