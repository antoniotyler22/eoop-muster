package com.antoniotyler.accountedfor;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HeadcountWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
