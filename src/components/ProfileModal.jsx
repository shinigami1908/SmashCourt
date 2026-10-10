import React, { useState } from 'react';
import { X, RefreshCw, LogOut, Save } from 'lucide-react';
import { saveRegisteredUser, setUserSession } from '../utils/storage';
import { isValidFullName, isValidPhoneNumber, normalizePhoneNumber } from '../utils/profile';
import { getEndMinutes } from '../utils/storage';
import { getFormattedDate } from '../data/mockData';

export default function ProfileModal({ currentUser, bookings = [], onClose, onLogout, onResetDemoData, onUserUpdate, onPhoneAdded, requirePhone = false, demoMode = true }) {
  const [name, setName] = useState(currentUser?.name || '');
  const [flatNo, setFlatNo] = useState(currentUser?.flatNo || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [playerLevel, setPlayerLevel] = useState(currentUser?.playerLevel || 'Intermediate');
  const [isSaved, setIsSaved] = useState(false);

  const now = new Date();
  const today = getFormattedDate(0);
  const isMine = (entry) => (currentUser?.uid && entry?.uid === currentUser.uid) || entry?.phone === currentUser?.phone;
  const myBookings = bookings.filter((booking) => isMine(booking.bookedBy) || booking.players?.some(isMine));
  const completedBookings = myBookings.filter((booking) => booking.date < today || (booking.date === today && getEndMinutes(booking.endTime) <= now.getHours() * 60 + now.getMinutes()));
  const hostedGames = completedBookings.filter((booking) => isMine(booking.bookedBy));
  const joinedGames = completedBookings.filter((booking) => !isMine(booking.bookedBy));
  const upcomingBookings = myBookings.filter((booking) => booking.date > today || (booking.date === today && getEndMinutes(booking.endTime) > now.getHours() * 60 + now.getMinutes()));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isValidFullName(name)) {
      alert('Full name can contain letters and spaces only.');
      return;
    }
    if (!isValidPhoneNumber(phone)) {
      alert('Enter a 10-digit phone number using numbers only.');
      return;
    }
    const updatedUser = {
      ...currentUser,
      name: name.trim(),
      flatNo: flatNo.trim().toUpperCase(),
      phone: normalizePhoneNumber(phone),
      playerLevel
    };
    try {
      const savedUser = await onUserUpdate(updatedUser);
      const finalUser = savedUser || updatedUser;
      saveRegisteredUser(finalUser);
      setUserSession(finalUser);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      if (requirePhone && isValidPhoneNumber(finalUser.phone)) {
        onPhoneAdded?.(finalUser);
        onClose();
      }
    } catch (err) {
      alert(err.message || 'Could not save profile changes.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
              Resident Profile
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Meda Heights
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {requirePhone && (
          <p role="status" style={{ color: '#fbbf24', fontSize: '0.82rem', marginBottom: '14px' }}>Add a valid phone number to continue with your booking. It will be visible to residents when you book.</p>
        )}

        <form onSubmit={handleSave}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              margin: '0 auto 8px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '2px solid var(--primary-light)',
              fontSize: '2rem'
            }}>
              {currentUser.avatar?.startsWith('http') || currentUser.avatar?.startsWith('data:image') ? (
                <img src={currentUser.avatar} alt="Google account profile" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : currentUser.avatar || '🏸'}
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: '6px' }}>
              {currentUser?.email || 'Signed in with Google'}
            </div>
          </div>

          <section className="profile-stats" aria-label="Your booking statistics">
            <div><strong>{completedBookings.length}</strong><span>Games played</span></div>
            <div><strong>{hostedGames.length}</strong><span>Hosted</span></div>
            <div><strong>{joinedGames.length}</strong><span>Joined</span></div>
            <div><strong>{upcomingBookings.length}</strong><span>Upcoming</span></div>
          </section>

          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^\p{L}\p{M}\s]/gu, ''))}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Phone Number</label>
            <input type="tel" className="input-field" autoComplete="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit phone number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} required />
            <small style={{ color: 'var(--text-subtle)', display: 'block', marginTop: '5px' }}>Enter 10 digits. Visible to other residents when you book.</small>
          </div>

          <div className="input-group">
            <label className="input-label">Player Level</label>
            <select className="input-field" value={playerLevel} onChange={(e) => setPlayerLevel(e.target.value)}>
              <option value="All Welcome">Casual</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            <small style={{ color: 'var(--text-subtle)', display: 'block', marginTop: '5px' }}>Used as the default level when you create an open match.</small>
          </div>

          <div className="input-group">
            <label className="input-label">Flat / Apartment Number</label>
            <input
              type="text"
              className="input-field"
              value={flatNo}
              onChange={(e) => setFlatNo(e.target.value)}
              required
            />
          </div>

          {isSaved && (
            <div style={{ textAlign: 'center', color: '#34d399', fontSize: '0.85rem', fontWeight: 600, marginBottom: '12px' }}>
              ✓ Profile changes saved!
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full">
            <Save size={16} /> Save Profile Changes
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {demoMode && <button
            type="button"
            className="btn btn-secondary btn-full"
            onClick={onResetDemoData}
            style={{ fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} /> Restore Initial Demo Slots
          </button>}

          <button
            type="button"
            className="btn btn-danger btn-full"
            onClick={onLogout}
            style={{ fontSize: '0.85rem' }}
          >
            <LogOut size={14} /> Switch Account / Logout
          </button>
        </div>
      </div>
    </div>
  );
}
