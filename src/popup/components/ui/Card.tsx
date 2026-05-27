import React, { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export const Card = ({ children, className = '', style }: CardProps) => {
  return (
    <div className={`section-card ${className}`} style={style}>
      {children}
    </div>
  );
};