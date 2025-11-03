'use client';

import { motion } from 'framer-motion';
import { hoverScale } from '@/lib/animations';

interface CardAnimatedProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  hoverable?: boolean;
}

export function CardAnimated({
  children,
  onClick,
  className = '',
  hoverable = true
}: CardAnimatedProps) {
  return (
    <motion.div
      className={`
        bg-white rounded-xl shadow-md p-6
        border border-gray-200
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      whileHover={hoverable ? { scale: 1.02, y: -4 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

