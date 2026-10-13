package com.eeeme.shogimentalboard.speech;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

/**
 * 画面（JavaScript）から使う読み上げの窓口。
 * - speak / stop: 画面表示中の1回読み上げ（全モード共通・無料）
 * - startLoop / stopLoop: 00「ただ読み上げ」のバックグラウンド連続読み上げ（有料）
 * イベント: "loopCell" {file, rank, count} / "loopStopped" {reason}
 */
@CapacitorPlugin(name = "NativeSpeech")
public class NativeSpeechPlugin extends Plugin {

    private static final int REQ_NOTIFICATIONS = 7301;

    @Override
    public void load() {
        ListenService.setListener(new ListenService.Listener() {
            @Override
            public void onCell(int file, int rank, int count) {
                JSObject o = new JSObject();
                o.put("file", file);
                o.put("rank", rank);
                o.put("count", count);
                notifyListeners("loopCell", o);
            }

            @Override
            public void onStopped(String reason) {
                JSObject o = new JSObject();
                o.put("reason", reason);
                notifyListeners("loopStopped", o);
            }
        });
        // 読み上げエンジンを先に起こしておく（最初の1回が遅れないように）
        SpeechEngine.get(getContext());
    }

    @Override
    protected void handleOnDestroy() {
        ListenService.setListener(null);
        super.handleOnDestroy();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        getActivity().runOnUiThread(() -> SpeechEngine.get(getContext()).whenReady(ok -> {
            JSObject r = new JSObject();
            r.put("available", ok);
            call.resolve(r);
        }));
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.isEmpty()) {
            call.reject("text is required");
            return;
        }
        float rate = call.getFloat("rate", 1f);
        getActivity().runOnUiThread(() -> SpeechEngine.get(getContext()).speak(text, rate, false, ok -> {
            JSObject r = new JSObject();
            r.put("completed", ok);
            call.resolve(r);
        }));
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            // バックグラウンド連続読み上げ中は、そちらを止めない（stopLoop で止める）
            if (!ListenService.isRunning()) SpeechEngine.get(getContext()).stop();
            call.resolve();
        });
    }

    @PluginMethod
    public void startLoop(PluginCall call) {
        JSArray items = call.getArray("items");
        if (items == null || items.length() == 0) {
            call.reject("items is required");
            return;
        }
        ArrayList<String> texts = new ArrayList<>();
        int[] files = new int[items.length()];
        int[] ranks = new int[items.length()];
        try {
            for (int i = 0; i < items.length(); i++) {
                JSONObject it = items.getJSONObject(i);
                texts.add(it.getString("text"));
                files[i] = it.getInt("file");
                ranks[i] = it.getInt("rank");
            }
        } catch (JSONException e) {
            call.reject("invalid items", e);
            return;
        }
        long intervalMs = (long) (double) call.getDouble("intervalMs", 1500d);
        float rate = call.getFloat("rate", 1f);

        requestNotificationPermissionIfNeeded();

        Intent intent = new Intent(getContext(), ListenService.class)
            .setAction(ListenService.ACTION_START)
            .putStringArrayListExtra(ListenService.EXTRA_TEXTS, texts)
            .putExtra(ListenService.EXTRA_FILES, files)
            .putExtra(ListenService.EXTRA_RANKS, ranks)
            .putExtra(ListenService.EXTRA_INTERVAL_MS, intervalMs)
            .putExtra(ListenService.EXTRA_RATE, rate);
        try {
            ContextCompat.startForegroundService(getContext(), intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("could not start background reading", e);
        }
    }

    @PluginMethod
    public void stopLoop(PluginCall call) {
        if (ListenService.isRunning()) {
            Intent intent = new Intent(getContext(), ListenService.class).setAction(ListenService.ACTION_STOP);
            getContext().startService(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void isLooping(PluginCall call) {
        JSObject r = new JSObject();
        r.put("looping", ListenService.isRunning());
        call.resolve(r);
    }

    /**
     * Android 13 以降は、通知（停止ボタン付き）を出すのに許可が要る。
     * 許可がなくても読み上げ自体は続くので、結果は待たない。
     */
    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < 33 || getActivity() == null) return;
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
        ActivityCompat.requestPermissions(getActivity(), new String[] { Manifest.permission.POST_NOTIFICATIONS }, REQ_NOTIFICATIONS);
    }
}
