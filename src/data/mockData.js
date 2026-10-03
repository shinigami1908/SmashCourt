// Helper to get formatted date string YYYY-MM-DD
export const getFormattedDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Available Emoji Avatars
export const PRESET_AVATARS = ['🏸', '⚡', '🔥', '🏆', '🎯', '👑', '🚀', '⭐', '🐯', '🦅'];

// Helper to get relative date label
export const getDateLabel = (offsetDays) => {
  if (offsetDays === 0) return 'Today';
  if (offsetDays === 1) return 'Tomorrow';
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

// Helper array of 15-minute time options for custom time picker (06:00 AM to 11:00 PM)
export const GENERATE_TIME_OPTIONS = () => {
  const options = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (let min = 0; min < 60; min += 15) {
      if (hour === 23 && min > 30) break;
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const formatted = `${String(displayHour).padStart(2, '0')}:${String(min).padStart(2, '0')} ${period}`;
      options.push(formatted);
    }
  }
  options.push('12:00 AM'); // Midnight is the closing time, not the start of a new day.
  return options;
};

export const GENERATE_START_TIME_OPTIONS = () => GENERATE_TIME_OPTIONS().filter((time) => time !== '12:00 AM');

// Initial Demo Bookings (Custom Start/End Times)
export const INITIAL_BOOKINGS = [
  // Today 07:00 AM - 08:00 AM (Private)
  {
    id: `bkg_${getFormattedDate(0)}_0700_0800`,
    date: getFormattedDate(0),
    startTime: '07:00 AM',
    endTime: '08:00 AM',
    type: 'private',
    bookedBy: {
      phone: '9876543210',
      name: 'Rahul Verma',
      flatNo: 'B-402',
      avatar: '⚡'
    },
    note: 'Private match with B-block friends',
    createdAt: new Date().toISOString()
  },
  // Today 06:30 PM - 07:30 PM (Open Match / Group Poll)
  {
    id: `bkg_${getFormattedDate(0)}_1830_1930`,
    date: getFormattedDate(0),
    startTime: '06:30 PM',
    endTime: '07:30 PM',
    type: 'open',
    bookedBy: {
      phone: '9876543211',
      name: 'Ananya Sharma',
      flatNo: 'A-102',
      avatar: '🔥'
    },
    matchInfo: {
      matchType: 'Doubles',
      skillLevel: 'Intermediate',
      maxPlayers: 4, // 4 players limit
      note: 'Looking for 2 players for intense doubles game!'
    },
    players: [
      { phone: '9876543211', name: 'Ananya Sharma', flatNo: 'A-102', avatar: '🔥', role: 'Host' },
      { phone: '9876543212', name: 'Vikram Singh', flatNo: 'C-701', avatar: '🎯', role: 'Joined' }
    ],
    createdAt: new Date().toISOString()
  },
  // Today 08:00 PM - 09:00 PM (Open Match - Unlimited Players)
  {
    id: `bkg_${getFormattedDate(0)}_2000_2100`,
    date: getFormattedDate(0),
    startTime: '08:00 PM',
    endTime: '09:00 PM',
    type: 'open',
    bookedBy: {
      phone: '9876543213',
      name: 'Amit Patel',
      flatNo: 'D-304',
      avatar: '🏆'
    },
    matchInfo: {
      matchType: 'Doubles',
      skillLevel: 'All Welcome',
      maxPlayers: 'unlimited', // Any number of players allowed!
      note: 'Casual community game, anyone welcome to drop by!'
    },
    players: [
      { phone: '9876543213', name: 'Amit Patel', flatNo: 'D-304', avatar: '🏆', role: 'Host' },
      { phone: '9876543214', name: 'Pooja Iyer', flatNo: 'B-1104', avatar: '⭐', role: 'Joined' },
      { phone: '9876543215', name: 'Siddharth Rao', flatNo: 'A-901', avatar: '🚀', role: 'Joined' },
      { phone: '9876543216', name: 'Neha Gupta', flatNo: 'C-202', avatar: '🦅', role: 'Joined' },
      { phone: '9876543217', name: 'Karan Mehra', flatNo: 'D-801', avatar: '🎯', role: 'Joined' }
    ],
    createdAt: new Date().toISOString()
  },
  // Tomorrow 07:00 PM - 08:00 PM (Private)
  {
    id: `bkg_${getFormattedDate(1)}_1900_2000`,
    date: getFormattedDate(1),
    startTime: '07:00 PM',
    endTime: '08:00 PM',
    type: 'private',
    bookedBy: {
      phone: '9876543212',
      name: 'Vikram Singh',
      flatNo: 'C-701',
      avatar: '🎯'
    },
    note: 'Singles practice session',
    createdAt: new Date().toISOString()
  }
];
