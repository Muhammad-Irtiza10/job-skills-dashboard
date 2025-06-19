# print_aws_titles.py
# Place this at the project root (same folder as manage.py).
# Usage: python print_aws_titles.py

import time
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.edge.service import Service
from webdriver_manager.microsoft import EdgeChromiumDriverManager

# Configure headless Edge
opts = Options()
opts.add_argument("--headless")
opts.add_argument("--disable-gpu")
service = Service(EdgeChromiumDriverManager().install())

driver = webdriver.Edge(service=service, options=opts)
print("→ Loading AWS certification page…")
driver.get("https://aws.amazon.com/certification/")
time.sleep(3)
html = driver.page_source
driver.quit()

# Parse and print titles
soup = BeautifulSoup(html, "html.parser")
print("→ Found these certification titles:")
for a in soup.select("a[data-rg-n='Link']"):
    h4 = a.find("h4", {"data-rg-n": "TitleText"})
    if h4:
        print(repr(h4.get_text(strip=True)))
