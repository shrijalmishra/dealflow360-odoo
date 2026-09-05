import React from 'react';

export function Card({ children, className = '' }) {
  return <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>{children}</div>;
}

export function Button({ children, variant = 'primary', className = '', onClick, disabled }) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium px-4 py-2 text-sm transition-colors disabled:opacity-50';
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    primary: 'bg-primary-100 text-primary-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const s = status.toUpperCase();
  let variant = 'default';
  
  if (['DRAFT', 'PENDING', 'NOT_REQUIRED'].includes(s)) variant = 'default';
  else if (['PENDING_APPROVAL', 'UNDER_NEGOTIATION'].includes(s)) variant = 'warning';
  else if (['APPROVED', 'CONFIRMED', 'FULFILLED'].includes(s)) variant = 'success';
  else if (['REJECTED', 'CANCELLED', 'RETURNED'].includes(s)) variant = 'danger';
  else if (['SENT'].includes(s)) variant = 'primary';

  const label = s.replace(/_/g, ' ').replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
  return <Badge variant={variant}>{label}</Badge>;
}
