import { useState, useEffect } from 'react';

// Global tracker to ensure only one contact field is unmasked at a time
let activeUpdater = null;

export default function MaskedContact({ value, type = 'phone' }) {
  const [unmasked, setUnmasked] = useState(false);

  useEffect(() => {
    if (unmasked) {
      if (activeUpdater && activeUpdater !== setUnmasked) {
        activeUpdater(false);
      }
      activeUpdater = setUnmasked;
    } else {
      if (activeUpdater === setUnmasked) {
        activeUpdater = null;
      }
    }
  }, [unmasked]);

  // Handle value change (e.g. active item changes)
  useEffect(() => {
    setUnmasked(false);
  }, [value]);

  if (!value || value === '-' || value.trim() === '') {
    return <span>-</span>;
  }

  // Masking helpers
  const maskPhone = (val) => {
    const str = String(val).trim();
    if (str.length <= 4) return '******';
    return str.slice(0, 2) + '******' + str.slice(-2);
  };

  const maskEmail = (val) => {
    const str = String(val).trim();
    const parts = str.split('@');
    if (parts.length !== 2) return '******';
    const [name, domain] = parts;
    if (name.length <= 2) return '*@' + domain;
    return name[0] + '*****' + name[name.length - 1] + '@' + domain;
  };

  const displayed = unmasked 
    ? value 
    : (type === 'email' ? maskEmail(value) : maskPhone(value));

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setUnmasked(!unmasked);
      }}
      className="data-table-masked-contact"
      style={{
        cursor: 'pointer',
        padding: '1px 5px',
        borderRadius: '4px',
        background: unmasked ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
        border: unmasked ? '1px dashed rgba(37, 99, 235, 0.3)' : '1px solid transparent',
        color: unmasked ? 'var(--primary)' : 'inherit',
        fontWeight: unmasked ? 700 : 'normal',
        display: 'inline-block',
        userSelect: 'none',
      }}
      title="Click to reveal / hide"
    >
      {displayed}
    </span>
  );
}
