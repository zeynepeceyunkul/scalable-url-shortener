# Adım Adım Kurulum ve Çalıştırma

Bu dosyayı sırayla uygulayın.

---

## Adım 1: Bağımlılıkları yükleyin

Proje klasöründe (PowerShell veya CMD):

```powershell
cd C:\Users\User\Desktop\scalable-url-shortener
npm install
```

Bu işlem bitene kadar bekleyin. Hata alırsanız internet bağlantınızı kontrol edin.

---

## Adım 2: Port 3000’i kullanan işlemi kapatın

Port 3000 zaten kullanıldığı için uygulama başlamıyor. Aşağıdakilerden **birini** yapın.

### Seçenek A – PowerShell komutu (tercih edilen)

PowerShell’i **yönetici olarak** açın (sağ tık → “Run as administrator”), sonra:

```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

“Erişim reddedildi” gibi bir hata alırsanız PowerShell’i yönetici olarak açtığınızdan emin olun.

### Seçenek B – Görev Yöneticisi ile

1. `Ctrl + Shift + Esc` ile Görev Yöneticisi’ni açın.
2. “Ayrıntılar” (Details) sekmesine geçin.
3. “PID” sütununa göre sıralayın (isteğe bağlı).
4. Port 3000’i kullanan process’i bulmak için:  
   **PowerShell’de** şunu çalıştırın:  
   `Get-NetTCPConnection -LocalPort 3000`  
   Çıktıdaki **OwningProcess** değeri PID’dir.
5. Görev Yöneticisi’nde bu PID’ye sahip satırı bulun (genelde `node.exe`), sağ tık → “Görevi sonlandır”.

### Seçenek C – Farklı port kullanın

Port 3000’i kapatmak istemiyorsanız uygulamayı 3001’de çalıştırabilirsiniz:

1. Proje klasöründe `.env` dosyası yoksa `.env.example` dosyasını kopyalayın:
   ```powershell
   copy .env.example .env
   ```
2. `.env` dosyasını açın ve şu satırı ekleyin veya değiştirin:
   ```
   PORT=3001
   ```
3. Uygulamayı başlattığınızda artık adres **http://localhost:3001** olacak.

---

## Adım 3: PostgreSQL ve Redis’i başlatın (Docker ile)

Link kısaltma ve cache için veritabanı ve Redis gerekir. Sadece bu iki servisi çalıştırın:

```powershell
cd C:\Users\User\Desktop\scalable-url-shortener
docker compose up -d postgres redis
```

Bir süre bekleyin. `docker compose ps` ile ikisinin de “Up” olduğunu kontrol edin.

Docker yüklü değilse veya çalışmıyorsa: Adım 4’te uygulama başlar ama link oluşturma / yönlendirme istekleri veritabanı hatası verebilir; önce Docker’ı kurup `postgres` ve `redis`’i çalıştırın.

---

## Adım 4: Uygulamayı başlatın

Aynı proje klasöründe:

```powershell
npm run start:dev
```

Şunu görmelisiniz:  
`Nest application successfully started`  
ve  
`Application is running on: http://localhost:3000` (veya `.env`’de PORT=3001 yaptıysanız 3001).

---

## Adım 5: Tarayıcıdan test edin

- **http://localhost:3000** (veya 3001) adresine gidin.
- NestJS varsayılan sayfası veya 404 sayfası görünüyorsa API çalışıyordur.

API’yi denemek için:

```powershell
# Kayıt
curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"password123\"}"
```

---

## Özet kontrol listesi

| Adım | Yapılacak | Durum |
|------|-----------|--------|
| 1    | `npm install` | ☐ |
| 2    | Port 3000’i kapat VEYA `.env`’de PORT=3001 yap | ☐ |
| 3    | `docker compose up -d postgres redis` | ☐ |
| 4    | `npm run start:dev` | ☐ |
| 5    | Tarayıcıda http://localhost:3000 (veya 3001) | ☐ |

---

## Hâlâ “address already in use” alıyorsanız

- Önce `npm run start:dev` çalışan terminali **Ctrl+C** ile kapatın.
- Sonra Adım 2’deki port kapatma komutunu tekrar çalıştırın.
- Ardından tekrar `npm run start:dev` yapın.

## TypeScript / “Cannot find type definition file for 'node'” hatası

Bu düzeltildi. Hâlâ görüyorsanız:

1. `npm install` tekrar çalıştırın.
2. VS Code/Cursor’da: `Ctrl+Shift+P` → “Developer: Reload Window” veya “TypeScript: Restart TS Server”.
