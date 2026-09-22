import type { ReactNode } from 'react';
import { Component } from 'react';
import { withTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import tw from 'twin.macro';
import { ExclamationIcon } from '@heroicons/react/outline';

interface Props {
    children?: ReactNode;
    t: TFunction;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    override state: State = {
        hasError: false,
    };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    override componentDidCatch(error: Error) {
        console.error(error);
    }

    override render() {
        return this.state.hasError ? (
            <div css={tw`flex items-center justify-center w-full my-4`}>
                <div
                    css={tw`flex items-center bg-neutral-900/90 backdrop-blur-sm rounded-xl shadow-lg ring-1 ring-red-500/20 p-3 text-red-500`}
                >
                    <ExclamationIcon css={tw`h-4 w-4 flex-shrink-0 mr-2`} />

                    <p css={tw`text-sm text-neutral-100`}>{this.props.t('error.appError')}</p>
                </div>
            </div>
        ) : (
            this.props.children
        );
    }
}

export default withTranslation('common')(ErrorBoundary);
