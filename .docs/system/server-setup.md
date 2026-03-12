# Server Setup – Zapatismo Hosting

## Überblick

Zapatismo wird auf einem **Scaleway VPS** gehostet. Auf demselben Server laufen zwei vollständig isolierte Umgebungen:

- **Staging** – erreichbar unter `staging.deine-domain.com` – wird bei jedem Push auf den `staging`-Branch automatisch deployed. Die Datenbank wird dabei zurückgesetzt und mit Testdaten befüllt. Dient dazu, neue Features in einer echten Umgebung mit echten Testdaten zu verifizieren, bevor sie in Production gehen.

- **Production** – erreichbar unter `deine-domain.com` – wird bei jedem Push auf den `main`-Branch deployed. Keine Datenbankmanipulation – nur Schema-Migrationen werden ausgeführt.

Beide Umgebungen laufen als **Docker-Container** (jeweils Frontend, Backend, MySQL) und sind vollständig voneinander isoliert – eigenes Netzwerk, eigene Datenbank, eigene Volumes. Ein vorgelagerter nginx auf dem Server leitet den Traffic anhand der Subdomain an den jeweiligen Stack weiter.

Das Deployment läuft vollautomatisch via **GitHub Actions** – ein Push genügt.

---

## Architektur auf dem Server

```
Internet
    │
    ▼
Host-nginx (Port 80 / 443)
    ├── staging.deine-domain.com  →  127.0.0.1:30080  →  frontend-staging (Docker)
    │                                                          └── nginx-proxy /api → backend-staging:3000
    │                                                          └── MySQL-Staging (intern)
    │
    └── deine-domain.com          →  127.0.0.1:30081  →  frontend-prod (Docker)
                                                               └── nginx-proxy /api → backend-prod:3000
                                                               └── MySQL-Prod (intern)
```

Von außen sind ausschließlich Port 80 und 443 (HTTP/HTTPS) sowie Port 22 (SSH) erreichbar. Alle anderen Ports – insbesondere MySQL (3306) und das Backend (3000) – sind nur intern innerhalb der Docker-Netzwerke zugänglich.

Weiterführende Details zur nginx-Konfiguration, Angular API URL und Managed MySQL-Migration: siehe [`docker-hosting.md`](./docker-hosting.md).

---

## Server Setup

Schritt-für-Schritt-Anleitung für einen frischen Scaleway-Server (Ubuntu 22.04).

### Schritt 1 – Scaleway-Instanz erstellen

