// =================================================================================
// NFC CRAFT — ANA UYGULAMA DOSYASI
// =================================================================================
// Bu dosya tek bir ekrandan oluşan bir NFC okuma/yazma uygulamasını içerir.
// Dosyanın genel akışı yukarıdan aşağıya şu şekildedir:
//   1) Dış kütüphane importları ve NFC donanımının başlatılması
//   2) Açık/Koyu tema renk paletleri (lightColors / darkColors)
//   3) Çeviri sözlüğü (translations) — Türkçe ve İngilizce metinler
//   4) App bileşeni: state tanımları, NFC işlemleri, ekran (render) fonksiyonları
//   5) Tema ile birlikte değişen StyleSheet (getStyles fonksiyonu)
// Bir şey ararken bu sıralamayı takip edebilirsin.
// =================================================================================

import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  useColorScheme,
} from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

NfcManager.start();

// =================================================================================
// TEMA RENKLERİ
// =================================================================================
// Sistem temasına ek olarak kullanıcı Settings ekranından manuel geçiş yapabilir.
// themeOverride state'i null ise sistem teması, 'light'/'dark' ise manuel seçim kullanılır.

const lightColors = {
  background: '#f8f9ff',
  surface: '#ffffff',
  surfaceVariant: '#d3e4fe',
  surfaceContainerLowest: '#ffffff',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#434655',
  primary: '#004ac6',
  onPrimary: '#ffffff',
  outlineVariant: '#c3c6d7',
  error: '#ba1a1a',
};

const darkColors = {
  background: '#0b1420',
  surface: '#11233a',
  surfaceVariant: '#1f3a5f',
  surfaceContainerLowest: '#16263c',
  onSurface: '#eef1f8',
  onSurfaceVariant: '#aab2c5',
  primary: '#7da9ff',
  onPrimary: '#06182f',
  outlineVariant: '#33415a',
  error: '#ff6b6b',
};

// =================================================================================
// CEVIRI SOZLUGU
// =================================================================================
// Tüm arayüz ve Alert metinleri burada tutulur. Dinamik içerik gerektiren anahtarlar
// fonksiyon olarak tanımlanır (örn. cardCapturedMsg). t() ile aktif dile göre okunur.
// statusKey state'i bu anahtarları tutar; böylece dil değişince status otomatik güncellenir.

