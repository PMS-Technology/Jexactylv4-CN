<?php

return [
    'notices' => [
        'created' => '新巢 :name 已成功创建。',
        'deleted' => '已成功从控制面板删除请求的巢。',
        'updated' => '已成功更新巢的配置选项。',
    ],
    'eggs' => [
        'notices' => [
            'imported' => '已成功导入此蛋及其关联变量。',
            'updated_via_import' => '已使用提供的文件更新此蛋。',
            'deleted' => '已成功从控制面板删除请求的蛋。',
            'updated' => '蛋配置已成功更新。',
            'script_updated' => '蛋安装脚本已更新，将在服务器安装时运行。',
            'egg_created' => '新蛋已成功创建。您需要重启任何正在运行的守护进程以应用此新蛋。',
        ],
    ],
    'variables' => [
        'notices' => [
            'variable_deleted' => '变量 ":variable" 已被删除，重建后将不再对服务器可用。',
            'variable_updated' => '变量 ":variable" 已更新。您需要重建任何使用此变量的服务器以应用更改。',
            'variable_created' => '新变量已成功创建并分配给此蛋。',
        ],
    ],
];
