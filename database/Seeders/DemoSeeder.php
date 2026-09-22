<?php

namespace Database\Seeders;

use Everest\Models\Allocation;
use Everest\Models\Egg;
use Everest\Models\Node;
use Everest\Models\Server;
use Everest\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (!app()->environment('local') || DB::getDatabaseName() !== 'jexactyl_demo_php85') {
            throw new RuntimeException('DemoSeeder only runs against the local jexactyl_demo_php85 database.');
        }

        if (User::exists() || Node::exists() || Server::exists() || Allocation::exists()) {
            throw new RuntimeException('DemoSeeder requires an empty demo database.');
        }

        $egg = Egg::query()->firstOrFail();
        $adminPassword = Str::password(24);

        DB::transaction(function () use ($egg, $adminPassword): void {
            User::factory()->admin()->create([
                'username' => 'demo-admin',
                'email' => 'demo-admin@example.test',
                'password' => Hash::make($adminPassword),
                'language' => 'zh_CN',
            ]);

            $users = collect(range(1, 30))->map(fn (int $number) => User::factory()->create([
                'username' => sprintf('demo-user-%02d', $number),
                'email' => sprintf('demo-user-%02d@example.test', $number),
                'password' => Hash::make(Str::password(24)),
                'language' => 'zh_CN',
            ]));

            foreach (range(1, 2) as $nodeNumber) {
                $node = Node::factory()->create([
                    'name' => sprintf('Demo Node %02d', $nodeNumber),
                    'description' => 'Demo only: no Wings daemon is connected.',
                    'fqdn' => sprintf('node-%02d.example.invalid', $nodeNumber),
                    'scheme' => 'http',
                    'memory' => 32768,
                    'disk' => 102400,
                    'maintenance_mode' => true,
                    'deployable' => false,
                ]);

                foreach (range(1, 15) as $portNumber) {
                    $allocation = Allocation::factory()->create([
                        'node_id' => $node->id,
                        'ip' => sprintf('192.0.2.%d', $nodeNumber + 9),
                        'port' => 25564 + $portNumber,
                        'notes' => 'Demo only: not a real network port.',
                    ]);

                    if ($portNumber > 10) {
                        continue;
                    }

                    $serverNumber = ($nodeNumber - 1) * 10 + $portNumber;
                    $server = Server::factory()->create([
                        'name' => sprintf('Demo Server %02d', $serverNumber),
                        'description' => 'Demo only: no container or Wings daemon exists.',
                        'status' => Server::STATUS_SUSPENDED,
                        'node_id' => $node->id,
                        'owner_id' => $users[$serverNumber - 1]->id,
                        'allocation_id' => $allocation->id,
                        'nest_id' => $egg->nest_id,
                        'egg_id' => $egg->id,
                        'image' => 'example.invalid/demo/not-running:latest',
                        'startup' => 'echo demo-only',
                    ]);

                    $allocation->update(['server_id' => $server->id]);
                }
            }
        });

        $this->command->info('Demo administrator: demo-admin@example.test');
        $this->command->info('Demo administrator password (shown once): ' . $adminPassword);
        $this->command->info('Created 30 users, 2 offline nodes, 20 suspended servers, and 30 allocations.');
    }
}
