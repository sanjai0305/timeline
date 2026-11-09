import { registerPlugin, Capacitor } from '@capacitor/core';

export interface TimePickerResult {
  hour: number;
  minute: number;
  formatted12: string;
  formatted24: string;
  cancelled: boolean;
}

export interface MaterialTimePickerPluginInterface {
  pickTime(options: {
    title?: string;
    hour?: number;
    minute?: number;
    is24Hour?: boolean;
  }): Promise<TimePickerResult>;
}

export const NativeMaterialTimePicker = registerPlugin<MaterialTimePickerPluginInterface>(
  'MaterialTimePicker',
  {
    web: {
      pickTime: async () => {
        // Handled by React UI fallback on web
        return {
          hour: 6,
          minute: 0,
          formatted12: '06:00 AM',
          formatted24: '06:00',
          cancelled: true,
        };
      },
    },
  }
);

/**
 * Open the native MaterialTimePicker on Android, or returns null if on web.
 */
export async function openNativeClockTimePicker(
  title: string,
  currentTime12: string
): Promise<TimePickerResult | null> {
  if (!Capacitor.isNativePlatform()) {
    return null; // triggers Web ClockTimePickerModal
  }

  // Parse currentTime12 (e.g. "05:30 AM")
  let hour = 6;
  let minute = 0;
  const match = currentTime12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = match[3] ? match[3].toUpperCase() : 'AM';
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    hour = h;
    minute = isNaN(m) ? 0 : m;
  }

  try {
    const res = await NativeMaterialTimePicker.pickTime({
      title,
      hour,
      minute,
      is24Hour: false,
    });
    return res;
  } catch (err) {
    console.warn('Native MaterialTimePicker error, falling back to web clock:', err);
    return null;
  }
}

