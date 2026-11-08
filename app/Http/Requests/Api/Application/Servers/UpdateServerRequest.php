<?php

namespace Everest\Http\Requests\Api\Application\Servers;

use Everest\Models\Server;
use Illuminate\Support\Arr;
use Everest\Models\AdminRole;
use Everest\Http\Requests\Api\Application\ApplicationApiRequest;

class UpdateServerRequest extends ApplicationApiRequest
{
    public function rules(): array
    {
        // getRulesForUpdate() makes unique rules (external_id) ignore this server, so re-saving
        // an unchanged external ID no longer fails with "has already been taken".
        $rules = Server::getRulesForUpdate($this->route()->parameter('server'));

        return [
            'external_id' => $rules['external_id'],
            'name' => $rules['name'],
            'description' => array_merge(['nullable'], $rules['description']),
            'owner_id' => $rules['owner_id'],

            'limits' => 'sometimes|array',
            'limits.memory' => $rules['memory'],
            'limits.swap' => $rules['swap'],
            'limits.disk' => $rules['disk'],
            'limits.io' => $rules['io'],
            'limits.threads' => $rules['threads'],
            'limits.cpu' => $rules['cpu'],
            'limits.oom_killer' => 'sometimes|boolean',

            'feature_limits' => 'required|array',
            'feature_limits.allocations' => $rules['allocation_limit'],
            'feature_limits.backups' => $rules['backup_limit'],
            'feature_limits.databases' => $rules['database_limit'],
            'feature_limits.subusers' => $rules['subuser_limit'],

            'renewal_date' => $rules['renewal_date'],
            'billing_product_id' => $rules['billing_product_id'],

            'allocation_id' => 'bail|exists:allocations,id',
            'add_allocations' => 'bail|array',
            'add_allocations.*' => 'integer',
            'remove_allocations' => 'bail|array',
            'remove_allocations.*' => 'integer',
        ];
    }

    /**
     * @param string|null $key
     * @param string|array|null $default
     */
    public function validated($key = null, $default = null)
    {
        $data = parent::validated();
        $response = [
            'external_id' => array_get($data, 'external_id'),
            'name' => array_get($data, 'name'),
            'description' => array_get($data, 'description'),
            'owner_id' => array_get($data, 'owner_id'),

            'memory' => array_get($data, 'limits.memory'),
            'swap' => array_get($data, 'limits.swap'),
            'disk' => array_get($data, 'limits.disk'),
            'io' => array_get($data, 'limits.io'),
            'threads' => array_get($data, 'limits.threads'),
            'cpu' => array_get($data, 'limits.cpu'),
            'oom_killer' => array_get($data, 'limits.oom_killer'),

            'allocation_limit' => array_get($data, 'feature_limits.allocations'),
            'backup_limit' => array_get($data, 'feature_limits.backups'),
            'database_limit' => array_get($data, 'feature_limits.databases'),
            'subuser_limit' => array_get($data, 'feature_limits.subusers'),

            'renewal_date' => array_get($data, 'renewal_date'),
            'billing_product_id' => array_get($data, 'billing_product_id'),

            'allocation_id' => array_get($data, 'allocation_id'),
            'add_allocations' => array_get($data, 'add_allocations'),
            'remove_allocations' => array_get($data, 'remove_allocations'),
        ];

        // DetailsModificationService only touches these when the key exists. Always returning
        // them made every save without billing fields clear the renewal date and product.
        foreach (['description', 'renewal_date', 'billing_product_id'] as $optional) {
            if (!array_key_exists($optional, $data)) {
                unset($response[$optional]);
            }
        }

        return is_null($key) ? $response : Arr::get($response, $key, $default);
    }

    public function permission(): string
    {
        return AdminRole::SERVERS_UPDATE;
    }
}
