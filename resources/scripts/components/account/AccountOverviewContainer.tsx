import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import tw from 'twin.macro';
import styled from 'styled-components';

import ContentBox from '@/elements/ContentBox';
import PageContentBlock from '@/elements/PageContentBlock';
import CopyOnClick from '@/elements/CopyOnClick';
import UpdateAvatarForm from '@account/forms/UpdateAvatarForm';
import { breakpoint } from '@/assets/theme';
import { useStoreState } from '@/state/hooks';

const Container = styled.div`
    ${tw`flex flex-wrap`};

    & > div {
        ${tw`w-full`};

        ${breakpoint('sm')`
      width: calc(50% - 1rem);
    `}

        ${breakpoint('md')`
      ${tw`w-auto flex-1`};
    `}
    }
`;

const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
    <div css={tw`flex justify-between items-baseline gap-4 py-3 border-b border-neutral-700 last:border-b-0`}>
        <p css={tw`text-xs text-gray-400 uppercase whitespace-nowrap`}>{label}</p>
        <div css={tw`text-sm text-right break-words min-w-0`}>{children}</div>
    </div>
);

export default () => {
    const user = useStoreState(state => state.user.data!);

    return (
        <PageContentBlock title="账号" header description={'查看当前账号的基本信息。'}>
            <Container css={tw`lg:grid lg:grid-cols-2 mb-10 mt-10`}>
                <ContentBox title="头像" showFlashes="account:avatar">
                    <UpdateAvatarForm />
                </ContentBox>

                <ContentBox css={tw`mt-8 lg:mt-0 lg:ml-8`} title="账号信息">
                    <Detail label={'用户名'}>{user.username}</Detail>
                    <Detail label={'邮箱地址'}>{user.email}</Detail>
                    <Detail label={'账号 ID'}>
                        <CopyOnClick text={user.uuid}>
                            <code css={tw`font-mono text-xs`}>{user.uuid}</code>
                        </CopyOnClick>
                    </Detail>
                    {user.roleName && <Detail label={'角色'}>{user.roleName}</Detail>}
                    <Detail label={'注册时间'}>{format(user.createdAt, 'yyyy-MM-dd')}</Detail>
                    <p css={tw`text-xs text-gray-400 mt-6`}>
                        邮箱、密码和登录方式可在
                        <Link to={'/account/security'} css={tw`text-green-400 hover:text-green-200 duration-300`}>
                            安全设置
                        </Link>
                        中管理。
                    </p>
                </ContentBox>
            </Container>
        </PageContentBlock>
    );
};
