<?php

namespace Database\Seeders;

use Ramsey\Uuid\Uuid;
use Everest\Models\Egg;
use Everest\Models\Node;
use Everest\Models\User;
use Everest\Models\Server;
use Everest\Models\Setting;
use Illuminate\Support\Str;
use Everest\Models\Allocation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Crypt;

class DemoDataSeeder extends Seeder
{
    private const PASSWORD = 'TestAdmin123!';

    public function run(): void
    {
        DB::transaction(function () {
            $this->removeExistingDemoData();

            Setting::query()->updateOrCreate(['key' => 'settings::app:locale'], ['value' => 'zh']);
            Setting::query()->updateOrCreate(['key' => 'settings::app:setup'], ['value' => 'true']);

            User::query()->create([
                'uuid' => Uuid::uuid4()->toString(),
                'username' => 'testadmin',
                'email' => 'testadmin@example.test',
                'password' => Hash::make(self::PASSWORD),
                'language' => 'zh',
                'root_admin' => true,
                'use_totp' => false,
            ]);

            $users = collect(range(1, 30))->map(fn (int $number) => User::query()->create([
                'uuid' => Uuid::uuid4()->toString(),
                'username' => sprintf('testuser%02d', $number),
                'email' => sprintf('testuser%02d@example.test', $number),
                'password' => Hash::make(self::PASSWORD),
                'language' => 'zh',
                'root_admin' => false,
                'use_totp' => false,
            ]));

            $nodes = collect(range(1, 2))->map(fn (int $number) => Node::query()->forceCreate([
                'uuid' => Uuid::uuid4()->toString(),
                'public' => true,
                'name' => "Test Node {$number}",
                'description' => '仅用于界面和功能测试，不连接真实 Wings 后端。',
                'fqdn' => "node-{$number}.example.test",
                'scheme' => 'http',
                'listen_port_http' => 8080,
                'listen_port_sftp' => 2022,
                'public_port_http' => 8080,
                'public_port_sftp' => 2022,
                'behind_proxy' => false,
                'maintenance_mode' => true,
                'memory' => 32768,
                'memory_overallocate' => 0,
                'disk' => 512000,
                'disk_overallocate' => 0,
                'upload_size' => 100,
                'daemon_token_id' => Str::random(Node::DAEMON_TOKEN_ID_LENGTH),
                // Node::getDecryptedKey() decrypts with unserialize; the token must be
                // stored in the serialized format Crypt::encrypt produces.
                'daemon_token' => Crypt::encrypt(Str::random(Node::DAEMON_TOKEN_LENGTH)),
                'daemon_base' => Node::DEFAULT_DAEMON_BASE,
            ]));

            $allocations = $nodes->mapWithKeys(function (Node $node, int $nodeIndex) {
                return [$node->id => collect(range(1, 20))->map(fn (int $number) => Allocation::query()->create([
                    'node_id' => $node->id,
                    'ip' => '192.0.2.' . ($nodeIndex + 10),
                    'ip_alias' => '测试节点 ' . ($nodeIndex + 1),
                    'port' => 25564 + ($nodeIndex * 20) + $number,
                    'notes' => '测试端口',
                ]))];
            });

            $egg = Egg::query()->where('name', 'Paper')->first() ?? Egg::query()->firstOrFail();

            foreach (range(1, 30) as $index) {
                $node = $nodes[($index - 1) % 2];
                $allocation = $allocations[$node->id][intdiv($index - 1, 2)];
                $user = $users[$index - 1];

                $server = Server::query()->forceCreate([
                    'uuid' => Uuid::uuid4()->toString(),
                    'uuidShort' => Str::lower(Str::random(8)),
                    'node_id' => $node->id,
                    'name' => sprintf('测试服务器 %02d', $index),
                    'description' => '模拟服务器，不连接真实后端。',
                    'status' => null,
                    'skip_scripts' => true,
                    'owner_id' => $user->id,
                    'memory' => 1024,
                    'swap' => 0,
                    'disk' => 5120,
                    'io' => 500,
                    'cpu' => 100,
                    'oom_killer' => true,
                    'allocation_id' => $allocation->id,
                    'nest_id' => $egg->nest_id,
                    'egg_id' => $egg->id,
                    'startup' => $egg->startup,
                    'image' => array_key_first($egg->docker_images),
                    'allocation_limit' => 0,
                    'database_limit' => 0,
                    'backup_limit' => 0,
                    'subuser_limit' => 0,
                    'installed_at' => now(),
                ]);

                $allocation->update(['server_id' => $server->id]);
            }
        });

        $this->command?->info('中文测试数据已创建，管理员账号：testadmin@example.test / ' . self::PASSWORD);
    }

    private function removeExistingDemoData(): void
    {
        $nodeIds = Node::query()->where('fqdn', 'like', 'node-%.example.test')->pluck('id');

        Server::query()->whereIn('node_id', $nodeIds)->delete();
        Allocation::query()->whereIn('node_id', $nodeIds)->delete();
        Node::query()->whereIn('id', $nodeIds)->delete();
        User::query()->where('email', 'like', 'test%@example.test')->delete();
    }
}
