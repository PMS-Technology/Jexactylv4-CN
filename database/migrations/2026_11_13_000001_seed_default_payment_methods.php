<?php

use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Migrations\Migration;

return new class () extends Migration {
    /**
     * The payment methods a panel starts with.
     *
     * A method is only offered when its channel has been configured, so seeding them
     * all is safe: the ones whose credentials are missing simply do not show up at
     * checkout. The identifiers are unique, so running this again does not duplicate
     * them.
     */
    private const METHODS = [
        ['identifier' => 'stripe', 'name' => '信用卡 / Stripe', 'description' => '使用国际信用卡付款。', 'sort' => 10],
        ['identifier' => 'epay:wxpay', 'name' => '微信支付', 'description' => '使用微信扫码付款。', 'sort' => 20],
        ['identifier' => 'epay:alipay', 'name' => '支付宝', 'description' => '使用支付宝付款。', 'sort' => 30],
        ['identifier' => 'epay:qqpay', 'name' => 'QQ 钱包', 'description' => '使用 QQ 钱包付款。', 'sort' => 40],
        ['identifier' => 'creem', 'name' => 'Creem', 'description' => '由 Creem 代收并处理税务与发票。', 'sort' => 50],
        ['identifier' => 'waffo', 'name' => 'Waffo 聚合网关', 'description' => '覆盖多个地区的收单网关。', 'sort' => 60],
        ['identifier' => 'waffo_pancake', 'name' => 'USDC 支付', 'description' => '使用 USDC 稳定币付款。', 'sort' => 70],
    ];

    public function up(): void
    {
        foreach (self::METHODS as $method) {
            DB::table('payment_methods')->insertOrIgnore([
                'uuid' => (string) Str::uuid(),
                'identifier' => $method['identifier'],
                'name' => $method['name'],
                'icon' => null,
                'description' => $method['description'],
                'enabled' => true,
                'sort' => $method['sort'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('payment_methods')->whereIn('identifier', array_column(self::METHODS, 'identifier'))->delete();
    }
};
