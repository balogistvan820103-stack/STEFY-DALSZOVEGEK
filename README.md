# STEFY-BAND DALSZÖVEGEK

Offline-first, mobilra optimalizált digitális zenész-könyv. A dalokat és fellépés-listákat az alkalmazás a böngésző helyi IndexedDB-adatbázisában tárolja. A használatához nincs fiók vagy szerveroldali adatbázis.

A kezdőképernyő alapértelmezett, álló színpadi háttere a `stage-default.png` fájlban található, és az alkalmazás offline gyorsítótárának része. A „STEFY-BAND DALSZÖVEGEK” felirat és a mottó HTML/CSS szöveg, nem része a háttérképnek. Saját kép a **Beállítások → Saját háttér** részen választható.

## Használat Androidon

Az `outputs` mappát HTTPS-t használó statikus webtárhelyen kell közzétenni. Az első megnyitáskor az alkalmazás letölti a szükséges felületi fájlokat; ezután a dalok, a keresés, a fellépés-listák és az adatmentés internet nélkül is elérhető. Androidon nyisd meg a címet Chrome-ban, majd válaszd a böngésző **Telepítés** vagy **Hozzáadás a kezdőképernyőhöz** parancsát.

Az `index.html` közvetlen, `file://` megnyitása csak bemutatásra jó: a böngésző biztonsági szabályai miatt PWA telepítése és megbízható offline gyorsítótár ilyenkor nem működik. Az alkalmazás ebben a csomagban telepíthető webalkalmazás (PWA), nem natív APK.

## Biztonsági mentés

A **Beállítások → Exportálás** JSON-fájlt készít a dalokról, címkékről, fellépés-listákról és megjelenési beállításokról. Tartsd meg a fájl egy másolatát az eszközön kívül is. Importálás előtt a fájlt ellenőrzi az alkalmazás, és külön rákérdez, ha teljes visszaállítást választasz.

## Képernyő ébren tartása

A Fellépés mód a böngésző Screen Wake Lock támogatását használja, és HTTPS-kapcsolatot igényel. Ha a készülék vagy a böngésző ezt nem engedélyezi, az Android kijelző-időkorlátja érvényesülhet. A fellépésből kilépve a képernyő-ébresztő zár felszabadul.

## Tömeges dalszöveg-import

A **Dalok** képernyőn TXT-fájlokat egyszerre is beolvashatsz; az alkalmazás mappaválasztót kínál, ha azt az eszköz böngészője támogatja. Ha nem, válaszd ki egyszerre a fájlokat a többfájlos tallózóval. A kijelölt mappák almappáit is feldolgozza. UTF-8 és Windows-1250 szövegkódolás használható. Az import előnézetében látod a hozzáadandó, már létező, kihagyott és hibás fájlok számát. A fájl neve lesz a dal címe, az importált dalok az **Importált dalok** címkét kapják. A meglévő dalokat az import nem írja felül.

## Tesztelés helyi gépen

A `outputs` tartalmát kiszolgáló HTTPS alatt vagy helyi fejlesztői szerveren nyisd meg. Az első betöltést követően próbáld ki a keresést, TXT-importot, címke szerinti tömeges szerkesztést, fellépés módot és az export/import műveleteket. A böngészőből történő mappaválasztás elérhetősége a böngészőtől és annak verziójától függ; a többfájlos tallózás tartalék lehetőség.
