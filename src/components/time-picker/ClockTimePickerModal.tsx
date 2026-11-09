import React, { useState, useEffect } from 'react';
import { X, Clock, Check } from 'lucide-react';
import { backButtonService } from '@/services/backButtonService';

interface ClockTimePickerModalProps {
  isOpen: boolean;
  title?: string;
  initialTime?: string; // "05:00 AM" or "14:30"
  onClose: () => void;
  onSelectTime: (time12: string, time24: string) => void;
}

export const ClockTimePickerModal: React.FC<ClockTimePickerModalProps> = ({
  isOpen,
  title = 'Select Time',
  initialTime = '06:00 AM',
  onClose,
  onSelectTime,
}) => {
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const [selectedHour, setSelectedHour] = useState<number>(6); // 1-12
  const [selectedMinute, setSelectedMinute] = useState<number>(0); // 0-59
  const [isAm, setIsAm] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;
    const unregister = backButtonService.registerModal(() => {
      onClose();
      return true;
    });
    return unregister;
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Parse initial time
    if (initialTime) {
      const match = initialTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const period = match[3] ? match[3].toUpperCase() : null;

        if (period) {
          setIsAm(period === 'AM');
          setSelectedHour(h === 0 ? 12 : h > 12 ? h - 12 : h);
        } else {
          // 24h format
          setIsAm(h < 12);
          const h12 = h % 12;
          setSelectedHour(h12 === 0 ? 12 : h12);
        }
        setSelectedMinute(isNaN(m) ? 0 : m);
      }
    }
    setMode('hours');
  }, [initialTime, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const h24 = isAm ? (selectedHour === 12 ? 0 : selectedHour) : (selectedHour === 12 ? 12 : selectedHour + 12);
    const mStr = selectedMinute.toString().padStart(2, '0');
    const h24Str = h24.toString().padStart(2, '0');
    const h12Str = selectedHour.toString().padStart(2, '0');
    const period = isAm ? 'AM' : 'PM';

    const formatted12 = `${h12Str}:${mStr} ${period}`;
    const formatted24 = `${h24Str}:${mStr}`;

    onSelectTime(formatted12, formatted24);
    onClose();
  };

  // Clock calculations
  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const currentAngle = mode === 'hours'
    ? (selectedHour % 12) * 30
    : selectedMinute * 6;

  const radius = 95; // px from center
  const centerX = 120;
  const centerY = 120;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xs bg-[#181830] border border-white/10 rounded-3xl p-5 shadow-2xl z-10 animate-in zoom-in-95 duration-150 text-white select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-brand-purple/20 text-brand-accent">
              <Clock size={16} />
            </div>
            <h3 className="font-semibold text-sm text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Digital display & AM/PM Toggle */}
        <div className="flex items-center justify-between px-2 mb-4">
          <div className="flex items-baseline space-x-1">
            <button
              type="button"
              onClick={() => setMode('hours')}
              className={`text-3xl font-extrabold transition-all px-2 py-0.5 rounded-xl ${
                mode === 'hours'
                  ? 'text-white bg-brand-purple/30 border border-brand-accent'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              {selectedHour.toString().padStart(2, '0')}
            </button>
            <span className="text-2xl font-bold text-text-muted">:</span>
            <button
              type="button"
              onClick={() => setMode('minutes')}
              className={`text-3xl font-extrabold transition-all px-2 py-0.5 rounded-xl ${
                mode === 'minutes'
                  ? 'text-white bg-brand-purple/30 border border-brand-accent'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              {selectedMinute.toString().padStart(2, '0')}
            </button>
          </div>

          <div className="flex flex-col bg-[#111122] rounded-xl p-1 border border-white/10 space-y-1">
            <button
              type="button"
              onClick={() => setIsAm(true)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                isAm
                  ? 'bg-purple-gradient text-white shadow-glow-purple-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setIsAm(false)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                !isAm
                  ? 'bg-purple-gradient text-white shadow-glow-purple-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              PM
            </button>
          </div>
        </div>

        {/* Analog Clock Dial */}
        <div className="relative w-[240px] h-[240px] mx-auto bg-[#111122] rounded-full border border-white/10 p-2 shadow-inner">
          {/* Dial Center Dot */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-brand-accent rounded-full -translate-x-1/2 -translate-y-1/2 z-20 shadow-glow-purple-sm" />

          {/* Clock Hand */}
          <div
            className="absolute top-1/2 left-1/2 h-[82px] w-[2px] bg-brand-accent origin-bottom -translate-x-1/2 -translate-y-full z-10 pointer-events-none transition-transform duration-200"
            style={{
              transform: `translate(-50%, -100%) rotate(${currentAngle}deg)`,
            }}
          >
            <div className="absolute top-0 left-1/2 w-8 h-8 rounded-full bg-brand-purple/80 border-2 border-brand-accent -translate-x-1/2 -translate-y-1/2 shadow-glow-purple" />
          </div>

          {/* Numbers */}
          {mode === 'hours'
            ? hours.map((h, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                const isSelected = selectedHour === h;

                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setSelectedHour(h);
                      // Auto switch to minutes mode
                      setMode('minutes');
                    }}
                    style={{ left: `${x}px`, top: `${y}px` }}
                    className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full text-xs font-bold flex items-center justify-center transition-all z-20 ${
                      isSelected
                        ? 'text-white font-black'
                        : 'text-text-secondary hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {h}
                  </button>
                );
              })
            : minutes.map((m, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                const isSelected = Math.abs(selectedMinute - m) < 3;

                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMinute(m)}
                    style={{ left: `${x}px`, top: `${y}px` }}
                    className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full text-xs font-medium flex items-center justify-center transition-all z-20 ${
                      isSelected
                        ? 'text-white font-black'
                        : 'text-text-secondary hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {m.toString().padStart(2, '0')}
                  </button>
                );
              })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-4 mt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-purple-gradient text-white text-xs font-bold shadow-glow-purple-sm active:scale-95 transition-all flex items-center space-x-1.5"
          >
            <Check size={14} />
            <span>OK</span>
          </button>
        </div>
      </div>
    </div>
  );
};

