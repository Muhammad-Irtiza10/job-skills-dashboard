import requests
from bs4 import BeautifulSoup
import csv
import time

AWS_URL    = "https://aws.amazon.com/certification/"
SELECTOR   = "a[data-rg-n='Link']"
HEADERS    = {"User-Agent": "Mozilla/5.0 (compatible)"}
OUTPUT_CSV = "aws_certs.csv"

def scrape_aws_certs():
    resp = requests.get(AWS_URL, headers=HEADERS)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    certs = []
    for a in soup.select(SELECTOR):
        href = a.get("href")
        if not href:
            continue
        url = requests.compat.urljoin(AWS_URL, href)
        h4 = a.find("h4", {"data-rg-n": "TitleText"})
        title = h4.get_text(strip=True) if h4 else "—"
        certs.append((title, url))

    return certs

def save_to_csv(certs):
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Title", "URL"])
        writer.writerows(certs)

def main():
    print("→ Scraping AWS certifications…")
    certs = scrape_aws_certs()
    print(f"   Found {len(certs)} certifications.")
    save_to_csv(certs)
    print(f"   Written to {OUTPUT_CSV}")
    time.sleep(1)

if __name__ == "__main__":
    main()
