package com.antoniotyler.accountedfor;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** The web app hands the headcount to the home-screen widget: { n, t, unit, when, label }. */
@CapacitorPlugin(name = "HeadcountWidget")
public class HeadcountWidgetPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        Context ctx = getContext();
        SharedPreferences.Editor e = ctx.getSharedPreferences(HeadcountWidget.PREFS, Context.MODE_PRIVATE).edit();
        e.putInt("n", call.getInt("n", -1));
        e.putInt("t", call.getInt("t", 0));
        e.putString("unit", trim(call.getString("unit", ""), 24));
        e.putString("when", trim(call.getString("when", ""), 16));
        e.putString("label", trim(call.getString("label", "accounted for"), 30));
        e.apply();
        HeadcountWidget.refresh(ctx);
        call.resolve();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject r = new JSObject();
        r.put("available", true);
        call.resolve(r);
    }

    private static String trim(String s, int n) {
        if (s == null) return "";
        return s.length() > n ? s.substring(0, n) : s;
    }
}
