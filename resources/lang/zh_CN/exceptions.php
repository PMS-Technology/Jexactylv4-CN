<?php

return [
    'daemon_connection_failed' => '在尝试与守护进程通信时发生异常，导致 HTTP/:code 响应码。此异常已被记录。',
    'node' => [
        'servers_attached' => '节点必须没有关联的服务器才能被删除。',
        'daemon_off_config_updated' => '守护进程配置<strong>已更新</strong>，但在尝试自动更新守护进程上的配置文件时遇到错误。您需要手动更新守护进程的配置文件（config.yml）以应用这些更改。',
    ],
    'allocations' => [
        'server_using' => '当前有服务器被分配到此分配。只有没有服务器被分配时才能删除分配。',
        'too_many_ports' => '不支持在一个范围中一次添加超过 1000 个端口。',
        'invalid_mapping' => '为 :port 提供的映射无效，无法处理。',
        'cidr_out_of_range' => 'CIDR 表示法仅允许 /25 到 /32 之间的掩码。',
        'port_out_of_range' => '分配中的端口号必须大于 1024 且小于等于 65535。',
        'parse_ip_failed' => '无法解析提供的分配 IP 地址 :ip（:underlying）：:message',
    ],
    'nest' => [
        'delete_has_servers' => '有关联活跃服务器的巢无法从控制面板中删除。',
        'egg' => [
            'delete_has_servers' => '有关联活跃服务器的蛋无法从控制面板中删除。',
            'invalid_copy_id' => '用于复制脚本的蛋不存在，或者它本身正在复制脚本。',
            'must_be_child' => '此蛋的"复制设置自"指令必须是所选巢的子选项。',
            'has_children' => '此蛋是一个或多个其他蛋的父级。请在删除此蛋之前删除那些蛋。',
        ],
        'variables' => [
            'env_not_unique' => '环境变量 :name 必须在此蛋中唯一。',
            'reserved_name' => '环境变量 :name 受保护，不能分配给变量。',
            'bad_validation_rule' => '验证规则 ":rule" 不是此应用程序的有效规则。',
        ],
        'importer' => [
            'json_error' => '解析 JSON 文件时发生错误：:error。',
            'file_error' => '提供的 JSON 文件无效。',
            'invalid_json_provided' => '提供的 JSON 文件格式无法识别。',
            'unknown_content_type' => '上传文件的内容类型不受支持。',
        ],
    ],
    'subusers' => [
        'editing_self' => '不允许编辑自己的子用户账户。',
        'user_is_owner' => '不能将服务器所有者添加为此服务器的子用户。',
        'subuser_exists' => '该电子邮件地址的用户已被指定为此服务器的子用户。',
    ],
    'databases' => [
        'delete_has_databases' => '无法删除关联了活跃数据库的数据库主机服务器。',
    ],
    'tasks' => [
        'chain_interval_too_long' => '链式任务的最大间隔时间为 15 分钟。',
    ],
    'users' => [
        'node_revocation_failed' => '未能撤销 <a href=":link">节点 #:node</a> 上的密钥。:error',
    ],
    'deployment' => [
        'no_viable_nodes' => '未找到满足自动部署指定要求的节点。',
        'no_viable_allocations' => '未找到满足自动部署要求的分配。',
    ],
    'api' => [
        'resource_not_found' => '请求的资源在此服务器上不存在。',
    ],
    'billing' => [
        'discount_not_found' => '所选折扣码不存在。',
        'discount_invalid' => '所选折扣码无效。',
        'discount_unknown_type' => '折扣码类型未知。',
        'discount_provided_invalid' => '提供的折扣码无效。',
        'free_checkout_session' => '无法为免费产品创建结账会话。',
        'paid_node_unavailable' => '付费服务器无法部署到此节点。',
        'server_not_on_account' => '此服务器 ID 不属于您的账户。',
        'session_retrieve_failed' => '处理订单失败：无法获取会话。',
        'payment_incomplete' => '付款尚未完成。',
        'order_already_processed' => '此订单已处理。',
        'unable_to_create_server' => '无法创建服务器：:message',
        'valid_node_required' => '必须为部署分配有效节点。',
        'free_node_unavailable' => '免费服务器无法部署到此节点。',
        'free_product_owned' => '您已拥有此免费产品，不能重复创建。',
        'paid_package_free_deploy' => '此套餐为付费套餐，无法免费部署。',
        'cheaper_plan' => '不能升级到更便宜的方案。',
        'upgrade_unavailable' => '此服务器当前无法升级。',
        'free_renewal_too_early' => '不能提前超过 7 天续费免费服务器。',
        'upgrade_wait' => '两次服务器升级之间必须等待 :days 天。',
    ],
    'auth' => [
        'email_in_use' => '此邮箱已被使用。',
        'passwords_mismatch' => '输入的密码不匹配。',
        'incorrect_information' => '提供的信息不正确。',
        'signup_disabled' => '当前已禁用用户注册。',
        'username_in_use' => '此用户名已被其他用户使用。',
    ],
    'tickets' => [
        'disabled' => '工单模块已禁用，无法创建工单。',
        'limit_reached' => '您已达到每个用户 :count 个工单的数量限制。',
        'not_owner' => '此工单不属于您。',
    ],
    'server_groups' => [
        'assign_failed' => '无法将分组分配给服务器。',
        'edit_forbidden' => '您无权编辑此服务器分组。',
    ],
    'account' => [
        'api_key_limit' => '您已达到此账户允许的 API 密钥数量上限。',
    ],
    'schedules' => [
        'no_tasks' => '无法处理定时任务执行：没有注册任何任务。',
        'invalid_cron' => '提供的 Cron 数据无法解析为有效表达式。',
    ],
    'server_transfer' => [
        'node_not_found' => '请求的节点不存在。',
        'same_node' => '服务器已在此节点上。',
        'allocation_unavailable' => '请求的分配在目标节点上不可用。',
        'additional_allocations_unavailable' => '一个或多个额外分配在目标节点上不可用。',
    ],
    'backups' => [
        'missing_upload_id' => '无法完成备份请求：模型中缺少 upload_id。',
    ],
    'network' => [
        'allocation_limit_reached' => '无法为此服务器分配额外分配：已达到限制。',
        'allocation_limit_missing' => '无法删除此服务器的分配：未设置分配限制。',
        'cannot_delete_primary' => '无法删除此服务器的主要分配。',
        'default_not_assigned' => '请求的默认分配当前未分配给此服务器。',
        'no_fallback_allocation' => '您正尝试删除此服务器的默认分配，但没有可用的备用分配。',
    ],
    'webhooks' => [
        'url_missing' => '尚未定义 Webhook URL。',
        'send_failed' => '无法通过 URL 发送 Webhook。',
    ],
    'application_users' => [
        'root_required' => '必须是超级管理员才能向其他用户授予权限。',
        'cannot_remove_root' => '没有同等级权限时，不能移除 rootAdmin。',
    ],
];
