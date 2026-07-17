import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update .mini-rep-table CSS to compress font sizes and padding
css_find = """        .mini-rep-table th {
            font-size: 10px;
            font-weight: 700;
            color: #0f2e53;
            padding: 8px 5px;
            border-bottom: 1px solid #e2e8f0;
            background-color: transparent !important; white-space: normal !important;
            text-align: center;
        }"""
css_replace = """        .mini-rep-table th {
            font-size: 9px !important;
            font-weight: 700;
            color: #0f2e53;
            padding: 4px 2px !important;
            border-bottom: 1px solid #e2e8f0;
            background-color: transparent !important; white-space: normal !important;
            text-align: center;
            letter-spacing: -0.2px;
        }"""
html = html.replace(css_find, css_replace)

css_td_find = """        .mini-rep-table td {
            font-size: 11px;
            color: #334155;
            padding: 8px 5px;
            border-bottom: 1px solid #f1f5f9;
            text-align: center;
            vertical-align: middle;
            white-space: nowrap;
        }"""
css_td_replace = """        .mini-rep-table td {
            font-size: 10px !important;
            color: #334155;
            padding: 4px 2px !important;
            border-bottom: 1px solid #f1f5f9;
            text-align: center;
            vertical-align: middle;
            white-space: normal !important;
            letter-spacing: -0.1px;
        }"""
html = html.replace(css_td_find, css_td_replace)

# 2. Clean up inline styles in the headers
html = html.replace('style="font-size: 10px;"', '')

# 3. Increase the wrapper flex-basis slightly to allow more room if screen permits, but keep min-width: 0.
html = html.replace('flex: 1; min-width: 0; flex-basis: 300px;', 'flex: 1; min-width: 0; flex-basis: 340px;')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Updated index.html to heavily compress tables so they fit perfectly in the cards without overflowing.")
