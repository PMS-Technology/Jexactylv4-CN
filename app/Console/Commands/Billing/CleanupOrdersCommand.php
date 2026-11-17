<?php

namespace Everest\Console\Commands\Billing;

use Illuminate\Console\Command;
use Everest\Models\Billing\Order;

class CleanupOrdersCommand extends Command
{
    protected $description = 'An automated task to delete and edit billing orders.';

    protected $signature = 'p:billing:cleanup-orders';

    /**
     * CleanupOrdersCommand constructor.
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Handle command execution.
     *
     * An unpaid order is only expired once it has been waiting for longer than the
     * configured window. The window has to cover the time a customer spends on the
     * gateway page, because the payment notification arrives after that — expiring an
     * order that is still being paid for would throw the payment away.
     */
    public function handle()
    {
        $cutoff = now()->subDays($this->expireDays());

        // The orders this task acts on: the expired ones, which are removed, and the
        // pending ones that have been waiting unpaid for longer than the window.
        $orders = Order::where('status', Order::STATUS_EXPIRED)
            ->orWhere(function ($query) use ($cutoff) {
                $query->where('status', Order::STATUS_PENDING)
                    ->where('created_at', '<=', $cutoff);
            })
            ->get();

        foreach ($orders as $order) {
            try {
                if ($order->status === Order::STATUS_EXPIRED) {
                    $order->delete();
                    continue;
                }

                $order->forceFill(['status' => Order::STATUS_EXPIRED])->save();
            } catch (\Exception $ex) {
                // handle quietly, no need to log this
            }
        }

        // Orders whose customer is gone are removed whatever their status, since there
        // is nobody left to look at them.
        foreach (Order::whereDoesntHave('user')->get() as $order) {
            try {
                $order->delete();
            } catch (\Exception $ex) {
                // handle quietly, no need to log this
            }
        }
    }

    /**
     * How many days an unpaid order is kept.
     */
    private function expireDays(): int
    {
        return max(1, (int) config('modules.billing.orders.expire_days', 7));
    }
}
