import {
  collection, doc, getDoc, getDocs, onSnapshot, query, runTransaction, setDoc, where, writeBatch
} from 'firebase/firestore';
import { firestore } from '../firebase';
import { getEndMinutes, getStartMinutes, validateBookingRange } from './storage';

const bookingsRef = () => collection(firestore, 'bookings');
const toBooking = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });

export const subscribeToBookings = (onBookings, onError) => onSnapshot(
  bookingsRef(),
  (snapshot) => onBookings(snapshot.docs.map(toBooking)),
  onError
);

const getDateBookings = async (date) => {
  const snapshot = await getDocs(query(bookingsRef(), where('date', '==', date)));
  return snapshot.docs.map(toBooking);
};

const assertNoOverlap = (bookings, startTime, endTime, excludeId) => {
  const start = getStartMinutes(startTime);
  const end = getEndMinutes(endTime);
  const conflict = bookings.some((booking) => booking.id !== excludeId &&
    start < getEndMinutes(booking.endTime) && end > getStartMinutes(booking.startTime));
  if (conflict) throw new Error('The court is already booked during that time. Please choose another time.');
};

const slotReferences = (date, startTime, endTime) => {
  const start = getStartMinutes(startTime);
  const end = getEndMinutes(endTime);
  const refs = [];
  for (let minute = Math.floor(start / 15) * 15; minute < end; minute += 15) {
    refs.push(doc(firestore, 'courtSlots', `${date}_${minute}`));
  }
  return refs;
};

export const createFirestoreBooking = async (booking) => {
  validateBookingRange(booking.date, booking.startTime, booking.endTime);
  const ref = doc(bookingsRef(), booking.id);
  const existing = await getDateBookings(booking.date);
  assertNoOverlap(existing, booking.startTime, booking.endTime);
  const slots = slotReferences(booking.date, booking.startTime, booking.endTime);
  await runTransaction(firestore, async (transaction) => {
    const bookingSnapshot = await transaction.get(ref);
    if (bookingSnapshot.exists()) throw new Error('This booking already exists. Please retry.');
    const slotSnapshots = await Promise.all(slots.map((slot) => transaction.get(slot)));
    const conflictingIds = [...new Set(slotSnapshots
      .filter((snapshot) => snapshot.exists() && snapshot.data().bookingId !== booking.id)
      .map((snapshot) => snapshot.data().bookingId)
      .filter(Boolean))];
    const conflictingBookings = await Promise.all(conflictingIds.map((id) => transaction.get(doc(bookingsRef(), id))));
    const conflictingBookingData = new Map(conflictingIds.map((id, index) => [id, conflictingBookings[index].exists() ? conflictingBookings[index].data() : null]));
    const hasLiveConflict = slotSnapshots.some((snapshot) => {
      if (!snapshot.exists()) return false;
      const slotBookingId = snapshot.data().bookingId;
      if (!slotBookingId || slotBookingId === booking.id) return false;
      const existingBooking = conflictingBookingData.get(slotBookingId);
      if (!existingBooking || existingBooking.date !== booking.date) return false;
      return getStartMinutes(booking.startTime) < getEndMinutes(existingBooking.endTime)
        && getEndMinutes(booking.endTime) > getStartMinutes(existingBooking.startTime);
    });
    if (hasLiveConflict) {
      throw new Error('The court is already booked during that time. Please choose another time.');
    }
    slots.forEach((slot) => transaction.set(slot, { bookingId: booking.id, date: booking.date }));
    transaction.set(ref, booking);
  });
};

export const updateFirestoreBooking = async (bookingId, fields, currentBooking) => {
  const nextStart = fields.startTime || currentBooking.startTime;
  const nextEnd = fields.endTime || currentBooking.endTime;
  const timeChanged = nextStart !== currentBooking.startTime || nextEnd !== currentBooking.endTime;
  if (timeChanged) validateBookingRange(currentBooking.date, nextStart, nextEnd, nextStart !== currentBooking.startTime);
  const currentDayBookings = await getDateBookings(currentBooking.date);
  assertNoOverlap(currentDayBookings, nextStart, nextEnd, bookingId);
  const oldSlots = slotReferences(currentBooking.date, currentBooking.startTime, currentBooking.endTime);
  const nextSlots = slotReferences(currentBooking.date, nextStart, nextEnd);
  const slotByPath = new Map([...oldSlots, ...nextSlots].map((slot) => [slot.path, slot]));
  const allSlots = [...slotByPath.values()];
  const nextPaths = new Set(nextSlots.map((slot) => slot.path));
  await runTransaction(firestore, async (transaction) => {
    const bookingRef = doc(bookingsRef(), bookingId);
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!bookingSnapshot.exists()) throw new Error('This booking no longer exists.');
    const slotSnapshots = await Promise.all(allSlots.map((slot) => transaction.get(slot)));
    for (let index = 0; index < allSlots.length; index += 1) {
      const snapshot = slotSnapshots[index];
      const slot = allSlots[index];
      if (nextPaths.has(slot.path) && snapshot.exists() && snapshot.data().bookingId !== bookingId) {
        throw new Error('The court is already booked during that time. Please choose another time.');
      }
    }
    allSlots.forEach((slot, index) => {
      const snapshot = slotSnapshots[index];
      if (!nextPaths.has(slot.path) && snapshot.exists() && snapshot.data().bookingId === bookingId) transaction.delete(slot);
      else if (nextPaths.has(slot.path)) transaction.set(slot, { bookingId, date: currentBooking.date });
    });
    transaction.update(bookingRef, fields);
  });
};