const translations = {
  tr: {
    readTabTitle: 'NFC Oku',
    writeTabTitle: 'NFC Yaz',
    settingsTabTitle: 'Ayarlar',
    statusLabel: 'DURUM',

    waitingForScan: 'Tarama için bekleniyor...',
    readingMode: 'Okuma modunda, kartı yaklaştırın...',
    cardCapturedTitle: 'Kart Yakalandı!',
    cardCapturedMsg: (uid) => `UID: ${uid}`,
    readCancelled: 'Okuma iptal edildi.',
    scanPrompt: 'NFC taramasını başlatmak için tıklayın.',
    readButton: 'Kart Oku',

    writeOptionsPrompt: 'Yazmak istediğiniz verinin tipini seçin.',
    copyTitle: 'Kopyala',
    copyDesc: 'Bir karttaki veriyi okuyup başka bir karta birebir kopyalar.',
    websiteTitle: 'Web Sitesi',
    websiteDesc: 'Okutulduğunda otomatik olarak web sitesine gider.',
    contactTitle: 'Kişi Kartı',
    contactDesc: 'Okutulduğunda kişiyi rehbere kaydeder.',
    bluetoothTitle: 'Bluetooth',
    bluetoothDesc: 'Okutulduğunda bluetooth cihazınızı otomatik olarak eşler.',
    eraseTitle: 'Veri Sil',
    eraseDesc: 'Kartın içindeki mevcut tüm NDEF verilerini temizler.',

    eraseHeaderTitle: 'Veri Silme',
    copyHeaderTitle: 'Kart Kopyalama',
    dataEntryHeaderTitle: 'Veri Girişi',

    eraseButton: 'Kartı Temizle',
    writeButton: 'Veriyi Yaz',
    copyStep1Button: 'Kartı Oku ve Kopyala',
    copyStep2Button: 'Hafızadakini Yapıştır',
    cancelButton: 'İptal',

    websiteLabel: 'Web Sitesi Linki',
    nameLabel: 'Ad Soyad',
    phoneLabel: 'Telefon Numarası',
    emailLabel: 'E-posta Adresi',
    macLabel: 'MAC Adresi',
    placeholderEmail: 'ornek@mail.com',

    eraseInfo: 'Kartın içeriğini kalıcı olarak silmek için telefonu karta yaklaştırıp aşağıdaki butona basın.',
    copyStep1Info: 'Adım 1: Kopyalamak istediğiniz veriyi içeren kartı telefonunuza yaklaştırın ve aşağıdaki butona basın.',
    copyStep2Info: 'Adım 2: Veri hafızaya alındı! Şimdi verinin yazılacağı kartı yaklaştırın ve yapıştır butonuna basın.',

    errorTitle: 'Hata',
    urlEmptyError: 'Link alanı boş bırakılamaz!',
    contactRequiredError: 'İsim ve Telefon alanları zorunludur!',
    macInvalidError: 'Geçerli bir MAC adresi girin (örn: 00:11:22:33:44:55)',
    writeGenericError: 'Kartı erken çekmiş olabilirsin veya bu kart desteklenmiyor.',
    noDataError: 'Bu kartta kopyalanabilecek bir veri (NDEF) bulunamadı veya kart boş.',
    copyReadError: 'Kart okunamadı veya erken çektiniz. NDEF formatlı olduğundan emin olun.',
    encodeError: 'Kopyalanan veri yazılabilir formata dönüştürülemedi. Lütfen tekrar deneyin.',
    copyWriteError: 'Yazma başarısız. Kartı erken çekmiş olabilirsin veya kart kilitli olabilir.',

    successTitle: 'Başarılı!',
    eraseSuccessMsg: 'Kart başarıyla temizlendi.',
    writeSuccessMsg: 'Veri karta başarıyla yazıldı.',
    copySavedTitle: 'Hafızaya Alındı!',
    copySavedMsg: 'Veri kopyalandı. Şimdi verinin yazılacağı kartı yaklaştırın.',
    copyWriteSuccessMsg: 'Hafızadaki veri yeni karta başarıyla yazıldı.',

    eraseModeStatus: 'Silme modunda, kartı yaklaştırın...',
    writeModeStatus: 'Yazma modunda, kartı yaklaştırın...',
    eraseSuccessStatus: 'Silme Başarılı!',
    writeSuccessStatus: 'Yazma Başarılı!',
    eraseFailStatus: 'Silme başarısız.',
    writeFailStatus: 'Yazma başarısız.',
    copyStep1ReadingStatus: 'Kaynak kartı okumak için yaklaştırın...',
    copyDataWaitingStatus: 'Veri hafızada bekliyor.',
    noDataStatus: 'Veri bulunamadı.',
    copyReadFailStatus: 'Okuma başarısız.',
    copyStep2WritingStatus: 'Hedef kartı yazmak için yaklaştırın...',
    copyCompleteStatus: 'Kopyalama Tamamlandı!',

    navRead: 'Oku',
    navWrite: 'Yaz',
    navSettings: 'Ayarlar',

    settingsLanguageSection: 'Dil',
    settingsThemeSection: 'Tema',
    langTurkish: 'Türkçe',
    langEnglish: 'İngilizce',
    themeSystem: 'Sistem',
    themeLight: 'Açık',
    themeDark: 'Koyu',
    settingsThemeNote: 'Sistem seçildiğinde cihazınızın tema ayarı kullanılır.',
  },

  en: {
    readTabTitle: 'NFC Read',
    writeTabTitle: 'NFC Write',
    settingsTabTitle: 'Settings',
    statusLabel: 'STATUS',

    waitingForScan: 'Waiting for scan...',
    readingMode: 'Reading mode, bring the card closer...',
    cardCapturedTitle: 'Card Captured!',
    cardCapturedMsg: (uid) => `UID: ${uid}`,
    readCancelled: 'Reading cancelled.',
    scanPrompt: 'Tap the button to start the NFC scan.',
    readButton: 'Scan Card',

    writeOptionsPrompt: 'Select the type of data you want to write.',
    copyTitle: 'Copy',
    copyDesc: 'Reads data from one card and copies it identically to another.',
    websiteTitle: 'Website',
    websiteDesc: 'Automatically opens the website when scanned.',
    contactTitle: 'Contact Card',
    contactDesc: 'Saves the contact to the address book when scanned.',
    bluetoothTitle: 'Bluetooth',
    bluetoothDesc: 'Automatically pairs your bluetooth device when scanned.',
    eraseTitle: 'Erase Data',
    eraseDesc: 'Clears all existing NDEF data currently on the card.',

    eraseHeaderTitle: 'Erase Data',
    copyHeaderTitle: 'Card Copying',
    dataEntryHeaderTitle: 'Data Entry',

    eraseButton: 'Clear Card',
    writeButton: 'Write Data',
    copyStep1Button: 'Read and Copy Card',
    copyStep2Button: 'Paste From Memory',
    cancelButton: 'Cancel',

    websiteLabel: 'Website Link',
    nameLabel: 'Full Name',
    phoneLabel: 'Phone Number',
    emailLabel: 'Email Address',
    macLabel: 'MAC Address',
    placeholderEmail: 'example@mail.com',

    eraseInfo: 'Bring the phone close to the card and press the button below to permanently erase its content.',
    copyStep1Info: 'Step 1: Bring the source card close to your phone and press the button below. The data will be read and stored in memory.',
    copyStep2Info: 'Step 2: Data stored! Now bring the target card close to your phone and press the paste button.',

    errorTitle: 'Error',
    urlEmptyError: 'The link field cannot be left empty!',
    contactRequiredError: 'Name and phone number fields are required!',
    macInvalidError: 'Enter a valid MAC address (e.g. 00:11:22:33:44:55)',
    writeGenericError: 'You may have removed the card too soon, or this card is not supported.',
    noDataError: 'No copyable data (NDEF) was found on this card, or the card is empty.',
    copyReadError: 'The card could not be read or was removed too soon. Make sure it is NDEF formatted.',
    encodeError: 'The copied data could not be converted to a writable format. Please try again.',
    copyWriteError: 'Writing failed. You may have removed the card too soon, or it might be locked.',

    successTitle: 'Success!',
    eraseSuccessMsg: 'The card was cleared successfully.',
    writeSuccessMsg: 'The data was written to the card successfully.',
    copySavedTitle: 'Saved to Memory!',
    copySavedMsg: 'Data copied. Now bring the card you want to write it to close to your phone.',
    copyWriteSuccessMsg: 'The data in memory was written to the new card successfully.',

    eraseModeStatus: 'Erase mode, bring the card closer...',
    writeModeStatus: 'Write mode, bring the card closer...',
    eraseSuccessStatus: 'Erase successful!',
    writeSuccessStatus: 'Write successful!',
    eraseFailStatus: 'Erase failed.',
    writeFailStatus: 'Write failed.',
    copyStep1ReadingStatus: 'Bring the source card closer to read it...',
    copyDataWaitingStatus: 'Data is waiting in memory.',
    noDataStatus: 'No data found.',
    copyReadFailStatus: 'Reading failed.',
    copyStep2WritingStatus: 'Bring the target card closer to write it...',
    copyCompleteStatus: 'Copy complete!',

    navRead: 'Read',
    navWrite: 'Write',
    navSettings: 'Settings',

    settingsLanguageSection: 'Language',
    settingsThemeSection: 'Theme',
    langTurkish: 'Turkish',
    langEnglish: 'English',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    settingsThemeNote: 'When System is selected, your device theme preference is used.',
  },
};

