function SlotSelector({ slots, selectedSlot, onSelectSlot, disabledSlots = [] }) {
  if (!slots || slots.length === 0) {
    return <p className="text-sm text-gray-500">No available slots for this date.</p>;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {slots.map((slot) => {
        const isSelected = slot === selectedSlot;
        const isDisabled = disabledSlots.includes(slot);

        return (
          <button
            key={slot}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelectSlot(slot)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              isDisabled
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : isSelected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
            }`}
          >
            {slot}
          </button>
        );
      })}
    </div>
  );
}

export default SlotSelector;
