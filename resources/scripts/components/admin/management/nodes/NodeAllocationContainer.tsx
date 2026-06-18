import { useTranslation } from 'react-i18next';
import { faNetworkWired } from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router-dom';
import tw from 'twin.macro';

import AdminBox from '@/elements/AdminBox';
import AllocationTable from '@admin/management/nodes/allocations/AllocationTable';
import CreateAllocationForm from '@admin/management/nodes/allocations/CreateAllocationForm';
import DeleteAllAllocationsButton from './allocations/DeleteAllAllocationsButton';
import FlashMessageRender from '@/elements/FlashMessageRender';

export default () => {
    const { t } = useTranslation('admin');
    const params = useParams<'id'>();

    return (
        <>
            <FlashMessageRender byKey={'admin:nodes:allocations'} />
            <div css={tw`w-full grid grid-cols-1 lg:grid-cols-12 gap-8`}>
                <div css={tw`lg:col-span-8`}>
                    <AllocationTable nodeId={Number(params.id)} />
                </div>

                <div css={tw`lg:col-span-4`}>
                    <AdminBox icon={faNetworkWired} title={t('nodes.nodeAllocation') as string} css={tw`h-auto w-full`}>
                        <CreateAllocationForm nodeId={Number(params.id)} />
                    </AdminBox>
                    <div className={'text-right mt-4'}>
                        <DeleteAllAllocationsButton nodeId={Number(params.id)} />
                    </div>
                </div>
            </div>
        </>
    );
};
