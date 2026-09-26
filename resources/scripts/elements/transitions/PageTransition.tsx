import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

const variants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
};

/**
 * `fill` makes the page stretch to the remaining height of a flex-column parent, for pages that
 * size themselves against the viewport (see `PageContentBlock`'s `fullHeight`). It is opt-in
 * because a flex container stops child margins from collapsing, which would shift the spacing
 * of every other page.
 */
const PageTransition = ({ children, fill }: { children: ReactNode; fill?: boolean }) => (
    <motion.div
        variants={variants}
        initial={'initial'}
        animate={'animate'}
        exit={'exit'}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className={fill ? 'flex w-full min-h-0 flex-1 flex-col' : 'w-full'}
    >
        {children}
    </motion.div>
);

export default PageTransition;
