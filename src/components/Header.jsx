import React from 'react';
import { Shield } from 'lucide-react';
import { isBookingHappeningNow } from '../utils/storage';

export default function Header({ user, bookings, onOpenProfile }) {
  const activeBookingNow = bookings.find((b) => isBookingHappeningNow(b));

  return (
    <header className="glass-panel app-header" style={{ padding: '16px 20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        {/* Logo & Society Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
            flexShrink: 0
          }}>
            🏸
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
              SmashCourt
            </h1>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={11} color="var(--primary-light)" /> Meda Heights
            </span>
          </div>
        </div>

        {/* User Profile Pill */}
        {user && (
          <button
            onClick={onOpenProfile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 12px 6px 6px',
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              color: '#ffffff',
              transition: 'all 0.2s ease'
            }}
          >
            <div className="user-avatar-circle" style={{ overflow: 'hidden' }}>
              {user.avatar && (/^(https?:\/\/|data:image)/i.test(user.avatar)) ? (
                <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user.avatar || '🏸'
              )}
            </div>
            <div style={{ textAlign: 'left', paddingRight: '4px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.1 }}>
                {user.name.split(' ')[0]}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--primary-light)', fontWeight: 600 }}>
                Flat {user.flatNo}
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Live Court Status Indicator */}
      <div className={`court-status${activeBookingNow ? ' is-occupied' : ''}`} style={{
        marginTop: '14px',
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        background: activeBookingNow
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)'
          : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)',
        border: activeBookingNow
          ? '1px solid rgba(239, 68, 68, 0.3)'
          : '1px solid rgba(16, 185, 129, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.82rem'
      }}>
        <div className="court-status__primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: activeBookingNow ? '#ef4444' : '#10b981',
            boxShadow: activeBookingNow ? '0 0 10px #ef4444' : '0 0 10px #10b981',
            display: 'inline-block'
          }} />
          <span style={{ fontWeight: 600, color: activeBookingNow ? '#fca5a5' : '#6ee7b7' }}>
            {activeBookingNow ? `Court Occupied (${activeBookingNow.startTime} - ${activeBookingNow.endTime})` : 'Court Available Right Now'}
          </span>
        </div>

        {activeBookingNow ? (
          <div className="court-status__secondary" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            Booked by <strong>{activeBookingNow.bookedBy.name}</strong> ({activeBookingNow.bookedBy.flatNo})
          </div>
        ) : (
          <div className="court-status__secondary" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            Ready for play • Book your slot
          </div>
        )}
      </div>
    </header>
  );
}
