import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'success' | 'danger' | 'icon' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  style,
  disabled,
  ...props
}: ButtonProps) => {
  
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'btn-primary';
      case 'success': return 'btn-success';
      case 'icon': return 'icon-btn';
      case 'danger': return 'delete-btn';
      case 'outline': return 'btn-outline';
      default: return 'btn-primary';
    }
  };

  const getSizeClass = () => {
    if (variant === 'icon' || variant === 'danger') return '';
    switch (size) {
      case 'sm': return 'padding-sm font-sm';
      case 'md': return 'padding-md font-md';
      case 'lg': return 'padding-lg font-lg';
      default: return 'padding-md font-md';
    }
  };

  const baseClass = (variant === 'icon' || variant === 'danger') ? '' : 'btn-hover';
  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? 'btn-disabled' : '';

  const finalClassName = `${baseClass} ${getVariantClass()} ${getSizeClass()} ${widthClass} ${disabledClass} ${className}`.trim();

  return (
    <button
      className={finalClassName}
      disabled={disabled}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
};