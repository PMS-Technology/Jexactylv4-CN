<?php

namespace Everest\Services\Billing\Channels;

/**
 * Where the customer is sent to pay, and how.
 *
 * Most gateways are reached by a plain redirect to a URL they built themselves. The
 * Epay protocol is different: the merchant hands the gateway a set of signed fields,
 * and the gateway takes them from either the query string or a form body. Which one it
 * reads is the gateway's choice, so the fields are carried here and the browser is
 * asked to submit them as a form — with the same fields in the query string, so a
 * gateway that only reads one of the two still sees the whole set.
 */
final readonly class CheckoutTarget
{
    /**
     * @param array<string, string> $params the signed fields to submit; empty means a
     *                                      plain redirect to the URL
     */
    public function __construct(
        public string $url,
        public array $params = [],
    ) {
    }

    /**
     * Whether the fields have to be submitted as a form rather than followed as a link.
     */
    public function isForm(): bool
    {
        return $this->params !== [];
    }

    /**
     * The target as the client receives it.
     *
     * @return array{url: string, method: string, params: array<string, string>}
     */
    public function toArray(): array
    {
        return [
            'url' => $this->url,
            'method' => $this->isForm() ? 'POST' : 'GET',
            'params' => $this->params,
        ];
    }
}
