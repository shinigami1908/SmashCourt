export const normalizePhoneNumber = (value) => String(value || '').trim();

export const isValidPhoneNumber = (value) => /^\d{10}$/.test(normalizePhoneNumber(value));

export const isValidFullName = (value) => /^[\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+)*$/u.test(String(value || '').trim());

export const updateBookingResidentProfiles = (bookings, previousUser, nextUser) => {
  const latestProfile = {
    name: nextUser?.name || '',
    flatNo: nextUser?.flatNo || '',
    phone: nextUser?.phone || '',
    avatar: nextUser?.avatar || '',
    playerLevel: nextUser?.playerLevel || 'Intermediate'
  };
  const belongsToUser = (entry) => (
    (nextUser?.uid && entry?.uid === nextUser.uid)
    || (!entry?.uid && previousUser?.phone && entry?.phone === previousUser.phone)
  );
  const withLatestProfile = (entry) => ({ ...entry, ...latestProfile });
  const profileIsCurrent = (entry) => Object.entries(latestProfile).every(([key, value]) => entry?.[key] === value);

  return bookings.map((booking) => {
    let changed = false;
    let bookedBy = booking.bookedBy;
    if (belongsToUser(bookedBy) && !profileIsCurrent(bookedBy)) {
      bookedBy = withLatestProfile(bookedBy);
      changed = true;
    }
    let players = booking.players;
    if (Array.isArray(players)) {
      players = players.map((player) => {
        if (!belongsToUser(player) || profileIsCurrent(player)) return player;
        changed = true;
        return withLatestProfile(player);
      });
    }
    return changed ? { ...booking, bookedBy, players } : booking;
  });
};
