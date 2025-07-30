# WooCommerce Advanced Exporter

En webbaseret værktøj til at behandle og eksportere WooCommerce produktdata fra CSV-filer. Dette værktøj gør det nemt at:

- Importere og behandle ZIP-filer med WooCommerce CSV-data
- Filtrere produkter efter kategorier eller individuelle produkter
- Konvertere priser mellem valutaer
- Eksportere udvalgte data til nye CSV-filer

## Funktioner

- Drag-and-drop upload af ZIP-filer
- Understøtter både UTF-8 og Windows-1252 kodning
- Automatisk genkendelse af parent/variation produkter
- Smart filtrering på kategorier og produkter
- Live preview af data
- Valutaomregning med dynamisk kurs
- Eksport til ZIP med separate CSV-filer

## Teknologier

- Vanilla JavaScript
- [PapaParse](https://www.papaparse.com/) til CSV parsing
- [JSZip](https://stuk.github.io/jszip/) til ZIP fil håndtering
- CSS Grid og Flexbox til responsivt layout

## Kom i gang

1. Åbn `index.html` i en moderne browser
2. Upload ZIP-filer med WooCommerce CSV-data via drag-and-drop eller fil-vælger
3. Behandl filerne og vælg produkter/kategorier til eksport
4. Indstil valutakurs hvis nødvendigt
5. Generer nye CSV-filer pakket i en ZIP-fil

## Udvikling

Projektet bruger ikke build tools eller dependencies udover de CDN-leverede biblioteker. For at udvikle:

1. Klon repository'et
2. Åbn `index.html` i en browser
3. Rediger JavaScript i `scripts/script.js`
4. Rediger CSS i `styles/styles.css`

## Licensering

Dette projekt er open source og tilgængeligt under MIT licensen.