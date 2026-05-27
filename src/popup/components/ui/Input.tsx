import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  width?: string | number;
}

export const Input = ({ width, className = '', style, ...props }: InputProps) => {
  return (
    <input
      className={`input-default ${className}`}
      style={{ width: width || '100%', ...style }}
      {...props}
    />
  );
};