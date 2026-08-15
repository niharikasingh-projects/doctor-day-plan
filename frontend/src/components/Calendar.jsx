import { useMemo } from 'react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toDateKey = (year, month, day) => {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};

function Calendar({ year, month, availability, isLoading, selectedDate, onSelectDate, onPrevMonth, onNextMonth }) {
  const todayKey = useMemo(() => {
    const now = new Date();
    return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onPrevMonth}
          className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100"
          aria-label="Previous month"
        >
          &lsaquo;
        </button>
        <span className="text-sm font-semibold text-gray-900">{monthLabel}</span>
        <button
          type="button"
          onClick={onNextMonth}
          className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100"
          aria-label="Next month"
        >
          &rsaquo;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="text-center text-xs font-medium text-gray-400 py-1">
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} />;
          }

          const dateKey = toDateKey(year, month, day);
          const isPast = dateKey < todayKey;
          const isAvailable = availability[dateKey];
          const isSelected = dateKey === selectedDate;
          const isDisabled = isPast || isAvailable === false || isLoading;

          let stateClasses = 'text-gray-300';
          if (isPast) {
            stateClasses = 'text-gray-300 cursor-not-allowed';
          } else if (isLoading) {
            stateClasses = 'text-gray-400 cursor-wait';
          } else if (isAvailable === true) {
            stateClasses = 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer';
          } else if (isAvailable === false) {
            stateClasses = 'bg-red-50 text-red-300 cursor-not-allowed';
          } else {
            stateClasses = 'text-gray-500 hover:bg-gray-100 cursor-pointer';
          }

          return (
            <button
              key={dateKey}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectDate(dateKey)}
              aria-label={`${new Date(year, month, day).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })} - ${isPast ? 'past date' : isAvailable === true ? 'available' : 'unavailable'}`}
              aria-pressed={isSelected}
              className={`aspect-square rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${stateClasses} ${
                isSelected ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-200 inline-block" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-100 inline-block" /> Unavailable
        </span>
      </div>
    </div>
  );
}

export default Calendar;
