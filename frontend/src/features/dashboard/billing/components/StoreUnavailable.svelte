<script lang="ts">
    import Alert from '$lib/components/Alert.svelte';
</script>

<!-- Shown when billing is on but no payment method is ready to take money. -->
<div class="mx-auto max-w-3xl p-6 lg:p-8">
    <Alert variant="destructive" title="商店暂不可用">
        由于配置错误，商店目前无法使用。请稍后再试，或联系管理员。
    </Alert>
</div>
