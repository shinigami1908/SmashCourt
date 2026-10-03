import React from 'react';
import { CalendarDays, Flame, Lock, Users } from 'lucide-react';
import { getFormattedDate } from '../data/mockData';
import { getEndMinutes, getStartMinutes, isWeekday } from '../utils/storage';

const DAY_START = 6 * 60;
const DAY_END = 24 * 60;
const HOUR_HEIGHT = 56;
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
const GRID_HEIGHT = (DAY_END - DAY_START) * MINUTE_HEIGHT;

const getDay = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return {
    date: getFormattedDate(offset),
    weekday: date.toLocaleDateString(undefined, { weekday: 'long' }),
    shortWeekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
    monthDay: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    offset,
  };
};

const timeLabel = (hour) => {
  const normalized = hour % 24;
  const h = normalized % 12 || 12;
  return `${h} ${normalized >= 12 ? 'PM' : 'AM'}`;
};

export default function CalendarView({ bookings, currentUser, onSelectSlot }) {
  const days = [0, 1, 2].map(getDay);
  const now = new Date();
  const today = getFormattedDate(0);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const hours = Array.from({ length: 18 }, (_, index) => index + 6);

  const selectEmptyTime = (event, day) => {
    if (event.target.closest('[data-calendar-event]')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const minuteIntoDay = Math.floor(((event.clientY - bounds.top) / bounds.height) * (DAY_END - DAY_START) / 15) * 15 + DAY_START;
    if (minuteIntoDay >= DAY_END || (day.date === today && minuteIntoDay <= currentMinutes)) return;
    const hour24 = Math.floor(minuteIntoDay / 60);
    const minutes = minuteIntoDay % 60;
    const hour12 = hour24 % 12 || 12;
    const startTime = `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${hour24 >= 12 ? 'PM' : 'AM'}`;
    const endMinute = Math.min(minuteIntoDay + 60, DAY_END);
    const endHour24 = Math.floor(endMinute / 60);
    const endTime = endMinute === DAY_END
      ? '12:00 AM'
      : `${String(endHour24 % 12 || 12).padStart(2, '0')}:${String(endMinute % 60).padStart(2, '0')} ${endHour24 >= 12 ? 'PM' : 'AM'}`;
    onSelectSlot({ date: day.date, startTime, endTime, booking: null });
  };

  return (
    <section className="glass-panel outlook-calendar">
      <header className="outlook-calendar__header">
        <div>
          <h2><CalendarDays size={21} /> Court calendar</h2>
          <p>Three-day schedule · 6:00 AM–12:00 AM · Select an open time to book</p>
        </div>
        <div className="outlook-calendar__legend">
          <span><i className="legend-private" /> Private</span>
          <span><i className="legend-open" /> Open match</span>
          <span><i className="legend-mine" /> Your booking</span>
          <span><i className="legend-classes" /> Children’s classes</span>
        </div>
      </header>

      <div className="outlook-calendar__scroll">
        <div className="outlook-calendar__canvas">
          <div className="outlook-calendar__corner">India Standard Time</div>
          {days.map((day) => {
            const dayBookings = bookings.filter((booking) => booking.date === day.date);
            return (
              <div className={`outlook-calendar__day-heading ${day.date === today ? 'is-today' : ''}`} key={day.date}>
                <span>{day.shortWeekday}</span>
                <strong>{day.monthDay}</strong>
                <small>{dayBookings.length} {dayBookings.length === 1 ? 'booking' : 'bookings'}</small>
              </div>
            );
          })}

          <div className="outlook-calendar__time-axis" style={{ height: GRID_HEIGHT }}>
            {hours.map((hour) => (
              <span key={hour} style={{ top: (hour * 60 - DAY_START) * MINUTE_HEIGHT }}>{timeLabel(hour)}</span>
            ))}
            <span className="outlook-calendar__midnight" style={{ top: GRID_HEIGHT }}>12 AM</span>
          </div>

          {days.map((day) => {
            const dayBookings = bookings.filter((booking) => booking.date === day.date);
            const pastHeight = day.date === today
              ? Math.max(0, Math.min(GRID_HEIGHT, (currentMinutes - DAY_START) * MINUTE_HEIGHT))
              : day.date < today ? GRID_HEIGHT : 0;
            return (
              <div
                className={`outlook-calendar__day ${day.date === today ? 'is-today' : ''}`}
                key={day.date}
                style={{ height: GRID_HEIGHT }}
                onClick={(event) => selectEmptyTime(event, day)}
                role="presentation"
              >
                {hours.map((hour) => (
                  <React.Fragment key={hour}>
                    <div className="outlook-calendar__hour-line" style={{ top: (hour * 60 - DAY_START) * MINUTE_HEIGHT }} />
                    <div className="outlook-calendar__half-line" style={{ top: (hour * 60 + 30 - DAY_START) * MINUTE_HEIGHT }} />
                  </React.Fragment>
                ))}
                {pastHeight > 0 && <div className="outlook-calendar__past" style={{ height: pastHeight }} />}
                {isWeekday(day.date) && (
                  <div
                    className="outlook-calendar__event is-class"
                    data-calendar-event
                    role="note"
                    aria-label="Children’s classes, court unavailable, 4:30 PM to 6:30 PM"
                    title="Children’s classes · Court unavailable · 4:30 PM–6:30 PM"
                    style={{ top: (16 * 60 + 30 - DAY_START) * MINUTE_HEIGHT, height: 120 * MINUTE_HEIGHT }}
                  >
                    <strong><Users size={13} />4:30–6:30 PM</strong>
                    <span>Children’s classes · Court unavailable</span>
                  </div>
                )}
                {day.date === today && currentMinutes >= DAY_START && currentMinutes < DAY_END && (
                  <div className="outlook-calendar__now" style={{ top: (currentMinutes - DAY_START) * MINUTE_HEIGHT }}><i /></div>
                )}
                {dayBookings.map((booking) => {
                  const start = getStartMinutes(booking.startTime);
                  const end = getEndMinutes(booking.endTime);
                  const top = Math.max(0, (start - DAY_START) * MINUTE_HEIGHT);
                  const height = Math.max(24, (Math.min(DAY_END, end) - Math.max(DAY_START, start)) * MINUTE_HEIGHT);
                  const isOpen = booking.type === 'open';
                  const isMine = booking.bookedBy?.phone === currentUser?.phone || booking.players?.some((player) => player.phone === currentUser?.phone);
                  return (
                    <button
                      type="button"
                      data-calendar-event
                      key={booking.id}
                      className={`outlook-calendar__event ${isOpen ? 'is-open' : 'is-private'} ${isMine ? 'is-mine' : ''}`}
                      style={{ top, height }}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectSlot({ date: day.date, booking });
                      }}
                      title={`${booking.startTime}–${booking.endTime} · ${booking.bookedBy?.name || 'Resident'}`}
                    >
                      <strong>{isOpen ? <Flame size={13} /> : <Lock size={13} />}{booking.startTime}–{booking.endTime}</strong>
                      <span>{isOpen ? `${booking.matchInfo?.matchType || 'Open match'} · ${booking.bookedBy?.name || 'Host'}` : `${booking.bookedBy?.name || 'Resident'} · Private`}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
