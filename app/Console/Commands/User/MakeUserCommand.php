<?php

namespace Everest\Console\Commands\User;

use Illuminate\Console\Command;
use Everest\Services\Users\UserCreationService;

class MakeUserCommand extends Command
{
    protected $description = 'Creates a user on the system via the CLI.';

    protected $signature = 'p:user:make {--email=} {--username=} {--name-first=} {--name-last=} {--password=} {--admin=} {--no-password}';

    /**
     * MakeUserCommand constructor.
     */
    public function __construct(private UserCreationService $creationService)
    {
        parent::__construct();
    }

    /**
     * Handle command request to create a new user.
     *
     * @throws \Exception
     * @throws \Everest\Exceptions\Model\DataValidationException
     */
    public function handle()
    {
        // The option arrives as a raw string; passing it straight to the model let anything
        // other than "1" (e.g. --admin=true) be stored as root_admin = 0, silently creating
        // a regular user. Parse it as a boolean and refuse values we cannot interpret.
        $root_admin = $this->option('admin');
        if (is_null($root_admin)) {
            $root_admin = $this->confirm(trans('command/messages.user.ask_admin'));
        } else {
            $parsed = filter_var($root_admin, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if (is_null($parsed)) {
                $this->error("Invalid value for --admin: \"$root_admin\". Use true/false, 1/0, yes/no or on/off.");

                return self::FAILURE;
            }
            $root_admin = $parsed;
        }

        $email = $this->option('email') ?? $this->ask(trans('command/messages.user.ask_email'));
        $username = $this->option('username') ?? $this->ask(trans('command/messages.user.ask_username'));

        if (is_null($password = $this->option('password')) && !$this->option('no-password')) {
            $this->warn(trans('command/messages.user.ask_password_help'));
            $this->line(trans('command/messages.user.ask_password_tip'));
            $password = $this->secret(trans('command/messages.user.ask_password'));
        }

        $user = $this->creationService->handle(compact('email', 'username', 'password', 'root_admin'));
        $this->table(['Field', 'Value'], [
            ['UUID', $user->uuid],
            ['Email', $user->email],
            ['Username', $user->username],
            ['Admin', $user->root_admin ? 'Yes' : 'No'],
        ]);
    }
}
