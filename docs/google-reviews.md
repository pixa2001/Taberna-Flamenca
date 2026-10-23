# Google-Bewertungen: Testansicht und spätere Anbindung

## Aktueller Stand

Der zusätzliche Button „Reseñas de Google“ steht getrennt unter den fünf Meldekategorien. Die Ansicht startet ohne echte Anbindung mit einem verständlichen Hinweis. „Probar con datos de ejemplo“ aktiviert drei ausdrücklich als fiktiv gekennzeichnete Bewertungen. Diese werden lokal erzeugt; es findet kein Google-Abruf statt. Aktualisieren, Sortierung nach Erstellzeit, Sterne, Namen, Datum, optionale Texte und Rücknavigation sind implementiert.

Google untersagt Anreize für das Veröffentlichen von Bewertungen, etwa kostenlose Getränke. Deshalb eine echte Getränkeaktion nicht an eine Google-Bewertung knüpfen. Die Testansicht ist kein Nachweis einer echten Bewertung. Siehe die offizielle [Richtlinie zu gefälschten Interaktionen](https://support.google.com/contributionpolicy/answer/7400114).

## Lokale Markierungen

Schlüssel:

- Echtbetrieb: `taberna.googleReviews.invited.v1.live`
- Testmodus: `taberna.googleReviews.invited.v1.demo`

Der Wert ist jeweils ein JSON-Array der bereits markierten Review-IDs. Namen, Texte und OAuth-Daten werden dort nicht gespeichert. Google-Review-IDs bleiben beim Aktualisieren gleich; keine Zuordnung über den Namen. Die Testdaten haben eigene IDs. Markierte Buttons werden grün und deaktiviert. Aktualisieren und Neuladen erhalten den Status. Speicherfehler oder beschädigte Werte werden deutlich angezeigt und sperren das Markieren, statt zuverlässige Speicherung vorzutäuschen. Andere Tabs desselben Browser-Speichers werden über das Storage-Ereignis aktualisiert; dies ersetzt keine zentrale, atomare Mehrgeräteverwaltung.

„Nueva noche“ fragt vor dem Zurücksetzen nach und leert nur den Schlüssel des gerade ausgewählten Modus. Andere App-Daten und die Google-Bewertungen bleiben unverändert. Das Gerät setzt den Abend nicht automatisch zurück. Safari und eine zum Home-Bildschirm hinzugefügte App können getrennte Speicher verwenden. Löschen von Websitedaten, privates Browsen oder Browser-Speicherbereinigung kann Markierungen entfernen. Für denselben Abend deshalb dieselbe App-/Browserinstanz auf dem Bar-iPad verwenden. Die Daten sind nicht zwischen Geräten synchronisiert.

## Vorgesehene offizielle Schnittstelle

Für die vollständigen Bewertungen des eigenen verifizierten Unternehmensstandorts ist die **Google Business Profile API**, voraussichtlich der Lese-Endpunkt `accounts.locations.reviews.list`, vorgesehen. Keine Maps-/Suchergebnis-Scraping-Lösung und keine öffentliche Places-Auswahl weniger relevanter Bewertungen.

Die offizielle Dokumentation konnte in dieser Cloud-Aufgabe nicht aktuell abgerufen werden (Netzwerkproxy: HTTP 403). Deshalb ist noch keine konkrete Google-API fest in den Code eingebaut. Vor Implementierung des Backends insbesondere diese offiziellen Quellen auf aktuellen Stand prüfen:

- [Reviews list](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list)
- [Voraussetzungen und API-Zugriff](https://developers.google.com/my-business/content/prereqs)
- [Grundlegende Einrichtung](https://developers.google.com/my-business/content/basic-setup)

## Einmalige Schritte für echte Bewertungen

1. Mit dem Google-Konto prüfen, dass der eigene Standort **Taberna Flamenca, Köln** verifiziert ist und das Konto ihn verwalten darf.
2. Ein Google-Cloud-Projekt anlegen bzw. auswählen, die aktuellen Voraussetzungen prüfen und gegebenenfalls Zugang zu den Business Profile APIs beantragen. Die notwendigen APIs nach aktueller Google-Anleitung aktivieren. Freischaltung und Verfügbarkeit sind hier nicht geprüft.
3. OAuth-Zustimmungsbildschirm und einen OAuth-Web-Client mit exakt passender HTTPS-Callback-URL für den späteren Backenddienst einrichten. Erforderliche Scopes und gegebenenfalls Freigabe-/Verifizierungsanforderungen nach aktueller Google-Dokumentation prüfen. Der bekannte Scope `business.manage` kann weitergehende Rechte erlauben; unser Backend soll trotzdem ausschließlich Bewertungen lesen.
4. Einen kleinen HTTPS-Backenddienst mit geschütztem Personalzugang bereitstellen. Betreiber meldet sich dort einmalig mit dem berechtigten Google-Konto an. Das Backend verwahrt Client Secret und Refresh Token in einem Secret Store, erneuert Access Tokens serverseitig und wählt den richtigen Account und Standort explizit aus. Keine Tokens an das Frontend zurückgeben. Keine Schreiboperationen an Google implementieren.
5. Backend ruft die Bewertungen über den offiziellen Lese-Endpunkt ab, verarbeitet **alle Seiten** der API-Antwort und liefert die Bewertungen vollständig an die App. Nach Erstellzeit sortieren; die Oberfläche sortiert zusätzlich lokal. Die aktuell unterstützten API-Sortierungen vor Implementierung prüfen. Eine begrenzte erste Seite darf nicht als vollständige Liste ausgegeben werden.
6. Den Backendzugang authentifizieren (z. B. Sitzung nach Personal-Anmeldung), nur den exakten Ursprung der Pages-App per CORS mit Credentials erlauben und keine öffentliche Proxyroute bauen. Für iPad/Safari möglichst Frontend und Backend unter derselben eigenen Website-Domain betreiben, um Probleme mit Drittanbieter-Cookies zu vermeiden. CORS allein ist kein Zugriffsschutz.
7. Die öffentliche Backend-URL in `reviews-config.js` unter `reviewsEndpoint` eintragen. Die URL darf öffentlich sein, Zugangsdaten nicht. Der Datenadapter `reviews-data.js` ruft sie ausschließlich lesend per GET mit `credentials: include` und `cache: no-store` ab. Ein Abruf läuft nach 15 Sekunden ab. Bei Fehlern werden keine veralteten Karten als aktuell angezeigt.
8. Auf dem Bar-iPad Personalzugang herstellen, echte Daten mit Google abgleichen, Aktualisieren, lokale Markierung, Neuladen und „Nueva noche“ testen. Erst danach echten Betrieb freigeben.

## Backend-Antwortvertrag

Beispielstruktur (keine echte Bewertung):

```json
{
  "reviews": [
    {
      "reviewId": "google-review-id",
      "reviewer": { "displayName": "Name von Google" },
      "starRating": "FIVE",
      "comment": "Bewertungstext",
      "createTime": "2026-10-23T00:42:00Z"
    }
  ]
}
```

`comment` und der Name sind optional; ID, Sterne und gültige Erstellzeit müssen vorhanden sein. Alternativ unterstützt der Adapter einen vollständigen Ressourcen-Namen als `name` und ganzzahlige `rating`-Werte 1–5. Doppelte IDs oder fehlerhafte Antworten werden abgelehnt. Ein noch vorhandenes `nextPageToken` gilt als unvollständige Backend-Antwort. Das Frontend speichert keine Bewertungstexte dauerhaft. Attribution-/Anzeigevorgaben sowie etwaige Aufbewahrungsregeln der gewählten Google-API müssen vor Echtbetrieb geprüft und umgesetzt werden.

**Nie ins öffentliche Repository oder Browser-JavaScript:** OAuth Client Secret, Access Token, Refresh Token, Sitzungsschlüssel oder private API-Zugangsdaten. Eine feste öffentliche API-URL ist kein Geheimnis. Die Testversion benötigt weder Backend noch Google-Zugangsdaten; echte Bewertungen benötigen beides.

## Testen

```sh
node --test tests/*.test.cjs
```

Die zusätzlichen Tests prüfen Testkennzeichnung, Reihenfolge, Vorschau ohne Bewertungstext, lokale Persistenz über Neuladen und Aktualisieren, getrennte Test-/Echt-Schlüssel, Zurücksetzen mit Abbruch/Bestätigung, Erhalt fremder Speichereinträge, sichere Textausgabe, Speicherfehler, simulierte Backendfehler und die Rückkehr zum Meldesystem. Echte Google-Anmeldung und echte Bewertungen wurden nicht getestet.
