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
- Send öffnet direkt per `mailto:` das konfigurierte Standard-Mailprogramm. Keine Auswahl einer Versandart und kein vorgeschalteter Bestätigungsdialog.
- Empfänger: `info@taberna-flamenca.com`. Betreff: ausschließlich die Meldungsnummer, beispielsweise `TF-20261022-221735`.
- Nummer und Datum entstehen beim Send-Klick aus derselben lokalen Gerätezeit. Das Sekundenformat garantiert keine absolute Eindeutigkeit zwischen Geräten.
- Der deutsche Nachrichtentext enthält Nummer, Kategorie, Datum, Uhrzeit und Beschreibung. Freitext wird nicht übersetzt.

## Fotos und Standard-Mailprogramm

`mailto:` kann keine Fotoanhänge hinzufügen. Die Anwendung verwendet deshalb keine native Share-Auswahl mehr und behauptet keine automatische Übergabe von Fotos.

Der Hinweis zum manuellen Anhängen steht bereits beim Fotoeingabefeld. Send öffnet auch bei Fotos direkt das Mailprogramm. Anschließend bleiben die Fotos vorübergehend in einem Hinweisdialog mit einzelnen Downloadlinks verfügbar. Die Mitarbeiter können sie speichern und im Mailprogramm manuell anhängen. „Finalizar“ (oder Schließen des Dialogs) verwirft danach die Eingaben und Vorschau-URLs. Der E-Mail-Text nennt die Anzahl der Fotos zum manuellen Anhängen, ohne sie als bereits angehängt auszugeben.

Bei reinen Textmeldungen wird das Formular sofort nach dem Öffnungsversuch zurückgesetzt. Die App kann nicht erkennen, ob ein Mailprogramm installiert ist, ob ein Betriebssystemhinweis bestätigt wird oder ob die E-Mail tatsächlich versandt wird. Geräte oder Browser können beim Öffnen externer Anwendungen eigene Hinweise anzeigen. Sehr lange Texte können auf Längenbeschränkungen von Mail-Links treffen.

Keine Datenbank, kein localStorage, keine automatischen Uploads, keine Analyse- oder Übersetzungsdienste. Texte und Fotos bleiben im Arbeitsspeicher der aktuellen Seite. Nur ausdrücklich vom Mitarbeiter heruntergeladene Fotos werden lokal gespeichert. Neuladen verliert die Eingaben.

## Tests

Die Cloud-Umgebung enthält Node.js, Python 3, Playwright und Chromium; die Anwendung selbst benötigt Playwright nicht.

```sh
node --test tests/report.test.cjs
# Optional mit installierten WebKit-Binaries:
RUN_WEBKIT=1 node --test tests/report.test.cjs
```

Geprüft werden Kategorien, Validierung, Fotoverwaltung, Cancel, lokale Nummer, deutscher Nachrichtentext, direkter Mail-Aufruf ohne Versanddialog, Empfänger und Betreff, Sonderzeichen, Zurücksetzen sowie iPad-/iPhone-Abmessungen in Hoch- und Querformat. Echte Kameraaufnahme und die externe Mail-App müssen auf einem iPhone/iPad geprüft werden. WebKit konnte in der Cloud wegen gesperrter Download-Domains nicht installiert werden.
