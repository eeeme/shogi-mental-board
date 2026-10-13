package com.eeeme.shogimentalboard.speech;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

import java.util.ArrayList;
import java.util.Random;

/**
 * 00「ただ読み上げ」をバックグラウンドで続けるためのフォアグラウンドサービス。
 * 通知を出している間は、画面を消しても・他のアプリを使っていても読み上げを続ける。
 * 通知の「停止」から止められる。
 *
 * 次に読むマスはこのサービスが選ぶ（画面側の JavaScript は画面オフで止まるため）。
 */
public class ListenService extends Service {

    public static final String ACTION_START = "com.eeeme.shogimentalboard.LISTEN_START";
    public static final String ACTION_STOP = "com.eeeme.shogimentalboard.LISTEN_STOP";

    public static final String EXTRA_TEXTS = "texts";
    public static final String EXTRA_FILES = "files";
    public static final String EXTRA_RANKS = "ranks";
    public static final String EXTRA_INTERVAL_MS = "intervalMs";
    public static final String EXTRA_RATE = "rate";

    private static final String CHANNEL_ID = "listen";
    private static final int NOTIFICATION_ID = 1001;

    /** 画面側（プラグイン）へ進み具合を知らせる口。プラグインが居ない間は null。 */
    public interface Listener {
        void onCell(int file, int rank, int count);
        void onStopped(String reason);
    }

    private static Listener listener;
    private static volatile boolean running = false;

    public static void setListener(Listener l) { listener = l; }
    public static boolean isRunning() { return running; }

    private final Handler main = new Handler(Looper.getMainLooper());
    private final Random random = new Random();
    private PowerManager.WakeLock wakeLock;

    private ArrayList<String> texts = new ArrayList<>();
    private int[] files = new int[0];
    private int[] ranks = new int[0];
    private long intervalMs = 1500;
    private float rate = 1f;
    private int prev = -1;
    private int count = 0;
    /** start ごとに増える。古いループのコールバックを無視するため。 */
    private int generation = 0;

    private final Runnable next = this::speakNext;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_STOP.equals(action) || intent == null) {
            stopLoop("user");
            return START_NOT_STICKY;
        }
        if (ACTION_START.equals(action)) {
            ArrayList<String> t = intent.getStringArrayListExtra(EXTRA_TEXTS);
            int[] f = intent.getIntArrayExtra(EXTRA_FILES);
            int[] r = intent.getIntArrayExtra(EXTRA_RANKS);
            if (t == null || f == null || r == null || t.isEmpty() || t.size() != f.length || t.size() != r.length) {
                stopLoop("error");
                return START_NOT_STICKY;
            }
            texts = t;
            files = f;
            ranks = r;
            intervalMs = Math.max(0, intent.getLongExtra(EXTRA_INTERVAL_MS, 1500));
            rate = intent.getFloatExtra(EXTRA_RATE, 1f);
            startInForeground();
            acquireWakeLock();
            generation++;
            prev = -1;
            count = 0;
            running = true;
            main.removeCallbacks(next);
            main.post(next);
        }
        return START_NOT_STICKY;
    }

    private void speakNext() {
        if (!running) return;
        final int gen = generation;
        int i = pick();
        prev = i;
        count++;
        Listener l = listener;
        if (l != null) l.onCell(files[i], ranks[i], count);
        SpeechEngine.get(this).speak(texts.get(i), rate, true, ok -> {
            if (!running || gen != generation) return;
            if (!ok && count == 1) {
                // 最初の1件から読めない＝読み上げエンジンが使えない
                stopLoop("tts_unavailable");
                return;
            }
            main.postDelayed(next, intervalMs);
        });
    }

    /** 直前と同じマスを続けて出さない（候補が1マスだけのときは除く）。 */
    private int pick() {
        int n = texts.size();
        if (n <= 1) return 0;
        int i;
        do {
            i = random.nextInt(n);
        } while (i == prev);
        return i;
    }

    private void stopLoop(String reason) {
        boolean was = running;
        running = false;
        generation++;
        main.removeCallbacks(next);
        SpeechEngine.get(this).stop();
        releaseWakeLock();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        stopSelf();
        Listener l = listener;
        if (l != null && (was || !"user".equals(reason))) l.onStopped(reason);
    }

    private void startInForeground() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "読み上げ", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("ただ読み上げを続けている間に表示します");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }

        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent openPi = open != null ? PendingIntent.getActivity(this, 0, open, piFlags) : null;
        Intent stop = new Intent(this, ListenService.class).setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(this, 1, stop, piFlags);

        Notification n = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle("ただ読み上げ")
            .setContentText("読み上げ中です。止めるときは「停止」を押してください。")
            .setContentIntent(openPi)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .addAction(android.R.drawable.ic_media_pause, "停止", stopPi)
            .build();

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
        ServiceCompat.startForeground(this, NOTIFICATION_ID, n, type);
    }

    /** 画面オフ中に CPU が眠って次の読み上げが遅れないよう、読み上げ中だけ保持する。 */
    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) return;
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "shogimentalboard:listen");
        wakeLock.setReferenceCounted(false);
        // 念のための上限（4時間）。通常は停止時に解放する。
        wakeLock.acquire(4L * 60 * 60 * 1000);
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        wakeLock = null;
    }

    @Override
    public void onDestroy() {
        if (running) stopLoop("destroyed");
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // アプリを履歴から消したら止める
        stopLoop("task_removed");
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
