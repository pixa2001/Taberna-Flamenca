# Taberna Flamenca – Comunicación

Statisches internes Meldesystem mit spanischer Bedienoberfläche. Die vorhandene Startseite, Icons und Bilddateien bleiben erhalten. Alle fünf Kategorien öffnen dieselbe Formularansicht ohne Seitenneuladen.

## Lokal starten

```sh
cd /workspace/Taberna-Flamenca
python3 -m http.server 8000 --bind 127.0.0.1
```

Keine Build-Schritte oder Laufzeitabhängigkeiten. Für GitHub Pages die Dateien `index.html`, `report.css`, `report.js`, `logo.png` und `background.jpg` gemeinsam veröffentlichen. Relative Pfade unterstützen auch Pages unter einem Repository-Unterpfad. Native Dateifreigabe benötigt einen unterstützten Browser und einen sicheren Kontext (HTTPS, wie auf GitHub Pages).

## Bedienung und Daten

- Kategorie wählen, optional Fotos und/oder Text hinzufügen. Leer oder nur mit Leerzeichen ist eine Meldung nicht zulässig.
- „Tomar foto“ bietet über ein Datei-Eingabefeld mit `capture="environment"` die Gerätekamera an, soweit unterstützt. „Elegir fotos“ erlaubt Mehrfachauswahl. Maximal fünf Bilder; jedes ist einzeln entfernbar. Originaldateien bleiben für die Freigabe erhalten. Nicht darstellbare Bildformate erhalten einen Hinweis zur fehlenden Vorschau.
- Cancel verwirft die aktuelle Meldung; bei vorhandenen Daten erfolgt vorher eine spanische Bestätigung.
- Send erzeugt die Meldungsnummer `TF-JJJJMMTT-HHMMSS` aus der lokalen Gerätezeit, Betreff und deutschen Nachrichtentext. Der eingegebene Text bleibt unverändert. Nummer und Datum werden zusammen aus demselben Zeitpunkt gebildet. Das vorgegebene Sekundenformat reduziert Kollisionen, garantiert jedoch keine Eindeutigkeit zwischen Geräten oder innerhalb derselben Sekunde.
- Texte und Bilder bleiben ausschließlich im Arbeitsspeicher der aktuellen Seite. Keine Datenbank, kein localStorage, kein Upload, keine Analyse- oder Übersetzungsdienste. Vorschau-URLs werden beim Entfernen, Abbruch und Abschluss freigegeben. Ein Neuladen verliert die Eingaben.

## Übergabe an Mail auf iPhone/iPad

Bei unterstützter Dateifreigabe prüft die Anwendung `navigator.canShare({ files })` und übergibt die originalen `File`-Objekte, den deutschen Betreff als `title` sowie Nachricht und Empfängerhinweis als `text` an `navigator.share()`. Nach dem Hinweis „Compartir“ antippen und in der Geräteoberfläche die Mail-App wählen.

**Web Share unterstützt kein Empfängerfeld.** Die Adresse `info@taberna-flamenca.com` muss in der ausgewählten Mail-App eingetragen werden. Sie steht im Hinweisdialog und im geteilten Text. Ob Betreff, Text und alle Anhänge übernommen werden, entscheidet die gewählte App. Deshalb vor dem Versand prüfen. Ein erfolgreich aufgelöster Share-Aufruf bestätigt keine versandte E-Mail.

Ohne Dateifreigabe oder nach einem Freigabefehler bietet die Anwendung `mailto:` mit exakt diesem Empfänger, codiertem Betreff und Text an. `mailto:` enthält **keine Fotoanhänge**. Der Dialog erklärt das und bietet für jedes Foto einen ausdrücklich manuell auszulösenden Download zum anschließenden Anhängen an. Das ist eine bewusste lokale Speicherung durch den Mitarbeiter, keine automatische Speicherung der App. Bei reinen Textmeldungen wird unmittelbar dieser Mail-Dialog angeboten. Sehr lange Texte können auf gerätespezifische Längenbeschränkungen von Mail-Links treffen; eine installierte/konfigurierte Mail-App ist erforderlich.

Beim Abbruch der nativen Freigabe oder einem Fehler bleiben die Eingaben erhalten. Nach erfolgreicher Übergabe bzw. Öffnen des Mail-Links werden sie zurückgesetzt; die App behauptet keinen Versand und kann einen späteren Abbruch in der Mail-App nicht feststellen.

## Automatisierte Prüfung

Die Tests benötigen Node.js, Python 3, Playwright und Chromium. In der eingerichteten Cloud-Umgebung sind diese bereits vorhanden; die Anwendung selbst benötigt Playwright nicht.

```sh
node --test tests/report.test.cjs
# Zusätzlich, falls die passenden Playwright-WebKit-Binaries installiert sind:
RUN_WEBKIT=1 node --test tests/report.test.cjs
```

Die Tests starten einen eigenen statischen Server auf Port 8765 und prüfen Kategorien, Validierung, Kamera-Dateifeld, Mehrfachauswahl, Fünf-Foto-Grenze, Vorschauen, Löschen, Cancel, lokale Nummer und deutschen Text, simulierte native Freigabe einschließlich Abbruch/Fehler, Mail-Link-Codierung, Zurücksetzen und iPad-/iPhone-Abmessungen in beiden Ausrichtungen. Native Freigabe wird simuliert, Kamera und die echte Apple-Mail-Oberfläche können damit nicht verifiziert werden.

Vor dem produktiven Einsatz auf einem echten iPhone/iPad über HTTPS prüfen: Kameraaufnahme, Auswahl von fünf Fotos (auch HEIC), Entfernen, Teilen an Mail mit allen Anhängen, Eintragen des Empfängers, Übernahme des Betreffs und Abbruch im Share-Menü. Der WebKit-Download war in der Cloud durch die Netzwerkregeln gesperrt; ein Safari-Test wurde dort nicht durchgeführt.
