import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Home, LogIn, ShieldCheck } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { isFirebaseConfigured, firebaseAuth } from '../firebase';
import { getRegisteredUser, saveRegisteredUser, setUserSession } from '../utils/storage';
import { getFirestoreUser, saveFirestoreUser } from '../utils/firebaseBookings';
import { isValidPhoneNumber, normalizePhoneNumber } from '../utils/profile';

export default function AuthModal({ onLoginSuccess }) {
  const [step, setStep] = useState('sign-in');
  const [firebaseUid, setFirebaseUid] = useState(null);
  const [googleProfile, setGoogleProfile] = useState(null);
  const [name, setName] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [phone, setPhone] = useState('');
  const [playerLevel, setPlayerLevel] = useState('Intermediate');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const finishLogin = (user) => {
    setUserSession(user);
    onLoginSuccess(user);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    if (!isFirebaseConfigured) {
      setError('Firebase is not configured. Use a demo account or add the Firebase Web app settings.');
      return;
    }
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(firebaseAuth, provider);
      const account = result.user;
      const existingProfile = await getFirestoreUser(account.uid);
      const googlePhoto = account.photoURL || '🏸';
      const identity = {
        ...existingProfile,
        uid: account.uid,
        phone: isValidPhoneNumber(existingProfile?.phone)
          ? existingProfile.phone
          : isValidPhoneNumber(account.phoneNumber) ? account.phoneNumber : '',
        email: account.email || '',
        name: existingProfile?.name || account.displayName || '',
        flatNo: existingProfile?.flatNo || '',
        playerLevel: existingProfile?.playerLevel || 'Intermediate',
        avatar: googlePhoto,
        googlePhotoURL: account.photoURL || ''
      };

      if (existingProfile?.flatNo && isValidPhoneNumber(identity.phone)) {
        const savedProfile = await saveFirestoreUser(account.uid, { ...existingProfile, ...identity });
        finishLogin(savedProfile);
      } else {
        setFirebaseUid(account.uid);
        setGoogleProfile(identity);
        setName(identity.name);
        setFlatNo(identity.flatNo);
        setPhone(identity.phone);
        setPlayerLevel(identity.playerLevel);
        setStep('register');
      }
    } catch (err) {
      const errorMessage = err.code === 'auth/unauthorized-domain'
        ? `This app address is not authorized for Firebase sign-in. Add ${window.location.hostname} under Firebase Console → Authentication → Settings → Authorized domains, then try again.`
        : err.code === 'permission-denied' || err.code === 'firestore/permission-denied'
          ? 'Google sign-in worked, but Firestore denied access to your resident profile. Publish the project’s firestore.rules in Firebase Console → Firestore Database → Rules, then try again.'
          : err.code === 'auth/operation-not-allowed'
        ? 'Google sign-in is not enabled in Firebase Authentication yet.'
        : err.code === 'auth/popup-blocked'
          ? 'The sign-in popup was blocked. Allow popups for this app and try again.'
          : err.message || 'Google sign-in failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (phone, demoName, demoFlat, avatar) => {
    const saved = getRegisteredUser(phone);
    const user = saved || { phone, name: demoName, flatNo: demoFlat, avatar };
    saveRegisteredUser(user);
    finishLogin(user);
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (!name.trim() || !flatNo.trim() || !isValidPhoneNumber(phone)) {
      setError('Enter your name, flat number, and a valid phone number to finish your resident profile.');
      return;
    }
    setError('');
    setIsLoading(true);
    const profile = {
      ...googleProfile,
      uid: firebaseUid,
      name: name.trim(),
      flatNo: flatNo.trim().toUpperCase(),
      phone: normalizePhoneNumber(phone),
      playerLevel,
      avatar: googleProfile?.googlePhotoURL || '🏸',
      registeredAt: new Date().toISOString()
    };
    try {
      const savedProfile = await saveFirestoreUser(firebaseUid, profile);
      saveRegisteredUser(savedProfile);
      finishLogin(savedProfile);
    } catch (err) {
      setError(err.message || 'Could not save your profile to Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  const profileImage = googleProfile?.avatar && /^https?:\/\//i.test(googleProfile.avatar);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(16,185,129,.2), rgba(6,182,212,.2))',
            border: '2px solid rgba(16,185,129,.4)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '2rem', margin: '0 auto 12px', overflow: 'hidden'
          }}>
            {step === 'register' && profileImage
              ? <img src={googleProfile.avatar} alt="Google account profile" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🏸'}
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>Welcome to SmashCourt</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {step === 'register' ? 'Finish your Greenwood Heights resident profile' : 'Society Court Booking & Matchmaking'}
          </p>
        </div>

        {error && <div role="alert" style={{ padding: '10px 14px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '.85rem', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}

        {step === 'sign-in' && (
          <>
            {isFirebaseConfigured ? (
              <>
                <button type="button" className="btn btn-primary btn-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                  <LogIn size={17} /> {isLoading ? 'Connecting to Google…' : 'Continue with Google'} <ArrowRight size={17} />
                </button>
                <p style={{ color: 'var(--text-subtle)', fontSize: '.75rem', lineHeight: 1.5, textAlign: 'center', marginTop: '12px' }}>
                  Your Google account photo will be used for your resident profile.
                </p>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', marginBottom: '14px' }}>
                  Add Firebase Web app settings to enable Google sign-in.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => handleDemoLogin('9876543210', 'Rahul Verma', 'B-402', '⚡')}>⚡ Rahul (B-402)</button>
                  <button type="button" className="btn btn-secondary" onClick={() => handleDemoLogin('9876543211', 'Ananya Sharma', 'A-102', '🔥')}>🔥 Ananya (A-102)</button>
                </div>
              </>
            )}
          </>
        )}

        {step === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', color: 'var(--primary-light)', fontSize: '.82rem' }}>
              <ShieldCheck size={16} /> {googleProfile?.email || 'Google account verified'}
            </div>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input className="input-field" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <input type="tel" className="input-field" autoComplete="tel" placeholder="Include country code if needed" value={phone} onChange={(event) => setPhone(event.target.value)} required />
              <small style={{ color: 'var(--text-subtle)', display: 'block', marginTop: '5px' }}>Other residents can see it when you book.</small>
            </div>
            <div className="input-group">
              <label className="input-label">Player Level</label>
              <select className="input-field" value={playerLevel} onChange={(event) => setPlayerLevel(event.target.value)}>
                <option value="All Welcome">Casual / All Welcome</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Tower & Flat Number</label>
              <div style={{ position: 'relative' }}>
                <Home size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="input-field" style={{ paddingLeft: '42px' }} placeholder="e.g. Tower B - Flat 402" value={flatNo} onChange={(event) => setFlatNo(event.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
              <CheckCircle2 size={17} /> {isLoading ? 'Saving profile…' : 'Complete Setup & Enter Court'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
