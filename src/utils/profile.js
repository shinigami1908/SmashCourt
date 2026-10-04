export const normalizePhoneNumber = (value) => String(value || '').trim();

export const isValidPhoneNumber = (value) => {
  const phone = normalizePhoneNumber(value);
  const digits = phone.replace(/\D/g, '');
  return /^[+]?[-\d\s().]+$/.test(phone) && digits.length >= 8 && digits.length <= 15;
};

export const updateBookingPhoneReferences = (bookings, previousUser, nextUser) => {
  const belongsToUser = (entry) => (
    (nextUser?.uid && entry?.uid === nextUser.uid)
    || (previousUser?.phone && entry?.phone === previousUser.phone)
  );

  return bookings.map((booking) => {
    let changed = false;
    let bookedBy = booking.bookedBy;
    if (belongsToUser(bookedBy) && (bookedBy.phone !== nextUser.phone || bookedBy.playerLevel !== nextUser.playerLevel)) {
      bookedBy = { ...bookedBy, phone: nextUser.phone, playerLevel: nextUser.playerLevel || 'Intermediate' };
      changed = true;
    }
    let players = booking.players;
    if (Array.isArray(players)) {
      players = players.map((player) => {
        if (!belongsToUser(player) || (player.phone === nextUser.phone && player.playerLevel === (nextUser.playerLevel || 'Intermediate'))) return player;
        changed = true;
        return { ...player, phone: nextUser.phone, playerLevel: nextUser.playerLevel || 'Intermediate' };
      });
    }
    return changed ? { ...booking, bookedBy, players } : booking;
  });
};
