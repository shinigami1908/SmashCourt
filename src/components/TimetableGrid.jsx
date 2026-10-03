import React, { useState } from 'react';
import { Plus, Users, Lock, Clock, ChevronRight, Flame, Calendar as CalendarIcon } from 'lucide-react';
import { getFormattedDate } from '../data/mockData';
import { parseTimeToMinutes, getEndMinutes } from '../utils/storage';
import ResidentProfileModal from './ResidentProfileModal';

export default function TimetableGrid({ selectedOffset, bookings, currentUser, onSelectSlot }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'open' | 'mine'
  const [viewingProfile, setViewingProfile] = useState(null);

  const dateStr = getFormattedDate(selectedOffset);
  const now = new Date();
  const isToday = selectedOffset === 0;
  const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

  // Get all bookings for the selected date
  const dateBookings = bookings.filter((b) => b.date === dateStr);

  // Filter out past slots for today
  const activeBookings = dateBookings.filter((b) => {
    if (!isToday) return true;
    const endMins = getEndMinutes(b.endTime);
    return endMins > currentMinutesNow; // Hide expired/past slots!
  }).sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  // Filter based on selected tab
  const filteredBookings = activeBookings.filter((b) => {
    const isMine = b.bookedBy.phone === currentUser.phone || (b.players && b.players.some(p => p.phone === currentUser.phone));
    if (filter === 'all') return true;
    if (filter === 'open') return b.type === 'open';
    if (filter === 'mine') return isMine; // My slots only!
    return true;
  });

  return (
    <div>
      {/* Top Banner: Prominent New Custom Booking Button */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        marginBottom: '16px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
            Want to use the court?
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Choose your custom timing & play mode
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => onSelectSlot({ date: dateStr, startTime: '06:00 AM', endTime: '07:00 AM', booking: null })}
          style={{ padding: '10px 18px', fontSize: '0.9rem', flexShrink: 0 }}
        >
          <Plus size={18} /> Book Court Slot
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '12px',
        marginBottom: '8px',
        scrollbarWidth: 'none'
      }}>
        <button
          className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
          style={{ whiteSpace: 'nowrap', padding: '6px 14px', fontSize: '0.8rem' }}
        >
          Active Bookings ({activeBookings.length})
        </button>
        <button
          className={`tab-btn tab-amber ${filter === 'open' ? 'active' : ''}`}
          onClick={() => setFilter('open')}
          style={{ whiteSpace: 'nowrap', padding: '6px 14px', fontSize: '0.8rem' }}
        >
          <Users size={13} /> Open Games ({activeBookings.filter(b => b.type === 'open').length})
        </button>
        <button
          className={`tab-btn ${filter === 'mine' ? 'active' : ''}`}
          onClick={() => setFilter('mine')}
          style={{ whiteSpace: 'nowrap', padding: '6px 14px', fontSize: '0.8rem' }}
        >
          My Slots ({activeBookings.filter(b => b.bookedBy.phone === currentUser.phone || (b.players && b.players.some(p => p.phone === currentUser.phone))).length})
        </button>
      </div>

      {/* Booked Slots Timeline / Calendar View */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredBookings.length === 0 ? (
          <div className="glass-panel" style={{ padding: '36px 20px', textAlign: 'center' }}>
            <CalendarIcon size={32} color="var(--primary-light)" style={{ marginBottom: '8px', opacity: 0.8 }} />
            <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700 }}>No Bookings Yet for this Date</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px', marginBottom: '16px' }}>
              The court is completely open! Be the first to reserve your preferred timing.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => onSelectSlot({ date: dateStr, startTime: '06:00 AM', endTime: '07:00 AM', booking: null })}
            >
              <Plus size={16} /> Book Court Now
            </button>
          </div>
        ) : (
          filteredBookings.map((b) => {
            const isOpen = b.type === 'open';
            const isPrivate = b.type === 'private';
            const isMine = b.bookedBy.phone === currentUser.phone || (b.players && b.players.some(p => p.phone === currentUser.phone));
            const maxPlayers = b.matchInfo?.maxPlayers;
            const isUnlimited = maxPlayers === 'unlimited';
            const currentPlayersCount = b.players?.length || 1;
            const isFull = !isUnlimited && maxPlayers && currentPlayersCount >= Number(maxPlayers);

            return (
              <div
                key={b.id}
                onClick={() => onSelectSlot({ date: dateStr, booking: b })}
                className={`glass-panel booking-card${isMine ? ' is-mine' : ''}`}
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  borderLeft: isMine
                    ? '4px solid var(--primary)'
                    : isOpen
                    ? '4px solid #f59e0b'
                    : '4px solid #06b6d4',
                  transition: 'all 0.2s ease',
                  background: isMine
                    ? 'rgba(16, 185, 129, 0.08)'
                    : isOpen
                    ? 'rgba(245, 158, 11, 0.06)'
                    : 'var(--bg-card)'
                }}
              >
                <div className="booking-card__heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Timing & Badge */}
                  <div className="booking-card__labels" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: '1rem',
                      color: '#ffffff'
                    }} className="booking-card__time">
                      <Clock size={16} color="var(--primary-light)" />
                      {b.startTime} - {b.endTime}
                    </div>

                    {isPrivate ? (
                      <span className="badge badge-private">
                        <Lock size={12} /> Private
                      </span>
                    ) : isFull ? (
                      <span className="badge badge-full">
                        <Users size={12} /> Full ({currentPlayersCount}/{maxPlayers})
                      </span>
                    ) : (
                      <span className="badge badge-open">
                        <Flame size={12} /> Open Match ({currentPlayersCount}/{isUnlimited ? '∞' : maxPlayers})
                      </span>
                    )}

                    {isMine && (
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#34d399',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}>
                        Your Slot
                      </span>
                    )}
                  </div>

                  <ChevronRight size={18} color="var(--text-subtle)" />
                </div>

                {/* Sub info */}
                <div className="booking-card__details" style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '0.85rem'
                }}>
                  {isPrivate ? (
                    <div style={{ color: 'var(--text-muted)' }}>
                      Reserved by <button type="button" className="profile-link" onClick={(event) => { event.stopPropagation(); setViewingProfile(b.bookedBy); }}><strong>{b.bookedBy.name}</strong> ({b.bookedBy.flatNo})</button>
                      {b.note && <span style={{ fontStyle: 'italic', marginLeft: '6px' }}>• "{b.note}"</span>}
                    </div>
                  ) : (
                    <div>
                      <div className="booking-card__match" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                          {b.matchInfo?.matchType || 'Doubles'} • {b.matchInfo?.skillLevel || 'Intermediate'}
                        </span>
                        <span style={{ color: 'var(--text-subtle)', fontSize: '0.78rem' }}>
                          Host: <button type="button" className="profile-link" onClick={(event) => { event.stopPropagation(); setViewingProfile(b.bookedBy); }}>{b.bookedBy.name} ({b.bookedBy.flatNo})</button>
                        </span>
                      </div>

                      {/* Players list with photos/avatars */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {b.players?.map((p, idx) => (
                          <button
                            type="button"
                            key={idx}
                            className="profile-link"
                            onClick={(event) => { event.stopPropagation(); setViewingProfile(p); }}
                            title={`View ${p.name}'s profile`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-full)',
                              border: p.phone === currentUser.phone ? '1px solid var(--primary)' : '1px solid transparent',
                              color: 'inherit', font: 'inherit', cursor: 'pointer'
                            }}
                          >
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {p.avatar && (/^(https?:\/\/|data:image)/i.test(p.avatar)) ? (
                                <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: '0.8rem' }}>{p.avatar || '🏸'}</span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: p.phone === currentUser.phone ? '#34d399' : '#e2e8f0' }}>
                              {p.flatNo}
                            </span>
                          </button>
                        ))}

                        {/* Open Spots indicator */}
                        {!isUnlimited && maxPlayers && (
                          Array.from({ length: Math.max(0, Number(maxPlayers) - currentPlayersCount) }).map((_, idx) => (
                            <div
                              key={`empty_${idx}`}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                border: '1px dashed rgba(245, 158, 11, 0.5)',
                                background: 'rgba(245, 158, 11, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fbbf24',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}
                            >
                              +
                            </div>
                          ))
                        )}

                        {isUnlimited && (
                          <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontStyle: 'italic', marginLeft: '4px' }}>
                            + Any resident welcome
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <ResidentProfileModal profile={viewingProfile} onClose={() => setViewingProfile(null)} />
    </div>
  );
}
