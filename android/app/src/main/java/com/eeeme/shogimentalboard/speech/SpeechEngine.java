package com.eeeme.shogimentalboard.speech;

import android.content.Context;
import android.media.AudioAttributes;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Android 標準の読み上げ（TextToSpeech）をアプリ全体で1つだけ持つ。
 * 画面からの1回読み上げ（{@link NativeSpeechPlugin#speak}）と、
 * バックグラウンドの連続読み上げ（{@link ListenService}）の両方がこれを使う。
 *
 * WebView の speechSynthesis は Android では使えない端末があり、
 * 画面を消すと止まるため、読み上げはすべてネイティブ側で行う。
 */
public final class SpeechEngine {

    private static final String TAG = "SpeechEngine";

    public interface Done {
        /** @param ok 最後まで読み上げたら true。中断・エラーは false。 */
        void onDone(boolean ok);
    }

    public interface Ready {
        /** @param ok 日本語で読み上げられる状態なら true。 */
        void onReady(boolean ok);
    }

    private static SpeechEngine instance;

    public static synchronized SpeechEngine get(Context context) {
        if (instance == null) instance = new SpeechEngine(context.getApplicationContext());
        return instance;
    }

    private final Handler main = new Handler(Looper.getMainLooper());
    private final AtomicLong seq = new AtomicLong();
    private final Map<String, Done> pending = new HashMap<>();
    private final List<Ready> waiting = new ArrayList<>();
    private TextToSpeech tts;
    /** null=初期化中 / true=使える / false=使えない */
    private Boolean usable = null;

    private SpeechEngine(Context context) {
        tts = new TextToSpeech(context, status -> main.post(() -> onInit(status)));
    }

    private void onInit(int status) {
        boolean ok = false;
        if (status == TextToSpeech.SUCCESS && tts != null) {
            int lang = tts.setLanguage(Locale.JAPAN);
            ok = lang != TextToSpeech.LANG_MISSING_DATA && lang != TextToSpeech.LANG_NOT_SUPPORTED;
            tts.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            );
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) {}
                @Override public void onDone(String id) { finish(id, true); }
                @Override public void onError(String id) { finish(id, false); }
                @Override public void onStop(String id, boolean interrupted) { finish(id, false); }
            });
        } else {
            Log.w(TAG, "TextToSpeech init failed: " + status);
        }
        usable = ok;
        List<Ready> list = new ArrayList<>(waiting);
        waiting.clear();
        for (Ready r : list) r.onReady(ok);
    }

    /** 初期化を待ってから呼ぶ。初期化済みならすぐ呼ぶ。メインスレッドで呼ぶこと。 */
    public void whenReady(Ready ready) {
        if (usable == null) waiting.add(ready);
        else ready.onReady(usable);
    }

    /**
     * 1件読み上げる。done はメインスレッドで呼ばれる。
     * @param flush true なら直前の読み上げを打ち切って読む。false なら順番待ちに積む（Web 版と同じ動き）。
     */
    public void speak(String text, float rate, boolean flush, Done done) {
        whenReady(ok -> {
            if (!ok || tts == null) {
                if (done != null) done.onDone(false);
                return;
            }
            String id = "u" + seq.incrementAndGet();
            if (done != null) {
                synchronized (pending) {
                    pending.put(id, done);
                }
            }
            tts.setSpeechRate(clamp(rate));
            int r = tts.speak(text, flush ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD, new Bundle(), id);
            if (r != TextToSpeech.SUCCESS) finish(id, false);
        });
    }

    /** 読み上げ中のものを止める。 */
    public void stop() {
        if (tts != null && Boolean.TRUE.equals(usable)) tts.stop();
        // stop() で onStop が来ない端末があるので、待っている呼び出し元は自分で終わらせる
        List<Done> list;
        synchronized (pending) {
            list = new ArrayList<>(pending.values());
            pending.clear();
        }
        for (Done d : list) main.post(() -> d.onDone(false));
    }

    private void finish(String id, boolean ok) {
        Done d;
        synchronized (pending) {
            d = pending.remove(id);
        }
        if (d != null) main.post(() -> d.onDone(ok));
    }

    private static float clamp(float rate) {
        if (Float.isNaN(rate) || rate <= 0f) return 1f;
        return Math.max(0.1f, Math.min(4f, rate));
    }
}
