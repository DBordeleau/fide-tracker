import json
import os
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# Configure Chrome WebDriver (headless)
def setup_driver():
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    driver = webdriver.Chrome(options=chrome_options)
    return driver

# Scrape top 100 chess players from FIDE
def scrape_fide_rankings():
    driver = setup_driver()
    players = []
    
    try:
        url = "https://ratings.fide.com/top_lists.phtml?list=open"
        driver.get(url)
        
        wait = WebDriverWait(driver, 10)
        table = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "top_recors_table")))
        
        # Get all rows except header
        rows = table.find_elements(By.CSS_SELECTOR, "tbody tr")
        
        for row in rows[:100]:
            cells = row.find_elements(By.TAG_NAME, "td")
            
            if len(cells) >= 5:
                # Extract rank (not currently used for historical tracking but maybe in future)
                rank = cells[0].text.strip()
                
                # Extract name and profile link (for FIDE ID)
                name_link = cells[1].find_element(By.TAG_NAME, "a")
                name = name_link.text.strip()
                profile_url = name_link.get_attribute("href")
                fide_id = profile_url.split("/")[-1] if profile_url else None
                
                # Extract federation
                fed_cell = cells[2]
                fed_code = fed_cell.text.strip()
                
                # Extract rating
                rating = cells[3].text.strip()
                
                # Extract birth year
                birth_year = cells[4].text.strip()
                
                player = {
                    "rank": int(rank),
                    "name": name,
                    "fide_id": fide_id,
                    "federation": fed_code,
                    "rating": int(rating),
                    "birth_year": int(birth_year) if birth_year else None,
                    "scraped_at": datetime.utcnow().isoformat()
                }
                
                players.append(player)
        
        print(f"Successfully scraped {len(players)} players")
        
    except Exception as e:
        print(f"Error scraping FIDE rankings: {e}")
        raise
    finally:
        driver.quit()
    
    return players

# Save rankings to JSON file with timestamp
def save_rankings(players):
    timestamp = datetime.utcnow().strftime("%Y-%m-%d")
    
    os.makedirs("data", exist_ok=True)
    
    # Save monthly snapshot
    filename = f"data/rankings_{timestamp}.json"
    with open(filename, 'w') as f:
        json.dump(players, f, indent=2)
    
    # Update rankings
    with open("data/rankings_latest.json", 'w') as f:
        json.dump(players, f, indent=2)
    
    print(f"Rankings saved to {filename}")
    
    return filename

def main():
    print("Starting FIDE rankings scraper...")
    print(f"Timestamp: {datetime.utcnow().isoformat()}")
    
    players = scrape_fide_rankings()
    
    if players:
        save_rankings(players)
        print("Scraping completed successfully!")
    else:
        print("No players scraped!")
        exit(1)

if __name__ == "__main__":
    main()