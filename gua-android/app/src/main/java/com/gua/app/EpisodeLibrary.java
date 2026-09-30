package com.gua.app;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class EpisodeLibrary {
    private EpisodeLibrary() {}

    public static final class Segment {
        public final String text;
        public final String languageTag;
        public final int silenceSeconds;

        private Segment(String text, String languageTag, int silenceSeconds) {
            this.text = text;
            this.languageTag = languageTag;
            this.silenceSeconds = silenceSeconds;
        }

        public static Segment speech(String languageTag, String text) {
            return new Segment(text, languageTag, 0);
        }

        public static Segment pause(int seconds) {
            return new Segment("", "", seconds);
        }

        public boolean isPause() {
            return silenceSeconds > 0;
        }
    }

    public static String title(String id) {
        switch (id) {
            case "interview": return "GUA Gym — Interview Drill";
            case "civics": return "GUA Gym — Guatemala Civics";
            case "formal": return "GUA Gym — Formal Spanish";
            case "shadow": return "GUA Gym — Shadowing Mix";
            default: return "GUA Gym — Daily Spanish";
        }
    }

    public static List<Segment> get(String id) {
        switch (id) {
            case "interview": return interview();
            case "civics": return civics();
            case "formal": return formal();
            case "shadow": return shadow();
            default: return daily();
        }
    }

    private static List<Segment> daily() {
        return new ArrayList<>(Arrays.asList(
            Segment.speech("tr-TR", "GUA Gym modu. Şimdi sadece dinle. Her İspanyolca cümleden sonra yüksek sesle tekrar et."),
            Segment.pause(3),
            Segment.speech("es-MX", "Quiero hablar con más claridad y naturalidad."),
            Segment.pause(5),
            Segment.speech("es-MX", "Puedo comunicarme en español, pero quiero expresarme con más precisión."),
            Segment.pause(5),
            Segment.speech("es-MX", "Cuando no entiendo una pregunta, pido una aclaración con calma."),
            Segment.pause(5),
            Segment.speech("es-MX", "¿Podría repetir la pregunta, por favor?"),
            Segment.pause(5),
            Segment.speech("es-MX", "¿Podría hablar un poco más despacio?"),
            Segment.pause(5),
            Segment.speech("es-MX", "Si he entendido bien, la pregunta se refiere a mi experiencia personal."),
            Segment.pause(6),
            Segment.speech("es-MX", "En primer lugar, quisiera explicar mi relación con Guatemala."),
            Segment.pause(6),
            Segment.speech("es-MX", "Además, mantengo vínculos familiares importantes con el país."),
            Segment.pause(6),
            Segment.speech("es-MX", "Por esa razón, quiero mejorar mi español formal y cotidiano."),
            Segment.pause(6),
            Segment.speech("es-MX", "Mi objetivo no es memorizar frases. Quiero responder con naturalidad."),
            Segment.pause(7),
            Segment.speech("tr-TR", "Şimdi son dört cümleyi ekrana bakmadan kendi sözlerinle birleştir."),
            Segment.pause(12)
        ));
    }

    private static List<Segment> interview() {
        return new ArrayList<>(Arrays.asList(
            Segment.speech("tr-TR", "Mülakat provası. Soruyu dinle, beş saniye düşün, sonra cevabını sesli ver."),
            Segment.pause(3),
            Segment.speech("es-MX", "¿Por qué desea adquirir la nacionalidad guatemalteca?"),
            Segment.pause(10),
            Segment.speech("es-MX", "Empiece con una respuesta directa. Después añada contexto personal y termine con una frase breve."),
            Segment.pause(5),
            Segment.speech("es-MX", "¿Qué relación personal y familiar mantiene con Guatemala?"),
            Segment.pause(10),
            Segment.speech("es-MX", "¿Cuándo vivió en Guatemala y a qué se dedicaba profesionalmente?"),
            Segment.pause(10),
            Segment.speech("es-MX", "¿Qué significa Guatemala para su familia actualmente?"),
            Segment.pause(10),
            Segment.speech("es-MX", "¿Qué aspectos de su español desea mejorar antes de una entrevista formal?"),
            Segment.pause(10),
            Segment.speech("es-MX", "¿Qué haría si no entiende una pregunta de un funcionario?"),
            Segment.pause(10),
            Segment.speech("es-MX", "Una respuesta útil puede comenzar así: Permítame aclarar mi situación."),
            Segment.pause(5),
            Segment.speech("es-MX", "Otra opción natural es: En mi caso, el vínculo con Guatemala es principalmente familiar y personal."),
            Segment.pause(7),
            Segment.speech("tr-TR", "Son tur. İki dakikalık tek bir cevapta Guatemala ile bağını, geçmişini ve neden İspanyolca çalıştığını anlat."),
            Segment.pause(15)
        ));
    }

    private static List<Segment> civics() {
        return new ArrayList<>(Arrays.asList(
            Segment.speech("tr-TR", "Guatemala civics. Önce dinle, sonra anahtar cümleyi tekrar et."),
            Segment.pause(3),
            Segment.speech("es-MX", "Guatemala es un Estado libre, independiente y soberano."),
            Segment.pause(6),
            Segment.speech("es-MX", "El sistema de gobierno es republicano, democrático y representativo."),
            Segment.pause(6),
            Segment.speech("es-MX", "La soberanía radica en el pueblo."),
            Segment.pause(6),
            Segment.speech("es-MX", "El poder público se organiza en los organismos Legislativo, Ejecutivo y Judicial."),
            Segment.pause(7),
            Segment.speech("es-MX", "El Congreso de la República ejerce la potestad legislativa."),
            Segment.pause(6),
            Segment.speech("es-MX", "Los tribunales de justicia ejercen la función jurisdiccional."),
            Segment.pause(6),
            Segment.speech("es-MX", "El territorio de Guatemala se divide en departamentos y municipios."),
            Segment.pause(6),
            Segment.speech("es-MX", "Guatemala tiene veintidós departamentos."),
            Segment.pause(6),
            Segment.speech("es-MX", "La independencia de Centroamérica de España se proclamó en mil ochocientos veintiuno."),
            Segment.pause(7),
            Segment.speech("es-MX", "Los Acuerdos de Paz fueron firmados en mil novecientos noventa y seis."),
            Segment.pause(7),
            Segment.speech("tr-TR", "Şimdi üç cümleyle devlet yapısını İspanyolca anlat."),
            Segment.pause(12)
        ));
    }

    private static List<Segment> formal() {
        return new ArrayList<>(Arrays.asList(
            Segment.speech("tr-TR", "Resmî ve idari İspanyolca. Cümleyi duyduktan sonra tekrar et."),
            Segment.pause(3),
            Segment.speech("es-MX", "Quisiera conocer el estado de mi trámite."),
            Segment.pause(6),
            Segment.speech("es-MX", "¿Podría indicarme cuáles son los requisitos pendientes?"),
            Segment.pause(6),
            Segment.speech("es-MX", "Necesito presentar una copia certificada del documento."),
            Segment.pause(6),
            Segment.speech("es-MX", "Quisiera confirmar si el documento todavía está vigente."),
            Segment.pause(6),
            Segment.speech("es-MX", "¿Es necesario comparecer personalmente?"),
            Segment.pause(6),
            Segment.speech("es-MX", "¿Puedo otorgar un poder notarial para dar seguimiento al expediente?"),
            Segment.pause(7),
            Segment.speech("es-MX", "Adjunto los documentos requeridos para acreditar el vínculo familiar."),
            Segment.pause(7),
            Segment.speech("es-MX", "Agradecería que me informaran si debo subsanar algún requisito."),
            Segment.pause(7),
            Segment.speech("es-MX", "De conformidad con la información recibida, presentaré la documentación dentro del plazo."),
            Segment.pause(8),
            Segment.speech("tr-TR", "Şimdi bunlardan üçünü kendi durumuna uyarlayarak söyle."),
            Segment.pause(12)
        ));
    }

    private static List<Segment> shadow() {
        return new ArrayList<>(Arrays.asList(
            Segment.speech("tr-TR", "Shadowing modu. Cümleyi bitirmesini bekleme; yarım saniye geriden aynı ritimle tekrar et."),
            Segment.pause(3),
            Segment.speech("es-MX", "Durante esos años aprendí a desenvolverme en un entorno profesional en español."),
            Segment.pause(4),
            Segment.speech("es-MX", "Desde entonces he mantenido una relación personal importante con Guatemala."),
            Segment.pause(4),
            Segment.speech("es-MX", "Actualmente quiero recuperar fluidez y ampliar mi vocabulario formal."),
            Segment.pause(4),
            Segment.speech("es-MX", "No necesito hablar de manera perfecta; necesito comunicarme de manera clara, precisa y natural."),
            Segment.pause(5),
            Segment.speech("es-MX", "Cuando cometo un error, prefiero corregirlo y volver a utilizar la expresión correctamente."),
            Segment.pause(5),
            Segment.speech("es-MX", "Además de estudiar gramática, practico respuestas espontáneas y situaciones reales."),
            Segment.pause(5),
            Segment.speech("es-MX", "Mi objetivo es poder mantener una conversación sin traducir mentalmente cada frase."),
            Segment.pause(6),
            Segment.speech("tr-TR", "Aynı turu bir kez daha, bu kez daha hızlı ve daha az düşünerek tekrar et."),
            Segment.pause(10)
        ));
    }
}
