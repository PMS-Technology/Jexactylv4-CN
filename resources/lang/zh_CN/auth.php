<?php

return [
    'sign_in' => '登录',
    'go_to_login' => '前往登录',
    'failed' => '未找到与所提供的凭据匹配的账户。',

    'forgot_password' => [
        'label' => '忘记密码？',
        'label_help' => '请输入您的账户邮箱地址以获取重置密码的指引。',
        'button' => '找回账户',
    ],

    'reset_password' => [
        'button' => '重置并登录',
    ],

    'two_factor' => [
        'label' => '双重验证码',
        'label_help' => '此账户需要第二层身份验证才能继续。请输入您的设备生成的验证码以完成登录。',
        'checkpoint_failed' => '双重验证码无效。',
    ],

    'throttle' => '登录尝试次数过多。请在 :seconds 秒后重试。',
    'password_requirements' => '密码长度至少为 8 个字符，且应为此站点独有的密码。',
    '2fa_must_be_enabled' => '管理员要求您的账户必须启用双重身份验证才能使用控制面板。',
];
