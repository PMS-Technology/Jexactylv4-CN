import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import useEventListener from '@/plugins/useEventListener';
import SearchModal from '@account/search/SearchModal';

export default () => {
    const { t } = useTranslation('dashboard');
    const [visible, setVisible] = useState(false);

    useEventListener('keydown', (e: KeyboardEvent) => {
        if (['input', 'textarea'].indexOf(((e.target as HTMLElement).tagName || 'input').toLowerCase()) < 0) {
            if (!visible && e.metaKey && e.key.toLowerCase() === '/') {
                setVisible(true);
            }
        }
    });

    return (
        <>
            <SearchModal open={visible} onClose={() => setVisible(false)} />

            <div className={'navigation-link'} onClick={() => setVisible(true)}>
                <FontAwesomeIcon icon={faSearch} />
                {t('search')}
            </div>
        </>
    );
};
