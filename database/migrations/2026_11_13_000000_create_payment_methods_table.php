<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class () extends Migration {
    /**
     * Run the migrations.
     *
     * The payment methods a customer can choose from at checkout. The identifier is
     * what decides the flow: it is the channel's own identifier, optionally followed
     * by a colon and the method within that channel — `stripe` is Stripe itself,
     * `epay:wxpay` is the WeChat Pay method of the Epay channel.
     */
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->required();
            $table->string('identifier')->required();
            $table->string('name')->required();
            $table->string('icon')->nullable();
            $table->string('description')->nullable();
            $table->boolean('enabled')->default(true);
            $table->integer('sort')->default(0);
            $table->timestamps();

            $table->unique('identifier');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
