import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, SafeAreaView } from 'react-native';
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

  // --- KARTA NDEF VERİSİ YAZMA MEKANİZMASI (DEĞİŞTİRİLMEDİ) ---
  async function writeNfcData() {
    let bytes = null;

    try {
      setLoading(true);
      setCardId('Yazma modunda, kartı yaklaştırın...');

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
      }

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        Alert.alert('Başarılı!', 'Veri karta başarıyla işlendi kanka!');
        setCardId('Yazma Başarılı!');
        setWriteMode('NONE'); 
      }
    } catch (ex) {
      console.warn("NFC Yazma Hatası:", ex);
      Alert.alert('Yazma Hatası', 'Kartı erken çekmiş olabilirsin veya bu kart yazılabilir değil.');
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
          Yakındaki bir NFC etiketini taramak için butona dokunun.
        </Text>
        
        <TouchableOpacity style={styles.primaryButton} onPress={startNfcScan} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Kart Oku</Text>}
        </TouchableOpacity>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>DURUM / UID</Text>
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
          Boş bir etikete veya yeniden yazılabilir bir NFC çipine kaydetmek istediğiniz veri tipini seçin.
        </Text>

        <TouchableOpacity style={styles.optionCard} onPress={() => setWriteMode('WEBSITE')}>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>🌐 Web Sitesi</Text>
            <Text style={styles.optionDesc}>Bir URL veya web bağlantısını kodlayın.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => setWriteMode('CONTACT')}>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>👤 Kişi Kartı</Text>
            <Text style={styles.optionDesc}>VCard bilgilerini aktarın. Rehbere ekleme imkanı sağlar.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => setWriteMode('BLUETOOTH')}>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>🎧 Bluetooth</Text>
            <Text style={styles.optionDesc}>Eşleşme bilgilerini yazın. Kulaklıkları hızlıca bağlar.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderWriteForm = () => {
    return (
      <View style={styles.tabContainer}>
        {renderHeader('Veri Girişi')}
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

          <TouchableOpacity style={styles.primaryButton} onPress={writeNfcData} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Karta Yaz</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghostButton} onPress={() => setWriteMode('NONE')} disabled={loading}>
            <Text style={styles.ghostButtonText}>İptal ve Geri Dön</Text>
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
  safeArea: { flex: 1, backgroundColor: COLORS.surface },
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