<?php

namespace Everest\Http\Controllers\Api\Client\Billing;

use Everest\Models\Server;
use Everest\Models\Billing\Product;
use Everest\Exceptions\DisplayException;
use Everest\Services\Billing\UpgradeService;
use Everest\Services\Billing\CheckoutService;
use Everest\Transformers\Api\Client\ProductTransformer;
use Everest\Http\Controllers\Api\Client\ClientApiController;
use Everest\Http\Requests\Api\Client\Billing\ProcessUpgradeRequest;
use Everest\Http\Requests\Api\Client\Billing\GetUpgradeChargeRequest;
use Everest\Http\Requests\Api\Client\Billing\GetUpgradeOptionsRequest;

class UpgradeController extends ClientApiController
{
    public function __construct(
        private UpgradeService $upgradeService,
        private CheckoutService $checkoutService,
    ) {
        parent::__construct();
    }

    /**
     * Returns all available products to upgrade to.
     */
    public function index(GetUpgradeOptionsRequest $request, Server $server): array
    {
        $existing_product = Product::findOrFail($server->billing_product_id);

        $products = Product::where('category_uuid', $existing_product->category->uuid)
            ->where('price', '>', $existing_product->price)
            ->get();

        return $this->transform($products, ProductTransformer::class);
    }

    /**
     * Generate an OTC for the pro-rated server upgrade.
     */
    public function charge(GetUpgradeChargeRequest $request, Server $server): array
    {
        $existing_product = Product::findOrFail($server->billing_product_id);
        $new_product = Product::findOrFail($request->input('product_id'));

        if ($existing_product->price >= $new_product->price) {
            throw new DisplayException('You cannot upgrade to a cheaper plan.');
        }

        $charge = $this->upgradeService->charge($server, $existing_product, $new_product);

        return ['charge' => $charge];
    }

    /**
     * Process a one-time upgrade fee through the chosen payment method and
     * update the server with new resources according to new package.
     */
    public function create(ProcessUpgradeRequest $request, Server $server): string
    {
        $validated = $this->upgradeService->validate($request->user());

        if (!$validated) {
            throw new DisplayException('This server cannot be upgraded at this time.');
        }

        $existing_product = Product::findOrFail($server->billing_product_id);
        $new_product = Product::findOrFail($request->input('product_id'));
        $price = $this->upgradeService->charge($server, $existing_product, $new_product);

        if ($existing_product->price >= $new_product->price) {
            throw new DisplayException('You cannot upgrade to a cheaper plan.');
        }

        return $this->checkoutService->createUpgrade(
            $request->user(),
            $server,
            $new_product,
            $price,
            (string) $request->input('payment_method'),
        );
    }
}
