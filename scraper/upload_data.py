import os
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def get_db_connection():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SECRET_KEY")
    return create_client(url, key)

# Uploads the latest scraped ratings data to supabase
def upload_rankings():
    
    with open('data/rankings_latest.json', 'r') as f:
        players = json.load(f)
    
    if not players:
        print("No data to upload!")
        return
    
    print(f"Uploading {len(players)} players to Supabase...")
    
    conn = get_db_connection()
    
    scraped_date = datetime.utcnow().date().isoformat()
    scraped_at = datetime.utcnow().isoformat()
    
    try:
        print("Upserting players...")
        player_data = [
            {
                'fide_id': p['fide_id'],
                'name': p['name'],
                'birth_year': p['birth_year']
            }
            for p in players
        ]
        
        conn.table("players").upsert(
            player_data,
            on_conflict='fide_id'
        ).execute()
        
        print(f"Upserted {len(player_data)} players")
        
        print("Inserting rankings...")
        ranking_data = [
            {
                'fide_id': p['fide_id'],
                'rank': p['rank'],
                'rating': p['rating'],
                'federation': p['federation'],
                'scraped_date': scraped_date,
                'scraped_at': scraped_at,
                'data_source': 'scraper'
            }
            for p in players
        ]
        
        conn.table("rankings").upsert(
            ranking_data,
            on_conflict='fide_id,scraped_date',
            ignore_duplicates=True
        ).execute()
        
        print(f"Inserted {len(ranking_data)} rankings for {scraped_date}")
        print("\nSuccessfully uploaded all data to Supabase!")
        
    except Exception as e:
        print(f"Error uploading to Supabase: {e}")
        raise

if __name__ == "__main__":
    upload_rankings()