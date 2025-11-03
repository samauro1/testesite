import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-18 h-18'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Letter P - Blue with white stripes */}
        <g>
          {/* P vertical stem */}
          <rect x="10" y="10" width="12" height="80" fill="#3B82F6" />
          {/* White horizontal stripes on P */}
          <rect x="10" y="25" width="12" height="2" fill="white" />
          <rect x="10" y="35" width="12" height="2" fill="white" />
          <rect x="10" y="45" width="12" height="2" fill="white" />
          {/* P horizontal bar */}
          <rect x="10" y="10" width="30" height="12" fill="#3B82F6" />
          {/* White stripe on P horizontal bar */}
          <rect x="15" y="15" width="20" height="2" fill="white" />
        </g>
        
        {/* Letter S - Black, overlapping P */}
        <g>
          {/* S top curve */}
          <path
            d="M 35 10 Q 50 5 65 10 Q 75 15 75 25 Q 75 30 70 30 Q 65 30 65 25 Q 65 20 55 20 Q 45 20 45 25"
            fill="black"
            stroke="black"
            strokeWidth="2"
          />
          {/* S middle curve */}
          <path
            d="M 45 25 Q 50 30 55 35 Q 60 40 65 40 Q 70 40 70 45 Q 70 50 65 50 Q 60 50 55 50 Q 50 50 45 45"
            fill="black"
            stroke="black"
            strokeWidth="2"
          />
          {/* S bottom curve */}
          <path
            d="M 45 45 Q 50 50 55 55 Q 60 60 65 60 Q 70 60 70 65 Q 70 70 65 70 Q 50 75 35 70 Q 25 65 25 55 Q 25 50 30 50 Q 35 50 35 55 Q 35 60 45 60 Q 55 60 55 55"
            fill="black"
            stroke="black"
            strokeWidth="2"
          />
        </g>
      </svg>
    </div>
  );
}
