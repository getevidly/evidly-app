import { motion } from 'framer-motion';
import { ReactNode, Children } from 'react';

interface StaggeredListProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggeredList({ children, className = '', staggerDelay = 0.04 }: StaggeredListProps) {
  return (
    <div className={className}>
      {Children.map(children, (child, i) => (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * staggerDelay, duration: 0.2, ease: 'easeOut' }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
