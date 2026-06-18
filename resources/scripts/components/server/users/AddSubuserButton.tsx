import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import EditSubuserModal from '@server/users/EditSubuserModal';
import { Button } from '@/elements/button/index';

export default () => {
    const { t } = useTranslation('server');
    const [visible, setVisible] = useState(false);

    return (
        <>
            <EditSubuserModal visible={visible} onModalDismissed={() => setVisible(false)} />
            <Button onClick={() => setVisible(true)}>{t('usersPage.newUser') as string}</Button>
        </>
    );
};
