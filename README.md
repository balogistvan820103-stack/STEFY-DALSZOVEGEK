# STEFY DALSZÖVEGEK

Offline-first, mobilra optimalizált digitális zenész-könyv. A dalokat és fellépés-listákat az alkalmazás a böngésző helyi IndexedDB-adatbázisában tárolja. A használatához nincs fiók vagy szerveroldali adatbázis.

## Használat Androidon

Az `outputs` mappát HTTPS-t használó statikus webtárhelyen kell közzétenni. Az első megnyitáskor az alkalmazás letölti a szükséges felületi fájlokat; ezután a dalok, a keresés, a fellépés-listák és az adatmentés internet nélkül is elérhető. Androidon nyisd meg a címet Chrome-ban, majd válaszd a böngésző **Telepítés** vagy **Hozzáadás a kezdőképernyőhöz** parancsát.

Az `index.html` közvetlen, `file://` megnyitása csak bemutatásra jó: a böngésző biztonsági szabályai miatt PWA telepítése és megbízható offline gyorsítótár ilyenkor nem működik. Az alkalmazás ebben a csomagban telepíthető webalkalmazás (PWA), nem natív APK.

## Biztonsági mentés

A **Beállítások → Exportálás** JSON-fájlt készít a dalokról, címkékről, fellépés-listákról és megjelenési beállításokról. Tartsd meg a fájl egy másolatát az eszközön kívül is. Importálás előtt a fájlt ellenőrzi az alkalmazás, és külön rákérdez, ha teljes visszaállítást választasz.

## Képernyő ébren tartása

A Fellépés mód a böngésző Screen Wake Lock támogatását használja, és HTTPS-kapcsolatot igényel. Ha a készülék vagy a böngésző ezt nem engedélyezi, az Android kijelző-időkorlátja érvényesülhet. A fellépésből kilépve a képernyő-ébresztő zár felszabadul.
