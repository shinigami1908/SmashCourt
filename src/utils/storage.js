import { INITIAL_BOOKINGS } from '../data/mockData';

const USER_SESSION_KEY = 'smashcourt_user_session';
const BOOKINGS_KEY = 'smashcourt_bookings_data';
const REGISTERED_USERS_KEY = 'smashcourt_registered_users';

const readStorageValue = (key) => localStorage.getItem(key);

// User Session Management
export const getUserSession = () => {
  try {
    const data = readStorageValue(USER_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to get user session', e);
    return null;
  }
};

export const setUserSession = (user) => {
  try {
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save user session', e);
  }
};

export const clearUserSession = () => {
  try {
    localStorage.removeItem(USER_SESSION_KEY);
  } catch (e) {
    console.error('Failed to clear user session', e);
  }
};

// Registered Users Database
export const getRegisteredUser = (phone) => {
  try {
    const usersStr = readStorageValue(REGISTERED_USERS_KEY);
    const users = usersStr ? JSON.parse(usersStr) : {};
    return users[phone] || null;
  } catch (e) {
    return null;
  }
};

export const saveRegisteredUser = (user) => {
  try {
    const usersStr = readStorageValue(REGISTERED_USERS_KEY);
    const users = usersStr ? JSON.parse(usersStr) : {};
    users[user.phone] = user;
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to register user', e);
  }
};

// Convert time to total minutes from midnight
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }

  return 0;
};

