import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def get_db_connection():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SECRET_KEY")
    return create_client(url, key)

# Gets FIDE IDs that already exist in the database. This is used to include players below the rating threshold.
def get_existing_fide_ids(conn):
    response = conn.table("players").select("fide_id").execute()
    return {row["fide_id"] for row in response.data}

# Extracts relevant player data from FIDE historical text file (name, fide_id, federation, rating, birth_year)
def parse_fide_text_file(filepath, min_rating=2500, existing_fide_ids=None):
    players = []
    existing_fide_ids = existing_fide_ids or set()
    
    with open(filepath, 'r', encoding='latin-1') as f:
        lines = f.readlines()
    
    # Skip header line
    data_lines = [line for line in lines[1:] if line.strip()]
    print(f"Data lines (after header): {len(data_lines)}")

    # Debug: print first few lines to see the format
    if len(data_lines) > 0:
        print("\nFirst 3 lines for debugging:")
        for i, line in enumerate(data_lines[:3]):
            print(f"Line {i+2} (length {len(line)}): {repr(line[:150])}")
    
    skipped_invalid = 0
    skipped_low_rating = 0

    # Text files use a fixed-width format:
        # Positions:
        # 0-14: FIDE ID
        # 15-75: Name
        # 76-78: Federation
        # 79: Sex
        # 80-112: Other fields (titles, etc.)
        # 113-117: Rating (4 digits)
        # 126-130: Birth year (4 digits)
    for line_num, line in enumerate(data_lines, start=2):
        try:
            # Make sure line is long enough
            if len(line) < 123:
                skipped_invalid += 1
                continue
            
            fide_id = line[0:15].strip()
            name = line[15:76].strip()
            federation = line[76:79].strip()  # Plan to be used for nation comparisons
            sex = line[79:80].strip()  # Not currently used
            title = line[80:83].strip()  # Not currently used
            
            rating_str = line[113:117].strip()

            birthday_str = line[126:130].strip()

            # Debug first player
            if line_num == 2:
                print(f"\nParsing first player:")
                print(f"  FIDE ID: '{fide_id}'")
                print(f"  Name: '{name}'")
                print(f"  Federation: '{federation}'")
                print(f"  Sex: '{sex}'")
                print(f"  Rating str: '{rating_str}'")
                print(f"  Birth year str: '{birthday_str}'")
                print(f"  Positions 110-120: '{line[110:120]}'")
                print(f"  Positions 120-130: '{line[120:130]}'")
            
            # Skip if invalid data
            if not fide_id or not rating_str or not name:
                skipped_invalid += 1
                continue
            
            # Convert rating to int
            try:
                rating = int(rating_str)
            except ValueError:
                skipped_invalid += 1
                continue
            
            # Include if rating >= min_rating OR already exists in DB
            if rating < min_rating and fide_id not in existing_fide_ids:
                skipped_low_rating += 1
                continue
            
            # Parse birth year from birthday string (YYYY/MM/DD)
            birth_year = None
            if birthday_str and len(birthday_str) >= 4:
                try:
                    birth_year = int(birthday_str[0:4])
                    if birth_year < 1900 or birth_year > 2024: # sanity check
                        birth_year = None
                except ValueError:
                    pass
            
            player = {
                'fide_id': fide_id,
                'name': name,
                'federation': federation,
                'rating': rating,
                'birth_year': birth_year,
                'sex': sex,
                'title': None, # Not currently used
                'rank': None  # historical data doesn't have rank
            }
            
            players.append(player)
            
        except (ValueError, IndexError) as e:
            print(f"Warning: Skipping line {line_num} due to parse error: {str(e)}")
            skipped_invalid += 1
            continue
    
    print(f"\nParsing summary:")
    print(f"  Valid players found: {len(players)}")
    print(f"  Skipped (invalid data): {skipped_invalid}")
    print(f"  Skipped (rating < {min_rating}): {skipped_low_rating}")
    
    return players

# Seeds the database with rating data. Ignores players below 2500 rating unless they already exist in the DB
def seed_database(filepath, data_date, min_rating=2500):
    print(f"\nParsing file: {filepath}")
    print(f"Data date: {data_date}")
    print(f"Minimum rating for new players: {min_rating}")
    
    conn = get_db_connection()
    
    existing_fide_ids = get_existing_fide_ids(conn)
    print(f"Found {len(existing_fide_ids)} existing players in database")
    
    players = parse_fide_text_file(filepath, min_rating, existing_fide_ids)
    print(f"Parsed {len(players)} players (>={min_rating} or already in DB)")
    
    if not players:
        print("No players found! Check your parsing logic or min_rating threshold.")
        return
    
    new_players = [p for p in players if p['fide_id'] not in existing_fide_ids]
    existing_players = [p for p in players if p['fide_id'] in existing_fide_ids]
    print(f"  - New players (>={min_rating}): {len(new_players)}")
    print(f"  - Existing players (any rating): {len(existing_players)}")
    
    try:
        scraped_date = datetime.strptime(data_date, '%Y-%m-%d').date().isoformat()
        scraped_at = datetime.strptime(data_date, '%Y-%m-%d').isoformat()
        
        print("\nInserting/updating players...")
        batch_size = 100
        player_count = 0
        
        for i in range(0, len(players), batch_size):
            batch = players[i:i + batch_size]
            player_data = [
                {
                    'fide_id': p['fide_id'],
                    'name': p['name'],
                    'birth_year': p['birth_year']
                }
                for p in batch
            ]
            
            conn.table("players").upsert(
                player_data,
                on_conflict='fide_id'
            ).execute()
            
            player_count += len(batch)
            print(f"  Processed {player_count}/{len(players)} players...")
        
        # Insert rankings in batches if data doesn't exist for this date
        print("\nInserting rankings...")
        ranking_count = 0
        
        for i in range(0, len(players), batch_size):
            batch = players[i:i + batch_size]
            ranking_data = [
                {
                    'fide_id': p['fide_id'],
                    'rank': p['rank'],  # NULL for historical data
                    'rating': p['rating'],
                    'federation': p['federation'],
                    'scraped_date': scraped_date,
                    'scraped_at': scraped_at,
                    'data_source': 'historical'  # Mark as historical data to differentiate from scraped data
                }
                for p in batch
            ]
            
            conn.table("rankings").upsert(
                ranking_data,
                on_conflict='fide_id,scraped_date',
                ignore_duplicates=True
            ).execute()
            
            ranking_count += len(batch)
            print(f"  Processed {ranking_count}/{len(players)} rankings...")
        
        print(f"\nSuccessfully seeded {len(players)} players for date {data_date}")
        
        # Summary
        print("\nSummary:")
        print(f"  - Total players processed: {len(players)}")
        print(f"  - New players added: {len(new_players)}")
        print(f"  - Existing players updated: {len(existing_players)}")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        raise

