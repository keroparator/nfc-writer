import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

// NFC Donanım katmanını ayağa kaldırıyoruz
NfcManager.start();

export default function App() {
  const [loading, setLoading] = useState(false);
  const [cardId, setCardId] = useState('Kart bekleniyor...');
  
  // Mod Yönetimi: 'NONE', 'WEBSITE', 'CONTACT', 'WIFI', 'BLUETOOTH'
  const [writeMode, setWriteMode] = useState('NONE'); 

  // Web Sitesi Modu Durumu
  const [url, setUrl] = useState('https://google.com');

  // Kişi Bilgisi (Contact) Modu Durumları
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Wi-Fi Modu Durumları
  const [ssid, setSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');

  // Bluetooth Modu Durumları
  const [macAddress, setMacAddress] = useState('');

  // --- KART OKUMA MEKANİZMASI ---
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

  // --- KARTA NDEF VERİSİ YAZMA MEKANİZMASI ---
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

      } else if (writeMode === 'WIFI') {
        if (!ssid) {
          Alert.alert('Hata', 'Wi-Fi ağ adı (SSID) zorunludur!');
          setLoading(false);
          return;
        }
        await NfcManager.requestTechnology([NfcTech.Ndef]);
        // Wi-Fi konfigürasyonunu kütüphanenin native fonksiyonu ile oluşturuyoruz
        bytes = Ndef.encodeMessage([
          Ndef.wifiSimpleConnectionRecord(ssid, wifiPassword)
        ]);

      } else if (writeMode === 'BLUETOOTH') {
        if (!macAddress || !macAddress.includes(':')) {
          Alert.alert('Hata', 'Geçerli bir MAC adresi girin (örn: 00:11:22:33:44:55)');
          setLoading(false);
          return;
        }
        await NfcManager.requestTechnology([NfcTech.Ndef]);
        
        // MAC adresini işleme: Parçala, hex formattan integer'a çevir,
        // Little-Endian (ters sıralama) zorunluluğu nedeniyle diziyi tersine çevir.
        const macBytes = macAddress.split(':').reverse().map(hex => parseInt(hex, 16));
        
        // Payload yapısı: Uzunluk (0x08, 0x00 = Toplam 8 byte) + 6 byte MAC adresi
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>NFC Tools Studio</Text>
      
      <View style={styles.cardBox}>
        <Text style={styles.label}>Durum / Okunan ID:</Text>
        <Text style={styles.uidText}>{cardId}</Text>
      </View>

      {/* --- ANA SEÇİM MENÜSÜ --- */}
      {writeMode === 'NONE' && (
        <View style={styles.fullWidth}>
          <TouchableOpacity style={[styles.button, styles.readButton]} onPress={startNfcScan} disabled={loading}>
            <Text style={styles.buttonText}>SADECE KART OKU</Text>
          </TouchableOpacity>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Yazma Modu Seçin:</Text>

          <TouchableOpacity style={[styles.button, styles.writeButton]} onPress={() => setWriteMode('WEBSITE')}>
            <Text style={styles.buttonText}>🌐 WEB SİTESİ YAZ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.contactButton]} onPress={() => setWriteMode('CONTACT')}>
            <Text style={styles.buttonText}>👤 KİŞİ KARTI (CONTACT) YAZ</Text>
          </TouchableOpacity>

          {/* YENİ MODLAR: WİFİ ve BLUETOOTH */}
          <TouchableOpacity style={[styles.button, styles.wifiButton]} onPress={() => setWriteMode('WIFI')}>
            <Text style={styles.buttonText}>📶 WİFİ AĞI YAZ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.bluetoothButton]} onPress={() => setWriteMode('BLUETOOTH')}>
            <Text style={styles.buttonText}>🎧 BLUETOOTH EŞLEŞTİRME YAZ</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- WEB SİTESİ INPUT EKRANI --- */}
      {writeMode === 'WEBSITE' && (
        <View style={styles.fullWidth}>
          <Text style={styles.sectionTitle}>Web Sitesi Linkini Girin:</Text>
          <TextInput style={styles.input} onChangeText={setUrl} value={url} placeholder="https://example.com" placeholderTextColor="#666" />
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={writeNfcData} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>KARTA YAZMA MODUNU AÇ</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setWriteMode('NONE')}>
            <Text style={styles.cancelText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- KİŞİ KARTI INPUT EKRANI --- */}
      {writeMode === 'CONTACT' && (
        <View style={styles.fullWidth}>
          <Text style={styles.sectionTitle}>Kişi Bilgilerini Doldurun:</Text>
          <TextInput style={styles.input} onChangeText={setName} value={name} placeholder="Ad Soyad" placeholderTextColor="#666" />
          <TextInput style={styles.input} onChangeText={setPhone} value={phone} placeholder="Telefon Numarası" keyboardType="phone-pad" placeholderTextColor="#666" />
          <TextInput style={styles.input} onChangeText={setEmail} value={email} placeholder="E-posta Adresi" keyboardType="email-address" placeholderTextColor="#666" />
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={writeNfcData} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>KARTA KİŞİYİ YAZ</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setWriteMode('NONE')}>
            <Text style={styles.cancelText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- WİFİ INPUT EKRANI --- */}
      {writeMode === 'WIFI' && (
        <View style={styles.fullWidth}>
          <Text style={styles.sectionTitle}>Wi-Fi Bilgilerini Doldurun:</Text>
          <TextInput style={styles.input} onChangeText={setSsid} value={ssid} placeholder="Ağ Adı (SSID)" placeholderTextColor="#666" />
          <TextInput style={styles.input} onChangeText={setWifiPassword} value={wifiPassword} placeholder="Ağ Şifresi (Açık ağ ise boş bırakın)" placeholderTextColor="#666" secureTextEntry={false} />
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={writeNfcData} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>KARTA WİFİ YAZ</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setWriteMode('NONE')}>
            <Text style={styles.cancelText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- BLUETOOTH INPUT EKRANI --- */}
      {writeMode === 'BLUETOOTH' && (
        <View style={styles.fullWidth}>
          <Text style={styles.sectionTitle}>Cihazın MAC Adresini Girin:</Text>
          <TextInput style={styles.input} onChangeText={setMacAddress} value={macAddress} placeholder="Örn: A1:B2:C3:D4:E5:F6" placeholderTextColor="#666" autoCapitalize="characters" />
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={writeNfcData} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>KARTA BLUETOOTH YAZ</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setWriteMode('NONE')}>
            <Text style={styles.cancelText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e1e24', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 25 },
  fullWidth: { width: '100%' },
  cardBox: { backgroundColor: '#2a2a35', padding: 15, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 25, borderLeftWidth: 5, borderLeftColor: '#007AFF' },
  label: { color: '#aaa', fontSize: 13, marginBottom: 5 },
  uidText: { color: '#00ffcc', fontSize: 16, fontWeight: 'mono', textAlign: 'center' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'left' },
  divider: { height: 1, backgroundColor: '#444', width: '100%', marginVertical: 20 },
  input: { backgroundColor: '#2a2a35', color: '#fff', width: '100%', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 15, borderWidth: 1, borderColor: '#444' },
  button: { width: '100%', paddingVertical: 14, borderRadius: 30, elevation: 3, alignItems: 'center', marginBottom: 12 },
  readButton: { backgroundColor: '#34c759' },
  writeButton: { backgroundColor: '#007AFF' },
  contactButton: { backgroundColor: '#af52de' },
  wifiButton: { backgroundColor: '#f4a261' },
  bluetoothButton: { backgroundColor: '#2a9d8f' },
  saveButton: { backgroundColor: '#ff9500', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cancelButton: { width: '100%', alignItems: 'center', marginTop: 15 },
  cancelText: { color: '#ff3b30', fontSize: 15, fontWeight: 'bold' }
});