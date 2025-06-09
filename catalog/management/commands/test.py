# test_edge_profile.py

import time
from selenium import webdriver
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options as EdgeOptions

EDGE_DRIVER_PATH = r"C:\Users\aurakcyber5\Downloads\edgedriver_win32\msedgedriver.exe"
PROFILE_PARENT = r"C:\Users\aurakcyber5\selenium-profile-seed"
PROFILE_NAME   = "SeleniumTest"

options = EdgeOptions()
options.use_chromium = True

# 1) Point at the parent folder containing your “SeleniumTest” subfolder:
options.add_argument(f"--user-data-dir={PROFILE_PARENT}")

# 2) Tell Edge which sub-folder is the actual profile:
options.add_argument(f"--profile-directory={PROFILE_NAME}")

# 3) Suppress WebDriver flags so LinkedIn sees a normal browser:
options.add_experimental_option("excludeSwitches", ["enable-automation"])
options.add_experimental_option("useAutomationExtension", False)

# 4) (Optional) Use a real User-Agent:
options.add_argument(
    "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0"
)
options.add_argument("--window-size=1200,800")

driver = webdriver.Edge(service=EdgeService(EDGE_DRIVER_PATH), options=options)
try:
    # Navigate to LinkedIn feed to confirm we’re already logged in:
    driver.get("https://www.linkedin.com/feed/")
    time.sleep(5)

    print("CURRENT URL:", driver.current_url)
    print("COOKIES:", driver.get_cookies())
finally:
    driver.quit()
