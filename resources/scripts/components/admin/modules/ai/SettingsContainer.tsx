import { useState } from 'react';
import { Field as FormikField, Form, Formik } from 'formik';
import { faKey, faNetworkWired, faUser } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

import { AIFormat, AISettings, syncModels, updateSettings } from '@/api/routes/admin/ai';
import AdminBox from '@/elements/AdminBox';
import { Button } from '@/elements/button';
import Field from '@/elements/Field';
import Label from '@/elements/Label';
import Select from '@/elements/Select';
import { useStoreState } from '@/state/hooks';
import useFlash from '@/plugins/useFlash';

const formats: Array<{ value: AIFormat; label: string }> = [
    { value: 'anthropic_messages', label: 'Anthropic Messages API' },
    { value: 'command_code', label: 'Command Code' },
    { value: 'opencode_zen', label: 'OpenCode Zen' },
    { value: 'opencode_go', label: 'OpenCode Go' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'google_ai_studio', label: 'Google AI Studio (Gemini API)' },
    { value: 'google_vertex_ai', label: 'Google Vertex AI' },
    { value: 'openai_chat', label: 'OpenAI Chat Completions API' },
    { value: 'openai_responses', label: 'OpenAI Responses API' },
    { value: 'ollama_chat', label: 'Ollama Chat API' },
    { value: 'zed', label: 'Zed' },
    { value: 'anthropic_claude_code', label: 'Anthropic Claude Code' },
    { value: 'google_antigravity', label: 'Google Antigravity' },
    { value: 'google_gemini_cli', label: 'Google Gemini CLI' },
    { value: 'github_copilot', label: 'GitHub Copilot' },
    { value: 'openai_codex', label: 'OpenAI Codex' },
    { value: 'xai_grok_build', label: 'xAI Grok Build' },
];

export default () => {
    const { t } = useTranslation('admin');
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();
    const ai = useStoreState(s => s.everest.data!.ai);
    const [models, setModels] = useState(ai.models);
    const [syncing, setSyncing] = useState(false);

    const submit = (values: AISettings) => {
        clearFlashes();
        const settings = { ...values };
        if (!settings.key) delete settings.key;

        updateSettings(settings)
            .then(() => {
                addFlash({
                    type: 'success',
                    key: 'admin:ai:settings',
                    message: t('settings.savedSuccessfully'),
                });
                window.location.reload();
            })
            .catch(error => clearAndAddHttpError({ key: 'admin:ai:settings', error }));
    };

    const synchronize = (values: AISettings) => {
        clearFlashes();
        setSyncing(true);
        const settings = { ...values };
        if (!settings.key) delete settings.key;

        updateSettings(settings)
            .then(syncModels)
            .then(setModels)
            .then(() =>
                addFlash({
                    type: 'success',
                    key: 'admin:ai:settings',
                    message: t('aiModule.modelsSynchronized'),
                }),
            )
            .catch(error => clearAndAddHttpError({ key: 'admin:ai:settings', error }))
            .finally(() => setSyncing(false));
    };

    return (
        <Formik<AISettings>
            onSubmit={submit}
            initialValues={{
                user_access: ai.user_access,
                format: ai.format,
                model: ai.model,
                base_url: ai.base_url || '',
                project: ai.project || '',
                location: ai.location || 'global',
                key: '',
            }}
        >
            {({ values }) => (
                <Form>
                    <div className={'grid lg:grid-cols-2 gap-4'}>
                        <AdminBox title={t('aiModule.providerConfiguration') as string} icon={faNetworkWired}>
                            <div className={'space-y-4'}>
                                <div>
                                    <Label>{t('aiModule.apiFormat')}</Label>
                                    <FormikField as={Select} name={'format'}>
                                        {formats.map(format => (
                                            <option key={format.value} value={format.value}>
                                                {format.label}
                                            </option>
                                        ))}
                                    </FormikField>
                                </div>
                                <Field
                                    id={'model'}
                                    name={'model'}
                                    label={t('aiModule.model') as string}
                                    list={'ai-models'}
                                    required
                                />
                                <datalist id={'ai-models'}>
                                    {models.map(model => (
                                        <option key={model} value={model} />
                                    ))}
                                </datalist>
                                <Field
                                    id={'base_url'}
                                    name={'base_url'}
                                    label={t('aiModule.baseUrl') as string}
                                    placeholder={t('aiModule.officialEndpointPlaceholder') as string}
                                />
                                <p className={'text-gray-400 text-xs'}>{t('aiModule.baseUrlDescription')}</p>
                                <Button type={'button'} onClick={() => synchronize(values)} disabled={syncing}>
                                    {syncing ? t('aiModule.synchronizingModels') : t('aiModule.synchronizeModels')}
                                </Button>
                            </div>
                        </AdminBox>
                        <div className={'space-y-4'}>
                            <AdminBox title={t('aiModule.credentials') as string} icon={faKey}>
                                <div className={'space-y-4'}>
                                    <Field
                                        id={'key'}
                                        name={'key'}
                                        type={'password'}
                                        label={t('aiModule.apiKeyOrToken') as string}
                                        placeholder={ai.key ? '********' : undefined}
                                    />
                                    <p className={'text-gray-400 text-xs'}>{t('aiModule.modifyApiKeyDescription')}</p>
                                    {(values.format === 'google_vertex_ai' ||
                                        values.format === 'google_antigravity' ||
                                        values.format === 'google_gemini_cli' ||
                                        values.format === 'openai_codex') && (
                                        <Field
                                            id={'project'}
                                            name={'project'}
                                            label={t('aiModule.projectOrAccount') as string}
                                        />
                                    )}
                                    {values.format === 'google_vertex_ai' && (
                                        <Field
                                            id={'location'}
                                            name={'location'}
                                            label={t('aiModule.location') as string}
                                        />
                                    )}
                                </div>
                            </AdminBox>
                            <AdminBox title={t('aiModule.clientSideAI') as string} icon={faUser}>
                                <div className={'inline-flex'}>
                                    <Label className={'mt-1 mr-2'}>{t('aiModule.allowStandardUsers')}</Label>
                                    <Field id={'user_access'} name={'user_access'} type={'checkbox'} />
                                </div>
                                <p className={'text-gray-400 text-xs mt-1.5'}>
                                    {t('aiModule.allowStandardUsersDescription')}
                                </p>
                            </AdminBox>
                        </div>
                    </div>
                    <div className={'w-full flex flex-row items-center mt-6'}>
                        <div className={'flex text-xs text-gray-500'}>{t('aiModule.changesMayNotApply')}</div>
                        <div className={'flex ml-auto'}>
                            <Button type={'submit'}>{t('aiModule.saveChanges')}</Button>
                        </div>
                    </div>
                </Form>
            )}
        </Formik>
    );
};
