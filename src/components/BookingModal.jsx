import React, { useState } from 'react';
import { X, Lock, Users, Sparkles, AlertCircle, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getDateLabel, getFormattedDate, GENERATE_TIME_OPTIONS, GENERATE_START_TIME_OPTIONS } from '../data/mockData';
import { isTimingOverlapping, getStartMinutes, getEndMinutes, overlapsChildrenClasses } from '../utils/storage';
import { isValidPhoneNumber } from '../utils/profile';

export default function BookingModal({ slotItem, selectedOffset, currentUser, onClose, onConfirmBooking, firebaseMode = false }) {
  const [bookingType, setBookingType] = useState('open');

  const allTimeOptions = GENERATE_TIME_OPTIONS();
  const isToday = slotItem?.date === getFormattedDate(0);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startTimeOptions = GENERATE_START_TIME_OPTIONS().filter((time) =>
    (!isToday || getStartMinutes(time) > currentMinutes)
    && !overlapsChildrenClasses(slotItem.date, getStartMinutes(time), getStartMinutes(time) + 15));
  const suggestedStart = slotItem?.startTime && slotItem.startTime !== '12:00 AM'
    ? slotItem.startTime
    : '06:00 AM';
  const defaultStart = startTimeOptions.includes(suggestedStart) ? suggestedStart : startTimeOptions[0] || '06:00 AM';

  const [startTime, setStartTime] = useState(defaultStart);

  // Compute end time options strictly AFTER startTime (12:00 AM midnight is a valid close)
  const getValidEndTimes = (start) => {
    const startMins = getStartMinutes(start);
    return allTimeOptions.filter((time) => {
      const endMins = getEndMinutes(time);
      return endMins > startMins && endMins - startMins <= 120
        && !overlapsChildrenClasses(slotItem.date, startMins, endMins);
    });
  };

  const initialValidEndTimes = getValidEndTimes(defaultStart);
  const defaultEnd = slotItem?.endTime && getEndMinutes(slotItem.endTime) > getStartMinutes(defaultStart)
    ? slotItem.endTime
    : (initialValidEndTimes.find((t) => getEndMinutes(t) === getStartMinutes(defaultStart) + 60) || initialValidEndTimes[0] || '07:00 PM');

  const [endTime, setEndTime] = useState(defaultEnd);

  // Automatically update End Time if Start Time changes
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

  // Match fields
  const [matchType, setMatchType] = useState('Doubles');
  const [isUnlimited, setIsUnlimited] = useState(true); // Default: No limit checked!
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [note, setNote] = useState('');

  const [error, setError] = useState('');

  const triggerConfetti = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValidPhoneNumber(currentUser?.phone)) {
      setError('Add a valid phone number to your profile before booking.');
      return;
    }

    const startMins = getStartMinutes(startTime);
    const endMins = getEndMinutes(endTime);

    if (endMins <= startMins) {
      setError('End time must be strictly after Start time');
      return;
    }

    if (endMins - startMins > 120) {
      setError('Bookings cannot be longer than 2 hours.');
      return;
    }

    if (overlapsChildrenClasses(slotItem.date, startMins, endMins)) {
      setError('The court is reserved for children’s classes on weekdays from 4:30 PM to 6:30 PM.');
      return;
    }

    if (slotItem.date < getFormattedDate(0) || (isToday && startMins <= currentMinutes)) {
      setError('Choose a start time that is still in the future.');
      return;
    }

    if (!firebaseMode && isTimingOverlapping(slotItem.date, startTime, endTime)) {
      setError(`The court is already booked during ${startTime} - ${endTime}. Please select another time.`);
      return;
    }

    const bookingData = {
      id: `bkg_${slotItem.date}_${startMins}_${endMins}_${Date.now()}`,
      date: slotItem.date,
      startTime,
      endTime,
      type: bookingType,
      playerUids: bookingType === 'open' && currentUser.uid ? [currentUser.uid] : [],
      bookedBy: {
        uid: currentUser.uid || null,
        phone: currentUser.phone,
        name: currentUser.name,
        flatNo: currentUser.flatNo,
        avatar: currentUser.avatar
      },
      note: note.trim(),
      createdAt: new Date().toISOString()
    };

    if (bookingType === 'open') {
      bookingData.matchInfo = {
        matchType,
        maxPlayers: isUnlimited ? 'unlimited' : Number(maxPlayers),
        skillLevel,
        note: note.trim()
      };
      bookingData.players = [
        {
          uid: currentUser.uid || null,
          phone: currentUser.phone,
          name: currentUser.name,
          flatNo: currentUser.flatNo,
          avatar: currentUser.avatar,
          role: 'Host'
        }
      ];
    }

    try {
      await onConfirmBooking(bookingData);
      triggerConfetti();
    } catch (err) {
      setError(err.message || 'Could not create this booking.');
    }
  };

  const validEndOptions = getValidEndTimes(startTime);

  return (
    <div className="modal-overlay">
      <div className="modal-content booking-modal">
        {/* Header */}
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--primary-light)', fontWeight: 700, textTransform: 'uppercase' }}>
              {getDateLabel(selectedOffset)}
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
              New Court Booking
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px',
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
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>{error}</div>
          </div>
        )}

        <form className="booking-modal__form" onSubmit={handleSubmit}>
          {/* Custom Time Range Selector */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '16px'
          }} className="booking-modal__times">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Clock size={16} color="var(--primary-light)" /> Select Booking Duration
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>Start Time</label>
                <select
                  className="input-field"
                  style={{ marginTop: '4px' }}
                  value={startTime}
                  disabled={isToday && startTimeOptions.length === 0}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                >
                  {startTimeOptions.map((t) => (
                    <option key={`start_${t}`} value={t}>{t}</option>
                  ))}
                </select>
                {isToday && startTimeOptions.length === 0 && (
                  <p style={{ color: '#fca5a5', fontSize: '0.78rem', marginTop: '6px' }}>There are no bookable start times left today.</p>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>End Time (After Start)</label>
                <select
                  className="input-field"
                  style={{ marginTop: '4px' }}
                  value={endTime}
                  disabled={isToday && startTimeOptions.length === 0}
                  onChange={(e) => setEndTime(e.target.value)}
                >
                  {validEndOptions.map((t) => (
                    <option key={`end_${t}`} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Booking Type Selector */}
          <div className="input-group booking-modal__types">
            <label className="input-label">Booking Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Option A: Open Match Poll */}
              <div
                onClick={() => setBookingType('open')}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: bookingType === 'open'
                    ? '2px solid #f59e0b'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: bookingType === 'open'
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(217, 119, 6, 0.1) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                className="booking-modal__type-option"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Users size={18} color="#fbbf24" />
                  <strong style={{ fontSize: '0.95rem', color: '#fbbf24' }}>Open Match</strong>
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Looking for residents to join you.
                </p>
                {bookingType === 'open' && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#f59e0b',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    ✓
                  </span>
                )}
              </div>

              {/* Option B: Private Court */}
              <div
                onClick={() => setBookingType('private')}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: bookingType === 'private'
                    ? '2px solid #06b6d4'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: bookingType === 'private'
                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.18) 0%, rgba(8, 145, 178, 0.1) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                className="booking-modal__type-option"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Lock size={18} color="#67e8f9" />
                  <strong style={{ fontSize: '0.95rem', color: '#67e8f9' }}>Private Court</strong>
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Reserved exclusively for your flat/friends.
                </p>
                {bookingType === 'private' && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#06b6d4',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    ✓
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Conditional Options for Open Match */}
          {bookingType === 'open' && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '16px',
              border: '1px solid rgba(245, 158, 11, 0.2)'
            }} className="booking-modal__match-options">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
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
                  <label className="input-label">Skill Level</label>
                  <select
                    className="input-field"
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value)}
                  >
                    <option value="All Welcome">Casual / All Welcome</option>
                    <option value="Beginner">Beginner Friendly</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced / Competitive</option>
                  </select>
                </div>
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

                {!isUnlimited ? (
                  <input
                    type="number"
                    min={2}
                    max={20}
                    className="input-field"
                    placeholder="Set max players limit e.g. 4"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(e.target.value)}
                  />
                ) : (
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: '#fbbf24',
                    fontSize: '0.82rem'
                  }}>
                    🌐 Open for any number of society residents to join!
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="input-group booking-modal__note">
            <label className="input-label">
              {bookingType === 'open' ? 'Note for society players (Optional)' : 'Booking Note (Optional)'}
            </label>
            <input
              type="text"
              className="input-field"
              placeholder={bookingType === 'open' ? 'e.g. Looking for aggressive players!' : 'e.g. Playing with flat B-201'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full booking-modal__submit" style={{ marginTop: '8px' }} disabled={isToday && startTimeOptions.length === 0}>
            Confirm & Reserve Court <Sparkles size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
