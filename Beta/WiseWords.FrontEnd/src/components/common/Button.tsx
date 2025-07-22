import React from 'react';

const styles = {
  base: {
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-primary)',
    border: 'none',
    padding: '0.3rem 0.7rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 700,
    fontFamily: 'Orbitron, Inter, sans-serif',
    fontSize: '0.85rem',
    transition: 'all 0.2s ease'
  },
  withMargin: {
    marginLeft: '8px'
  }
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  withMargin?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary',
  withMargin = false,
  className,
  style,
  ...props
}) => (
  <button
    style={{
      ...styles.base,
      ...(withMargin ? styles.withMargin : {}),
      ...style
    }}
    className={className}
    {...props}
  />
);
