import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, SafeAreaView, Platform, StatusBar } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

// NFC Donanım katmanını ayağa kaldırıyoruz
NfcManager.start();

const COLORS = {
  background: '#f8f9ff',
  surface: '#ffffff',
  surfaceVariant: '#d3e4fe',
  surfaceContainerLowest: '#ffffff',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#434655',
  primary: '#004ac6',
  onPrimary: '#ffffff',
  primaryContainer: '#2563eb',
  onPrimaryContainer: '#eeefff',
  outlineVariant: '#c3c6d7',
  error: '#ba1a1a',
};

export default function App() {
  // --- ORİJİNAL STATE'LER ---
  const [loading, setLoading] = useState(false);
  const [cardId, setCardId] = useState('Tarama için bekleniyor...');
  const [writeMode, setWriteMode] = useState('NONE'); 
  const [url, setUrl] = useState('https://google.com');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [macAddress, setMacAddress] = useState('');

  // --- YENİ UI STATE'İ (Alt Menü İçin) ---
  const [activeTab, setActiveTab] = useState('READ'); // 'READ' veya 'WRITE'

  // --- YENİ KOPYALAMA STATE'LERİ ---
  const [copyStep, setCopyStep] = useState(1); // 1: Okuma/Hafızaya Alma, 2: Yazma/Yapıştırma
  const [copiedRecords, setCopiedRecords] = useState(null);

  // --- KART OKUMA MEKANİZMASI (DEĞİŞTİRİLMEDİ) ---
  async function startNfcScan() {
    try {
      setLoading(true);
      setCardId('Okuma modunda, kartı yaklaştırın...');
      await NfcManager.requestTechnology([NfcTech.NfcA]);
      const tag = await NfcManager.getTag();
      setCardId(tag.id);
      Alert.alert('Kart Yakalandı!', `UID: ${tag.id}`);
    } catch (ex) {
      console.warn(ex);
      setCardId('Okuma iptal edildi.');
    } finally {
      NfcManager.cancelTechnologyRequest();
      setLoading(false);
    }
  }

  // --- KARTA NDEF VERİSİ YAZMA / SİLME MEKANİZMASI ---
  async function writeNfcData() {
    let bytes = null;

    try {
      setLoading(true);
      setCardId(writeMode === 'ERASE' ? 'Silme modunda, kartı yaklaştırın...' : 'Yazma modunda, kartı yaklaştırın...');

      if (writeMode === 'WEBSITE') {
        if (!url) { 
          Alert.alert('Hata', 'Link alanı boş bırakılamaz!'); 
          setLoading(false); 
          return; 
        }
        await NfcManager.requestTechnology([NfcTech.Ndef]);
        bytes = Ndef.encodeMessage([Ndef.uriRecord(url)]);

      } else if (writeMode === 'CONTACT') {
        if (!name || !phone) { 
          Alert.alert('Hata', 'İsim ve Telefon alanları zorunludur!'); 
          setLoading(false); 
          return; 
        }
        const vCardData = `BEGIN:VCARD\nVERSION:3.0\nN:;${name};;;\nFN:${name}\nTEL;CELL:${phone}\nEMAIL:${email}\nEND:VCARD`;
        await NfcManager.requestTechnology([NfcTech.Ndef]);
        bytes = Ndef.encodeMessage([
          Ndef.mimeMediaRecord('text/vcard', vCardData)
        ]);

      } else if (writeMode === 'BLUETOOTH') {
        if (!macAddress || !macAddress.includes(':')) {
          Alert.alert('Hata', 'Geçerli bir MAC adresi girin (örn: 00:11:22:33:44:55)');
          setLoading(false);
          return;
        }
        await NfcManager.requestTechnology([NfcTech.Ndef]);
        
        const macBytes = macAddress.split(':').reverse().map(hex => parseInt(hex, 16));
        const payload = [0x08, 0x00, ...macBytes];
        
        bytes = Ndef.encodeMessage([
          Ndef.mimeMediaRecord('application/vnd.bluetooth.ep.oob', payload)
        ]);
        
      } else if (writeMode === 'ERASE') {
        await NfcManager.requestTechnology([NfcTech.Ndef]);
        // Boş bir NDEF mesajı ile kartı temizliyoruz
        bytes = [0xD0, 0x00, 0x00];
      }

      if (bytes !== null) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        Alert.alert('Başarılı!', writeMode === 'ERASE' ? 'Kart başarıyla temizlendi.' : 'Veri karta başarıyla yazıldı.');
        setCardId(writeMode === 'ERASE' ? 'Silme Başarılı!' : 'Yazma Başarılı!');
        setWriteMode('NONE'); 
      }
    } catch (ex) {
      console.warn("NFC İşlem Hatası:", ex);
      Alert.alert('Hata', 'Kartı erken çekmiş olabilirsin veya bu kart desteklenmiyor.');
      setCardId(writeMode === 'ERASE' ? 'Silme başarısız.' : 'Yazma başarısız.');
    } finally {
      NfcManager.cancelTechnologyRequest();
      setLoading(false);
    }
  }

  // --- YENİ: KOPYALAMA MEKANİZMASI (ADIM 1 - OKUMA) ---
  async function handleCopyStep1() {
    try {
      setLoading(true);
      setCardId('Kaynak kartı okumak için yaklaştırın...');
      await NfcManager.requestTechnology([NfcTech.Ndef]);
      const tag = await NfcManager.getTag();

      if (tag && tag.ndefMessage && tag.ndefMessage.length > 0) {
        setCopiedRecords(tag.ndefMessage); // Veriyi hiçbir değişiklik yapmadan hafızaya alıyoruz
        Alert.alert('OKUNAN VERİ (DEBUG)', JSON.stringify(tag.ndefMessage)); // DEBUG: ham veriyi göster
        Alert.alert('Hafızaya Alındı!', 'Veri kopyalandı. Şimdi verinin yazılacağı (yapıştırılacağı) kartı yaklaştırın.');
        setCopyStep(2); // 2. adıma (Yazma) geç
        setCardId('Veri hafızada bekliyor.');
      } else {
        Alert.alert('Hata', 'Bu kartta kopyalanabilecek bir veri (NDEF) bulunamadı veya kart boş.');
        setCardId('Veri bulunamadı.');
      }
    } catch (ex) {
      console.warn("Kopyalama (Okuma) Hatası:", ex);
      Alert.alert('Hata', 'Kart okunamadı veya erken çektiniz. Kartın NDEF formatlı olduğundan emin olun.');
      setCardId('Okuma başarısız.');
    } finally {
      NfcManager.cancelTechnologyRequest();
      setLoading(false);
    }
  }

  // --- YENİ: KOPYALAMA MEKANİZMASI (ADIM 2 - YAZMA) ---
  async function handleCopyStep2() {
    try {
      setLoading(true);
      setCardId('Hedef kartı yazmak için yaklaştırın...');
      await NfcManager.requestTechnology([NfcTech.Ndef]);
      
      if (copiedRecords) {
        let bytes = null;
        try {
          // Hafızadaki her kaydı, kütüphanenin kendi record-builder'larıyla yeniden oluşturuyoruz.
          // Ham obje (plain object) vermek yerine Ndef.uriRecord / Ndef.textRecord / Ndef.mimeMediaRecord
          // kullanmak, "undefined is not a function" hatasını önler.
          const rebuiltRecords = copiedRecords.map(record => {
            const typeArr = record.type ? Array.from(record.type) : [];
            const payloadArr = record.payload ? Array.from(record.payload) : [];
            const typeStr = String.fromCharCode(...typeArr);

            // TNF_WELL_KNOWN (1) + RTD_URI ("U")  -> Web Sitesi / URL kartları
            if (record.tnf === 1 && typeStr === 'U') {
              const uri = Ndef.uri.decodePayload(payloadArr);
              return Ndef.uriRecord(uri);
            }

            // TNF_WELL_KNOWN (1) + RTD_TEXT ("T") -> Düz metin kartları
            if (record.tnf === 1 && typeStr === 'T') {
              const text = Ndef.text.decodePayload(payloadArr);
              return Ndef.textRecord(text);
            }

            // TNF_MIME_MEDIA (2) -> vCard (Kişi Kartı) ve Bluetooth kartları
            if (record.tnf === 2) {
              return Ndef.mimeMediaRecord(typeStr, payloadArr);
            }

            // Tanınmayan/diğer tipler için ham veriyle devam etmeyi dene (fallback)
            return {
              tnf: record.tnf,
              type: typeArr,
              id: record.id ? Array.from(record.id) : [],
              payload: payloadArr,
            };
          });

          bytes = Ndef.encodeMessage(rebuiltRecords);
        } catch (e) {
          console.warn("Veri Encode Hatası:", e);
          Alert.alert('Hata', `Dönüştürme hatası: ${e?.message || JSON.stringify(e)}`);
          setLoading(false);
          NfcManager.cancelTechnologyRequest();
          return;
        }
        
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        Alert.alert('Başarılı!', 'Hafızadaki veri yeni karta başarıyla yazıldı.');
        setCardId('Kopyalama Tamamlandı!');
        
        // İşlem bitince hafızayı sıfırla ve menüye dön
        setCopiedRecords(null);
        setCopyStep(1);
        setWriteMode('NONE');
      }
    } catch (ex) {
      console.warn("Kopyalama (Yazma) Hatası:", ex);
      Alert.alert('Hata', 'Yazma başarısız. Kartı erken çekmiş olabilirsin veya kart kilitli olabilir.');
      setCardId('Yazma başarısız.');
    } finally {
      NfcManager.cancelTechnologyRequest();
      setLoading(false);
    }
  }

  // --- RENDER YARDIMCILARI ---
  const renderHeader = (title) => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );

  const renderReadTab = () => (
    <View style={styles.tabContainer}>
      {renderHeader('NFC Oku')}
      <View style={styles.readContent}>
        <View style={styles.nfcIconPlaceholder}>
          <Text style={{ fontSize: 64 }}>📡</Text>
        </View>
        <Text style={styles.descriptionText}>
          NFC taramasını başlatmak için tıklayın.
        </Text>
        
        <TouchableOpacity style={styles.primaryButton} onPress={startNfcScan} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Kart Oku</Text>}
        </TouchableOpacity>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>DURUM</Text>
          <Text style={styles.statusValue}>{cardId}</Text>
        </View>
      </View>
    </View>
  );

  const renderWriteOptions = () => (
    <View style={styles.tabContainer}>
      {renderHeader('NFC Yaz')}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.descriptionText}>
          Yazmak istediğiniz verinin tipini seçin.
        </Text>

        <TouchableOpacity style={styles.optionCard} onPress={() => { setWriteMode('COPY'); setCopyStep(1); setCopiedRecords(null); }}>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>📋 Kopyala</Text>
            <Text style={styles.optionDesc}>Bir karttaki veriyi okuyup başka bir karta birebir kopyalar.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => setWriteMode('WEBSITE')}>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>🌐 Web Sitesi</Text>
            <Text style={styles.optionDesc}>Okutulduğunda otomatik olarak web sitesine gider.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => setWriteMode('CONTACT')}>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>👤 Kişi Kartı</Text>
            <Text style={styles.optionDesc}>Okutulduğunda kişiyi rehbere kaydeder.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => setWriteMode('BLUETOOTH')}>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>🎧 Bluetooth</Text>
            <Text style={styles.optionDesc}>Okutulduğunda bluetooth cihazınızı otomatik olarak eşler.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => setWriteMode('ERASE')}>
          <View style={styles.optionTextContainer}>
            <Text style={[styles.optionTitle, { color: COLORS.error }]}>🗑️ Veri Sil</Text>
            <Text style={styles.optionDesc}>Kartın içindeki mevcut tüm NDEF verilerini temizler.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderWriteForm = () => {
    // Kopyalama veya Normal Yazma için dinamik buton ayarları
    let onPressAction = writeNfcData;
    let buttonText = writeMode === 'ERASE' ? 'Kartı Temizle' : 'Veriyi Yaz';

    if (writeMode === 'COPY') {
      onPressAction = copyStep === 1 ? handleCopyStep1 : handleCopyStep2;
      buttonText = copyStep === 1 ? 'Kartı Oku ve Kopyala' : 'Hafızadakini Yapıştır';
    }

    return (
      <View style={styles.tabContainer}>
        {renderHeader(
          writeMode === 'ERASE' ? 'Veri Silme' : 
          writeMode === 'COPY' ? 'Kart Kopyalama' : 
          'Veri Girişi'
        )}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>DURUM</Text>
            <Text style={styles.statusValue}>{cardId}</Text>
          </View>

          {writeMode === 'WEBSITE' && (
            <View>
              <Text style={styles.inputLabel}>Web Sitesi Linki</Text>
              <TextInput style={styles.input} onChangeText={setUrl} value={url} placeholder="https://example.com" placeholderTextColor={COLORS.onSurfaceVariant} autoCapitalize="none" />
            </View>
          )}

          {writeMode === 'CONTACT' && (
            <View>
              <Text style={styles.inputLabel}>Ad Soyad</Text>
              <TextInput style={styles.input} onChangeText={setName} value={name} placeholder="John Doe" placeholderTextColor={COLORS.onSurfaceVariant} />
              <Text style={styles.inputLabel}>Telefon Numarası</Text>
              <TextInput style={styles.input} onChangeText={setPhone} value={phone} placeholder="+90 555 555 5555" keyboardType="phone-pad" placeholderTextColor={COLORS.onSurfaceVariant} />
              <Text style={styles.inputLabel}>E-posta Adresi</Text>
              <TextInput style={styles.input} onChangeText={setEmail} value={email} placeholder="ornek@mail.com" keyboardType="email-address" placeholderTextColor={COLORS.onSurfaceVariant} autoCapitalize="none" />
            </View>
          )}

          {writeMode === 'BLUETOOTH' && (
            <View>
              <Text style={styles.inputLabel}>MAC Adresi</Text>
              <TextInput style={styles.input} onChangeText={setMacAddress} value={macAddress} placeholder="A1:B2:C3:D4:E5:F6" placeholderTextColor={COLORS.onSurfaceVariant} autoCapitalize="characters" />
            </View>
          )}

          {writeMode === 'ERASE' && (
            <View style={{ marginVertical: 16 }}>
              <Text style={styles.descriptionText}>Kartın içeriğini kalıcı olarak silmek için telefonu karta yaklaştırıp aşağıdaki butona basın.</Text>
            </View>
          )}

          {writeMode === 'COPY' && (
            <View style={{ marginVertical: 16 }}>
              {copyStep === 1 ? (
                <Text style={styles.descriptionText}>
                  Adım 1: Kopyalamak istediğiniz veriyi içeren kartı telefonunuza yaklaştırın ve aşağıdaki butona basın. Veri okunarak hafızaya alınacaktır.
                </Text>
              ) : (
                <Text style={styles.descriptionText}>
                  Adım 2: Veri başarıyla hafızaya alındı! Şimdi verinin yazılacağı yeni kartı telefonunuza yaklaştırın ve aşağıdaki butona basarak veriyi yapıştırın.
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity 
            style={[styles.primaryButton, writeMode === 'ERASE' && { backgroundColor: COLORS.error }]} 
            onPress={onPressAction} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{buttonText}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghostButton} onPress={() => {
            setWriteMode('NONE');
            setCopiedRecords(null);
            setCopyStep(1);
          }} disabled={loading}>
            <Text style={styles.ghostButtonText}>İptal</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* İçerik Alanı */}
        <View style={styles.contentArea}>
          {activeTab === 'READ' ? renderReadTab() : 
            (writeMode === 'NONE' ? renderWriteOptions() : renderWriteForm())}
        </View>

        {/* Alt Navigasyon (Bottom Nav) */}
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={[styles.navItem, activeTab === 'READ' && styles.navItemActive]} 
            onPress={() => { setActiveTab('READ'); setWriteMode('NONE'); }}>
            <Text style={[styles.navIcon, activeTab === 'READ' && styles.navIconActive]}>📡</Text>
            <Text style={[styles.navText, activeTab === 'READ' && styles.navTextActive]}>Oku</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navItem, activeTab === 'WRITE' && styles.navItemActive]} 
            onPress={() => { setActiveTab('WRITE'); }}>
            <Text style={[styles.navIcon, activeTab === 'WRITE' && styles.navIconActive]}>✍️</Text>
            <Text style={[styles.navText, activeTab === 'WRITE' && styles.navTextActive]}>Yaz</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.surface, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1, backgroundColor: COLORS.background },
  contentArea: { flex: 1 },
  tabContainer: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  
  header: { height: 56, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.outlineVariant },
  headerTitle: { fontSize: 22, fontWeight: '600', color: COLORS.primary },
  
  readContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  nfcIconPlaceholder: { width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.outlineVariant, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  descriptionText: { fontSize: 16, color: COLORS.onSurfaceVariant, textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  
  primaryButton: { width: '100%', backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, marginTop: 8 },
  primaryButtonText: { color: COLORS.onPrimary, fontSize: 18, fontWeight: '600' },
  
  ghostButton: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  ghostButtonText: { color: COLORS.onSurfaceVariant, fontSize: 16, fontWeight: '600' },

  statusCard: { width: '100%', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.outlineVariant, borderRadius: 12, padding: 16, marginTop: 32, flexDirection: 'column' },
  statusLabel: { fontSize: 12, fontWeight: '500', color: COLORS.onSurfaceVariant, marginBottom: 4 },
  statusValue: { fontSize: 14, fontWeight: '600', color: COLORS.onSurface },

  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceContainerLowest, borderWidth: 1, borderColor: COLORS.outlineVariant, borderRadius: 16, padding: 20, marginBottom: 16 },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.onSurface, marginBottom: 4 },
  optionDesc: { fontSize: 14, color: COLORS.onSurfaceVariant, lineHeight: 20 },
  chevron: { fontSize: 24, color: COLORS.primary, paddingLeft: 16 },

  inputLabel: { fontSize: 14, fontWeight: '500', color: COLORS.onSurfaceVariant, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.outlineVariant, borderRadius: 8, padding: 16, fontSize: 16, color: COLORS.onSurface },

  bottomNav: { flexDirection: 'row', backgroundColor: COLORS.surfaceContainerLowest, borderTopWidth: 1, borderTopColor: COLORS.outlineVariant, paddingVertical: 8, paddingBottom: 16 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginHorizontal: 16, borderRadius: 12 },
  navItemActive: { backgroundColor: COLORS.surfaceVariant },
  navIcon: { fontSize: 24, opacity: 0.6 },
  navIconActive: { opacity: 1 },
  navText: { fontSize: 12, fontWeight: '500', color: COLORS.onSurfaceVariant, marginTop: 4 },
  navTextActive: { color: COLORS.primary, fontWeight: '700' },
});