1. Im [Scaleway-Dashboard](https://console.scaleway.com) eine neue **Instance** erstellen.
2. Image: **Ubuntu 22.04 LTS**
3. Typ: `DEV1-S` oder `PLAY2-PICO` reicht für Zapatismo.
4. Beim Erstellen den **öffentlichen SSH-Key** hinterlegen (Inhalt von `~/.ssh/id_ed25519.pub` vom lokalen Rechner). Falls noch kein Key existiert, zuerst einen generieren:
   ```bash
   ssh-keygen -t ed25519 -C "zapatismo-server"
   ```
5. Instanz erstellen und die angezeigte **IP-Adresse** notieren.

---

### Schritt 2 – DNS einrichten

Beim Domain-Anbieter zwei DNS-A-Records anlegen:

| Subdomain            | Typ | Wert           |
|----------------------|-----|----------------|
| `deine-domain.com`   | A   | Server-IP      |
| `staging.deine-domain.com` | A | Server-IP |

DNS-Änderungen können einige Minuten bis Stunden brauchen, bis sie aktiv sind.

---

### Schritt 3 – Per SSH verbinden

```bash
ssh root@DEINE-SERVER-IP
```

---

### Schritt 4 – System aktualisieren

```bash
apt update && apt upgrade -y
```

---

### Schritt 5 – Firewall einrichten

Nur die drei notwendigen Ports freigeben – alles andere bleibt geschlossen:

```bash
apt install -y ufw
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
ufw status
```

> Alternativ kann die Firewall direkt im Scaleway-Dashboard unter **Security Groups** konfiguriert werden – das hat denselben Effekt.

---

### Schritt 6 – Docker installieren

```bash
apt install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Prüfen ob Docker läuft
docker --version
docker compose version
```

---

### Schritt 7 – Repo auf dem Server ablegen

Das Repo wird einmalig geklont. GitHub Actions deployt danach nur noch Docker-Images – der Code selbst muss nicht bei jedem Deploy neu geklont werden.

```bash
mkdir -p /opt/zapatismo
cd /opt/zapatismo
git clone https://github.com/DEIN-ORG/zapatismo.git .
```

> Der Pfad `/opt/zapatismo` wird später als `STAGING_DEPLOY_PATH` und `PROD_DEPLOY_PATH` in den GitHub Actions Secrets hinterlegt.

---

### Schritt 8 – Umgebungsvariablen anlegen

Aus den Beispiel-Dateien im Repo die echten `.env`-Dateien erstellen und befüllen:

```bash
cp .env.staging.example .env.staging
nano .env.staging

cp .env.production.example .env.production
nano .env.production
```

Alle Variablen ausfüllen – insbesondere:
- `REGISTRY_IMAGE_PREFIX` (z.B. `ghcr.io/dein-github-username`)
- `MYSQL_ROOT_PASSWORD` (sicheres Passwort wählen)
- `DATABASE_URL` (muss den MySQL-Service-Namen als Host enthalten: `mysql-staging` bzw. `mysql-prod`)
- `JWT_SECRET` (langen zufälligen String wählen, z.B. `openssl rand -hex 32`)
- Strava API Credentials

Die `.env`-Dateien verlassen den Server **nie** – sie werden nicht ins Repo eingecheckt und nicht von der Pipeline überschrieben.

---

### Schritt 9 – Host-nginx installieren und konfigurieren

```bash
apt install -y nginx
```

Konfigurationsdatei anlegen:

```bash
nano /etc/nginx/sites-available/zapatismo
```

Inhalt (Domains anpassen):

```nginx
# Staging
server {
    listen 80;
    server_name staging.deine-domain.com;
    location / {
        proxy_pass http://127.0.0.1:30080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Production
server {
    listen 80;
    server_name deine-domain.com;
    location / {
        proxy_pass http://127.0.0.1:30081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Konfiguration aktivieren und nginx neu laden:

```bash
ln -s /etc/nginx/sites-available/zapatismo /etc/nginx/sites-enabled/
nginx -t        # Konfiguration auf Fehler prüfen
systemctl reload nginx
```

---

### Schritt 10 – HTTPS mit Let's Encrypt einrichten

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d deine-domain.com -d staging.deine-domain.com
```

Certbot ergänzt die nginx-Konfiguration automatisch um HTTPS und richtet die automatische Zertifikatserneuerung ein. Danach ist die App unter `https://` erreichbar.

---

### Schritt 11 – GitHub Actions Secrets anlegen

Im GitHub-Repository unter **Settings → Secrets and variables → Actions** folgende Secrets anlegen:

| Secret | Wert |
|--------|------|
| `STAGING_SSH_HOST` | IP-Adresse oder Domain des Servers |
| `STAGING_SSH_USER` | `root` (oder der angelegte Deploy-User) |
| `STAGING_SSH_KEY` | Inhalt der privaten Key-Datei (`~/.ssh/id_ed25519`) – komplett inklusive `-----BEGIN...` Zeilen |
| `STAGING_DEPLOY_PATH` | `/opt/zapatismo` |
| `PROD_SSH_HOST` | Selbe IP (gleicher Server) |
| `PROD_SSH_USER` | `root` |
| `PROD_SSH_KEY` | Selber privater Key |
| `PROD_DEPLOY_PATH` | `/opt/zapatismo` |

---

### Schritt 12 – Erstes manuelles Deployment (Bootstrap)

Beim allerersten Deployment müssen die Docker-Images noch nicht in der ghcr.io Registry sein. Daher einmalig lokal oder direkt auf dem Server bauen und starten:

```bash
cd /opt/zapatismo

# Staging
docker compose -f docker-compose.staging.yml up -d --build

# Production
docker compose -f docker-compose.production.yml up -d --build
```

Ab dem zweiten Deployment übernimmt GitHub Actions komplett – Push auf `staging` oder `main` löst den automatischen Deploy aus.

---

### Schritt 13 – Prüfen ob alles läuft

```bash
# Laufende Container anzeigen
docker ps

# Logs eines Services anschauen (z.B. Backend Staging)
docker compose -f docker-compose.staging.yml logs backend-staging

# nginx Status prüfen
systemctl status nginx
```

Anschließend im Browser `https://staging.deine-domain.com` und `https://deine-domain.com` aufrufen – beide sollten die Zapatismo-App zeigen.
