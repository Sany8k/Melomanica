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
  
  // Собираем классы на основе пропсов
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'btn-primary';
      case 'success': return 'btn-success';
      case 'icon': return 'icon-btn';
      case 'danger': return 'delete-btn';
      case 'outline': return 'btn-outline'; // Если захотим добавить контурную кнопку
      default: return 'btn-primary';
    }
  };

  const getSizeClass = () => {
    // Если это кнопка-иконка, ей не нужны паддинги для размера
    if (variant === 'icon' || variant === 'danger') return '';
    switch (size) {
      case 'sm': return 'padding-sm font-sm'; // В CSS: padding: 4px 8px; font-size: 11px;
      case 'md': return 'padding-md font-md'; // В CSS: padding: 8px 16px; font-size: 12px;
      case 'lg': return 'padding-lg font-lg'; // В CSS: padding: 15px 0; font-size: 14px;
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