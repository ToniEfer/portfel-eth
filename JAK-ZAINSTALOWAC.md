# Portfel ETH — instalacja na Androidzie

Ten folder to gotowa aplikacja internetowa (PWA). Po opublikowaniu pod adresem
HTTPS Android zainstaluje ją jak zwykłą aplikację: własna ikona w szufladzie,
pełny ekran bez paska przeglądarki, działanie po wyłączeniu sieci.

## Dlaczego nie da się po prostu skopiować pliku na telefon

Otwarty prosto z pamięci telefonu (`file://`) plik nie pobierze kursów —
przeglądarka blokuje wtedy zapytania do API giełd. Potrzebny jest adres HTTPS.
To jedyny powód hostingu; sama aplikacja nie ma żadnego serwera ani bazy.

## Publikacja — Netlify Drop (najszybsze, bez konta)

1. Na komputerze wejdź na **app.netlify.com/drop**
2. Przeciągnij na stronę **cały folder `eth-app`**
3. Po kilku sekundach dostaniesz adres w stylu `https://cos-tam-123.netlify.app`
4. Bez konta adres żyje około doby. Załóż darmowe konto (przycisk pojawi się
   od razu po wrzuceniu), żeby został na stałe i dało się zmienić nazwę.

### Alternatywa: GitHub Pages

Jeśli masz konto GitHub: utwórz repozytorium, wrzuć zawartość `eth-app`,
potem Settings → Pages → Source: `main`, katalog `/root`. Adres będzie miał
postać `https://twojanazwa.github.io/nazwa-repo/`.

## Instalacja na telefonie

1. Otwórz adres w **Chrome na Androidzie**
2. Menu (trzy kropki) → **Dodaj do ekranu głównego** albo **Zainstaluj aplikację**
3. Potwierdź nazwę i gotowe — ikona ląduje na ekranie głównym

Po instalacji aplikacja otwiera się bez paska adresu, ma własne okno w liście
zadań i żółtą ikonę Ethereum.

## Skąd biorą się dane

| Dane | Źródło | Uwagi |
|---|---|---|
| Kurs ETH, świece dzienne | crypto.com | to samo publiczne API, którego używa connector |
| Kurs ETH (zapas) | CoinGecko, potem Coinbase | gdy crypto.com nie odpowie |
| Kurs USD/PLN | NBP, tabela A | publikowana raz dziennie w dni robocze |

Wszystko pobiera sama aplikacja w telefonie, bezpośrednio z tych serwisów.
Nic nie przechodzi przez pośrednika, nie ma kluczy API ani logowania.

Odświeżanie: co 60 sekund, po powrocie do aplikacji z tła, po powrocie sieci
oraz po naciśnięciu przycisku **Odśwież**.

## Tryb offline

Service worker trzyma w pamięci podręcznej powłokę aplikacji i ostatnio
pobrane notowania. Bez sieci aplikacja się otworzy i pokaże ostatnie znane
wartości, wyraźnie oznaczone jako pochodzące z pamięci podręcznej.

## Ilość ETH i wybór waluty

Zapisują się w pamięci przeglądarki na telefonie — osobno od wersji na
komputerze. Po instalacji ustaw ilość raz; zostanie zapamiętana.

## Aktualizacja aplikacji

Wgraj zmienione pliki na ten sam hosting. Żeby telefon na pewno pobrał nową
wersję, podnieś numer w pierwszej linii `sw.js`:

```js
var VERSION = "eth-portfel-v2";
```

Bez tego stara wersja może jeszcze przez chwilę siedzieć w pamięci podręcznej.

## Zawartość folderu

| Plik | Do czego |
|---|---|
| `index.html` | cała aplikacja — układ, style i logika |
| `manifest.webmanifest` | nazwa, ikony, kolory, tryb pełnoekranowy |
| `sw.js` | service worker: tryb offline i pamięć podręczna |
| `icon-192.png`, `icon-512.png` | ikony aplikacji |
| `icon-maskable-512.png` | ikona przycinana do kształtu systemowego |
| `apple-touch-icon.png` | ikona dla iPhone'a i iPada |
| `icon.svg` | ikona źródłowa |

## Uwaga

Aplikacja pokazuje dane rynkowe i przelicza wartość portfela. Nie jest poradą
inwestycyjną ani narzędziem transakcyjnym — nie łączy się z żadnym portfelem
ani giełdą i nie ma dostępu do Twoich środków.
