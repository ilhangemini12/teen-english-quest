# Guatemala Citizenship Academy

Kişisel Guatemala vatandaşlık hazırlığı için GitHub Pages üzerinde çalışan bağımsız çalışma merkezi.

## Canlı adres
- Canonical: https://ilhangemini12.github.io/teen-english-quest/guatemala-citizenship-spanish/
- Eski /guatemala/ yolu canonical adrese yönlendirilir.

## Academy v2
- 12 haftalık İspanyolca + Guatemala civics müfredatı
- B1+ → B2 hedefli günlük çalışma akışı
- 220 kelimelik başlangıç SRS havuzu (40 çekirdek + 180 Academy v2)
- 180+ civics çalışma sorusu (15 çekirdek + 166 Academy v2)
- Guatemala tarih / coğrafya / anayasa / devlet yapısı
- kişisel vatandaşlık mülakatı pratiği
- otomatik Hata Defteri
- haftalık Koç analizi
- 20 civics + 5 sözlü görevden oluşan Tam Deneme
- /100 kişisel hazırlık skoru
- Busuu ve Drops çalışma profili / günlük süre kaydı
- JSON export/import
- Supabase üzerinden cihazlar arası otomatik ilerleme senkronu

## Busuu rolü
Busuu ana CEFR dil omurgasıdır:
1. Grammar Review
2. Vocabulary Review
3. Complete Spanish course
4. Speaking / Conversations (abonelik planında varsa)
5. Writing

Haftalık hedef: 4 gün × 15–20 dakika.

## Drops rolü
Guatemala hedefi için **Spanish (Mexican)** önerilir.
- Her iş günü 5–10 dakika
- Öncelik: Review Dojo / zayıf kelime tekrarı
- Vatandaşlık için önemli kelimeler ayrıca Academy SRS havuzuna eklenir.

## Supabase
Academy aynı BatumHub Supabase projesini kullanır. İlerleme ayrı `public.guatemala_progress` tablosunda tutulur. Bu nedenle ana BatumHub `user_progress` JSON verisinin üzerine yazılmaz. RLS politikaları yalnızca oturum açmış kullanıcının kendi satırını okuyup/yazmasına izin verir.

## Yerel veri
Tarayıcıda `gtCitizenLab.v1` anahtarı altında yerel kopya tutulur. Bulut senkronu kapalı olsa bile uygulama çalışır.

## Not
Civics soruları resmî naturalización soru bankası değildir. İçerik Guatemala Anayasası, INE bölgesel/coğrafi materyali ve MINEDUC Formación Ciudadana kapsamına göre çalışma amacıyla hazırlanmıştır. /100 Academy skoru da resmî sınav sonucu değildir.
