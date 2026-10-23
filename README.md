# Taberna Flamenca – Comunicación

Statisches internes Meldesystem mit spanischer Bedienoberfläche. Alle fünf Kategorien öffnen dieselbe Formularansicht ohne Seitenneuladen. Startseite, Icons und Bilddateien bleiben erhalten.

## Lokal starten

```sh
cd /workspace/Taberna-Flamenca
python3 -m http.server 8000 --bind 127.0.0.1
```

Keine Build-Schritte oder Laufzeitabhängigkeiten. Für GitHub Pages `index.html`, `report.css`, `report.js`, `logo.png` und `background.jpg` gemeinsam veröffentlichen. Alle Dateipfade sind relativ.

## Meldungen

- Optional Kameraaufnahme (soweit vom Gerät unterstützt) oder Mehrfachauswahl, maximal fünf Fotos mit Vorschau und einzelnem Löschen.
- Optionaler Beschreibungstext; mindestens Text oder ein Foto ist erforderlich.
- Cancel fragt bei vorhandenen Eingaben vor dem Verwerfen nach.
- Send öffnet direkt das native Teilenmenü, ohne vorgeschalteten Bestätigungsdialog. Je nach Gerät und installierten Apps kann dort beispielsweise Mail oder WhatsApp gewählt werden. Dies gilt auch für Meldungen ohne Fotos.
- Als Titel wird ausschließlich die Meldungsnummer übergeben, beispielsweise `TF-20261022-221735`. Die E-Mail-Empfängeradresse `info@taberna-flamenca.com` und der Betreff stehen zusätzlich im geteilten Text. Web Share kann kein Empfängerfeld vorbelegen; welche Felder eine Ziel-App übernimmt, entscheidet diese App.
- Nummer und Datum entstehen beim Send-Klick aus derselben lokalen Gerätezeit. Das Sekundenformat garantiert keine absolute Eindeutigkeit zwischen Geräten.
- Der deutsche Nachrichtentext enthält Nummer, Kategorie, Datum, Uhrzeit und Beschreibung. Freitext wird nicht übersetzt.

## Teilen und Fallback

Die Anwendung verwendet `navigator.share()` mit deutschem Nachrichtentext und Titel. Bei Fotos prüft sie zuerst `navigator.canShare({ files })` und übergibt die originalen `File`-Objekte. Das benötigt einen unterstützten Browser und einen sicheren Kontext (HTTPS, wie auf GitHub Pages). Die Ziel-App entscheidet über die Übernahme von Titel, Text und Anhängen. Die echte Übergabe an WhatsApp oder Mail ist auf dem jeweiligen Gerät zu prüfen.

Bei Abbruch des Teilenmenüs bleiben alle Eingaben erhalten. Nach erfolgreicher Übergabe wird das Formular zurückgesetzt. Die App bestätigt keinen tatsächlichen Versand.

Fehlt die Teilen-Unterstützung oder schlägt sie fehl, bleiben die Daten erhalten und ein Fallback-Dialog bietet Zurückkehren oder Öffnen einer E-Mail an. Bei Fotos stehen Downloadlinks bereit: `mailto:` kann keine Anhänge hinzufügen. Die Fotos müssen in diesem Fall ausdrücklich manuell angehängt werden. Nur dieser Fallback belegt die Empfängeradresse im Mailprogramm direkt vor; der Betreff bleibt ausschließlich die Meldungsnummer. Sehr lange Texte können auf Längenbeschränkungen von Mail-Links treffen.

Keine Datenbank, kein localStorage, keine automatischen Uploads, keine Analyse- oder Übersetzungsdienste. Texte und Fotos bleiben im Arbeitsspeicher der aktuellen Seite. Nur ausdrücklich vom Mitarbeiter heruntergeladene Fotos werden lokal gespeichert. Neuladen verliert die Eingaben.

## Tests

Die Cloud-Umgebung enthält Node.js, Python 3, Playwright und Chromium; die Anwendung selbst benötigt Playwright nicht.

```sh
node --test tests/report.test.cjs
# Optional mit installierten WebKit-Binaries:
RUN_WEBKIT=1 node --test tests/report.test.cjs
```

Geprüft werden Kategorien, Validierung, Fotoverwaltung, Cancel, lokale Nummer, deutscher Nachrichtentext, direkter Share-Aufruf mit und ohne Fotos, Dateianhänge, Abbruch und Freigabefehler, Mail-Fallback, Empfängerhinweis und Betreff, Sonderzeichen, Zurücksetzen sowie iPad-/iPhone-Abmessungen in Hoch- und Querformat. Echte Kameraaufnahme und die externe Mail-App müssen auf einem iPhone/iPad geprüft werden. WebKit konnte in der Cloud wegen gesperrter Download-Domains nicht installiert werden.

## Google-Bewertungen (Testansicht)

Neu: „Reseñas de Google“ als separater Zugang unter den Meldekategorien. Echte Google-Daten sind noch nicht verbunden. „Probar con datos de ejemplo“ zeigt ausdrücklich gekennzeichnete Testdaten. Markierungen bleiben nur lokal auf diesem Gerät gespeichert; Test- und Echtbetrieb haben getrennte Schlüssel. Mit „Nueva noche“ können sie nach Bestätigung zurückgesetzt werden.

Einrichtung des späteren Google-Backenddienstes, Speichergrenzen und alle Voraussetzungen: [docs/google-reviews.md](docs/google-reviews.md). Für sämtliche Tests `node --test tests/*.test.cjs` verwenden.
