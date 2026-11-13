<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class () extends Migration {
    /**
     * Run the migrations.
     *
     * The product id the MoR gateways know the product by. Stripe creates its products
     * on the fly, so it does not need one; Creem and Pancake sell products that exist
     * in their own dashboard first, so the panel has to remember which one.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('external_id')->nullable()->after('stripe_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('external_id');
        });
    }
};
