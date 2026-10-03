import React, { useState } from 'react';
import { X, Share2, UserPlus, LogOut, Trash2, Flame, Clock, Edit3, Save, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getDateLabel, GENERATE_START_TIME_OPTIONS, GENERATE_TIME_OPTIONS, getFormattedDate } from '../data/mockData';
import { parseTimeToMinutes, getEndMinutes, getStartMinutes, overlapsChildrenClasses } from '../utils/storage';

export default function SlotDetailsModal({
  slotItem,
  selectedOffset,
  currentUser,
  onClose,
  onJoinMatch,
  onLeaveMatch,
  onCancelBooking,
  onUpdateBooking
}) {
  const { booking } = slotItem;
  const [isEditing, setIsEditing] = useState(false);
  const startTimeOptions = GENERATE_START_TIME_OPTIONS();
  const allTimeOptions = GENERATE_TIME_OPTIONS();
  const isToday = booking.date === getFormattedDate(0);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const editableStartTimeOptions = startTimeOptions.filter((time) =>
    ((!isToday || getStartMinutes(time) > currentMinutes) || time === booking.startTime)
    && (!overlapsChildrenClasses(booking.date, getStartMinutes(time), getStartMinutes(time) + 15) || time === booking.startTime));

  const getValidEndTimes = (start) => {
    const startMins = getStartMinutes(start);
    return allTimeOptions.filter((time) => {
      const endMins = getEndMinutes(time);
      const isExistingRange = start === booking.startTime && time === booking.endTime;
      return endMins > startMins && (endMins - startMins <= 120 || isExistingRange)
        && (!overlapsChildrenClasses(booking.date, startMins, endMins) || isExistingRange);
    });
  };

  // Edit fields
  const [startTime, setStartTime] = useState(booking.startTime || '06:00 PM');
  const [endTime, setEndTime] = useState(booking.endTime || '07:00 PM');
  const [matchType, setMatchType] = useState(booking.matchInfo?.matchType || 'Doubles');
  const [isUnlimited, setIsUnlimited] = useState(booking.matchInfo?.maxPlayers === 'unlimited');
  const [maxPlayers, setMaxPlayers] = useState(booking.matchInfo?.maxPlayers && booking.matchInfo?.maxPlayers !== 'unlimited' ? booking.matchInfo.maxPlayers : 4);
  const [note, setNote] = useState(booking.note || booking.matchInfo?.note || '');
  const [editError, setEditError] = useState('');

  const handleStartTimeChange = (newStart) => {
    setStartTime(newStart);
    const validEnds = getValidEndTimes(newStart);
    const currentEndMins = getEndMinutes(endTime);
    const newStartMins = getStartMinutes(newStart);

    if (!validEnds.some((time) => getEndMinutes(time) === currentEndMins)) {
      if (validEnds.length > 0) {
        const targetMins = newStartMins + 60;
        const matchingOneHour = validEnds.find(t => getEndMinutes(t) === targetMins);
        setEndTime(matchingOneHour || validEnds[0]);
      }
    }
  };

  const start = booking.startTime || slotItem.startTime || '06:00 PM';
  const end = booking.endTime || slotItem.endTime || '07:00 PM';

  const isOpen = booking.type === 'open';
  const isPrivate = booking.type === 'private';
  const isHost = booking.bookedBy?.phone === currentUser.phone;
  const isPlayerJoined = isOpen && booking.players?.some((p) => p.phone === currentUser.phone);

  const maxLimit = booking.matchInfo?.maxPlayers;
  const isUnlimitedMatch = maxLimit === 'unlimited';
  const currentCount = booking.players?.length || 1;
  const isFull = !isUnlimitedMatch && maxLimit && currentCount >= Number(maxLimit);

  // Handle Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');

    const startMins = parseTimeToMinutes(startTime);
    const endMins = getEndMinutes(endTime);

    if (endMins <= startMins) {
      setEditError('End time must be after Start time');
      return;
    }

    const timeChanged = startTime !== booking.startTime || endTime !== booking.endTime;
    if (timeChanged && endMins - startMins > 120) {
      setEditError('Bookings cannot be longer than 2 hours.');
      return;
    }

    if (timeChanged && overlapsChildrenClasses(booking.date, startMins, endMins)) {
      setEditError('The court is reserved for children’s classes on weekdays from 4:30 PM to 6:30 PM.');
      return;
    }

    if (startTime !== booking.startTime && (booking.date < getFormattedDate(0) || (isToday && startMins <= currentMinutes))) {
      setEditError('Choose a start time that is still in the future.');
      return;
    }

    const updatedFields = {
      startTime,
      endTime,
      note: note.trim()
    };

    if (isOpen) {
      updatedFields.matchInfo = {
        ...booking.matchInfo,
        matchType,
        maxPlayers: isUnlimited ? 'unlimited' : Number(maxPlayers),
        note: note.trim()
      };
    }

    try {
      await onUpdateBooking(booking.id, updatedFields);
      setIsEditing(false);
    } catch (err) {
      setEditError(err.message || 'Could not update this booking.');
    }
  };

  // Generate WhatsApp Share Message
  const handleShareToWhatsApp = () => {
    const dateText = new Date(`${booking.date}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
    const hostText = [booking.bookedBy?.name, booking.bookedBy?.flatNo].filter(Boolean).join(' · ');
    const playerStatusText = isUnlimitedMatch ? `${currentCount} players · no limit` : `${currentCount}/${maxLimit || currentCount} players`;
    const bookingUrl = new URL(window.location.href);
    bookingUrl.searchParams.set('booking', booking.id);
    const details = [
      '🏸 *SmashCourt · Open Match*',
      '',
      `📅 *Date:* ${dateText}`,
      `🕒 *Time:* ${start} – ${end}`,
      `👤 *Host:* ${hostText || 'Court resident'}`,
      `🎯 *Game:* ${booking.matchInfo?.matchType || 'Badminton'} · ${booking.matchInfo?.skillLevel || 'All levels'}`,
      `👥 *Players:* ${playerStatusText}`,
      booking.matchInfo?.note?.trim() ? `💬 *Note:* ${booking.matchInfo.note.trim()}` : '',
      '',
      `👉 *View or join this match:* ${bookingUrl.toString()}`
    ].filter((line) => line !== null);
    const shareUrl = new URL('https://wa.me/');
    shareUrl.searchParams.set('text', details.join('\n'));
    window.open(shareUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  const handleJoin = () => {
    confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
    onJoinMatch(booking.id);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--primary-light)', fontWeight: 700, textTransform: 'uppercase' }}>
              {getDateLabel(selectedOffset)} • {start} - {end}
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
              {isEditing ? 'Edit Court Booking' : isOpen ? 'Open Game Details' : 'Private Court Reservation'}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* EDIT FORM MODE */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit}>
            {editError && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#fca5a5',
                fontSize: '0.85rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} /> {editError}
              </div>
            )}

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '16px'
            }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Clock size={16} color="var(--primary-light)" /> Change Booking Timing
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>Start Time</label>
                  <select
                    className="input-field"
                    style={{ marginTop: '4px' }}
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                  >
                    {editableStartTimeOptions.map((t) => (
                      <option key={`start_${t}`} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>End Time</label>
                  <select
                    className="input-field"
                    style={{ marginTop: '4px' }}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  >
                    {getValidEndTimes(startTime).map((t) => (
                      <option key={`end_${t}`} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {isOpen && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                marginBottom: '16px',
                border: '1px solid rgba(245, 158, 11, 0.2)'
              }}>
                <div className="input-group">
                  <label className="input-label">Format</label>
                  <select
                    className="input-field"
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value)}
                  >
                    <option value="Doubles">Doubles Match</option>
                    <option value="Singles">Singles Match</option>
                    <option value="Open Session">Open Session</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Max Players Limit</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#fbbf24', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isUnlimited}
                        onChange={(e) => setIsUnlimited(e.target.checked)}
                      />
                      No Limit / Any Number
                    </label>
                  </label>

                  {!isUnlimited && (
                    <input
                      type="number"
                      min={2}
                      max={20}
                      className="input-field"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(e.target.value)}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Note / Message</label>
              <input
                type="text"
                className="input-field"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">
                <Save size={16} /> Save Changes
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          /* REGULAR VIEW MODE */
          <div>
            {/* PRIVATE BOOKING DETAILS */}
            {isPrivate && (
              <div>
                <div style={{
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
                      {booking.bookedBy.avatar && (/^(https?:\/\/|data:image)/i.test(booking.bookedBy.avatar)) ? (
                        <img src={booking.bookedBy.avatar} alt="Host" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.4rem' }}>{booking.bookedBy.avatar || '🏸'}</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                        {booking.bookedBy.name}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#67e8f9', fontWeight: 600 }}>
                        Flat Number {booking.bookedBy.flatNo}
                      </div>
                    </div>
                  </div>

                  {booking.note && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)'
                    }}>
                      💬 "{booking.note}"
                    </div>
                  )}
                </div>

                {/* Host Actions */}
                {isHost ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-full"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 size={16} /> Edit Booking Details
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-full"
                      onClick={() => onCancelBooking(booking.id)}
                    >
                      <Trash2 size={16} /> Cancel My Booking
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', textAlign: 'center' }}>
                    This court slot is privately reserved by Flat {booking.bookedBy.flatNo}.
                  </p>
                )}
              </div>
            )}

            {/* OPEN MATCH DETAILS */}
            {isOpen && (
              <div>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.08) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="badge badge-open">
                      <Flame size={12} /> {booking.matchInfo?.matchType || 'Doubles'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 700 }}>
                      {booking.matchInfo?.skillLevel || 'Intermediate'}
                    </span>
                  </div>

                  {booking.matchInfo?.note && (
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginTop: '8px' }}>
                      💬 "{booking.matchInfo.note}"
                    </div>
                  )}
                </div>

                {/* Player List */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Players List ({currentCount}/{isUnlimitedMatch ? 'Unlimited' : maxLimit})
                    </span>
                    {isFull && (
                      <span style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 700 }}>
                        FULL MATCH 🏆
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {booking.players.map((p, idx) => {
                      const isUserThisPlayer = p.phone === currentUser.phone;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: isUserThisPlayer ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                            border: isUserThisPlayer ? '1px solid var(--primary-glow)' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 'var(--radius-md)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
                              {p.avatar && (/^(https?:\/\/|data:image)/i.test(p.avatar)) ? (
                                <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: '1rem' }}>{p.avatar || '🏸'}</span>
                              )}
                            </div>
                            <div>
                              <strong style={{ fontSize: '0.9rem', color: isUserThisPlayer ? '#34d399' : '#fff' }}>
                                {p.name} {isUserThisPlayer && '(You)'}
                              </strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                                Flat {p.flatNo}
                              </div>
                            </div>
                          </div>

                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: p.role === 'Host' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            color: p.role === 'Host' ? '#fbbf24' : 'var(--text-muted)'
                          }}>
                            {p.role}
                          </span>
                        </div>
                      );
                    })}

                    {!isUnlimitedMatch && maxLimit && (
                      Array.from({ length: Math.max(0, Number(maxLimit) - currentCount) }).map((_, idx) => (
                        <div
                          key={`empty_${idx}`}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px dashed rgba(255, 255, 255, 0.15)',
                            color: 'var(--text-subtle)',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <span style={{ color: '#f59e0b', fontWeight: 700 }}>+</span> Open Spot Available
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Host Edit Option */}
                  {isHost && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-full"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 size={16} /> Edit Match Details
                    </button>
                  )}

                  {/* Join Button */}
                  {!isPlayerJoined && !isFull && (
                    <button
                      type="button"
                      className="btn btn-primary btn-full"
                      onClick={handleJoin}
                    >
                      <UserPlus size={18} /> Join This Open Match
                    </button>
                  )}

                  {/* Leave Button */}
                  {isPlayerJoined && (
                    <button
                      type="button"
                      className="btn btn-danger btn-full"
                      onClick={() => onLeaveMatch(booking.id)}
                    >
                      <LogOut size={16} /> Leave Match Slot
                    </button>
                  )}

                  {/* WhatsApp Share Button */}
                  <button
                    type="button"
                    className="btn btn-whatsapp btn-full"
                    onClick={handleShareToWhatsApp}
                  >
                    <Share2 size={18} /> Share booking on WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
