import React from 'react';
import { Users } from 'lucide-react';
import { getFormattedDate, getDateLabel } from '../data/mockData';
import { isBookingInPast } from '../utils/storage';

export default function DateSelector({ selectedOffset, onSelectOffset, bookings }) {
  const offsets = [0, 1, 2]; // Today, Tomorrow, Day After

  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '6px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {offsets.map((offset) => {
          const isSelected = selectedOffset === offset;
          const dateStr = getFormattedDate(offset);
          const dateBookings = bookings.filter((b) => b.date === dateStr && !isBookingInPast(b));
          const openMatchesCount = dateBookings.filter((b) => b.type === 'open').length;

          return (
            <button
              key={offset}
              onClick={() => onSelectOffset(offset)}
              style={{
                padding: '12px 8px',
                border: isSelected ? '1px solid var(--primary-light)' : '1px solid transparent',
                borderRadius: 'var(--radius-md)',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                color: isSelected ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isSelected ? '0 4px 16px rgba(16, 185, 129, 0.25)' : 'none'
              }}
            >
              <div style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: isSelected ? '#34d399' : 'var(--text-subtle)'
              }}>
                {getDateLabel(offset)}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, margin: '2px 0 4px 0', color: isSelected ? '#fff' : '#cbd5e1' }}>
                {new Date(new Date().setDate(new Date().getDate() + offset)).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
              </div>

              {/* Sub-badge indicators */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
                {openMatchesCount > 0 && (
                  <span style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    <Users size={10} /> {openMatchesCount} Open
                  </span>
                )}
                <span style={{
                  fontSize: '0.68rem',
                  color: isSelected ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-subtle)'
                }}>
                  {dateBookings.length} Booked
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
