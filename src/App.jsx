import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DateSelector from './components/DateSelector';
import TimetableGrid from './components/TimetableGrid';
import CalendarView from './components/CalendarView';
import BookingModal from './components/BookingModal';
import SlotDetailsModal from './components/SlotDetailsModal';
import ProfileModal from './components/ProfileModal';
import AuthModal from './components/AuthModal';
import { Calendar as CalendarIcon, ListFilter } from 'lucide-react';

import {
  getUserSession,
  clearUserSession,
  getBookings,
  createBooking,
  updateBooking,
  cancelBooking,
  joinOpenMatch,
  leaveOpenMatch,
  resetDemoData
} from './utils/storage';
import { getFormattedDate } from './data/mockData';
import { isValidPhoneNumber } from './utils/profile';
import { firebaseAuth, isFirebaseConfigured } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  subscribeToBookings, createFirestoreBooking, updateFirestoreBooking, deleteFirestoreBooking,
  updateFirestorePlayers, saveFirestoreUser, getFirestoreUser
} from './utils/firebaseBookings';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [selectedOffset, setSelectedOffset] = useState(0);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [cloudError, setCloudError] = useState('');

  // Modals
  const [activeSlotForBooking, setActiveSlotForBooking] = useState(null);
  const [activeSlotForDetails, setActiveSlotForDetails] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [requirePhoneForBooking, setRequirePhoneForBooking] = useState(false);
  const [pendingBookingSlot, setPendingBookingSlot] = useState(null);

  // Initial Load & Session Retrieval
  useEffect(() => {
    if (isFirebaseConfigured) {
      const readinessTimeout = window.setTimeout(() => setAuthReady(true), 3000);
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
        if (!firebaseUser) {
          setCurrentUser(null);
          setBookings([]);
          window.clearTimeout(readinessTimeout);
          setAuthReady(true);
          return;
        }
        try {
          const profile = await getFirestoreUser(firebaseUser.uid);
          if (profile) setCurrentUser({ ...profile, uid: firebaseUser.uid, phone: firebaseUser.phoneNumber?.startsWith('+91') ? firebaseUser.phoneNumber.slice(3) : profile.phone });
        } catch (err) {
          setCloudError(`Could not load your Firebase profile: ${err.message}`);
        } finally {
          window.clearTimeout(readinessTimeout);
          setAuthReady(true);
        }
      });
      return () => {
        window.clearTimeout(readinessTimeout);
        unsubscribe();
      };
    }
    const sessionUser = getUserSession();
    if (sessionUser) {
      setCurrentUser(sessionUser);
    }
    const initialBookings = getBookings();
    setBookings(initialBookings);
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!currentUser || !bookings.length) return;
    const url = new URL(window.location.href);
    const bookingId = url.searchParams.get('booking');
    if (!bookingId) return;
    const booking = bookings.find((item) => item.id === bookingId);
    if (!booking) return;
    for (let offset = 0; offset <= 2; offset += 1) {
      if (getFormattedDate(offset) === booking.date) {
        setSelectedOffset(offset);
        break;
      }
    }
    setActiveSlotForDetails({ date: booking.date, booking });
    url.searchParams.delete('booking');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [currentUser, bookings]);

  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser?.uid) return undefined;
    setCloudError('');
    return subscribeToBookings(setBookings, (err) => setCloudError(`Could not sync bookings: ${err.message}`));
  }, [currentUser?.uid]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    clearUserSession();
    setCurrentUser(null);
    setShowProfileModal(false);
    if (isFirebaseConfigured) void signOut(firebaseAuth);
  };

  const handleSelectSlot = (slotItem) => {
    if (!slotItem?.booking && !isValidPhoneNumber(currentUser?.phone)) {
      setPendingBookingSlot(slotItem);
      setRequirePhoneForBooking(true);
      setShowProfileModal(true);
      return;
    }
    if (slotItem?.date) {
      for (let i = 0; i <= 2; i++) {
        if (getFormattedDate(i) === slotItem.date) {
          setSelectedOffset(i);
          break;
        }
      }
    }
    if (slotItem.booking) {
      setActiveSlotForDetails(slotItem);
    } else {
      setActiveSlotForBooking(slotItem);
    }
  };

  const handleConfirmBooking = async (newBookingData) => {
    if (!isValidPhoneNumber(currentUser?.phone)) {
      throw new Error('Add a valid phone number to your profile before booking.');
    }
    try {
      if (isFirebaseConfigured) {
        await createFirestoreBooking(newBookingData);
        setBookings((current) => [newBookingData, ...current]);
        setActiveSlotForBooking(null);
        return;
      }
      const updated = createBooking(newBookingData);
      setBookings(updated);
      setActiveSlotForBooking(null);
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateBooking = async (bookingId, updatedFields) => {
    if (isFirebaseConfigured) {
      const booking = bookings.find((item) => item.id === bookingId);
      if (!booking) throw new Error('This booking is no longer available.');
      await updateFirestoreBooking(bookingId, updatedFields, booking);
      const fresh = { ...booking, ...updatedFields };
      setBookings((current) => current.map((item) => item.id === bookingId ? fresh : item));
      setActiveSlotForDetails((prev) => prev ? { ...prev, booking: fresh } : { booking: fresh });
      return fresh;
    }
    const updated = updateBooking(bookingId, updatedFields);
    setBookings(updated);
    const fresh = updated.find((b) => b.id === bookingId);
    if (fresh) {
      setActiveSlotForDetails((prev) => (prev ? { ...prev, booking: fresh } : { booking: fresh }));
    } else {
      setActiveSlotForDetails(null);
    }
    return updated;
  };

  const handleJoinMatch = async (bookingId) => {
    if (!currentUser) return;
    const playerObj = {
      uid: currentUser.uid || null,
      phone: currentUser.phone,
      name: currentUser.name,
      flatNo: currentUser.flatNo,
      avatar: currentUser.avatar
    };
    if (isFirebaseConfigured) {
      await updateFirestorePlayers(bookingId, playerObj, 'join');
      setActiveSlotForDetails(null);
      return;
    }
    const updated = joinOpenMatch(bookingId, playerObj);
    setBookings(updated);
    setActiveSlotForDetails(null);
  };

  const handleLeaveMatch = async (bookingId) => {
    if (!currentUser) return;
    if (isFirebaseConfigured) {
      await updateFirestorePlayers(bookingId, currentUser, 'leave');
      setActiveSlotForDetails(null);
      return;
    }
    const updated = leaveOpenMatch(bookingId, currentUser.phone);
    setBookings(updated);
    setActiveSlotForDetails(null);
  };

  const handleCancelBooking = async (bookingId) => {
    if (isFirebaseConfigured) {
      await deleteFirestoreBooking(bookingId);
      setActiveSlotForDetails(null);
      setBookings((current) => current.filter((booking) => booking.id !== bookingId));
      return;
    }
    const updated = cancelBooking(bookingId);
    setBookings(updated);
    setActiveSlotForDetails(null);
  };

  const handleResetDemoData = () => {
    if (isFirebaseConfigured) return;
    const fresh = resetDemoData();
    setBookings(fresh);
    alert('Demo slots restored to initial state!');
  };

  return (
    <div className="app-container">
      {!authReady && (
        <div className="auth-loading" role="status" aria-live="polite">
          <span className="auth-loading__icon">🏸</span>
          <strong>SmashCourt</strong>
          <span>Restoring your session…</span>
        </div>
      )}
      {/* AUTH MODAL IF NOT LOGGED IN */}
      {authReady && !currentUser && (
        <AuthModal onLoginSuccess={handleLoginSuccess} />
      )}

      {/* MAIN APP CONTENT */}
      {currentUser && (
        <>
          {/* Header Bar */}
          <Header
            user={currentUser}
            bookings={bookings}
            onOpenProfile={() => setShowProfileModal(true)}
          />

          {/* VIEW SWITCHER TABS (Daily Schedule vs Court Calendar View) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '16px',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <button
              className={`tab-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <ListFilter size={15} /> Daily Schedule
            </button>
            <button
              className={`tab-btn ${viewMode === 'calendar' ? 'active tab-primary' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon size={15} /> Court Calendar
            </button>
          </div>

          {viewMode === 'list' ? (
            <>
              {/* Date Selector */}
              <DateSelector
                selectedOffset={selectedOffset}
                onSelectOffset={setSelectedOffset}
                bookings={bookings}
              />

              {/* Timetable Grid */}
              <TimetableGrid
                selectedOffset={selectedOffset}
                bookings={bookings}
                currentUser={currentUser}
                onSelectSlot={handleSelectSlot}
              />
            </>
          ) : (
            /* Court Calendar View */
            <CalendarView
              bookings={bookings}
              currentUser={currentUser}
              firebaseMode={isFirebaseConfigured}
              onSelectSlot={handleSelectSlot}
            />
          )}

          {/* MODAL 1: Create New Booking / Host Open Game */}
          {activeSlotForBooking && (
            <BookingModal
              slotItem={activeSlotForBooking}
              selectedOffset={selectedOffset}
              currentUser={currentUser}
              onClose={() => setActiveSlotForBooking(null)}
              onConfirmBooking={handleConfirmBooking}
            />
          )}

          {/* MODAL 2: View Slot Details / Join / Edit / WhatsApp Share / Cancel */}
          {activeSlotForDetails && (
            <SlotDetailsModal
              slotItem={activeSlotForDetails}
              selectedOffset={selectedOffset}
              currentUser={currentUser}
              onClose={() => setActiveSlotForDetails(null)}
              onJoinMatch={handleJoinMatch}
              onLeaveMatch={handleLeaveMatch}
              onCancelBooking={handleCancelBooking}
              onUpdateBooking={handleUpdateBooking}
            />
          )}

          {/* MODAL 3: Resident Profile Management */}
          {showProfileModal && (
            <ProfileModal
              currentUser={currentUser}
              onClose={() => { setShowProfileModal(false); setRequirePhoneForBooking(false); setPendingBookingSlot(null); }}
              requirePhone={requirePhoneForBooking}
              onPhoneAdded={() => {
                setShowProfileModal(false);
                setRequirePhoneForBooking(false);
                if (pendingBookingSlot) setActiveSlotForBooking(pendingBookingSlot);
                setPendingBookingSlot(null);
              }}
              onLogout={handleLogout}
              onResetDemoData={handleResetDemoData}
              demoMode={!isFirebaseConfigured}
              onUserUpdate={async (updated) => {
                const savedUser = isFirebaseConfigured ? await saveFirestoreUser(updated.uid, updated) : updated;
                setCurrentUser(savedUser);
                return savedUser;
              }}
            />
          )}
        </>
      )}
      {cloudError && <div role="alert" className="firebase-error-banner">{cloudError}</div>}
    </div>
  );
}
