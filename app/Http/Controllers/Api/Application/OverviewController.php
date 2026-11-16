<?php

namespace Everest\Http\Controllers\Api\Application;

use Everest\Models\Node;
use Everest\Models\User;
use Everest\Models\Backup;
use Everest\Models\Server;
use Everest\Models\Ticket;
use Everest\Models\Database;
use Everest\Models\Billing\Order;
use Illuminate\Http\JsonResponse;
use Everest\Models\Billing\Product;
use Everest\Services\Panel\PanelMode;
use Everest\Services\Helpers\SoftwareVersionService;
use Everest\Http\Requests\Api\Application\OverviewRequest;

class OverviewController extends ApplicationApiController
{
    /**
     * OverviewController constructor.
     */
    public function __construct(
        private SoftwareVersionService $softwareVersionService,
        private PanelMode $panelMode,
    ) {
        parent::__construct();
    }

    /**
     * Returns version information.
     */
    public function version(OverviewRequest $request): JsonResponse
    {
        return new JsonResponse($this->softwareVersionService->getVersionData());
    }

    /**
     * Returns metrics relating to server count, user count & more.
     */
    public function metrics(OverviewRequest $request): JsonResponse
    {
        $data = [
            'nodes' => Node::query()->count(),
            'servers' => [
                'total' => Server::query()->count(),
                'suspended' => Server::query()->where('status', Server::STATUS_SUSPENDED)->count(),
                'installing' => Server::query()->whereIn('status', [
                    Server::STATUS_INSTALLING,
                    Server::STATUS_INSTALL_FAILED,
                    Server::STATUS_REINSTALL_FAILED,
                ])->count(),
            ],
            'users' => [
                'total' => User::query()->count(),
                'admins' => User::query()->where('root_admin', true)->count(),
            ],
            'databases' => Database::query()->count(),
            'backups' => Backup::query()->count(),
            'tickets' => Ticket::query()->where('status', 'pending')->count(),
        ];

        // The billing metrics only exist in standard mode; personal mode drops the
        // whole billing system.
        if (config('modules.billing.enabled') && $this->panelMode->allows('billing')) {
            $data['billing'] = [
                'revenue' => (float) Order::query()->where('status', Order::STATUS_PROCESSED)->sum('total'),
                'orders_pending' => Order::query()->where('status', Order::STATUS_PENDING)->count(),
                'orders_this_month' => Order::query()->whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year)
                    ->count(),
                'products' => Product::query()->count(),
            ];
        }

        return new JsonResponse($data);
    }
}
