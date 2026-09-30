# Guatemala Citizenship Spanish Lab

Kişisel Guatemala vatandaşlık hazırlığı için GitHub üzerinde çalışan bağımsız çalışma merkezi.

## İçerik
- 12 haftalık İspanyolca + Guatemala civics müfredatı
- B1+ → B2 hedefli çalışma akışı
- Browser-local ilerleme, seri ve hazırlık skoru
- Basitleştirilmiş SM-2 spaced-repetition kelime sistemi
- Guatemala tarih / coğrafya / anayasa / devlet yapısı quizleri
- Vatandaşlık görüşmesi için kişisel İspanyolca soru-cevap provası
- Busuu ve Drops çalışma profili, günlük görev ve süre kaydı
- JSON export/import ile iş ve ev bilgisayarı arasında veri taşıma

## Busuu rolü
Busuu ana CEFR dil omurgasıdır. Önerilen sıra:
1. Grammar Review
2. Vocabulary Review
3. Complete Spanish course
4. Speaking / Conversations (abonelik planında varsa)
5. Writing

Haftalık hedef: 4 gün × 15–20 dakika.

## Drops rolü
Guatemala hedefi için Latin Amerika kullanımına daha yakın olduğu için **Spanish (Mexican)** önerilir.
- Her iş günü 5–10 dakika
- Öncelik: Review Dojo / zayıf kelime tekrarı
- Vatandaşlık için önemli kelimeleri ayrıca bu sitenin SRS havuzuna ekle

## Entegrasyon modeli
Busuu ve Drops bireysel kullanıcı ilerlemesini çekebileceğimiz belgelenmiş bir public API sunmadığı için hesap şifresi istenmez ve saklanmaz. Site, dış uygulama çalışmasını hedefler, uygulamayı açar ve sonuç/süreyi tek merkezde manuel olarak kaydeder.

## Veri
Tüm ilerleme browser `localStorage` içinde `gtCitizenLab.v1` anahtarında tutulur. Farklı cihazlar için Veri sekmesinden JSON export/import kullanılabilir.

## Hazırlık skoru
Site içindeki /100 hazırlık skoru resmi bir vatandaşlık veya dil sınavı notu değildir. Kelime ustalığı, civics doğruluğu, mülakat pratiği ve son 7 günlük çalışma düzeninden hesaplanan kişisel bir çalışma göstergesidir.
