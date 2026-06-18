<?php

return [
    'daemon_connection_failed' => 'There was an exception while attempting to communicate with the daemon resulting in a HTTP/:code response code. This exception has been logged.',
    'node' => [
        'servers_attached' => 'A node must have no servers linked to it in order to be deleted.',
        'daemon_off_config_updated' => 'The daemon configuration <strong>has been updated</strong>, however there was an error encountered while attempting to automatically update the configuration file on the Daemon. You will need to manually update the configuration file (config.yml) for the daemon to apply these changes.',
    ],
    'allocations' => [
        'server_using' => 'A server is currently assigned to this allocation. An allocation can only be deleted if no server is currently assigned.',
        'too_many_ports' => 'Adding more than 1000 ports in a single range at once is not supported.',
        'invalid_mapping' => 'The mapping provided for :port was invalid and could not be processed.',
        'cidr_out_of_range' => 'CIDR notation only allows masks between /25 and /32.',
        'port_out_of_range' => 'Ports in an allocation must be greater than 1024 and less than or equal to 65535.',
        'parse_ip_failed' => 'Could not parse provided allocation IP address for :ip (:underlying): :message',
    ],
    'nest' => [
        'delete_has_servers' => 'A Nest with active servers attached to it cannot be deleted from the Panel.',
        'egg' => [
            'delete_has_servers' => 'An Egg with active servers attached to it cannot be deleted from the Panel.',
            'invalid_copy_id' => 'The Egg selected for copying a script from either does not exist, or is copying a script itself.',
            'must_be_child' => 'The "Copy Settings From" directive for this Egg must be a child option for the selected Nest.',
            'has_children' => 'This Egg is a parent to one or more other Eggs. Please delete those Eggs before deleting this Egg.',
        ],
        'variables' => [
            'env_not_unique' => 'The environment variable :name must be unique to this Egg.',
            'reserved_name' => 'The environment variable :name is protected and cannot be assigned to a variable.',
            'bad_validation_rule' => 'The validation rule ":rule" is not a valid rule for this application.',
        ],
        'importer' => [
            'json_error' => 'There was an error while attempting to parse the JSON file: :error.',
            'file_error' => 'The JSON file provided was not valid.',
            'invalid_json_provided' => 'The JSON file provided is not in a format that can be recognized.',
            'unknown_content_type' => 'The uploaded file content type is not supported.',
        ],
    ],
    'subusers' => [
        'editing_self' => 'Editing your own subuser account is not permitted.',
        'user_is_owner' => 'You cannot add the server owner as a subuser for this server.',
        'subuser_exists' => 'A user with that email address is already assigned as a subuser for this server.',
    ],
    'databases' => [
        'delete_has_databases' => 'Cannot delete a database host server that has active databases linked to it.',
    ],
    'tasks' => [
        'chain_interval_too_long' => 'The maximum interval time for a chained task is 15 minutes.',
    ],
    'users' => [
        'node_revocation_failed' => 'Failed to revoke keys on <a href=":link">Node #:node</a>. :error',
    ],
    'deployment' => [
        'no_viable_nodes' => 'No nodes satisfying the requirements specified for automatic deployment could be found.',
        'no_viable_allocations' => 'No allocations satisfying the requirements for automatic deployment were found.',
    ],
    'api' => [
        'resource_not_found' => 'The requested resource does not exist on this server.',
    ],
    'billing' => [
        'discount_not_found' => 'The selected discount code does not exist.',
        'discount_invalid' => 'The selected discount code is invalid.',
        'discount_unknown_type' => 'The discount code has an unknown type.',
        'discount_provided_invalid' => 'The discount code provided is not valid.',
        'free_checkout_session' => 'You cannot create a checkout session for a free product.',
        'paid_node_unavailable' => 'Paid servers cannot be deployed to this node.',
        'server_not_on_account' => 'This server ID does not exist on your account.',
        'session_retrieve_failed' => 'Failed to process order: unable to retrieve session.',
        'payment_incomplete' => 'Payment not completed.',
        'order_already_processed' => 'This order has already been processed.',
        'unable_to_create_server' => 'Unable to create server: :message',
        'valid_node_required' => 'A valid node must be assigned for deployment.',
        'free_node_unavailable' => 'Free servers cannot be deployed to this node.',
        'free_product_owned' => 'You already own one of this free product and cannot have multiple.',
        'paid_package_free_deploy' => 'This package is paid and cannot be deployed for no cost.',
        'cheaper_plan' => 'You cannot upgrade to a cheaper plan.',
        'upgrade_unavailable' => 'This server cannot be upgraded at this time.',
        'free_renewal_too_early' => 'You cannot renew a free server more than 7 days in advance.',
        'upgrade_wait' => 'You must wait :days days between server upgrades.',
    ],
    'auth' => [
        'email_in_use' => 'This email is already in use.',
        'passwords_mismatch' => 'The passwords entered do not match.',
        'incorrect_information' => 'The information provided was incorrect.',
        'signup_disabled' => 'User signup is disabled at this time.',
        'username_in_use' => 'This username is already in use by another user.',
    ],
    'tickets' => [
        'disabled' => 'You cannot create a ticket as the module is disabled.',
        'limit_reached' => 'You have reached the ticket count per user of :count.',
        'not_owner' => 'You do not own this ticket.',
    ],
    'server_groups' => [
        'assign_failed' => 'Unable to assign group to server.',
        'edit_forbidden' => 'You do not have permission to edit this server group.',
    ],
    'account' => [
        'api_key_limit' => 'You have reached the account limit for number of API keys.',
    ],
    'schedules' => [
        'no_tasks' => 'Cannot process schedule for task execution: no tasks are registered.',
        'invalid_cron' => 'The cron data provided does not evaluate to a valid expression.',
    ],
    'server_transfer' => [
        'node_not_found' => 'The requested node does not exist.',
        'same_node' => 'The server is already on this node.',
        'allocation_unavailable' => 'The requested allocation is not available on the target node.',
        'additional_allocations_unavailable' => 'One or more of the additional allocations are not available on the target node.',
    ],
    'backups' => [
        'missing_upload_id' => 'Cannot complete backup request: no upload_id present on model.',
    ],
    'network' => [
        'allocation_limit_reached' => 'Cannot assign additional allocations to this server: limit has been reached.',
        'allocation_limit_missing' => 'You cannot delete allocations for this server: no allocation limit is set.',
        'cannot_delete_primary' => 'You cannot delete the primary allocation for this server.',
        'default_not_assigned' => 'The requested default allocation is not currently assigned to this server.',
        'no_fallback_allocation' => 'You are attempting to delete the default allocation for this server but there is no fallback allocation to use.',
    ],
    'webhooks' => [
        'url_missing' => 'No Webhook URL has been defined.',
        'send_failed' => 'Unable to send webhook through URL.',
    ],
    'application_users' => [
        'root_required' => 'You must be a root administrator to grant another user permissions.',
        'cannot_remove_root' => 'You cannot remove rootAdmin without the same level of permission.',
    ],
];
