<?php

namespace Everest\Services\Billing;

use Everest\Models\Egg;
use Everest\Models\Node;
use Everest\Models\User;
use Everest\Models\Server;
use Everest\Models\Billing\Order;
use Everest\Models\Billing\Product;
use Everest\Exceptions\DisplayException;
use Everest\Services\Billing\Channels\ChannelManager;
use Everest\Services\Billing\Channels\CheckoutTarget;

/**
 * Turns a checkout request into a hosted payment page.
 *
 * The client sends the same details whichever method the customer picked, so the work
 * of working out what is being bought — a new server, a renewal or an upgrade —
 * happens here once, and the channel only has to deal with the payment itself.
 */
class CheckoutService
{
    public function __construct(
        private ChannelManager $channels,
        private PaymentMethodService $paymentMethods,
        private DiscountService $discountService,
    ) {
    }

    /**
     * Creates a checkout and returns the URL the customer is sent to.
     *
     * @param array<string, mixed> $input the request body from the client
     */
    public function create(User $user, array $input, string $methodIdentifier): CheckoutTarget
    {
        $method = $this->paymentMethods->methodFor($methodIdentifier);
        $route = $this->paymentMethods->routeFor($method->identifier);

        $product = Product::findOrFail($input['product_id']);

        if (!$product->isPaid()) {
            throw new DisplayException('You cannot create a checkout session for a free product.');
        }

        $node = null;
        $server = null;
        $deploymentFee = 0.0;

        if (!empty($input['node_id'])) {
            $node = Node::findOrFail($input['node_id']);

            if (!$node->deployable) {
                throw new DisplayException('Paid servers cannot be deployed to this node.');
            }

            $deploymentFee = (float) ($node->deployment_fee ?? 0);
        } else {
            try {
                $server = $user->servers()->where('id', $input['server_id'] ?? null)->firstOrFail();
            } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
                throw new DisplayException('This server ID does not exist on your account.');
            }
        }

        $orderType = $server ? Order::TYPE_RENEWAL : Order::TYPE_NEW;
        $eggId = $this->resolveEggSelection($product, $input['egg_id'] ?? null);

        $price = null;
        $discountCode = $input['discount_code'] ?? null;

        if ($discountCode) {
            $price = $this->discountService->handle($product, $discountCode);
        }

        $metadata = [
            'user_id' => (string) $user->id,
            'customer_email' => $user->email,
            'product_id' => (string) $product->id,
            'node_id' => (string) ($node?->id ?? ''),
            'server_id' => (string) ($server?->id ?? 0),
            'egg_id' => (string) ($eggId ?? ''),
            'variables' => json_encode($input['variables'] ?? []),
            'order_type' => $orderType,
            'discount_code' => $discountCode,
        ];

        $context = new CheckoutContext($user, $product, $metadata, $price, $deploymentFee, $route->channel->value);

        return $this->channels->requireConfigured($route)->create($context, $route);
    }

    /**
     * Creates the checkout for a server upgrade, which is billed as the difference
     * between the two products rather than the full price of the new one.
     */
    public function createUpgrade(User $user, Server $server, Product $newProduct, float $price, string $methodIdentifier): CheckoutTarget
    {
        $method = $this->paymentMethods->methodFor($methodIdentifier);
        $route = $this->paymentMethods->routeFor($method->identifier);

        $metadata = [
            'user_id' => (string) $user->id,
            'customer_email' => $user->email,
            'product_id' => (string) $newProduct->id,
            'server_id' => (string) $server->id,
            'node_id' => (string) ($server->node_id ?? ''),
            'egg_id' => (string) ($server->egg_id ?? ''),
            'variables' => json_encode([]),
            'order_type' => Order::TYPE_UPGRADE,
            'discount_code' => null,
        ];

        $context = new CheckoutContext($user, $newProduct, $metadata, $price, 0.0, $route->channel->value);

        return $this->channels->requireConfigured($route)->create($context, $route);
    }

    /**
     * Validates the egg a customer selected for a product whose category doesn't pin one.
     * Categories with a fixed egg ignore any submitted selection. Returns the egg id to
     * carry through the checkout, or null when the category already has a fixed egg.
     */
    private function resolveEggSelection(Product $product, mixed $submittedEggId): ?int
    {
        if ($product->category->egg_id) {
            return null;
        }

        if (!$submittedEggId) {
            throw new DisplayException('An egg must be selected to deploy this product.');
        }

        $egg = Egg::findOrFail($submittedEggId);

        if ((int) $egg->nest_id !== (int) $product->category->nest_id) {
            throw new DisplayException('The selected egg does not belong to this product\'s nest.');
        }

        return $egg->id;
    }
}
