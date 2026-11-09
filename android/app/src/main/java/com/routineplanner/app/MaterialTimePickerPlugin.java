package com.routineplanner.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.material.timepicker.MaterialTimePicker;
import com.google.android.material.timepicker.TimeFormat;

import java.util.Locale;

@CapacitorPlugin(name = "MaterialTimePicker")
public class MaterialTimePickerPlugin extends Plugin {

    @PluginMethod
    public void pickTime(PluginCall call) {
        String title = call.getString("title", "Select Time");
        Integer initialHour = call.getInt("hour", 6);
        Integer initialMinute = call.getInt("minute", 0);
        Boolean is24Hour = call.getBoolean("is24Hour", false);

        if (initialHour == null || initialHour < 0 || initialHour > 23) {
            initialHour = 6;
        }
        if (initialMinute == null || initialMinute < 0 || initialMinute > 59) {
            initialMinute = 0;
        }

        final int h = initialHour;
        final int m = initialMinute;
        final boolean is24 = Boolean.TRUE.equals(is24Hour);

        getActivity().runOnUiThread(() -> {
            try {
                MaterialTimePicker picker = new MaterialTimePicker.Builder()
                        .setTimeFormat(is24 ? TimeFormat.CLOCK_24H : TimeFormat.CLOCK_12H)
                        .setInputMode(MaterialTimePicker.INPUT_MODE_CLOCK)
                        .setHour(h)
                        .setMinute(m)
                        .setTitleText(title)
                        .build();

                picker.addOnPositiveButtonClickListener(v -> {
                    int selectedHour = picker.getHour();
                    int selectedMinute = picker.getMinute();

                    int h12 = selectedHour % 12;
                    if (h12 == 0) h12 = 12;
                    String amPm = selectedHour >= 12 ? "PM" : "AM";
                    String formatted12 = String.format(Locale.US, "%02d:%02d %s", h12, selectedMinute, amPm);
                    String formatted24 = String.format(Locale.US, "%02d:%02d", selectedHour, selectedMinute);

                    JSObject ret = new JSObject();
                    ret.put("hour", selectedHour);
                    ret.put("minute", selectedMinute);
                    ret.put("formatted12", formatted12);
                    ret.put("formatted24", formatted24);
                    ret.put("cancelled", false);
                    call.resolve(ret);
                });

                picker.addOnNegativeButtonClickListener(v -> {
                    JSObject ret = new JSObject();
                    ret.put("cancelled", true);
                    call.resolve(ret);
                });

                picker.addOnCancelListener(dialogInterface -> {
                    JSObject ret = new JSObject();
                    ret.put("cancelled", true);
                    call.resolve(ret);
                });

                picker.show(getActivity().getSupportFragmentManager(), "MATERIAL_TIME_PICKER");
            } catch (Exception e) {
                call.reject("Failed to show MaterialTimePicker: " + e.getMessage(), e);
            }
        });
    }
}

