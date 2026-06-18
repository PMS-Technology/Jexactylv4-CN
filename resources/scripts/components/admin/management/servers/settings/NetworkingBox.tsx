import { faNetworkWired } from '@fortawesome/free-solid-svg-icons';
import { useFormikContext } from 'formik';
import { useTranslation } from 'react-i18next';
import tw from 'twin.macro';

import getAllocations from '@/api/routes/admin/nodes/getAllocations';
import { useServerFromRoute } from '@/api/routes/admin/server';
import AdminBox from '@/elements/AdminBox';
import Label from '@/elements/Label';
import Select from '@/elements/Select';
import type { Option } from '@/elements/SelectField';
import SelectField, { AsyncSelectField } from '@/elements/SelectField';

export default () => {
    const { t } = useTranslation('admin');
    const { isSubmitting } = useFormikContext();
    const { data: server } = useServerFromRoute();

    const loadOptions = async (inputValue: string, callback: (options: Option[]) => void) => {
        if (!server) {
            callback([] as Option[]);
            return;
        }

        const allocations = await getAllocations(server.nodeId, { search: inputValue, server_id: '0' });

        callback(
            allocations.map(a => {
                return { value: a.id.toString(), label: a.getDisplayText() };
            }),
        );
    };

    return (
        <AdminBox icon={faNetworkWired} title={t('servers.networking') as string} isLoading={isSubmitting}>
            <div css={tw`grid grid-cols-1 gap-4 lg:gap-6`}>
                <div>
                    <Label htmlFor={'allocationId'}>{t('servers.primaryAllocation') as string}</Label>
                    <Select id={'allocationId'} name={'allocationId'}>
                        {server?.relationships.allocations?.map(a => (
                            <option key={a.id} value={a.id}>
                                {a.getDisplayText()}
                            </option>
                        ))}
                    </Select>
                </div>
                <AsyncSelectField
                    id={'addAllocations'}
                    name={'addAllocations'}
                    label={t('servers.addAllocations') as string}
                    loadOptions={loadOptions}
                    isMulti
                />
                <SelectField
                    id={'removeAllocations'}
                    name={'removeAllocations'}
                    label={t('servers.removeAllocations') as string}
                    options={
                        server?.relationships.allocations?.map(a => {
                            return { value: a.id.toString(), label: a.getDisplayText() };
                        }) || []
                    }
                    isMulti
                    isSearchable
                />
            </div>
        </AdminBox>
    );
};
