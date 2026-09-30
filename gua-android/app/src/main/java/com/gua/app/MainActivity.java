package com.gua.app;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity implements TextToSpeech.OnInitListener {
    private static final String HOME = "file:///android_asset/index.html";
    private static final String ACADEMY = "https://ilhangemini12.github.io/teen-english-quest/guatemala-citizenship-spanish/";
    private static final String PREFS = "gua_prefs";
    private static final String PREF_PROJECT = "chatgpt_project_url";

    private WebView webView;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private List<EpisodeLibrary.Segment> currentSegments = new ArrayList<>();
    private final ArrayList<String> generatedUris = new ArrayList<>();
    private int currentIndex = 0;
    private String currentEpisode = "daily";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= 33 && ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 90);
        }

        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        webView.addJavascriptInterface(new Bridge(), "Gua");
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl(HOME);

        tts = new TextToSpeech(this, this);
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String utteranceId) {}

            @Override public void onDone(String utteranceId) {
                runOnUiThread(() -> synthesizeNext());
            }

            @Override public void onError(String utteranceId) {
                runOnUiThread(() -> {
                    toast("Ses oluşturma sırasında TTS hatası oluştu.");
                    notifyEpisodeState("error", "TTS error");
                });
            }
        });
    }

    @Override
    public void onInit(int status) {
        ttsReady = status == TextToSpeech.SUCCESS;
        runOnUiThread(() -> notifyEpisodeState(ttsReady ? "ready" : "error", ttsReady ? "Android TTS hazır" : "Android TTS başlatılamadı"));
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    private void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private void notifyEpisodeState(String state, String message) {
        if (webView == null) return;
        String js = "window.guaEpisodeState && window.guaEpisodeState(" + JSONObject.quote(state) + "," + JSONObject.quote(message) + ");";
        webView.evaluateJavascript(js, null);
    }

    private void generateEpisode(String id) {
        if (!ttsReady) {
            toast("Android TTS henüz hazır değil.");
            return;
        }
        currentEpisode = id == null ? "daily" : id;
        currentSegments = EpisodeLibrary.get(currentEpisode);
        generatedUris.clear();
        currentIndex = 0;

        File dir = new File(getCacheDir(), "gua_audio/" + currentEpisode + "_v1");
        if (!dir.exists() && !dir.mkdirs()) {
            toast("Ses önbelleği oluşturulamadı.");
            return;
        }

        notifyEpisodeState("building", "Podcast hazırlanıyor…");
        synthesizeNext();
    }

    private void synthesizeNext() {
        if (currentIndex >= currentSegments.size()) {
            playUris(generatedUris, EpisodeLibrary.title(currentEpisode));
            notifyEpisodeState("playing", "Hazır — arka planda oynatılıyor");
            return;
        }

        EpisodeLibrary.Segment segment = currentSegments.get(currentIndex);
        File dir = new File(getCacheDir(), "gua_audio/" + currentEpisode + "_v1");
        File out = new File(dir, String.format(Locale.US, "seg_%03d.wav", currentIndex));
        int idx = currentIndex;
        currentIndex++;

        if (segment.isPause()) {
            try {
                makeSilenceWav(out, segment.silenceSeconds);
                generatedUris.add(Uri.fromFile(out).toString());
                synthesizeNext();
            } catch (Exception e) {
                toast("Sessizlik dosyası oluşturulamadı.");
            }
            return;
        }

        if (out.exists() && out.length() > 256) {
            generatedUris.add(Uri.fromFile(out).toString());
            synthesizeNext();
            return;
        }

        Locale locale = Locale.forLanguageTag(segment.languageTag);
        int languageResult = tts.setLanguage(locale);
        if (languageResult == TextToSpeech.LANG_MISSING_DATA || languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {
            tts.setLanguage(Locale.US);
        }
        tts.setSpeechRate(segment.languageTag.startsWith("es") ? 0.91f : 0.96f);
        Bundle params = new Bundle();
        String utteranceId = "gua_" + currentEpisode + "_" + idx;
        int result = tts.synthesizeToFile(segment.text, params, out, utteranceId);
        if (result != TextToSpeech.SUCCESS) {
            toast("TTS dosyası başlatılamadı.");
        } else {
            generatedUris.add(Uri.fromFile(out).toString());
        }
    }

    private void playUris(ArrayList<String> uris, String title) {
        Intent i = new Intent(this, AudioPlayerService.class);
        i.setAction(AudioPlayerService.ACTION_PLAY);
        i.putStringArrayListExtra(AudioPlayerService.EXTRA_URLS, new ArrayList<>(uris));
        i.putExtra(AudioPlayerService.EXTRA_TITLE, title);
        startService(i);
    }

    private void playRadio(String url, String title) {
        ArrayList<String> list = new ArrayList<>();
        list.add(url);
        playUris(list, title == null ? "Spanish Radio" : title);
        notifyEpisodeState("playing", "Radio çalıyor: " + title);
    }

    private void stopAudio() {
        Intent i = new Intent(this, AudioPlayerService.class);
        i.setAction(AudioPlayerService.ACTION_STOP);
        startService(i);
        notifyEpisodeState("ready", "Oynatma durduruldu");
    }

    private void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            toast("Bağlantı açılamadı.");
        }
    }

    private void loadStations() {
        notifyEpisodeState("radio-loading", "İspanyolca istasyonlar yükleniyor…");
        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                URL url = new URL("https://de1.api.radio-browser.info/json/stations/search?language=spanish&hidebroken=true&limit=40&order=clickcount&reverse=true");
                conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(12000);
                conn.setReadTimeout(12000);
                conn.setRequestProperty("User-Agent", "GUA/1.0 (personal Spanish learning app)");
                conn.setRequestProperty("Accept", "application/json");
                InputStream in = new BufferedInputStream(conn.getInputStream());
                byte[] bytes = in.readAllBytes();
                String json = new String(bytes, StandardCharsets.UTF_8);
                JSONArray src = new JSONArray(json);
                JSONArray out = new JSONArray();
                for (int i = 0; i < src.length(); i++) {
                    JSONObject s = src.getJSONObject(i);
                    String stream = s.optString("url_resolved", s.optString("url", ""));
                    if (stream.isEmpty()) continue;
                    JSONObject row = new JSONObject();
                    row.put("name", s.optString("name", "Radio"));
                    row.put("url", stream);
                    row.put("country", s.optString("country", ""));
                    row.put("codec", s.optString("codec", ""));
                    row.put("bitrate", s.optInt("bitrate", 0));
                    out.put(row);
                }
                String payload = out.toString();
                runOnUiThread(() -> {
                    String js = "window.guaStationsLoaded && window.guaStationsLoaded(JSON.parse(" + JSONObject.quote(payload) + "));";
                    webView.evaluateJavascript(js, null);
                    notifyEpisodeState("radio-ready", "İstasyonlar hazır");
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    notifyEpisodeState("error", "Radio Browser erişilemedi");
                    toast("İstasyon listesi yüklenemedi. İnternet bağlantısını kontrol et.");
                });
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }

    private static void writeLeInt(BufferedOutputStream out, int value) throws Exception {
        out.write(value & 0xff);
        out.write((value >> 8) & 0xff);
        out.write((value >> 16) & 0xff);
        out.write((value >> 24) & 0xff);
    }

    private static void writeLeShort(BufferedOutputStream out, int value) throws Exception {
        out.write(value & 0xff);
        out.write((value >> 8) & 0xff);
    }

    private static void makeSilenceWav(File file, int seconds) throws Exception {
        int sampleRate = 16000;
        int channels = 1;
        int bits = 16;
        int samples = sampleRate * Math.max(1, seconds);
        int dataSize = samples * channels * bits / 8;
        try (BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(file))) {
            out.write("RIFF".getBytes(StandardCharsets.US_ASCII));
            writeLeInt(out, 36 + dataSize);
            out.write("WAVE".getBytes(StandardCharsets.US_ASCII));
            out.write("fmt ".getBytes(StandardCharsets.US_ASCII));
            writeLeInt(out, 16);
            writeLeShort(out, 1);
            writeLeShort(out, channels);
            writeLeInt(out, sampleRate);
            writeLeInt(out, sampleRate * channels * bits / 8);
            writeLeShort(out, channels * bits / 8);
            writeLeShort(out, bits);
            out.write("data".getBytes(StandardCharsets.US_ASCII));
            writeLeInt(out, dataSize);
            byte[] zero = new byte[4096];
            int remaining = dataSize;
            while (remaining > 0) {
                int n = Math.min(remaining, zero.length);
                out.write(zero, 0, n);
                remaining -= n;
            }
        }
    }

    public final class Bridge {
        @JavascriptInterface
        public void openAcademy() {
            runOnUiThread(() -> webView.loadUrl(ACADEMY));
        }

        @JavascriptInterface
        public void openHome() {
            runOnUiThread(() -> webView.loadUrl(HOME));
        }

        @JavascriptInterface
        public void generateEpisode(String id) {
            runOnUiThread(() -> MainActivity.this.generateEpisode(id));
        }

        @JavascriptInterface
        public void stopAudio() {
            runOnUiThread(MainActivity.this::stopAudio);
        }

        @JavascriptInterface
        public void loadStations() {
            MainActivity.this.loadStations();
        }

        @JavascriptInterface
        public void playRadio(String url, String title) {
            runOnUiThread(() -> MainActivity.this.playRadio(url, title));
        }

        @JavascriptInterface
        public String getProjectUrl() {
            return getSharedPreferences(PREFS, MODE_PRIVATE).getString(PREF_PROJECT, "");
        }

        @JavascriptInterface
        public void saveProjectUrl(String value) {
            String v = value == null ? "" : value.trim();
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(PREF_PROJECT, v).apply();
            runOnUiThread(() -> toast("GUA Project bağlantısı kaydedildi."));
        }

        @JavascriptInterface
        public void openChatGptProject() {
            SharedPreferences p = getSharedPreferences(PREFS, MODE_PRIVATE);
            String url = p.getString(PREF_PROJECT, "");
            if (url == null || url.isBlank()) url = "https://chatgpt.com/projects";
            final String target = url;
            runOnUiThread(() -> openExternal(target));
        }
    }
}
