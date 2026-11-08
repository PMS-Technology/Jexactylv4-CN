import { reservedEnvNames, type EggVariableValues } from '$lib/api/admin/nests';

/** Client-side checks matching StoreEggVariableRequest and VariableUpdateService. */
export function variableErrors(v: EggVariableValues, others: EggVariableValues[]): Partial<Record<'name' | 'env_variable' | 'rules', string>> {
    const env = v.env_variable.trim();
    const errors: Partial<Record<'name' | 'env_variable' | 'rules', string>> = {};

    if (!v.name.trim() || v.name.trim().length > 191) errors.name = '名称需要 1–191 个字符。';
    if (!/^\w{1,191}$/.test(env)) errors.env_variable = '只能包含字母、数字和下划线。';
    else if (reservedEnvNames.includes(env.toUpperCase())) errors.env_variable = `${env} 是保留名称。`;
    else if (others.some(o => o.env_variable.trim() === env)) errors.env_variable = '这个 Egg 已经有同名变量。';
    if (!v.rules.trim()) errors.rules = '请填写验证规则，例如 nullable|string。';

    return errors;
}

export const emptyVariable = (): EggVariableValues => ({
    name: '',
    description: '',
    env_variable: '',
    default_value: '',
    user_viewable: true,
    user_editable: true,
    rules: 'required|string',
});
