import React from 'react';

export function Card({ children, className = '', elevated = false }) {
  return (
    <div className={`${elevated ? 'df-card-elevated' : 'df-card'} ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  onClick,
  disabled,
  type = 'button',
}) {
  const base =
    'inline-flex items-center justify-center font-medium px-3.5 py-1.5 text-xs rounded-md transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none';

  const variants = {
    primary:
      'bg-white text-black hover:bg-zinc-200 active:bg-zinc-300 border border-white font-semibold',
    secondary:
      'bg-[#161616] text-zinc-200 hover:bg-[#202020] border border-[#27272a]',
    outline:
      'bg-transparent text-zinc-300 hover:bg-[#161616] hover:text-white border border-[#27272a]',
    danger:
      'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30',
    ghost:
      'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900',
  };

  return (
    <button
      type={type}
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-zinc-900 text-zinc-400 border border-zinc-800',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
    danger:  'bg-rose-500/10 text-rose-400 border border-rose-500/25',
    info:    'bg-blue-500/10 text-blue-400 border border-blue-500/25',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium tracking-wide ${
        variants[variant] || variants.default
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const s = (status || 'UNKNOWN').toUpperCase();
  let variant = 'default';
  let dotClass = 'bg-zinc-500';

  if (['DRAFT', 'NOT_REQUIRED', 'PENDING'].includes(s)) {
    variant = 'default';
    dotClass = 'bg-zinc-500';
  } else if (
    ['PENDING_APPROVAL', 'UNDER_NEGOTIATION', 'IN_TRANSIT', 'PROCESSING', 'RETURNED_FOR_REVISION', 'PARTIALLY_PAID'].includes(s)
  ) {
    variant = 'warning';
    dotClass = 'bg-amber-400';
  } else if (
    ['APPROVED', 'CONFIRMED', 'FULFILLED', 'PAID', 'ACTIVE', 'SHIPPING'].includes(s)
  ) {
    variant = 'success';
    dotClass = 'bg-emerald-400';
  } else if (
    ['REJECTED', 'CANCELLED', 'RETURNED', 'CANCEL'].includes(s)
  ) {
    variant = 'danger';
    dotClass = 'bg-rose-400';
  } else if (['SENT'].includes(s)) {
    variant = 'info';
    dotClass = 'bg-blue-400';
  }

  const label = s
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());

  return (
    <Badge variant={variant} className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass} flex-shrink-0`} />
      <span>{label}</span>
    </Badge>
  );
}
