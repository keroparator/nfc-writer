# 📡 NFC Writer & Reader

React Native ve Expo kullanılarak geliştirilmiş, NFC etiketlerini/kartlarını okuma ve farklı formatlarda veri yazma yeteneğine sahip kullanıcı dostu bir mobil uygulamadır.

## 🚀 Özellikler

- **NFC Kart Okuma:** Kartların kimlik numarasını (UID) okur ve ekranda gösterir.
- **Web Sitesi:** Okutulduğunda tarayıcıda otomatik olarak açılan URL'ler yazar.
- **Kişi Kartı (vCard):** Okutulduğunda rehbere doğrudan isim, telefon ve e-posta kaydetmeyi sağlayan vCard formatında veri yazar.
- **Bluetooth Eşleşmesi:** Belirtilen MAC adresi üzerinden cihazların hızlıca eşleşmesini sağlayan Out-of-Band (OOB) verisi yazar.

## 🛠️ Kullanılan Teknolojiler ve Bağımlılıklar

- **Framework:** [Expo (v56)](https://expo.dev/)
- **Kütüphane:** [React Native (v0.85)](https://reactnative.dev/)
- **NFC Yönetimi:** [react-native-nfc-manager](https://github.com/revtel/react-native-nfc-manager)