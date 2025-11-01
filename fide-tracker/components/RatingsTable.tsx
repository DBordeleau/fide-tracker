'use client'

import { useEffect, useState } from 'react'
import FederationFlag from './FederationFlag'

type Player = {
    rank: number
    fide_id: string
    name: string
    federation: string
    rating: number
    monthly_change: number | null
    yearly_change: number | null
}

type SortField = 'rank' | 'monthly_change' | 'yearly_change'
type SortOrder = 'asc' | 'desc'

export default function RatingsTable() {
    const [players, setPlayers] = useState<Player[]>([])
    const [sortedPlayers, setSortedPlayers] = useState<Player[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortField, setSortField] = useState<SortField>('rank')
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

    useEffect(() => {
        async function fetchRankings() {
            try {
                const response = await fetch('/api/ratings/latest')
                if (!response.ok) throw new Error('Failed to fetch rankings')
                const data = await response.json()
                setPlayers(data)
                setSortedPlayers(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred')
            } finally {
                setLoading(false)
            }
        }

        fetchRankings()
    }, [])

    useEffect(() => {
        const sorted = [...players].sort((a, b) => {
            let aValue = a[sortField]
            let bValue = b[sortField]

            // put null values at end (shouldn't happen?)
            if (aValue === null) return 1
            if (bValue === null) return -1

            if (sortOrder === 'asc') {
                return aValue - bValue
            } else {
                return bValue - aValue
            }
        })
        setSortedPlayers(sorted)
    }, [players, sortField, sortOrder])

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortOrder(field === 'rank' ? 'asc' : 'desc')
        }
    }

    const formatChange = (change: number | null) => {
        if (change === null) return '—'
        if (change === 0) return '0'
        return change > 0 ? `+${change}` : `${change}`
    }

    const getChangeColor = (change: number | null) => {
        if (change === null || change === 0) return 'text-gray-500'
        return change > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'
    }

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return (
                <svg className="w-5 h-5 ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            )
        }
        return sortOrder === 'asc' ? (
            <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
        ) : (
            <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-xl text-gray-600">Loading rankings...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-xl text-red-600">Error: {error}</div>
            </div>
        )
    }

    return (
        <div className="w-full overflow-x-auto rounded-lg shadow-lg">
            <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                    <tr>
                        <th
                            className="px-3 py-4 text-left text-base font-bold uppercase tracking-wide cursor-pointer hover:bg-gray-600 transition-colors w-16"
                            onClick={() => handleSort('rank')}
                        >
                            <div className="flex items-center">
                                Rank
                                <SortIcon field="rank" />
                            </div>
                        </th>
                        <th className="px-3 py-4 text-left text-base font-bold uppercase tracking-wide w-3rem">
                            Name
                        </th>
                        <th className="px-3 py-4 text-center text-base font-bold uppercase tracking-wide hidden sm:table-cell w-16">
                            Federation
                        </th>
                        <th className="px-3 py-4 text-right text-base font-bold uppercase tracking-wide w-20">
                            ELO
                        </th>
                        <th
                            className="px-3 pl-8 py-4 text-right text-base font-bold uppercase tracking-wide cursor-pointer hover:bg-gray-600 transition-colors hidden md:table-cell w-28"
                            onClick={() => handleSort('monthly_change')}
                        >
                            <div className="flex items-center justify-end">
                                MOM Change
                                <SortIcon field="monthly_change" />
                            </div>
                        </th>
                        <th
                            className="px-3 py-4 text-right text-base font-bold uppercase tracking-wide cursor-pointer hover:bg-gray-600 transition-colors hidden lg:table-cell w-28"
                            onClick={() => handleSort('yearly_change')}
                        >
                            <div className="flex items-center justify-end">
                                YOY Change
                                <SortIcon field="yearly_change" />
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {sortedPlayers.map((player, index) => (
                        <tr
                            key={player.fide_id}
                            className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        >
                            <td className="px-3 py-3 whitespace-nowrap text-base font-bold text-gray-900 w-16">
                                {player.rank}
                            </td>
                            <td className="px-3 py-3 text-base font-medium text-gray-900 w-52">
                                <div className="truncate" title={player.name}>
                                    {player.name}
                                </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap hidden sm:table-cell w-16">
                                <div className="flex justify-center">
                                    <FederationFlag fideCode={player.federation} className="w-8 h-6 rounded shadow-sm" />
                                </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-base text-right font-bold text-gray-900 w-20">
                                {player.rating}
                            </td>
                            <td
                                className={`px-3 py-3 whitespace-nowrap text-base text-center font-medium hidden md:table-cell w-28 ${getChangeColor(
                                    player.monthly_change
                                )}`}
                            >
                                {formatChange(player.monthly_change)}
                            </td>
                            <td
                                className={`px-3 py-3 whitespace-nowrap text-base text-center font-medium hidden lg:table-cell w-28 ${getChangeColor(
                                    player.yearly_change
                                )}`}
                            >
                                {formatChange(player.yearly_change)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}