export const saveFirestoreUser = async (uid, profile) => {
  const savedProfile = { ...profile, uid };
  await setDoc(doc(firestore, 'users', uid), savedProfile, { merge: true });
  return savedProfile;
};
export const getFirestoreUser = async (uid) => {
  const result = await getDoc(doc(firestore, 'users', uid));
  return result.exists() ? result.data() : null;
};

export const updateFirestoreUserPhoneInBookings = async (uid, oldPhone, newPhone) => {
  const [hosted, joined] = await Promise.all([
    getDocs(query(bookingsRef(), where('bookedBy.uid', '==', uid))),
    getDocs(query(bookingsRef(), where('playerUids', 'array-contains', uid)))
  ]);
  const snapshots = new Map([...hosted.docs, ...joined.docs].map((snapshot) => [snapshot.id, snapshot]));
  const updates = [];
  snapshots.forEach((snapshot) => {
    const booking = snapshot.data();
    const fields = {};
    if (booking.bookedBy?.uid === uid && booking.bookedBy.phone !== newPhone) {
      fields.bookedBy = { ...booking.bookedBy, phone: newPhone };
    }
    if (Array.isArray(booking.players)) {
      const players = booking.players.map((player) => (
        (player.uid === uid || (!player.uid && oldPhone && player.phone === oldPhone))
          ? { ...player, phone: newPhone }
          : player
      ));
      if (players.some((player, index) => player.phone !== booking.players[index].phone)) fields.players = players;
    }
    if (Object.keys(fields).length) updates.push({ ref: snapshot.ref, fields });
  });

  for (let index = 0; index < updates.length; index += 450) {
    const batch = writeBatch(firestore);
    updates.slice(index, index + 450).forEach(({ ref, fields }) => batch.update(ref, fields));
    await batch.commit();
  }
};

export const deleteFirestoreBooking = async (bookingId) => {
  const bookingRef = doc(bookingsRef(), bookingId);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(bookingRef);
    if (!snapshot.exists()) return;
    const booking = toBooking(snapshot);
    const slots = slotReferences(booking.date, booking.startTime, booking.endTime);
    const slotSnapshots = await Promise.all(slots.map((slot) => transaction.get(slot)));
    slots.forEach((slot, index) => {
      if (slotSnapshots[index].exists() && slotSnapshots[index].data().bookingId === bookingId) transaction.delete(slot);
    });
    transaction.delete(bookingRef);
  });
};

export const updateFirestorePlayers = (bookingId, player, action) => updateFirestoreMatchPlayers(bookingId, (booking) => {
  const players = booking.players || [];
  if (action === 'join') {
    if (players.some((entry) => entry.phone === player.phone)) return {};
    const maxPlayers = booking.matchInfo?.maxPlayers;
    if (maxPlayers !== 'unlimited' && maxPlayers && players.length >= Number(maxPlayers)) {
      throw new Error('This match is already full.');
    }
    return {
      players: [...players, { ...player, role: 'Joined' }],
      playerUids: [...new Set([...(booking.playerUids || []), player.uid])].filter(Boolean)
    };
  }
  const remaining = players.filter((entry) => entry.phone !== player.phone);
  if (booking.bookedBy?.phone === player.phone) {
    if (remaining.length === 0) return { __delete: true };
    remaining[0] = { ...remaining[0], role: 'Host' };
    const nextHost = remaining[0];
    return {
      bookedBy: { uid: nextHost.uid, phone: nextHost.phone, name: nextHost.name, flatNo: nextHost.flatNo, avatar: nextHost.avatar },
      players: remaining,
      playerUids: remaining.map((entry) => entry.uid).filter(Boolean)
    };
  }
  return { players: remaining, playerUids: (booking.playerUids || []).filter((uid) => uid !== player.uid) };
});

export const updateFirestoreMatchPlayers = async (bookingId, transform) => {
  const bookingRef = doc(bookingsRef(), bookingId);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(bookingRef);
    if (!snapshot.exists()) throw new Error('This booking no longer exists.');
    const booking = toBooking(snapshot);
    const updates = transform(booking);
    if (updates.__delete) {
      const slots = slotReferences(booking.date, booking.startTime, booking.endTime);
      const slotSnapshots = await Promise.all(slots.map((slot) => transaction.get(slot)));
      slots.forEach((slot, index) => {
        if (slotSnapshots[index].exists() && slotSnapshots[index].data().bookingId === bookingId) transaction.delete(slot);
      });
      transaction.delete(bookingRef);
    }
    else if (Object.keys(updates).length) transaction.update(bookingRef, updates);
  });
};
