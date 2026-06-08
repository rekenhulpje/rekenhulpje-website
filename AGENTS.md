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

De huidige calculators kunnen nog via Streamlit-iframes bestaan, maar de gewenste richting is website-native. Bij nieuwe publieke calculators of grote verbeteringen aan bestaande calculators moet de implementatie richting directe HTML/CSS/JavaScript op de website bewegen.
