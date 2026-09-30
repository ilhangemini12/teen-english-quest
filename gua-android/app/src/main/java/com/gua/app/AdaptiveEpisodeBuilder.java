package com.gua.app;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public final class AdaptiveEpisodeBuilder {
    private AdaptiveEpisodeBuilder() {}

    private static final class WeakWord {
        String es;
        String tr;
        String ex;
        int reps;
        double ef;
        String due;
        int errorCount;

        int score() {
            int s = 0;
            if (errorCount > 0) s += 100 + Math.min(50, errorCount * 8);
            if (reps <= 0) s += 35;
            else if (reps == 1) s += 25;
            else if (reps == 2) s += 10;
            if (ef > 0 && ef < 2.2) s += 15;
            if (due != null && !due.isBlank() && due.compareTo(LocalDate.now().toString()) <= 0) s += 10;
            return s;
        }
    }

    public static List<EpisodeLibrary.Segment> fromJson(String json) {
        List<EpisodeLibrary.Segment> out = new ArrayList<>();
        if (json == null || json.isBlank()) return out;

        try {
            JSONObject root = new JSONObject(json);
            List<WeakWord> words = collectWords(root);
            List<JSONObject> civics = collectErrors(root, "civics", "mock-civics");
            List<JSONObject> speaking = collectErrors(root, "speaking", "mock-speaking");
            List<JSONObject> recentInterviews = collectShortInterviews(root);

            if (words.isEmpty() && civics.isEmpty() && speaking.isEmpty() && recentInterviews.isEmpty()) {
                return out;
            }

            out.add(EpisodeLibrary.Segment.speech("tr-TR",
                    "GUA This Week. Bu bölüm Academy'deki gerçek zayıf noktalarından otomatik hazırlandı. Ekrana bakma; İspanyolca bölümlerde yüksek sesle cevap ver."));
            out.add(EpisodeLibrary.Segment.pause(3));

            if (!words.isEmpty()) {
                out.add(EpisodeLibrary.Segment.speech("tr-TR",
                        "Önce zorlandığın kelime ve kalıplar. Kelimeyi duyunca anlamını hatırla, sonra örnek cümleyi tekrar et."));
                out.add(EpisodeLibrary.Segment.pause(2));

                for (int i = 0; i < Math.min(8, words.size()); i++) {
                    WeakWord w = words.get(i);
                    out.add(EpisodeLibrary.Segment.speech("es-MX", w.es));
                    out.add(EpisodeLibrary.Segment.pause(3));
                    if (w.tr != null && !w.tr.isBlank()) {
                        out.add(EpisodeLibrary.Segment.speech("tr-TR", "Anlamı: " + w.tr));
                    }
                    if (w.ex != null && !w.ex.isBlank()) {
                        out.add(EpisodeLibrary.Segment.speech("es-MX", w.ex));
                        out.add(EpisodeLibrary.Segment.pause(5));
                    } else {
                        out.add(EpisodeLibrary.Segment.speech("es-MX", "Usa esta expresión en una frase propia: " + w.es));
                        out.add(EpisodeLibrary.Segment.pause(6));
                    }
                }
            }

            if (!civics.isEmpty()) {
                out.add(EpisodeLibrary.Segment.speech("tr-TR",
                        "Şimdi daha önce yanlış yaptığın civics soruları. Önce cevabı kendin söyle."));
                out.add(EpisodeLibrary.Segment.pause(2));
                for (int i = 0; i < Math.min(5, civics.size()); i++) {
                    JSONObject e = civics.get(i);
                    String q = e.optString("prompt", "");
                    String correct = e.optString("correct", "");
                    if (q.isBlank()) continue;
                    out.add(EpisodeLibrary.Segment.speech("es-MX", q));
                    out.add(EpisodeLibrary.Segment.pause(7));
                    if (!correct.isBlank()) {
                        out.add(EpisodeLibrary.Segment.speech("es-MX", "Respuesta correcta: " + correct));
                        out.add(EpisodeLibrary.Segment.pause(4));
                    }
                }
            }

            List<JSONObject> speakingPool = new ArrayList<>();
            speakingPool.addAll(speaking);
            speakingPool.addAll(recentInterviews);

            if (!speakingPool.isEmpty()) {
                out.add(EpisodeLibrary.Segment.speech("tr-TR",
                        "Son bölüm konuşma. Soruyu dinle ve en az kırk beş saniye doğal cevap ver. Ezberleme."));
                out.add(EpisodeLibrary.Segment.pause(2));
                for (int i = 0; i < Math.min(3, speakingPool.size()); i++) {
                    JSONObject e = speakingPool.get(i);
                    String q = e.optString("prompt", e.optString("q", ""));
                    if (q.isBlank()) continue;
                    out.add(EpisodeLibrary.Segment.speech("es-MX", q));
                    out.add(EpisodeLibrary.Segment.pause(12));
                    out.add(EpisodeLibrary.Segment.speech("es-MX",
                            "Ahora responde otra vez, pero con una idea principal, un detalle concreto y una frase final."));
                    out.add(EpisodeLibrary.Segment.pause(12));
                }
            }

            out.add(EpisodeLibrary.Segment.speech("tr-TR",
                    "Bölüm bitti. Bir sonraki Academy çalışmandan sonra This Week otomatik değişecek."));
            out.add(EpisodeLibrary.Segment.pause(2));
            return out;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private static List<WeakWord> collectWords(JSONObject root) {
        List<WeakWord> all = new ArrayList<>();
        JSONObject errorCounts = new JSONObject();

        JSONArray errors = root.optJSONArray("errors");
        if (errors != null) {
            for (int i = 0; i < errors.length(); i++) {
                JSONObject e = errors.optJSONObject(i);
                if (e == null || e.optBoolean("resolved", false)) continue;
                if (!"srs".equals(e.optString("type"))) continue;
                String key = e.optString("prompt", "").trim().toLowerCase();
                if (!key.isBlank()) {
                    try {
                        errorCounts.put(key, errorCounts.optInt(key, 0) + Math.max(1, e.optInt("count", 1)));
                    } catch (Exception ignored) {}
                }
            }
        }

        JSONArray words = root.optJSONArray("words");
        if (words != null) {
            for (int i = 0; i < words.length(); i++) {
                JSONObject x = words.optJSONObject(i);
                if (x == null) continue;
                WeakWord w = new WeakWord();
                w.es = x.optString("es", "").trim();
                if (w.es.isBlank()) continue;
                w.tr = x.optString("tr", "");
                w.ex = x.optString("ex", "");
                w.reps = x.optInt("reps", 0);
                w.ef = x.optDouble("ef", 2.5);
                w.due = x.optString("due", "");
                w.errorCount = errorCounts.optInt(w.es.toLowerCase(), 0);

                if (w.errorCount > 0 || w.reps < 3 || (w.due != null && !w.due.isBlank() && w.due.compareTo(LocalDate.now().toString()) <= 0)) {
                    all.add(w);
                }
            }
        }

        all.sort(Comparator.comparingInt(WeakWord::score).reversed());
        return all;
    }

    private static List<JSONObject> collectErrors(JSONObject root, String... types) {
        List<JSONObject> out = new ArrayList<>();
        JSONArray errors = root.optJSONArray("errors");
        if (errors == null) return out;

        for (int i = 0; i < errors.length(); i++) {
            JSONObject e = errors.optJSONObject(i);
            if (e == null || e.optBoolean("resolved", false)) continue;
            String type = e.optString("type", "");
            boolean match = false;
            for (String t : types) if (t.equals(type)) match = true;
            if (match) out.add(e);
        }

        out.sort((a, b) -> Integer.compare(b.optInt("count", 1), a.optInt("count", 1)));
        return out;
    }

    private static List<JSONObject> collectShortInterviews(JSONObject root) {
        List<JSONObject> out = new ArrayList<>();
        JSONArray interviews = root.optJSONArray("interviews");
        if (interviews == null) return out;

        for (int i = 0; i < Math.min(interviews.length(), 12); i++) {
            JSONObject x = interviews.optJSONObject(i);
            if (x == null) continue;
            String answer = x.optString("a", "").trim();
            int words = answer.isBlank() ? 0 : answer.split("\\s+").length;
            if (words < 45) {
                JSONObject row = new JSONObject();
                try {
                    row.put("q", x.optString("q", ""));
                    row.put("words", words);
                    out.add(row);
                } catch (Exception ignored) {}
            }
        }
        return out;
    }

    public static String summaryJson(String json) {
        JSONObject out = new JSONObject();
        try {
            if (json == null || json.isBlank()) {
                out.put("hasData", false);
                return out.toString();
            }

            JSONObject root = new JSONObject(json);
            List<WeakWord> words = collectWords(root);
            List<JSONObject> civics = collectErrors(root, "civics", "mock-civics");
            List<JSONObject> speaking = collectErrors(root, "speaking", "mock-speaking");
            List<JSONObject> interviews = collectShortInterviews(root);

            out.put("hasData", true);
            out.put("weakWords", Math.min(8, words.size()));
            out.put("civicsErrors", civics.size());
            out.put("speakingErrors", speaking.size());
            out.put("shortInterviews", interviews.size());
            out.put("updatedAt", root.optLong("updatedAt", 0));
        } catch (Exception e) {
            try { out.put("hasData", false); } catch (Exception ignored) {}
        }
        return out.toString();
    }
}
