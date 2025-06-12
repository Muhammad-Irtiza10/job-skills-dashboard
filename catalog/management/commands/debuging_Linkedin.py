import requests

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/135.0.0.0 Safari/537.36"
)

def dump_job_html(job_url: str):
    resp = requests.get(job_url, headers={"User-Agent": USER_AGENT})
    resp.raise_for_status()
    with open("job_debug.html", "w", encoding="utf-8") as f:
        f.write(resp.text)
    print("Wrote full HTML to job_debug.html")

if __name__ == "__main__":
    # replace this with one of your ‘Unknown’ URLs
    dump_job_html("https://ae.linkedin.com/jobs/view/senior-editor-at-department-of-culture-and-tourism-%E2%80%93-abu-dhabi-dct-abu-dhabi-4228965071")
