package com.antoniotyler.accountedfor;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/** Home-screen widget: "18 / 24 accounted for · UTILITIES · 1518". The app writes the numbers (HeadcountWidgetPlugin). */
public class HeadcountWidget extends AppWidgetProvider {
    static final String PREFS = "af_widget";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    /** Redraw every placed widget from what the app last saved. */
    public static void refresh(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, HeadcountWidget.class));
        if (ids.length > 0) mgr.updateAppWidget(ids, build(ctx));
    }

    static RemoteViews build(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int n = p.getInt("n", -1), t = p.getInt("t", 0);
        String unit = p.getString("unit", ""), when = p.getString("when", ""), label = p.getString("label", "accounted for");
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_headcount);
        if (n < 0 || t <= 0) {
            v.setTextViewText(R.id.w_big, "—");
            v.setTextViewText(R.id.w_sub, "Open Accounted For to load your team");
            v.setTextViewText(R.id.w_unit, unit.isEmpty() ? "Accounted For" : unit);
            v.setProgressBar(R.id.w_bar, 100, 0, false);
        } else {
            v.setTextViewText(R.id.w_big, n + " / " + t);
            v.setTextViewText(R.id.w_sub, (n >= t ? "All " : "") + label + (when.isEmpty() ? "" : " · " + when));
            v.setTextViewText(R.id.w_unit, unit.isEmpty() ? "Accounted For" : unit);
            v.setProgressBar(R.id.w_bar, 100, Math.round(100f * n / t), false);
        }
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(ctx, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        return v;
    }
}
