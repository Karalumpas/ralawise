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

- Node.js & Express
- Tailwind CSS
- Vanilla JavaScript
- [PapaParse](https://www.papaparse.com/) til CSV parsing
- [JSZip](https://stuk.github.io/jszip/) til ZIP fil håndtering

## Kom i gang

1. Kør `npm install` (ingen afhængigheder installeres offline)
2. Start serveren med `node server.js`
3. Åbn `http://localhost:3000` i din browser
4. Gå til `dashboard.html` for at administrere dine WooCommerce shops
5. Upload ZIP-filer, vælg data og eksporter

## Udvikling

Projektet kører nu som en lille Node.js applikation.

1. Klon repository'et
2. Kør `npm install`
3. Start serveren med `node server.js`
4. Rediger filer under `public/`

## Licensering

Dette projekt er open source og tilgængeligt under MIT licensen.