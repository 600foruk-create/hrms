import re
from bs4 import BeautifulSoup

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

def count_children(node_id):
    node = soup.find(id=node_id)
    if node:
        print(f"Children of {node_id}: {[c.get('id') for c in node.find_all('div', recursive=False) if c.get('id')]}")

count_children('app-shell')
count_children('admin-view')
count_children('manager-view')
count_children('employee-view')
