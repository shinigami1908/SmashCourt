import React from 'react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { getFormattedDate } from '../data/mockData';

export default function MyBookingsSummary({ currentUser, bookings, onSelectSlot }) {
  if (!currentUser) return null;

  // Find all active bookings for this user across all dates
  const myBookings = bookings.filter((booking) => {
    const isOwner = booking.bookedBy?.phone === currentUser.phone;
    const isParticipant = booking.players?.some((p) => p.phone === currentUser.phone);
    return isOwner || isParticipant;
  });

  if (myBookings.length === 0) return null;

  return (
    <div style={{ marginTop: '24px' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <CheckCircle2 size={16} color="var(--primary-light)" /> Your Active Booked Slots ({myBookings.length})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {myBookings.map((b) => {
          const today = getFormattedDate(0);
          const tomorrow = getFormattedDate(1);
          let dateLabel = b.date;
          if (b.date === today) dateLabel = 'Today';
          else if (b.date === tomorrow) dateLabel = 'Tomorrow';

          const isOpen = b.type === 'open';
          const maxLimit = b.matchInfo?.maxPlayers;
          const isUnlimited = maxLimit === 'unlimited';

          return (
            <div
              key={b.id}
              onClick={() => onSelectSlot({ booking: b, date: b.date })}
              className="glass-panel my-booking-card"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                borderLeft: isOpen ? '4px solid #f59e0b' : '4px solid #06b6d4',
                background: 'rgba(16, 185, 129, 0.06)'
              }}
            >
              <div className="my-booking-card__content">
                <div className="my-booking-card__heading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                    {dateLabel} • {b.startTime} - {b.endTime}
                  </span>
                  <span className={`badge ${isOpen ? 'badge-open' : 'badge-private'}`} style={{ fontSize: '0.68rem' }}>
                    {isOpen ? 'Open Game' : 'Private'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {isOpen
                    ? `${b.players?.length}/${isUnlimited ? '∞' : maxLimit || 4} Players Joined`
                    : `Host: ${b.bookedBy.name} (Flat ${b.bookedBy.flatNo})`}
                </div>
              </div>

              <ChevronRight size={18} color="var(--text-subtle)" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
