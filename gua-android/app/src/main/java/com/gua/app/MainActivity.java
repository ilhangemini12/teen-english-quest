package com.gua.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
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
    private static final String PREF_LEVEL = "level";
    private static final String PREF_RADIO_CACHE = "radio_cache";
    private static final String PREF_UPDATE_CHECK = "last_update_check";
    private static final String ACADEMY_STATE_FILE = "academy_state.json";
    private static final String RELEASES_API = "https://api.github.com/repos/ilhangemini12/teen-english-quest/releases?per_page=20";

    private WebView webView;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private List<EpisodeLibrary.Segment> currentSegments = new ArrayList<>();
    private final ArrayList<String> generatedUris = new ArrayList<>();
    private final ArrayList<String> generatedCaptions = new ArrayList<>();
    private int currentIndex = 0;
    private String currentEpisode = "daily";
    private String currentCacheKey = "daily_v3";
    private File pendingUpdateApk;
    private String latestUpdateUrl = "";
    private boolean receiverRegistered = false;

    private final BroadcastReceiver playerReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            if (!AudioPlayerService.ACTION_STATE.equals(intent.getAction()) || webView == null) return;
            try {
                JSONObject o = new JSONObject();
                o.put("title", intent.getStringExtra("title"));
                o.put("caption", intent.getStringExtra("caption"));
                o.put("wordIndex", intent.getIntExtra("wordIndex", -1));
                o.put("index", intent.getIntExtra("index", 0));
                o.put("count", intent.getIntExtra("count", 0));
                o.put("position", intent.getLongExtra("position", 0));
                o.put("duration", intent.getLongExtra("duration", 0));
                o.put("playing", intent.getBooleanExtra("playing", false));
                o.put("speed", intent.getFloatExtra("speed", 1f));
                String js = "window.guaPlayerState && window.guaPlayerState(JSON.parse(" + JSONObject.quote(o.toString()) + "));";
                webView.evaluateJavascript(js, null);
            } catch (Exception ignored) {}
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= 33 && ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 90);
        }

        ContextCompat.registerReceiver(
                this,
                playerReceiver,
                new IntentFilter(AudioPlayerService.ACTION_STATE),
                ContextCompat.RECEIVER_NOT_EXPORTED
        );
        receiverRegistered = true;

        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        webView.addJavascriptInterface(new Bridge(), "Gua");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && url.startsWith(ACADEMY)) {
                    view.evaluateJavascript(
                            "try{if(typeof S!=='undefined'&&window.Gua&&Gua.syncAcademyState){Gua.syncAcademyState(JSON.stringify(S));}}catch(e){}",
                            null
                    );
                }
                if (HOME.equals(url)) {
                    maybeAutoCheckUpdates();
                }
            }
        });
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
    protected void onResume() {
        super.onResume();
        if (pendingUpdateApk != null && pendingUpdateApk.exists() && canInstallPackages()) {
            File f = pendingUpdateApk;
            pendingUpdateApk = null;
            installApk(f);
        }
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
        if (receiverRegistered) {
            try { unregisterReceiver(playerReceiver); } catch (Exception ignored) {}
        }
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

    private String level() {
        return getSharedPreferences(PREFS, MODE_PRIVATE).getString(PREF_LEVEL, "B1+");
    }

    private float spanishTtsRate() {
        switch (level()) {
            case "A2": return 0.80f;
            case "B1": return 0.87f;
            case "B2": return 1.00f;
            default: return 0.93f;
        }
    }

    private void generateEpisode(String id) {
        if (!ttsReady) {
            toast("Android TTS henüz hazır değil.");
            return;
        }
        currentEpisode = id == null ? "daily" : id;
        String adaptiveState = null;
        if ("adaptive".equals(currentEpisode)) {
            adaptiveState = readAcademyState();
            currentSegments = AdaptiveEpisodeBuilder.fromJson(adaptiveState, level());
            if (currentSegments.isEmpty()) {
                toast("Henüz kişiselleştirilmiş veri yok. Önce Academy'yi açıp birkaç çalışma yap.");
                notifyEpisodeState("needs-data", "Academy verisi gerekli");
                return;
            }
            currentCacheKey = "adaptive_" + level().replace("+","p") + "_" + Integer.toHexString(adaptiveState.hashCode());
        } else {
            currentSegments = EpisodeLibrary.get(currentEpisode);
            currentCacheKey = currentEpisode + "_" + level().replace("+","p") + "_v3";
        }
        generatedUris.clear();
        generatedCaptions.clear();
        currentIndex = 0;

        File dir = new File(getCacheDir(), "gua_audio/" + currentCacheKey);
        if (!dir.exists() && !dir.mkdirs()) {
            toast("Ses önbelleği oluşturulamadı.");
            return;
        }

        notifyEpisodeState("building", "Podcast hazırlanıyor…");
        synthesizeNext();
    }

    private void synthesizeNext() {
        if (currentIndex >= currentSegments.size()) {
            playUris(generatedUris, generatedCaptions, EpisodeLibrary.title(currentEpisode));
            notifyEpisodeState("playing", "Hazır — arka planda oynatılıyor");
            return;
        }

        EpisodeLibrary.Segment segment = currentSegments.get(currentIndex);
        File dir = new File(getCacheDir(), "gua_audio/" + currentCacheKey);
        File out = new File(dir, String.format(Locale.US, "seg_%03d.wav", currentIndex));
        int idx = currentIndex;
        currentIndex++;

        if (segment.isPause()) {
            try {
                makeSilenceWav(out, segment.silenceSeconds);
                generatedUris.add(Uri.fromFile(out).toString());
                generatedCaptions.add("");
                synthesizeNext();
            } catch (Exception e) {
                toast("Sessizlik dosyası oluşturulamadı.");
            }
            return;
        }

        if (out.exists() && out.length() > 256) {
            generatedUris.add(Uri.fromFile(out).toString());
            generatedCaptions.add(segment.text);
            synthesizeNext();
            return;
        }

        Locale locale = Locale.forLanguageTag(segment.languageTag);
        int languageResult = tts.setLanguage(locale);
        if (languageResult == TextToSpeech.LANG_MISSING_DATA || languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {
            tts.setLanguage(Locale.US);
        }
        tts.setSpeechRate(segment.languageTag.startsWith("es") ? spanishTtsRate() : 0.95f);
        Bundle params = new Bundle();
        String utteranceId = "gua_" + currentEpisode + "_" + idx;
        int result = tts.synthesizeToFile(segment.text, params, out, utteranceId);
        if (result != TextToSpeech.SUCCESS) {
            toast("TTS dosyası başlatılamadı.");
        } else {
            generatedUris.add(Uri.fromFile(out).toString());
            generatedCaptions.add(segment.text);
        }
    }

    private void playUris(ArrayList<String> uris, ArrayList<String> captions, String title) {
        Intent i = new Intent(this, AudioPlayerService.class);
        i.setAction(AudioPlayerService.ACTION_PLAY);
        i.putStringArrayListExtra(AudioPlayerService.EXTRA_URLS, new ArrayList<>(uris));
        i.putStringArrayListExtra(AudioPlayerService.EXTRA_CAPTIONS, new ArrayList<>(captions));
        i.putExtra(AudioPlayerService.EXTRA_TITLE, title);
        startService(i);
    }

    private void playRadio(String url, String title) {
        ArrayList<String> list = new ArrayList<>();
        list.add(url);
        playUris(list, new ArrayList<>(), title == null ? "Spanish Radio" : title);
        notifyEpisodeState("playing", "Radio çalıyor: " + title);
    }

    private void playerCommand(String command, float speed) {
        Intent i = new Intent(this, AudioPlayerService.class);
        if ("toggle".equals(command)) i.setAction(AudioPlayerService.ACTION_TOGGLE);
        else if ("next".equals(command)) i.setAction(AudioPlayerService.ACTION_NEXT);
        else if ("previous".equals(command)) i.setAction(AudioPlayerService.ACTION_PREVIOUS);
        else if ("stop".equals(command)) i.setAction(AudioPlayerService.ACTION_STOP);
        else if ("speed".equals(command)) {
            i.setAction(AudioPlayerService.ACTION_SPEED);
            i.putExtra(AudioPlayerService.EXTRA_SPEED, speed);
        } else return;
        startService(i);
    }

    private byte[] readAll(InputStream in) throws Exception {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int n;
            while ((n = in.read(buffer)) >= 0) out.write(buffer, 0, n);
            return out.toByteArray();
        }
    }

    private JSONArray fetchStationsFrom(String base) throws Exception {
        URL url = new URL(base + "/json/stations/search?language=spanish&hidebroken=true&limit=60&order=clickcount&reverse=true");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        try {
            conn.setInstanceFollowRedirects(true);
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(10000);
            conn.setRequestProperty("User-Agent", "GUA/1.2 (personal Spanish learning app)");
            conn.setRequestProperty("Accept", "application/json; charset=utf-8");
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) throw new Exception("HTTP " + code);
            String json = new String(readAll(new BufferedInputStream(conn.getInputStream())), StandardCharsets.UTF_8);
            JSONArray src = new JSONArray(json);
            JSONArray out = new JSONArray();
            for (int i = 0; i < src.length(); i++) {
                JSONObject s = src.optJSONObject(i);
                if (s == null || s.optInt("lastcheckok", 1) == 0) continue;
                String stream = s.optString("url_resolved", s.optString("url", ""));
                if (stream.isBlank()) continue;
                JSONObject row = new JSONObject();
                row.put("name", s.optString("name", "Radio").trim());
                row.put("url", stream);
                row.put("country", s.optString("country", ""));
                row.put("codec", s.optString("codec", ""));
                row.put("bitrate", s.optInt("bitrate", 0));
                row.put("uuid", s.optString("stationuuid", ""));
                out.put(row);
            }
            return out;
        } finally {
            conn.disconnect();
        }
    }

    private void loadStations() {
        notifyEpisodeState("radio-loading", "İspanyolca istasyonlar yükleniyor…");
        new Thread(() -> {
            String[] mirrors = {
                    "https://all.api.radio-browser.info",
                    "https://de1.api.radio-browser.info",
                    "https://nl1.api.radio-browser.info"
            };
            JSONArray result = null;
            String lastError = "";
            for (String base : mirrors) {
                try {
                    JSONArray x = fetchStationsFrom(base);
                    if (x.length() > 0) {
                        result = x;
                        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(PREF_RADIO_CACHE, x.toString()).apply();
                        break;
                    }
                } catch (Exception e) {
                    lastError = e.getClass().getSimpleName() + ": " + e.getMessage();
                }
            }

            if (result == null || result.length() == 0) {
                String cached = getSharedPreferences(PREFS, MODE_PRIVATE).getString(PREF_RADIO_CACHE, "");
                if (!cached.isBlank()) {
                    try { result = new JSONArray(cached); } catch (Exception ignored) {}
                }
            }

            final JSONArray finalResult = result;
            final String errorText = lastError;
            runOnUiThread(() -> {
                if (finalResult != null && finalResult.length() > 0) {
                    String js = "window.guaStationsLoaded && window.guaStationsLoaded(JSON.parse(" + JSONObject.quote(finalResult.toString()) + "));";
                    webView.evaluateJavascript(js, null);
                    notifyEpisodeState("radio-ready", "İstasyonlar hazır");
                } else {
                    String js = "window.guaStationsError && window.guaStationsError(" + JSONObject.quote(errorText.isBlank() ? "Radio Browser yanıt vermedi." : errorText) + ");";
                    webView.evaluateJavascript(js, null);
                    notifyEpisodeState("error", "Radyo dizinine ulaşılamadı");
                }
            });
        }).start();
    }

    private void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            toast("Bağlantı açılamadı.");
        }
    }

    private File academyStateFile() {
        return new File(getFilesDir(), ACADEMY_STATE_FILE);
    }

    private void saveAcademyState(String json) {
        if (json == null || json.isBlank() || json.length() > 1_500_000) return;
        try {
            new JSONObject(json);
            try (FileOutputStream out = new FileOutputStream(academyStateFile())) {
                out.write(json.getBytes(StandardCharsets.UTF_8));
            }
        } catch (Exception ignored) {}
    }

    private String readAcademyState() {
        File file = academyStateFile();
        if (!file.exists()) return "";
        try (FileInputStream in = new FileInputStream(file)) {
            return new String(readAll(in), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    private static int[] semver(String s) {
        String clean = s == null ? "" : s.replaceAll("[^0-9.]", "");
        String[] p = clean.split("\\.");
        return new int[]{
                p.length > 0 && !p[0].isBlank() ? Integer.parseInt(p[0]) : 0,
                p.length > 1 && !p[1].isBlank() ? Integer.parseInt(p[1]) : 0,
                p.length > 2 && !p[2].isBlank() ? Integer.parseInt(p[2]) : 0
        };
    }

    private static boolean newer(String latest, String current) {
        try {
            int[] a = semver(latest), b = semver(current);
            for (int i = 0; i < 3; i++) {
                if (a[i] != b[i]) return a[i] > b[i];
            }
        } catch (Exception ignored) {}
        return false;
    }

    private void maybeAutoCheckUpdates() {
        long now = System.currentTimeMillis();
        SharedPreferences p = getSharedPreferences(PREFS, MODE_PRIVATE);
        long last = p.getLong(PREF_UPDATE_CHECK, 0);
        if (now - last > 24L * 60L * 60L * 1000L) {
            p.edit().putLong(PREF_UPDATE_CHECK, now).apply();
            checkForUpdates(true);
        }
    }

    private void checkForUpdates(boolean silent) {
        new Thread(() -> {
            try {
                URL url = new URL(RELEASES_API);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                conn.setRequestProperty("User-Agent", "GUA/" + BuildConfig.VERSION_NAME);
                conn.setRequestProperty("Accept", "application/vnd.github+json");
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) throw new Exception("GitHub HTTP " + code);
                String json = new String(readAll(conn.getInputStream()), StandardCharsets.UTF_8);
                conn.disconnect();

                JSONArray releases = new JSONArray(json);
                String latestVersion = "";
                String downloadUrl = "";
                for (int i = 0; i < releases.length(); i++) {
                    JSONObject rel = releases.optJSONObject(i);
                    if (rel == null || rel.optBoolean("draft", false)) continue;
                    String tag = rel.optString("tag_name", "");
                    if (!tag.startsWith("gua-v")) continue;
                    latestVersion = tag.substring("gua-v".length());
                    JSONArray assets = rel.optJSONArray("assets");
                    if (assets != null) {
                        for (int j = 0; j < assets.length(); j++) {
                            JSONObject asset = assets.optJSONObject(j);
                            if (asset == null) continue;
                            String name = asset.optString("name", "");
                            if (name.toLowerCase(Locale.ROOT).endsWith(".apk")) {
                                downloadUrl = asset.optString("browser_download_url", "");
                                break;
                            }
                        }
                    }
                    if (!downloadUrl.isBlank()) break;
                }

                latestUpdateUrl = downloadUrl;
                JSONObject status = new JSONObject();
                status.put("current", BuildConfig.VERSION_NAME);
                status.put("latest", latestVersion.isBlank() ? BuildConfig.VERSION_NAME : latestVersion);
                status.put("available", !downloadUrl.isBlank() && newer(latestVersion, BuildConfig.VERSION_NAME));
                status.put("url", downloadUrl);
                String payload = status.toString();
                runOnUiThread(() -> webView.evaluateJavascript(
                        "window.guaUpdateStatus && window.guaUpdateStatus(JSON.parse(" + JSONObject.quote(payload) + "));", null));
            } catch (Exception e) {
                if (!silent) {
                    runOnUiThread(() -> webView.evaluateJavascript(
                            "window.guaUpdateError && window.guaUpdateError(" + JSONObject.quote(e.getMessage() == null ? "Update kontrolü başarısız." : e.getMessage()) + ");", null));
                }
            }
        }).start();
    }

    private boolean canInstallPackages() {
        return Build.VERSION.SDK_INT < 26 || getPackageManager().canRequestPackageInstalls();
    }

    private void downloadAndInstallUpdate(String requestedUrl) {
        String target = requestedUrl == null || requestedUrl.isBlank() ? latestUpdateUrl : requestedUrl;
        if (target == null || target.isBlank()) {
            toast("Önce güncellemeleri kontrol et.");
            return;
        }
        final String updateUrl = target;
        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                File root = getExternalCacheDir() != null ? getExternalCacheDir() : getCacheDir();
                File dir = new File(root, "updates");
                if (!dir.exists()) dir.mkdirs();
                File apk = new File(dir, "GUA-update.apk");

                URL u = new URL(updateUrl);
                conn = (HttpURLConnection) u.openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.setRequestProperty("User-Agent", "GUA/" + BuildConfig.VERSION_NAME);
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) throw new Exception("APK HTTP " + code);

                try (InputStream in = new BufferedInputStream(conn.getInputStream());
                     FileOutputStream out = new FileOutputStream(apk)) {
                    byte[] buf = new byte[16384];
                    int n;
                    while ((n = in.read(buf)) >= 0) out.write(buf, 0, n);
                }
                if (apk.length() < 500_000) throw new Exception("APK dosyası beklenenden küçük.");
                pendingUpdateApk = apk;
                runOnUiThread(() -> requestInstallPending(apk));
            } catch (Exception e) {
                runOnUiThread(() -> {
                    toast("Güncelleme indirilemedi: " + e.getMessage());
                    webView.evaluateJavascript("window.guaUpdateError && window.guaUpdateError(" + JSONObject.quote("İndirme hatası: " + e.getMessage()) + ");", null);
                });
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }

    private void requestInstallPending(File apk) {
        if (!canInstallPackages()) {
            pendingUpdateApk = apk;
            Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()));
            startActivity(settings);
            toast("Bir kez 'Bu kaynaktan izin ver' seçeneğini aç. GUA'ya dönünce kurulum ekranı otomatik açılacak.");
            return;
        }
        pendingUpdateApk = null;
        installApk(apk);
    }

    private void installApk(File apk) {
        try {
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", apk);
            Intent install = new Intent(Intent.ACTION_VIEW);
            install.setDataAndType(uri, "application/vnd.android.package-archive");
            install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(install);
        } catch (Exception e) {
            toast("Kurulum ekranı açılamadı: " + e.getMessage());
        }
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
        @JavascriptInterface public void openAcademy() { runOnUiThread(() -> webView.loadUrl(ACADEMY)); }
        @JavascriptInterface public void openHome() { runOnUiThread(() -> webView.loadUrl(HOME)); }
        @JavascriptInterface public void generateEpisode(String id) { runOnUiThread(() -> MainActivity.this.generateEpisode(id)); }

        @JavascriptInterface
        public void syncAcademyState(String json) {
            MainActivity.this.saveAcademyState(json);
            runOnUiThread(() -> {
                String summary = AdaptiveEpisodeBuilder.summaryJson(MainActivity.this.readAcademyState());
                String js = "window.guaAdaptiveUpdated && window.guaAdaptiveUpdated(JSON.parse(" + JSONObject.quote(summary) + "));";
                webView.evaluateJavascript(js, null);
            });
        }

        @JavascriptInterface public String getAdaptiveSummary() { return AdaptiveEpisodeBuilder.summaryJson(MainActivity.this.readAcademyState()); }
        @JavascriptInterface public void loadStations() { MainActivity.this.loadStations(); }
        @JavascriptInterface public void playRadio(String url, String title) { runOnUiThread(() -> MainActivity.this.playRadio(url, title)); }
        @JavascriptInterface public void playerCommand(String command) { runOnUiThread(() -> MainActivity.this.playerCommand(command, 1f)); }
        @JavascriptInterface public void setPlaybackSpeed(float speed) { runOnUiThread(() -> MainActivity.this.playerCommand("speed", speed)); }
        @JavascriptInterface public String getLevel() { return level(); }

        @JavascriptInterface
        public void setLevel(String value) {
            String v = ("A2".equals(value) || "B1".equals(value) || "B1+".equals(value) || "B2".equals(value)) ? value : "B1+";
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(PREF_LEVEL, v).apply();
            runOnUiThread(() -> toast("GUA seviyesi: " + v));
        }

        @JavascriptInterface public String getVersion() { return BuildConfig.VERSION_NAME; }
        @JavascriptInterface public void checkUpdate() { checkForUpdates(false); }
        @JavascriptInterface public void downloadUpdate(String url) { downloadAndInstallUpdate(url); }
        @JavascriptInterface public void openUrl(String url) { runOnUiThread(() -> openExternal(url)); }

        @JavascriptInterface public String getProjectUrl() {
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
