<?php

return [
    'user' => [
        'search_users' => '请输入用户名、用户 ID 或邮箱地址',
        'select_search_user' => '要删除的用户 ID（输入 \'0\' 重新搜索）',
        'deleted' => '用户已成功从控制面板中删除。',
        'confirm_delete' => '确定要从此控制面板删除此用户吗？',
        'no_users_found' => '未找到与搜索条件匹配的用户。',
        'multiple_found' => '找到多个匹配的用户账户，由于 --no-interaction 标志，无法删除用户。',
        'ask_admin' => '此用户是否为管理员？',
        'ask_email' => '邮箱地址',
        'ask_username' => '用户名',
        'ask_name_first' => '名字',
        'ask_name_last' => '姓氏',
        'ask_password' => '密码',
        'ask_password_tip' => '如果您想创建一个随机密码并通过邮件发送给用户的账户，请重新运行此命令（CTRL+C）并传递 `--no-password` 标志。',
        'ask_password_help' => '密码长度至少为 8 个字符，且至少包含一个大写字母和一个数字。',
        '2fa_help_text' => [
            '如果启用了双重身份验证，此命令将禁用用户的双重身份验证。这仅应在用户被锁定在账户之外时用作账户恢复命令。',
            '如果这不是您想要做的，请按 CTRL+C 退出此过程。',
        ],
        '2fa_disabled' => '已禁用 :email 的双重身份验证。',
    ],
    'schedule' => [
        'output_line' => '正在为定时任务 `:schedule`（:hash）中的第一个任务调度作业。',
    ],
    'maintenance' => [
        'deleting_service_backup' => '正在删除服务备份文件 :file。',
    ],
    'server' => [
        'rebuild_failed' => '在节点 ":node" 上请求重建 ":name"（#:id）失败，错误：:message',
        'reinstall' => [
            'failed' => '在节点 ":node" 上请求重装 ":name"（#:id）失败，错误：:message',
            'confirm' => '您即将对一组服务器进行重装操作。是否继续？',
        ],
        'power' => [
            'confirm' => '您即将对 :count 台服务器执行 :action 操作。是否继续？',
            'action_failed' => '在节点 ":node" 上请求 ":name"（#:id）的电源操作失败，错误：:message',
        ],
    ],
];
