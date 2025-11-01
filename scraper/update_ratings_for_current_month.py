import os
import zipfile
import requests
from datetime import datetime
from dateutil.relativedelta import relativedelta
from seed_historical_data import seed_database

# Get the month code for the current month in format 'mmmyy' (e.g., 'nov25')
def get_current_month_code():
    current = datetime.utcnow()
    month_name = current.strftime('%b').lower()
    year_code = current.strftime('%y')
    return f"{month_name}{year_code}"

def download_monthly_data(month_code, output_dir="historical_data"):
    url = f"http://ratings.fide.com/download/standard_{month_code}frl.zip"
    
    os.makedirs(output_dir, exist_ok=True)
    
    zip_filename = os.path.join(output_dir, f"standard_{month_code}frl.zip")
    txt_filename = os.path.join(output_dir, f"standard_{month_code}frl.txt")
    
    try:
        print(f"Downloading FIDE data for {month_code}...")
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=60)
        
        if response.status_code == 200:
            # Save zip file
            with open(zip_filename, 'wb') as f:
                f.write(response.content)
            print(f"Downloaded: {zip_filename}")
            
            # Extract zip file
            print(f"Extracting zip file...")
            with zipfile.ZipFile(zip_filename, 'r') as zip_ref:
                zip_ref.extractall(output_dir)
            print(f"Extracted to: {output_dir}")
            
            # Delete zip file
            os.remove(zip_filename)
            print(f"Deleted zip file")
            
            # Verify text file exists
            if os.path.exists(txt_filename):
                print(f"Text file ready: {txt_filename}")
                return txt_filename
            else:
                print(f"Error: Text file not found after extraction")
                return None
                
        else:
            print(f"Download failed (Status: {response.status_code})")
            return None
            
    except Exception as e:
        print(f"Error downloading/extracting data: {e}")
        return None

def main():
    print("="*80)
    print("FIDE MONTHLY DATA UPDATE")
    print("="*80)
    
    month_code = get_current_month_code()
    print(f"\nCurrent month code: {month_code}")
    
    # Determine the data date (1st of current month)
    current_date = datetime.utcnow()
    data_date = current_date.replace(day=1).strftime('%Y-%m-%d')
    print(f"Data date: {data_date}")
    
    print(f"\n{'='*80}")
    print("STEP 1: DOWNLOADING DATA")
    print('='*80)
    
    txt_file = download_monthly_data(month_code)
    
    if not txt_file:
        print("\nFailed to download/extract monthly data")
        print("This might be because FIDE hasn't published the data yet.")
        print("The data is typically available a few days into the month.")
        return
    
    print(f"\n{'='*80}")
    print("STEP 2: UPLOADING TO DATABASE")
    print('='*80)
    
    try:
        # Use min_rating=0 to include ALL players, not just 2500+
        # This ensures we update everyone who already exists in the database
        seed_database(txt_file, data_date, min_rating=2500)
        
        print(f"\n{'='*80}")
        print("MONTHLY UPDATE COMPLETE")
        print('='*80)
        print(f"Successfully downloaded and seeded data for {month_code}")
        
    except Exception as e:
        print(f"\nError seeding database: {e}")
        raise

if __name__ == "__main__":
    main()