# Seeds multiple historical text files in chronological order (order is important for pre-existing player evaluation)
def seed_multiple_files(file_list, min_rating=2500):
    print("="*80)
    print(f"SEEDING {len(file_list)} HISTORICAL FILES")
    print("="*80)
    
    # Sort by date to ensure chronological order
    file_list_sorted = sorted(file_list, key=lambda x: x[1])
    
    for filepath, data_date in file_list_sorted:
        print(f"\n{'='*80}")
        print(f"Processing: {os.path.basename(filepath)}")
        print('='*80)
        
        try:
            seed_database(filepath, data_date, min_rating)
        except Exception as e:
            print(f"Failed to seed {filepath}: {e}")
            response = input("Continue with next file? (y/n): ")
            if response.lower() != 'y':
                break

# Main entry point, seeds all data from text files in historical_data directory
def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Seed FIDE historical data')
    parser.add_argument('--file', help='Path to single historical file')
    parser.add_argument('--date', help='Date for the data (YYYY-MM-DD)')
    parser.add_argument('--min-rating', type=int, default=2500, 
                       help='Minimum rating for new players (default: 2500)')
    parser.add_argument('--batch', action='store_true',
                       help='Interactive batch mode for multiple files')
    parser.add_argument('--all', action='store_true',
                       help='Seed all historical files from Oct 2024 - Oct 2025')
    
    args = parser.parse_args()
    
    if args.all:
        # Seed all historical files
        files_to_seed = [
            ("historical_data/standard_oct24frl.txt", "2024-10-01"),
            ("historical_data/standard_nov24frl.txt", "2024-11-01"),
            ("historical_data/standard_dec24frl.txt", "2024-12-01"),
            ("historical_data/standard_jan25frl.txt", "2025-01-01"),
            ("historical_data/standard_feb25frl.txt", "2025-02-01"),
            ("historical_data/standard_mar25frl.txt", "2025-03-01"),
            ("historical_data/standard_apr25frl.txt", "2025-04-01"),
            ("historical_data/standard_may25frl.txt", "2025-05-01"),
            ("historical_data/standard_jun25frl.txt", "2025-06-01"),
            ("historical_data/standard_jul25frl.txt", "2025-07-01"),
            ("historical_data/standard_aug25frl.txt", "2025-08-01"),
            ("historical_data/standard_sep25frl.txt", "2025-09-01"),
            ("historical_data/standard_oct25frl.txt", "2025-10-01"),
        ]
        
        print(f"Ready to seed {len(files_to_seed)} files (Oct 2024 - Oct 2025)")
        confirm = input("Proceed? (y/n): ")
        if confirm.lower() == 'y':
            seed_multiple_files(files_to_seed, args.min_rating)
        else:
            print("Cancelled")
    
    elif args.file and args.date:
        seed_database(args.file, args.date, args.min_rating)
    
    elif args.batch:
        print("Batch mode: Enter files to seed")
        print("Format: filepath,date (e.g., oct2023.txt,2023-10-01)")
        print("Enter 'done' when finished\n")
        
        file_list = []
        while True:
            entry = input("File and date (or 'done'): ").strip()
            if entry.lower() == 'done':
                break
            
            try:
                filepath, date = entry.split(',')
                filepath = filepath.strip()
                date = date.strip()
                
                datetime.strptime(date, '%Y-%m-%d')
                
                if not os.path.exists(filepath):
                    print(f"File not found: {filepath}")
                    continue
                
                file_list.append((filepath, date))
                print(f"Added: {filepath} -> {date}")

            except ValueError as e:
                print(f"Invalid format. Use: filepath,YYYY-MM-DD")
        
        if file_list:
            print(f"\nReady to seed {len(file_list)} files")
            confirm = input("Proceed? (y/n): ")
            if confirm.lower() == 'y':
                seed_multiple_files(file_list, args.min_rating)
        else:
            print("No files to process")
    
    else:
        print("Error: Provide --file and --date, use --batch mode, or use --all")
        print("\nExamples:")
        print("  python seed_historical_data.py --all")
        print("  python seed_historical_data.py --all --min-rating 2600")
        print("  python seed_historical_data.py --file oct2024.txt --date 2024-10-01")
        print("  python seed_historical_data.py --batch")

if __name__ == "__main__":
    main()