// A 12:00 AM end time means midnight at the end of the selected booking date.
export const getStartMinutes = (timeStr) => parseTimeToMinutes(timeStr);
export const getEndMinutes = (timeStr) => timeStr === '12:00 AM' ? 24 * 60 : parseTimeToMinutes(timeStr);
export const isBookingInPast = (booking, now = new Date()) => {
  if (booking.date < `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`) return true;
  if (booking.date !== `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`) return false;
  return getEndMinutes(booking.endTime) <= now.getHours() * 60 + now.getMinutes();
};
export const isBookingHappeningNow = (booking, now = new Date()) => {
  if (booking.date !== `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  return getStartMinutes(booking.startTime) <= current && getEndMinutes(booking.endTime) > current;
};

export const validateBookingRange = (date, startTime, endTime, requireFuture = true) => {
  const start = getStartMinutes(startTime);
  const end = getEndMinutes(endTime);
  if (start < 6 * 60 || start >= 24 * 60 || end <= start || end > 24 * 60) {
    throw new Error('Court bookings must be between 6:00 AM and 12:00 AM.');
  }
  if (end - start < 15) throw new Error('Bookings must be at least 15 minutes long.');
  if (end - start > 120) throw new Error('Bookings cannot be longer than 2 hours.');
  if (overlapsChildrenClasses(date, start, end)) {
    throw new Error('The court is reserved for children’s classes on weekdays from 4:30 PM to 6:30 PM.');
  }
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (requireFuture && (date < today || (date === today && start <= now.getHours() * 60 + now.getMinutes()))) {
    throw new Error('Choose a start time that is still in the future.');
  }
};

// Check if a user already has an active booking on a given date
export const hasUserBookedOnDate = (userPhone, dateStr, excludeBookingId = null) => {
  const current = getBookings();
  return current.some(b =>
    b.date === dateStr &&
    b.bookedBy?.phone === userPhone &&
    b.id !== excludeBookingId
  );
};

export const isWeekday = (dateStr) => {
  const weekday = new Date(`${dateStr}T12:00:00`).getDay();
  return weekday >= 1 && weekday <= 5;
};

export const overlapsChildrenClasses = (dateStr, startMinutes, endMinutes) =>
  isWeekday(dateStr) && startMinutes < 18 * 60 + 30 && endMinutes > 16 * 60 + 30;

// Check if new timing overlaps with any existing booking on the same date
export const isTimingOverlapping = (dateStr, startTime, endTime, excludeBookingId = null) => {
  const current = getBookings();
  const newStart = parseTimeToMinutes(startTime);
  const newEnd = getEndMinutes(endTime);

  return current.some(b => {
    if (b.date !== dateStr) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;

    const bStart = parseTimeToMinutes(b.startTime);
    const bEnd = getEndMinutes(b.endTime);

    return newStart < bEnd && newEnd > bStart;
  });
};

// Bookings Storage Management
export const getBookings = () => {
  try {
    const data = readStorageValue(BOOKINGS_KEY);
    if (!data) {
      localStorage.setItem(BOOKINGS_KEY, JSON.stringify(INITIAL_BOOKINGS));
      return INITIAL_BOOKINGS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse bookings', e);
    return INITIAL_BOOKINGS;
  }
};

export const saveBookings = (bookings) => {
  try {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  } catch (e) {
    console.error('Failed to save bookings', e);
  }
};

export const createBooking = (newBooking) => {
  const current = getBookings();
  validateBookingRange(newBooking.date, newBooking.startTime, newBooking.endTime);
  if (current.some((b) => b.date === newBooking.date && getStartMinutes(newBooking.startTime) < getEndMinutes(b.endTime) && getEndMinutes(newBooking.endTime) > getStartMinutes(b.startTime))) {
    throw new Error('The court is already booked during that time. Please choose another time.');
  }
  const updated = [newBooking, ...current];
  saveBookings(updated);
  return updated;
};

export const updateBooking = (bookingId, updatedFields) => {
  const current = getBookings();
  const existing = current.find((booking) => booking.id === bookingId);
  if (existing) {
    const startTime = updatedFields.startTime || existing.startTime;
    const endTime = updatedFields.endTime || existing.endTime;
    const timeChanged = startTime !== existing.startTime || endTime !== existing.endTime;
    if (timeChanged) {
    validateBookingRange(existing.date, startTime, endTime, startTime !== existing.startTime);
    if (current.some((b) => b.id !== bookingId && b.date === existing.date && getStartMinutes(startTime) < getEndMinutes(b.endTime) && getEndMinutes(endTime) > getStartMinutes(b.startTime))) {
      throw new Error('The court is already booked during that time. Please choose another time.');
    }
    }
  }
  const updated = current.map(booking => {
    if (booking.id === bookingId) {
      return {
        ...booking,
        ...updatedFields
      };
    }
    return booking;
  });
  saveBookings(updated);
  return updated;
};

export const cancelBooking = (bookingId) => {
  const current = getBookings();
  const updated = current.filter(b => b.id !== bookingId);
  saveBookings(updated);
  return updated;
};

export const joinOpenMatch = (bookingId, player) => {
  const current = getBookings();
  const updated = current.map(booking => {
    if (booking.id === bookingId && booking.type === 'open') {
      const alreadyJoined = booking.players.some(p => p.phone === player.phone);
      if (alreadyJoined) return booking;

      const maxLimit = booking.matchInfo?.maxPlayers;
      if (maxLimit && maxLimit !== 'unlimited' && booking.players.length >= Number(maxLimit)) {
        return booking;
      }

      return {
        ...booking,
        players: [...booking.players, { ...player, role: 'Joined' }]
      };
    }
    return booking;
  });
  saveBookings(updated);
  return updated;
};

export const leaveOpenMatch = (bookingId, userPhone) => {
  const current = getBookings();
  const updated = current.map(booking => {
    if (booking.id === bookingId && booking.type === 'open') {
      const isHost = booking.bookedBy?.phone === userPhone;
      const remainingPlayers = booking.players.filter(p => p.phone !== userPhone);

      if (isHost && remainingPlayers.length === 0) {
        return null;
      }

      let newBookedBy = booking.bookedBy;
      if (isHost && remainingPlayers.length > 0) {
        newBookedBy = {
          phone: remainingPlayers[0].phone,
          name: remainingPlayers[0].name,
          flatNo: remainingPlayers[0].flatNo,
          avatar: remainingPlayers[0].avatar
        };
        remainingPlayers[0].role = 'Host';
      }

      return {
        ...booking,
        bookedBy: newBookedBy,
        players: remainingPlayers
      };
    }
    return booking;
  }).filter(Boolean);

  saveBookings(updated);
  return updated;
};

export const resetDemoData = () => {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(INITIAL_BOOKINGS));
  return INITIAL_BOOKINGS;
};
