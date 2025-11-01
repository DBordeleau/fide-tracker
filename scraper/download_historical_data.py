import os
import zipfile
import requests
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

# Generates all month codes between two dates (inclusive)
def generate_month_codes(start_date, end_date):
    months = []
    current = start_date
    
    while current <= end_date:
        month_name = current.strftime('%b').lower()  # 3-letter month abbreviation (oct, nov, dec, etc.)
        year_code = current.strftime('%y')  # 2-digit year (24, 25, etc.)
        months.append(f"{month_name}{year_code}")
        current += relativedelta(months=1)
    
    return months

# Downloads FIDE data to the output directory for a given month code
def download_fide_data(month_code, output_dir="historical_data"):
    url = f"http://ratings.fide.com/download/standard_{month_code}frl.zip"
    
    os.makedirs(output_dir, exist_ok=True)
    
    filename = os.path.join(output_dir, f"standard_{month_code}frl.zip")
    
    try:
        print(f"Downloading {month_code}...", end=" ")
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            with open(filename, 'wb') as f:
                f.write(response.content)
            print(f"Saved to {filename}")
            return True
        else:
            print(f"Failed (Status: {response.status_code})")
            return False
            
    except Exception as e:
        print(f"Error: {e}")
        return False
    
# Extracts zip file and deletes it after extraction
def extract_and_cleanup(zip_path, output_dir="historical_data"):
    try:
        print(f"  Extracting {os.path.basename(zip_path)}...", end=" ")
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(output_dir)
        
        print(f"Extracted")
        
        # Delete the zip file after extraction
        os.remove(zip_path)
        print(f"Deleted {os.path.basename(zip_path)}")
        
        return True
    except Exception as e:
        print(f"Error extracting: {e}")
        return False

# Main entry point, downloads historical data from Oct 2024-Oct 2025
def main():
    end_date = datetime(2025, 10, 1)
    start_date = datetime(2024, 10, 1)
    
    print(f"Downloading FIDE data from {start_date.strftime('%B %Y')} to {end_date.strftime('%B %Y')}")
    print("=" * 60)
    
    month_codes = generate_month_codes(start_date, end_date)
    
    successful = 0
    failed = 0
    
    for month_code in month_codes:
        zip_path = download_fide_data(month_code)
        
        if zip_path:
            if extract_and_cleanup(zip_path):
                successful += 1
            else:
                failed += 1
        else:
            failed += 1
    
    print("=" * 60)
    print(f"Download complete: {successful} successful, {failed} failed")

if __name__ == "__main__":
    main()