import React, { useState } from 'react';
import { X, RefreshCw, LogOut, Save } from 'lucide-react';
import { saveRegisteredUser, setUserSession } from '../utils/storage';

export default function ProfileModal({ currentUser, onClose, onLogout, onResetDemoData, onUserUpdate, demoMode = true }) {
  const [name, setName] = useState(currentUser?.name || '');
  const [flatNo, setFlatNo] = useState(currentUser?.flatNo || '');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    const updatedUser = {
      ...currentUser,
      name: name.trim(),
      flatNo: flatNo.trim().toUpperCase()
    };
    try {
      const savedUser = await onUserUpdate(updatedUser);
      const finalUser = savedUser || updatedUser;
      saveRegisteredUser(finalUser);
      setUserSession(finalUser);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
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

          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
