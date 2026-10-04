import React from 'react';
import { createPortal } from 'react-dom';
import { Home, Phone, X } from 'lucide-react';
import { isValidPhoneNumber } from '../utils/profile';
import { parseTimeToMinutes as parseTime } from '../utils/storage';

export default function ResidentProfileModal({ profile, bookings = [], onClose }) {
  if (!profile) return null;
  const phone = isValidPhoneNumber(profile.phone) ? profile.phone : '';
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const currentMinutes = today.getHours() * 60 + today.getMinutes();
  const isThisResident = (entry) => (profile.uid && entry?.uid === profile.uid) || entry?.phone === profile.phone;
  const residentBookings = bookings.filter((booking) => isThisResident(booking.bookedBy) || booking.players?.some(isThisResident));
  const completed = residentBookings.filter((booking) => {
    const end = booking.endTime === '12:00 AM' ? 1440 : parseTime(booking.endTime);
    return booking.date < todayKey || (booking.date === todayKey && end <= currentMinutes);
  });
  const hosted = completed.filter((booking) => isThisResident(booking.bookedBy));
  const joined = completed.filter((booking) => !isThisResident(booking.bookedBy));
  const upcoming = residentBookings.filter((booking) => booking.date > todayKey || (booking.date === todayKey && (booking.endTime === '12:00 AM' ? 1440 : parseTime(booking.endTime)) > currentMinutes));
  const playerLevel = profile.playerLevel === 'All Welcome' ? 'Casual' : profile.playerLevel || 'Intermediate';

  return createPortal(
    <div className="modal-overlay resident-profile-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal-content resident-profile-modal" role="dialog" aria-modal="true" aria-label={`${profile.name || 'Resident'} profile`}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.2rem', color: '#fff' }}>Resident Profile</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Meda Heights</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close profile">
            <X size={18} />
          </button>
        </div>

        <div className="resident-profile-modal__identity">
          <div className="resident-profile-modal__avatar">
            {profile.avatar && (/^(https?:\/\/|data:image)/i.test(profile.avatar))
              ? <img src={profile.avatar} alt="" referrerPolicy="no-referrer" />
              : <span>{profile.avatar || '🏸'}</span>}
          </div>
          <strong>{profile.name || 'Resident'}</strong>
          <span><Home size={15} /> Flat {profile.flatNo || '—'}</span>
          <span className="resident-profile-modal__level">Player level · {playerLevel}</span>
        </div>

        <section className="profile-stats" aria-label="Resident booking statistics">
          <div><strong>{completed.length}</strong><span>Games played</span></div>
          <div><strong>{hosted.length}</strong><span>Hosted</span></div>
          <div><strong>{joined.length}</strong><span>Joined</span></div>
          <div><strong>{upcoming.length}</strong><span>Upcoming</span></div>
        </section>

        <div className="resident-profile-modal__phone">
          <Phone size={17} />
          <div>
            <small>Phone number</small>
            {phone ? <a href={`tel:${phone}`}>{phone}</a> : <span>Not provided</span>}
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
