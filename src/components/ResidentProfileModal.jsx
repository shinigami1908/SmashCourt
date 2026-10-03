import React from 'react';
import { createPortal } from 'react-dom';
import { Home, Phone, X } from 'lucide-react';
import { isValidPhoneNumber } from '../utils/profile';

export default function ResidentProfileModal({ profile, onClose }) {
  if (!profile) return null;
  const phone = isValidPhoneNumber(profile.phone) ? profile.phone : '';

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
        </div>

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
