export const normalizePhoneNumber = (value) => String(value || '').trim();

export const isValidPhoneNumber = (value) => {
  const phone = normalizePhoneNumber(value);
  const digits = phone.replace(/\D/g, '');
  return /^[+]?[-\d\s().]+$/.test(phone) && digits.length >= 8 && digits.length <= 15;
};

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
