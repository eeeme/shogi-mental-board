package com.eeeme.shogimentalboard;

import android.os.Bundle;

import com.eeeme.shogimentalboard.speech.NativeSpeechPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // アプリ内で作った読み上げプラグインは、super.onCreate より前に登録する
        registerPlugin(NativeSpeechPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
