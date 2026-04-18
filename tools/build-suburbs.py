#!/usr/bin/env python3
"""
build-suburbs.py — Generate static suburb landing pages and sitemap.

Reads data/gold-coast-opshops.json, writes:
  - suburb/<slug>/index.html         per suburb (one per unique suburb in data)
  - suburb/index.html                directory page listing all suburbs
  - sitemap.xml                      regenerated with all URLs

These pages are static HTML that work without JavaScript and contain
Schema.org structured data so Google indexes individual shops.

Usage: python3 tools/build-suburbs.py
"""

import html
import json
import os
import re
import shutil
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data' / 'gold-coast-opshops.json'
OUT_SUBURB = ROOT / 'suburb'
OUT_CHARITY = ROOT / 'charity'
OUT_SHOP = ROOT / 'shop'
SITEMAP = ROOT / 'sitemap.xml'
SITE_URL = 'https://map.opshopsearch.com'

CHARITY_COLOURS = {
    'Vinnies': '#0066CC',
    'Salvos': '#E60000',
    'Lifeline': '#00AA44',
}

def slug(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

def esc(s) -> str:
    return html.escape(str(s) if s is not None else '')

def charity_colour(c: str) -> str:
    return CHARITY_COLOURS.get(c, '#666666')

def shop_jsonld(shop: dict) -> str:
    payload = {
        '@context': 'https://schema.org',
        '@type': 'ThriftStore',
        'name': shop['name'],
        'address': {
            '@type': 'PostalAddress',
            'streetAddress': shop['address'],
            'addressLocality': shop['suburb'],
            'postalCode': shop['postcode'],
            'addressRegion': 'QLD',
            'addressCountry': 'AU',
        },
        'geo': {
            '@type': 'GeoCoordinates',
            'latitude': shop['lat'],
            'longitude': shop['lng'],
        },
        'telephone': shop.get('phone'),
        'url': shop.get('website'),
        'parentOrganization': shop.get('charity'),
        'openingHours': shop.get('hours'),
    }
    return json.dumps(payload, separators=(',', ':'))

PAGE_HEAD = """<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#1a1a2e" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0d0d18" media="(prefers-color-scheme: dark)">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <link rel="canonical" href="{canonical}">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/svg+xml" href="/icons/icon.svg">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/icons/icon-192.png">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:image" content="{site_url}/icons/icon-512.png">
  <meta property="og:url" content="{canonical}">
  <link rel="stylesheet" href="/css/style.css">
  <style>
    body {{ overflow: auto; }}
    main {{ max-width: 800px; margin: 0 auto; padding: 24px 20px 80px; }}
    h1 {{ font-size: 1.6rem; margin-bottom: 8px; }}
    .lede {{ color: var(--text-secondary); margin-bottom: 24px; line-height: 1.5; }}
    .shop-card {{
      background: var(--bg-surface);
      border: 1px solid var(--border-soft);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }}
    .shop-card h2 {{ font-size: 1.1rem; margin-bottom: 8px; }}
    .shop-card .charity-badge {{
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      color: #fff;
      padding: 2px 10px;
      border-radius: 12px;
      margin-bottom: 10px;
    }}
    .shop-card dl {{ font-size: 0.9rem; line-height: 1.5; }}
    .shop-card dt {{ font-weight: 600; color: var(--text-secondary); margin-top: 8px; font-size: 0.8rem; }}
    .shop-card dd {{ margin: 0; }}
    .shop-card a {{ color: var(--text-link); text-decoration: none; }}
    .shop-card .actions {{ margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap; }}
    .shop-card .btn-link {{
      flex: 1; min-width: 140px;
      padding: 10px 14px;
      background: var(--color-vinnies);
      color: #fff !important;
      border-radius: 8px;
      text-align: center;
      font-weight: 600;
      font-size: 0.9rem;
    }}
    .shop-card .btn-link.secondary {{
      background: var(--bg-secondary-btn);
      color: var(--text-primary) !important;
      border: 1px solid var(--border-soft);
    }}
    .crumbs {{ font-size: 0.85rem; margin-bottom: 16px; }}
    .crumbs a {{ color: var(--text-link); text-decoration: none; }}
    .suburb-list {{ list-style: none; padding: 0; }}
    .suburb-list li {{ padding: 12px 0; border-bottom: 1px solid var(--border-softer); }}
    .suburb-list a {{ color: var(--text-link); font-weight: 500; text-decoration: none; }}
    .suburb-list .count {{ color: var(--text-muted); font-size: 0.85rem; margin-left: 6px; }}
    .verified {{ font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; }}
    .cat-tag {{ font-size: 0.7rem; padding: 2px 8px; }}
    .cat-row {{ display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px; }}
  </style>
</head>
<body>
  <header id="app-header">
    <h1 style="font-size: 1.2rem;"><a href="/" style="color:#fff;text-decoration:none;">OpShop Finder</a></h1>
    <p class="subtitle">Gold Coast Op Shops</p>
  </header>
  <main>
"""

PAGE_FOOT = """
  </main>
</body>
</html>
"""

def render_shop_card(shop: dict) -> str:
    cats = shop.get('categories') or []
    cats_html = ''.join(f'<span class="cat-tag">{esc(c)}</span>' for c in cats)
    address_full = f"{shop['address']}, {shop['suburb']} {shop['postcode']}"
    maps_q = address_full.replace(' ', '+')
    website = shop.get('website') or ''
    website_html = (
        f'<dt>Website</dt><dd><a href="{esc(website)}" target="_blank" rel="noopener">'
        f'{esc(website.replace("https://","").replace("http://",""))}</a></dd>'
        if website else ''
    )
    phone = shop.get('phone') or ''
    phone_html = (
        f'<dt>Phone</dt><dd><a href="tel:{esc(phone.replace(" ", ""))}">{esc(phone)}</a></dd>'
        if phone else ''
    )
    verified = shop.get('lastVerified')
    verified_html = f'<p class="verified">Verified {esc(verified)}</p>' if verified else ''
    return f"""    <article class="shop-card">
      <span class="charity-badge" style="background:{charity_colour(shop['charity'])}">{esc(shop['charity'])}</span>
      <h2>{esc(shop['name'])}</h2>
      <dl>
        <dt>Address</dt><dd>{esc(address_full)}</dd>
        {phone_html}
        <dt>Hours</dt><dd>{esc(shop.get('hours', '—'))}</dd>
        {website_html}
      </dl>
      {f'<div class="cat-row">{cats_html}</div>' if cats_html else ''}
      <div class="actions">
        <a class="btn-link" href="https://www.google.com/maps/dir/?api=1&destination={shop['lat']},{shop['lng']}" target="_blank" rel="noopener">Get directions</a>
        <a class="btn-link secondary" href="/?shop={esc(slug(shop['name']))}">View on map</a>
      </div>
      {verified_html}
      <script type="application/ld+json">{shop_jsonld(shop)}</script>
    </article>
"""

def render_suburb_page(suburb: str, shops: list) -> str:
    title = f'Op Shops in {suburb}, Gold Coast — OpShop Finder'
    desc = (
        f'{len(shops)} op shops in {suburb} on the Gold Coast. '
        'Opening hours, addresses, charities and directions for every shop.'
    )
    canonical = f'{SITE_URL}/suburb/{slug(suburb)}/'
    head = PAGE_HEAD.format(
        title=esc(title),
        description=esc(desc),
        canonical=canonical,
        site_url=SITE_URL,
    )
    cards = ''.join(render_shop_card(s) for s in sorted(shops, key=lambda s: s['name']))
    body = f"""    <p class="crumbs"><a href="/">Home</a> · <a href="/suburb/">All suburbs</a></p>
    <h1>Op shops in {esc(suburb)}</h1>
    <p class="lede">There are {len(shops)} op shop{'' if len(shops) == 1 else 's'} in {esc(suburb)} on the Gold Coast. Find opening hours, addresses, charity affiliation, and directions below — or <a href="/?suburb={esc(slug(suburb))}">view them all on the map</a>.</p>
{cards}"""
    return head + body + PAGE_FOOT

def render_suburb_index(by_suburb: dict) -> str:
    title = 'All Suburbs — OpShop Finder Gold Coast'
    desc = 'Browse op shops on the Gold Coast by suburb. {} suburbs, {} shops total.'.format(
        len(by_suburb), sum(len(v) for v in by_suburb.values()))
    canonical = f'{SITE_URL}/suburb/'
    head = PAGE_HEAD.format(
        title=esc(title),
        description=esc(desc),
        canonical=canonical,
        site_url=SITE_URL,
    )
    items = ''.join(
        f'<li><a href="/suburb/{slug(s)}/">{esc(s)}</a><span class="count">'
        f'({len(by_suburb[s])} shop{"" if len(by_suburb[s]) == 1 else "s"})</span></li>\n'
        for s in sorted(by_suburb)
    )
    body = f"""    <p class="crumbs"><a href="/">Home</a></p>
    <h1>Op shops by suburb</h1>
    <p class="lede">Browse op shops by Gold Coast suburb. {len(by_suburb)} suburbs covered, {sum(len(v) for v in by_suburb.values())} shops total.</p>
    <ul class="suburb-list">
{items}    </ul>
"""
    return head + body + PAGE_FOOT

def render_charity_page(charity: str, shops: list) -> str:
    title = f'{charity} Op Shops on the Gold Coast — OpShop Finder'
    desc = (
        f'{len(shops)} {charity} op shops on the Gold Coast. '
        'Opening hours, addresses, and directions for every store.'
    )
    canonical = f'{SITE_URL}/charity/{slug(charity)}/'
    head = PAGE_HEAD.format(
        title=esc(title), description=esc(desc),
        canonical=canonical, site_url=SITE_URL,
    )
    cards = ''.join(render_shop_card(s) for s in sorted(shops, key=lambda s: (s['suburb'], s['name'])))
    body = f"""    <p class="crumbs"><a href="/">Home</a> · <a href="/charity/">All charities</a></p>
    <h1>{esc(charity)} op shops on the Gold Coast</h1>
    <p class="lede">There {'is' if len(shops) == 1 else 'are'} {len(shops)} {esc(charity)} op shop{'' if len(shops) == 1 else 's'} on the Gold Coast. View opening hours, addresses, and directions below — or <a href="/?charity={esc(slug(charity))}">filter the map view</a>.</p>
{cards}"""
    return head + body + PAGE_FOOT

def render_shop_page(shop: dict) -> str:
    title = f"{shop['name']} — {shop['suburb']} | OpShop Finder"
    desc = (
        f"{shop['name']}, a {shop['charity']} op shop at {shop['address']}, "
        f"{shop['suburb']} {shop['postcode']}. "
        f"Open {shop.get('hours', 'check website')}. "
        f"Phone {shop.get('phone', 'N/A')}."
    )
    canonical = f"{SITE_URL}/shop/{slug(shop['name'])}/"
    head = PAGE_HEAD.format(
        title=esc(title), description=esc(desc),
        canonical=canonical, site_url=SITE_URL,
    )
    cards = render_shop_card(shop)
    body = f"""    <p class="crumbs"><a href="/">Home</a> · <a href="/suburb/{slug(shop['suburb'])}/">{esc(shop['suburb'])}</a> · <a href="/charity/{slug(shop['charity'])}/">{esc(shop['charity'])}</a></p>
    <h1>{esc(shop['name'])}</h1>
    <p class="lede">A {esc(shop['charity'])} op shop in {esc(shop['suburb'])} on the Gold Coast.</p>
{cards}
    <p style="margin-top:24px;text-align:center;">
      <a class="btn-link" href="/?shop={esc(slug(shop['name']))}" style="display:inline-block;padding:12px 24px;background:var(--color-vinnies);color:#fff !important;border-radius:8px;text-decoration:none;font-weight:600;">View on interactive map →</a>
    </p>"""
    return head + body + PAGE_FOOT

def render_charity_index(by_charity: dict) -> str:
    title = 'Op Shops by Charity — OpShop Finder Gold Coast'
    desc = 'Browse Gold Coast op shops by charity organisation.'
    canonical = f'{SITE_URL}/charity/'
    head = PAGE_HEAD.format(
        title=esc(title), description=esc(desc),
        canonical=canonical, site_url=SITE_URL,
    )
    items = ''.join(
        f'<li><a href="/charity/{slug(c)}/">{esc(c)}</a><span class="count">'
        f'({len(by_charity[c])} shop{"" if len(by_charity[c]) == 1 else "s"})</span></li>\n'
        for c in sorted(by_charity)
    )
    body = f"""    <p class="crumbs"><a href="/">Home</a></p>
    <h1>Op shops by charity</h1>
    <p class="lede">Browse op shops on the Gold Coast by the charity organisation that runs them. Filter by your favourite cause.</p>
    <ul class="suburb-list">
{items}    </ul>
"""
    return head + body + PAGE_FOOT

def render_sitemap(by_suburb: dict, by_charity: dict, shops: list) -> str:
    today = date.today().isoformat()
    urls = [
        (f'{SITE_URL}/', '1.0', 'weekly'),
        (f'{SITE_URL}/suburb/', '0.9', 'weekly'),
        (f'{SITE_URL}/charity/', '0.9', 'weekly'),
        (f'{SITE_URL}/about/', '0.5', 'monthly'),
        (f'{SITE_URL}/submit/', '0.6', 'monthly'),
        (f'{SITE_URL}/embed/', '0.4', 'monthly'),
    ]
    for s in sorted(by_suburb):
        urls.append((f'{SITE_URL}/suburb/{slug(s)}/', '0.8', 'monthly'))
    for c in sorted(by_charity):
        urls.append((f'{SITE_URL}/charity/{slug(c)}/', '0.8', 'monthly'))
    for shop in sorted(shops, key=lambda s: s['name']):
        urls.append((f"{SITE_URL}/shop/{slug(shop['name'])}/", '0.7', 'monthly'))
    body = '\n'.join(
        f'  <url>\n    <loc>{u}</loc>\n    <lastmod>{today}</lastmod>\n'
        f'    <changefreq>{cf}</changefreq>\n    <priority>{p}</priority>\n  </url>'
        for u, p, cf in urls
    )
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">
{body}
</urlset>
'''

def main():
    if not DATA.exists():
        raise SystemExit(f'Data file not found: {DATA}')

    with DATA.open() as f:
        shops = json.load(f)

    by_suburb = defaultdict(list)
    by_charity = defaultdict(list)
    for s in shops:
        by_suburb[s['suburb']].append(s)
        by_charity[s['charity']].append(s)

    for out_dir in (OUT_SUBURB, OUT_CHARITY, OUT_SHOP):
        if out_dir.exists():
            shutil.rmtree(out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

    for suburb, suburb_shops in by_suburb.items():
        sub_dir = OUT_SUBURB / slug(suburb)
        sub_dir.mkdir(parents=True, exist_ok=True)
        (sub_dir / 'index.html').write_text(render_suburb_page(suburb, suburb_shops))
    (OUT_SUBURB / 'index.html').write_text(render_suburb_index(by_suburb))

    for charity, charity_shops in by_charity.items():
        ch_dir = OUT_CHARITY / slug(charity)
        ch_dir.mkdir(parents=True, exist_ok=True)
        (ch_dir / 'index.html').write_text(render_charity_page(charity, charity_shops))
    (OUT_CHARITY / 'index.html').write_text(render_charity_index(by_charity))

    for shop in shops:
        sh_dir = OUT_SHOP / slug(shop['name'])
        sh_dir.mkdir(parents=True, exist_ok=True)
        (sh_dir / 'index.html').write_text(render_shop_page(shop))

    SITEMAP.write_text(render_sitemap(by_suburb, by_charity, shops))

    print(f'Built {len(by_suburb)} suburb pages, {len(by_charity)} charity pages, '
          f'and {len(shops)} shop pages from {len(shops)} shops.')
    print(f'  → {OUT_SUBURB.relative_to(ROOT)}/')
    print(f'  → {OUT_CHARITY.relative_to(ROOT)}/')
    print(f'  → {OUT_SHOP.relative_to(ROOT)}/')
    print(f'  → {SITEMAP.relative_to(ROOT)}')

if __name__ == '__main__':
    main()
