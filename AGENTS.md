# AGENTS.md - Rekenhulpje website

## Projectdoel

Rekenhulpje is een Nederlandstalige website met praktische rekentools voor wonen, hypotheek en verhuizen. Customer experience staat boven developer-gemak: publieke calculators moeten snel laden, mobiel goed werken en niet afhankelijk zijn van slapende apps of trage iframe-starts.

## Algemene regels

- Schrijf publieke content in helder Nederlands.
- Houd berekeningen indicatief en vermijd financieel of fiscaal advies.
- Verander fiscale aannames alleen na broncheck en vermeld de aanname duidelijk.
- Maak kleine, gerichte wijzigingen en laat bestaande structuur intact waar dat kan.
- Bescherm bestaande SEO- en analytics-inrichting bij elke wijziging.

## Architectuur

- Nieuwe publieke calculators worden standaard website-native gebouwd in HTML, CSS en JavaScript binnen deze Netlify-site.
- Streamlit is alleen geschikt als prototype of interne testomgeving, tenzij expliciet anders gevraagd.
- Vermijd oplossingen die slapen, traag starten of afhankelijk zijn van iframe-laadtijd.
- Belangrijke content en primaire functionaliteit moeten direct bruikbaar zijn op mobiel.
- Houd publieke calculators compact aan de bovenkant: basisinvoer eerst, verdiepende instellingen in een uitklapblok.
- Metric cards moeten lange bedragen netjes kunnen tonen op desktop en mobiel. Test met grote eurobedragen, `/mnd`-waarden en waarden boven `€ 200.000`; verklein tekst of laat cards naar minder kolommen vallen als getallen krap worden.

## Website en SEO

- Belangrijke SEO-content moet crawlbaar in de HTML staan, niet alleen in een iframe of externe app.
- Behoud canonical tags, sitemap, robots.txt, GA4 en Open Graph/Twitter metadata.
- Nieuwe toolpagina's krijgen een duidelijke title, meta description, H1, FAQ, interne links en sitemap-entry.
- Gebruik natuurlijke Nederlandse zoekvragen en voorkom keyword stuffing.
- Interne links moeten gebruikers logisch door de woon-, hypotheek- en verhuisflow leiden.

## Deze repo

Belangrijke bestanden:

- `index.html`: homepage en tooloverzicht.
- `hypotheekcalculator.html`: hypotheekpagina.
- `woonlastencalculator.html`: woonlastenpagina.
- `verkoopopbrengst-calculator.html`: verkoopopbrengstpagina.
- `sitemap.xml`: alle publieke pagina's die Google mag vinden.
- `robots.txt`: verwijst naar de sitemap.
- `assets/logo.png`: merklogo.

Checks voor website-wijzigingen:

- Open de gewijzigde HTML-pagina lokaal of via de Netlify-preview als dat kan.
- Controleer dat navigatie, supportlinks, Instagram-link en calculatorlinks werken.
- Controleer dat `sitemap.xml` klopt na nieuwe of gewijzigde pagina's.
- Controleer dat metadata en canonical URL's niet per ongeluk verdwijnen.

## Migratiestatus

De publieke calculators op de website zijn website-native. De oude Streamlit-repos mogen nog als referentie of prototype blijven bestaan, maar nieuwe publieke calculators en grote calculatorwijzigingen moeten direct in HTML/CSS/JavaScript binnen deze repo worden gebouwd.
