from pathlib import Path
import re

origin = "https://mypowersetup.com"
equivalents = {
    "kalkulacky/kapacita-baterie/index.html": [
        ("cs-CZ", "/kalkulacky/kapacita-baterie/"),
        ("sk-SK", "/sk/kalkulacky/kapacita-baterie/"),
        ("pl-PL", "/pl/kalkulatory/pojemnosc-akumulatora/"),
        ("hu-HU", "/hu/kalkulatorok/akkumulator-kapacitas/"),
        ("x-default", "/kalkulacky/kapacita-baterie/"),
    ],
    "kalkulacky/solarni-panely/index.html": [
        ("cs-CZ", "/kalkulacky/solarni-panely/"),
        ("sk-SK", "/sk/kalkulacky/solarne-panely/"),
        ("pl-PL", "/pl/kalkulatory/panele-solarne/"),
        ("hu-HU", "/hu/kalkulatorok/napelem-teljesitmeny/"),
        ("x-default", "/kalkulacky/solarni-panely/"),
    ],
}
for filename, alternates in equivalents.items():
    path = Path(filename)
    text = path.read_text(encoding="utf-8")
    replacement = "\n".join(
        f'  <link rel="alternate" hreflang="{lang}" href="{origin}{route}">' for lang, route in alternates
    )
    text, count = re.subn(
        r'  <link rel="alternate" hreflang="cs-CZ" href="[^"]+">\n(?:  <link rel="alternate" hreflang="(?:sk-SK|pl-PL|hu-HU)" href="[^"]+">\n)*  <link rel="alternate" hreflang="x-default" href="[^"]+">',
        replacement,
        text,
        count=1,
    )
    if count != 1:
        raise SystemExit(f"{filename}: hreflang block not patched")
    path.write_text(text, encoding="utf-8")

guide_links = {
    "sk/sprievodca/kapacita-baterie-do-karavanu/index.html": ("/sk/kalkulacky/kapacita-baterie/", "Kalkulačka batérie"),
    "sk/sprievodca/kolko-w-solarnych-panelov/index.html": ("/sk/kalkulacky/solarne-panely/", "Kalkulačka soláru"),
    "pl/poradnik/pojemnosc-akumulatora-do-kampera/index.html": ("/pl/kalkulatory/pojemnosc-akumulatora/", "Kalkulator akumulatora"),
    "pl/poradnik/ile-wat-paneli-solarnych-do-kampera/index.html": ("/pl/kalkulatory/panele-solarne/", "Kalkulator paneli"),
    "hu/utmutatok/lakoauto-akkumulator-kapacitas/index.html": ("/hu/kalkulatorok/akkumulator-kapacitas/", "Akkumulátor-kalkulátor"),
    "hu/utmutatok/hany-watt-napelem-lakoautohoz/index.html": ("/hu/kalkulatorok/napelem-teljesitmeny/", "Napelem-kalkulátor"),
}
for filename, (route, label) in guide_links.items():
    path = Path(filename)
    text = path.read_text(encoding="utf-8")
    if f'href="{route}"' not in text:
        match = re.search(r'(<header class="article-header">.*?<nav>)', text, flags=re.S)
        if not match:
            raise SystemExit(f"{filename}: article header nav not found")
        text = text[: match.end()] + f'<a href="{route}">{label}</a>' + text[match.end() :]
        path.write_text(text, encoding="utf-8")

sitemap = Path("sitemap-calculators.xml")
xml = sitemap.read_text(encoding="utf-8")
routes = [
    "/sk/kalkulacky/", "/sk/kalkulacky/kapacita-baterie/", "/sk/kalkulacky/solarne-panely/",
    "/pl/kalkulatory/", "/pl/kalkulatory/pojemnosc-akumulatora/", "/pl/kalkulatory/panele-solarne/",
    "/hu/kalkulatorok/", "/hu/kalkulatorok/akkumulator-kapacitas/", "/hu/kalkulatorok/napelem-teljesitmeny/",
]
additions = "".join(
    f"  <url><loc>{origin}{route}</loc><lastmod>2026-09-14</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n"
    for route in routes
    if f"<loc>{origin}{route}</loc>" not in xml
)
xml = xml.replace("</urlset>", additions + "</urlset>")
sitemap.write_text(xml, encoding="utf-8")

indexnow = Path("src/indexnow.js")
text = indexnow.read_text(encoding="utf-8")
start = text.index("const CALCULATOR_LANDING_ROUTES = Object.freeze([")
end = text.index("]);", start) + 3
route_block = '''const CALCULATOR_LANDING_ROUTES = Object.freeze([
  "/kalkulacky/",
  "/kalkulacky/kapacita-baterie/",
  "/kalkulacky/solarni-panely/",
  "/kalkulacky/vykon-menice/",
  "/kalkulacky/prurez-kabelu-12v/",
  "/kalkulacky/12v-nebo-24v/",
  "/sk/kalkulacky/",
  "/sk/kalkulacky/kapacita-baterie/",
  "/sk/kalkulacky/solarne-panely/",
  "/pl/kalkulatory/",
  "/pl/kalkulatory/pojemnosc-akumulatora/",
  "/pl/kalkulatory/panele-solarne/",
  "/hu/kalkulatorok/",
  "/hu/kalkulatorok/akkumulator-kapacitas/",
  "/hu/kalkulatorok/napelem-teljesitmeny/",
]);'''
text = text[:start] + route_block + text[end:]
if '  "src/calculator-copy.js",' not in text:
    text = text.replace('  "src/calculator-landing-browser.js",\n', '  "src/calculator-landing-browser.js",\n  "src/calculator-copy.js",\n')
indexnow.write_text(text, encoding="utf-8")

testfile = Path("tests/indexnow.test.js")
text = testfile.read_text(encoding="utf-8")
start = text.index("const calculatorUrls = [")
end = text.index("];", start) + 2
sorted_routes = sorted([
    "/kalkulacky/", "/kalkulacky/12v-nebo-24v/", "/kalkulacky/kapacita-baterie/", "/kalkulacky/prurez-kabelu-12v/", "/kalkulacky/solarni-panely/", "/kalkulacky/vykon-menice/",
    "/sk/kalkulacky/", "/sk/kalkulacky/kapacita-baterie/", "/sk/kalkulacky/solarne-panely/",
    "/pl/kalkulatory/", "/pl/kalkulatory/pojemnosc-akumulatora/", "/pl/kalkulatory/panele-solarne/",
    "/hu/kalkulatorok/", "/hu/kalkulatorok/akkumulator-kapacitas/", "/hu/kalkulatorok/napelem-teljesitmeny/",
])
block = "const calculatorUrls = [\n" + "".join("  `${origin}" + route + "`,\n" for route in sorted_routes) + "];"
text = text[:start] + block + text[end:]
text = text.replace(
    '"src/calculator-landing-browser.js", "src/dc-cable.js"',
    '"src/calculator-landing-browser.js", "src/calculator-copy.js", "src/dc-cable.js"',
)
testfile.write_text(text, encoding="utf-8")
