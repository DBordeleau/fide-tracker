'use client'

import { useState } from 'react'
import RatingsTable from '../components/RatingsTable'

export default function Home() {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Loading...'

    // Parse the date string directly (YYYY-MM-DD format)
    // This avoids timezone conversion issues
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day) // month is 0-indexed in JS

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }

    return date.toLocaleDateString('en-US', options)
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          FIDE Chess Rankings
        </h1>
        <h6 className="text-center text-gray-700 mb-4">
          Last Updated: {formatDate(lastUpdated)}
        </h6>
        <h6 className="text-center text-gray-600 mb-4">
          Players only show up in this list if they have been rated at least 2500 after October 1, 2024.
        </h6>
        <RatingsTable onDateLoaded={setLastUpdated} />
      </div>
    </main>
  )
}