// =================================================================================
// ANA BILESEN
// =================================================================================
export default function App() {
  // --- TEMA ---
  // useColorScheme sistem temasını okur. themeOverride null ise sistem kullanılır,
  // 'light'/'dark' seçilmişse o değer öncelik kazanır.
  const systemColorScheme = useColorScheme();
  const [themeOverride, setThemeOverride] = useState(null);
  const effectiveScheme = themeOverride ?? systemColorScheme;
  const colors = effectiveScheme === 'dark' ? darkColors : lightColors;
  const styles = useMemo(() => getStyles(colors), [colors]);

  // --- DIL ---
  // Varsayılan dil İngilizce. t() aktif dile göre çeviriyi döndürür.
  const [language, setLanguage] = useState('en');
  const t = (key, ...args) => {
    const entry = translations[language][key];
    return typeof entry === 'function' ? entry(...args) : entry;
  };

  // --- STATUS STATE'I ---
  // statusKey: çeviri anahtarını tutar — dil değişince otomatik güncellenir.
  // statusExtra: UID gibi çeviri gerektirmeyen ham değerleri tutar; varsa öncelik alır.
  const [statusKey, setStatusKey] = useState('waitingForScan');
  const [statusExtra, setStatusExtra] = useState(null);
  const statusText = statusExtra ?? t(statusKey);

  // --- NFC VE FORM STATE'LERI ---
  const [loading, setLoading] = useState(false);
  const [writeMode, setWriteMode] = useState('NONE');
  const [url, setUrl] = useState('https://google.com');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [macAddress, setMacAddress] = useState('');

  // --- ALT MENU STATE'I ---
  const [activeTab, setActiveTab] = useState('READ');

  // --- KOPYALAMA AKISI STATE'LERI ---
  const [copyStep, setCopyStep] = useState(1);
  const [copiedRecords, setCopiedRecords] = useState(null);

  const resetStatus = () => { setStatusKey('waitingForScan'); setStatusExtra(null); };

  // ===============================================================================
  // NFC ISLEMLERI
  // ===============================================================================

  // Kartı okur ve UID'yi ekrana basar.
  async function startNfcScan() {
    try {
      setLoading(true);
      setStatusKey('readingMode');
      setStatusExtra(null);
      await NfcManager.requestTechnology([NfcTech.NfcA]);
      const tag = await NfcManager.getTag();
      setStatusExtra(tag.id);
      Alert.alert(t('cardCapturedTitle'), t('cardCapturedMsg', tag.id));
    } catch (ex) {
      console.warn(ex);
      setStatusKey('readCancelled');
      setStatusExtra(null);
    } finally {
      NfcManager.cancelTechnologyRequest();
      setLoading(false);
    }
  }

  // writeMode'a göre karta NDEF verisi yazar veya kartı temizler.
  async function writeNfcData() {
    let bytes = null;
    try {
      setLoading(true);
      setStatusExtra(null);
      setStatusKey(writeMode === 'ERASE' ? 'eraseModeStatus' : 'writeModeStatus');

      if (writeMode === 'WEBSITE') {
        if (!url) { Alert.alert(t('errorTitle'), t('urlEmptyError')); setLoading(false); return; }
        await NfcManager.requestTechnology([NfcTech.Ndef]);
        bytes = Ndef.encodeMessage([Ndef.uriRecord(url)]);

      } else if (writeMode === 'CONTACT') {
        if (!name || !phone) { Alert.alert(t('errorTitle'), t('contactRequiredError')); setLoading(false); return; }
        const vCardData = `BEGIN:VCARD\nVERSION:3.0\nN:;${name};;;\nFN:${name}\nTEL;CELL:${phone}\nEMAIL:${email}\nEND:VCARD`;
        await NfcManager.requestTechnology([NfcTech.Ndef]);
        bytes = Ndef.encodeMessage([Ndef.mimeMediaRecord('text/vcard', vCardData)]);

      } else if (writeMode === 'BLUETOOTH') {
        if (!macAddress || !macAddress.includes(':')) { Alert.alert(t('errorTitle'), t('macInvalidError')); setLoading(false); return; }
        await NfcManager.requestTechnology([NfcTech.Ndef]);
        const macBytes = macAddress.split(':').reverse().map((hex) => parseInt(hex, 16));
        bytes = Ndef.encodeMessage([Ndef.mimeMediaRecord('application/vnd.bluetooth.ep.oob', [0x08, 0x00, ...macBytes])]);

      } else if (writeMode === 'ERASE') {
        await NfcManager.requestTechnology([NfcTech.Ndef]);
        bytes = [0xd0, 0x00, 0x00];
      }

      if (bytes !== null) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        Alert.alert(t('successTitle'), writeMode === 'ERASE' ? t('eraseSuccessMsg') : t('writeSuccessMsg'));
        setStatusKey(writeMode === 'ERASE' ? 'eraseSuccessStatus' : 'writeSuccessStatus');
        setWriteMode('NONE');
      }
    } catch (ex) {
      console.warn('NFC Hata:', ex);
      Alert.alert(t('errorTitle'), t('writeGenericError'));
      setStatusKey(writeMode === 'ERASE' ? 'eraseFailStatus' : 'writeFailStatus');
    } finally {
      NfcManager.cancelTechnologyRequest();
      setLoading(false);
    }
  }

  // Kopyalama Adım 1: kaynak karttaki NDEF verisini okuyup hafızaya alır.
  async function handleCopyStep1() {
    try {
      setLoading(true);
      setStatusExtra(null);
      setStatusKey('copyStep1ReadingStatus');
      await NfcManager.requestTechnology([NfcTech.Ndef]);
      const tag = await NfcManager.getTag();

      if (tag && tag.ndefMessage && tag.ndefMessage.length > 0) {
        setCopiedRecords(tag.ndefMessage);
        Alert.alert(t('copySavedTitle'), t('copySavedMsg'));
        setCopyStep(2);
        setStatusKey('copyDataWaitingStatus');
      } else {
        Alert.alert(t('errorTitle'), t('noDataError'));
        setStatusKey('noDataStatus');
      }
    } catch (ex) {
      console.warn('Kopyalama Okuma Hata:', ex);
      Alert.alert(t('errorTitle'), t('copyReadError'));
      setStatusKey('copyReadFailStatus');
    } finally {
      NfcManager.cancelTechnologyRequest();
      setLoading(false);
    }
  }

  // Kopyalama Adım 2: hafızadaki veriyi hedef karta yazar.
  async function handleCopyStep2() {
    try {
      setLoading(true);
      setStatusExtra(null);
      setStatusKey('copyStep2WritingStatus');
      await NfcManager.requestTechnology([NfcTech.Ndef]);

      if (copiedRecords) {
        let bytes = null;
        try {
          // tag.ndefMessage Uint8Array dönebilir; Ndef.encodeMessage saf Array bekler.
          const formattedRecords = copiedRecords.map((record) => ({
            tnf: record.tnf,
            type: record.type ? Array.from(record.type) : [],
            id: record.id ? Array.from(record.id) : [],
            payload: record.payload ? Array.from(record.payload) : [],
          }));
          bytes = Ndef.encodeMessage(formattedRecords);
        } catch (e) {
          console.warn('Encode Hata:', e);
          Alert.alert(t('errorTitle'), t('encodeError'));
          setLoading(false);
          NfcManager.cancelTechnologyRequest();
          return;
        }

        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        Alert.alert(t('successTitle'), t('copyWriteSuccessMsg'));
        setStatusKey('copyCompleteStatus');
        setCopiedRecords(null);
        setCopyStep(1);
        setWriteMode('NONE');
      }
    } catch (ex) {
      console.warn('Kopyalama Yazma Hata:', ex);
      Alert.alert(t('errorTitle'), t('copyWriteError'));
      setStatusKey('writeFailStatus');
    } finally {
      NfcManager.cancelTechnologyRequest();
      setLoading(false);
    }
  }

  // ===============================================================================
  // EKRAN (RENDER) YARDIMCILARI
  // ===============================================================================

  // Her ekranda görünen ortak başlık. Sağda Settings butonu bulunur.
  const renderHeader = (title) => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity style={styles.settingsButton} onPress={() => setActiveTab('SETTINGS')}>
        <Text style={styles.settingsButtonIcon}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );

  // "Oku" sekmesi.
  const renderReadTab = () => (
    <View style={styles.tabContainer}>
      {renderHeader(t('readTabTitle'))}
      <View style={styles.readContent}>
        <View style={styles.nfcIconPlaceholder}>
          <Text style={{ fontSize: 64 }}>📡</Text>
        </View>
        <Text style={styles.descriptionText}>{t('scanPrompt')}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={startNfcScan} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryButtonText}>{t('readButton')}</Text>}
        </TouchableOpacity>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>{t('statusLabel')}</Text>
          <Text style={styles.statusValue}>{statusText}</Text>
        </View>
      </View>
    </View>
  );

  // "Yaz" sekmesinin ana seçenek menüsü.
  const renderWriteOptions = () => {
    const options = [
      { mode: 'COPY',      emoji: '📋', titleKey: 'copyTitle',      descKey: 'copyDesc',      onPress: () => { setWriteMode('COPY'); setCopyStep(1); setCopiedRecords(null); } },
      { mode: 'WEBSITE',   emoji: '🌐', titleKey: 'websiteTitle',   descKey: 'websiteDesc',   onPress: () => setWriteMode('WEBSITE') },
      { mode: 'CONTACT',   emoji: '👤', titleKey: 'contactTitle',   descKey: 'contactDesc',   onPress: () => setWriteMode('CONTACT') },
      { mode: 'BLUETOOTH', emoji: '🎧', titleKey: 'bluetoothTitle', descKey: 'bluetoothDesc', onPress: () => setWriteMode('BLUETOOTH') },
      { mode: 'ERASE',     emoji: '🗑️', titleKey: 'eraseTitle',     descKey: 'eraseDesc',     onPress: () => setWriteMode('ERASE') },
    ];

    return (
      <View style={styles.tabContainer}>
        {renderHeader(t('writeTabTitle'))}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.descriptionText}>{t('writeOptionsPrompt')}</Text>
          {options.map(({ mode, emoji, titleKey, descKey, onPress }) => (
            <TouchableOpacity key={mode} style={styles.optionCard} onPress={onPress}>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, mode === 'ERASE' && { color: colors.error }]}>
                  {emoji} {t(titleKey)}
                </Text>
                <Text style={styles.optionDesc}>{t(descKey)}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Seçilen veri tipine göre formu ve aksiyon butonunu gösteren ekran.
  const renderWriteForm = () => {
    let onPressAction = writeNfcData;
    let buttonText = writeMode === 'ERASE' ? t('eraseButton') : t('writeButton');

    if (writeMode === 'COPY') {
      onPressAction = copyStep === 1 ? handleCopyStep1 : handleCopyStep2;
      buttonText = copyStep === 1 ? t('copyStep1Button') : t('copyStep2Button');
    }

    const headerTitle =
      writeMode === 'ERASE' ? t('eraseHeaderTitle') :
      writeMode === 'COPY'  ? t('copyHeaderTitle')  :
      t('dataEntryHeaderTitle');

    return (
      <View style={styles.tabContainer}>
        {renderHeader(headerTitle)}
        <ScrollView contentContainerStyle={styles.scrollContent}>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>{t('statusLabel')}</Text>
            <Text style={styles.statusValue}>{statusText}</Text>
          </View>

          {writeMode === 'WEBSITE' && (
            <View>
              <Text style={styles.inputLabel}>{t('websiteLabel')}</Text>
              <TextInput style={styles.input} onChangeText={setUrl} value={url} placeholder="https://example.com" placeholderTextColor={colors.onSurfaceVariant} autoCapitalize="none" />
            </View>
          )}

          {writeMode === 'CONTACT' && (
            <View>
              <Text style={styles.inputLabel}>{t('nameLabel')}</Text>
              <TextInput style={styles.input} onChangeText={setName} value={name} placeholder="John Doe" placeholderTextColor={colors.onSurfaceVariant} />
              <Text style={styles.inputLabel}>{t('phoneLabel')}</Text>
              <TextInput style={styles.input} onChangeText={setPhone} value={phone} placeholder="+1 555 555 5555" keyboardType="phone-pad" placeholderTextColor={colors.onSurfaceVariant} />
              <Text style={styles.inputLabel}>{t('emailLabel')}</Text>
              <TextInput style={styles.input} onChangeText={setEmail} value={email} placeholder={t('placeholderEmail')} keyboardType="email-address" placeholderTextColor={colors.onSurfaceVariant} autoCapitalize="none" />
            </View>
          )}

          {writeMode === 'BLUETOOTH' && (
            <View>
              <Text style={styles.inputLabel}>{t('macLabel')}</Text>
              <TextInput style={styles.input} onChangeText={setMacAddress} value={macAddress} placeholder="A1:B2:C3:D4:E5:F6" placeholderTextColor={colors.onSurfaceVariant} autoCapitalize="characters" />
            </View>
          )}

          {writeMode === 'ERASE' && (
            <View style={{ marginVertical: 16 }}>
              <Text style={styles.descriptionText}>{t('eraseInfo')}</Text>
            </View>
          )}

          {writeMode === 'COPY' && (
            <View style={{ marginVertical: 16 }}>
              <Text style={styles.descriptionText}>
                {copyStep === 1 ? t('copyStep1Info') : t('copyStep2Info')}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, writeMode === 'ERASE' && { backgroundColor: colors.error }]}
            onPress={onPressAction}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryButtonText}>{buttonText}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostButton}
            onPress={() => { setWriteMode('NONE'); setCopiedRecords(null); setCopyStep(1); }}
            disabled={loading}
          >
            <Text style={styles.ghostButtonText}>{t('cancelButton')}</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    );
  };

  // Settings ekranı: dil ve tema seçimi.
  const renderSettings = () => {
    const OptionButton = ({ label, selected, onPress }) => (
      <TouchableOpacity
        style={[styles.settingsOption, selected && styles.settingsOptionSelected]}
        onPress={onPress}
      >
        <Text style={[styles.settingsOptionText, selected && styles.settingsOptionTextSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    );

    return (
      <View style={styles.tabContainer}>
        {renderHeader(t('settingsTabTitle'))}
        <ScrollView contentContainerStyle={styles.scrollContent}>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>{t('settingsLanguageSection')}</Text>
            <View style={styles.settingsRow}>
              <OptionButton label={t('langEnglish')} selected={language === 'en'} onPress={() => setLanguage('en')} />
              <OptionButton label={t('langTurkish')} selected={language === 'tr'} onPress={() => setLanguage('tr')} />
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>{t('settingsThemeSection')}</Text>
            <View style={styles.settingsRow}>
              <OptionButton label={t('themeSystem')} selected={themeOverride === null}    onPress={() => setThemeOverride(null)} />
              <OptionButton label={t('themeLight')}  selected={themeOverride === 'light'} onPress={() => setThemeOverride('light')} />
              <OptionButton label={t('themeDark')}   selected={themeOverride === 'dark'}  onPress={() => setThemeOverride('dark')} />
            </View>
            <Text style={styles.settingsNote}>{t('settingsThemeNote')}</Text>
          </View>

        </ScrollView>
      </View>
    );
  };

  // ===============================================================================
  // ANA YERLESIM (LAYOUT)
  // ===============================================================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={effectiveScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>

        <View style={styles.contentArea}>
          {activeTab === 'READ'     && renderReadTab()}
          {activeTab === 'WRITE'    && (writeMode === 'NONE' ? renderWriteOptions() : renderWriteForm())}
          {activeTab === 'SETTINGS' && renderSettings()}
        </View>

        <View style={styles.bottomNav}>
          {[
            { tab: 'READ',     icon: '📡', labelKey: 'navRead' },
            { tab: 'WRITE',    icon: '✍️',  labelKey: 'navWrite' },
            { tab: 'SETTINGS', icon: '⚙️',  labelKey: 'navSettings' },
          ].map(({ tab, icon, labelKey }) => (
            <TouchableOpacity
              key={tab}
              style={[styles.navItem, activeTab === tab && styles.navItemActive]}
              onPress={() => {
                setActiveTab(tab);
                if (tab !== 'WRITE') setWriteMode('NONE');
                resetStatus();
              }}
            >
              <Text style={[styles.navIcon, activeTab === tab && styles.navIconActive]}>{icon}</Text>
              <Text style={[styles.navText, activeTab === tab && styles.navTextActive]}>{t(labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </View>
    </SafeAreaView>
  );
}

// =================================================================================
// STILLER
// =================================================================================
// getStyles(colors) ile tema değiştiğinde StyleSheet yeniden oluşturulur.
// Bileşen içinde useMemo kullanarak gereksiz yeniden hesaplamalar önlenir.
function getStyles(colors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.surface,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: { flex: 1, backgroundColor: colors.background },
    contentArea: { flex: 1 },
    tabContainer: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },

    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant,
    },
    headerTitle: { fontSize: 22, fontWeight: '600', color: colors.primary },
    settingsButton: { padding: 6 },
    settingsButtonIcon: { fontSize: 22 },

    readContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    nfcIconPlaceholder: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    },
    descriptionText: { fontSize: 16, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 24, lineHeight: 24 },

    primaryButton: {
      width: '100%',
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      marginTop: 8,
    },
    primaryButtonText: { color: colors.onPrimary, fontSize: 18, fontWeight: '600' },
    ghostButton: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    ghostButtonText: { color: colors.onSurfaceVariant, fontSize: 16, fontWeight: '600' },

    statusCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      borderRadius: 12,
      padding: 16,
      marginTop: 32,
    },
    statusLabel: { fontSize: 12, fontWeight: '500', color: colors.onSurfaceVariant, marginBottom: 4 },
    statusValue: { fontSize: 14, fontWeight: '600', color: colors.onSurface },

    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    optionTextContainer: { flex: 1 },
    optionTitle: { fontSize: 17, fontWeight: '600', color: colors.onSurface, marginBottom: 4 },
    optionDesc: { fontSize: 14, color: colors.onSurfaceVariant, lineHeight: 20 },
    chevron: { fontSize: 24, color: colors.primary, paddingLeft: 16 },

    inputLabel: { fontSize: 14, fontWeight: '500', color: colors.onSurfaceVariant, marginBottom: 8, marginTop: 16 },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      borderRadius: 8,
      padding: 16,
      fontSize: 16,
      color: colors.onSurface,
    },

    settingsSection: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    settingsSectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 14,
    },
    settingsRow: { flexDirection: 'row', gap: 10 },
    settingsOption: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      alignItems: 'center',
    },
    settingsOptionSelected: {
      backgroundColor: colors.surfaceVariant,
      borderColor: colors.primary,
    },
    settingsOptionText: { fontSize: 14, fontWeight: '500', color: colors.onSurfaceVariant },
    settingsOptionTextSelected: { color: colors.primary, fontWeight: '700' },
    settingsNote: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 12, lineHeight: 18 },

    bottomNav: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceContainerLowest,
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant,
      paddingVertical: 8,
      paddingBottom: 16,
    },
    navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginHorizontal: 8, borderRadius: 12 },
    navItemActive: { backgroundColor: colors.surfaceVariant },
    navIcon: { fontSize: 22, opacity: 0.6 },
    navIconActive: { opacity: 1 },
    navText: { fontSize: 11, fontWeight: '500', color: colors.onSurfaceVariant, marginTop: 4 },
    navTextActive: { color: colors.primary, fontWeight: '700' },
  });
}