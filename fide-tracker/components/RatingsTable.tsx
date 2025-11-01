'use client'

import Link from 'next/link'
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

type Pagination = {
    currentPage: number
    pageSize: number
    totalCount: number
    totalPages: number
}

type SortField = 'rank' | 'monthly_change' | 'yearly_change'
type SortOrder = 'asc' | 'desc'

interface RatingsTableProps {
    onDateLoaded?: (date: string | null) => void
}

export default function RatingsTable({ onDateLoaded }: RatingsTableProps) {
    const [players, setPlayers] = useState<Player[]>([])
    const [pagination, setPagination] = useState<Pagination>({
        currentPage: 1,
        pageSize: 25,
        totalCount: 0,
        totalPages: 0
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortField, setSortField] = useState<SortField>('rank')
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
    const [pageInput, setPageInput] = useState('1')

    useEffect(() => {
        fetchRankings()
    }, [pagination.currentPage, sortField, sortOrder])

    async function fetchRankings() {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: pagination.currentPage.toString(),
                pageSize: pagination.pageSize.toString(),
                sortBy: sortField,
                sortDirection: sortOrder
            })

            const response = await fetch(`/api/ratings/latest?${params}`)
            if (!response.ok) throw new Error('Failed to fetch rankings')

            const data = await response.json()
            setPlayers(data.players)
            setPagination(data.pagination)
            setPageInput(data.pagination.currentPage.toString())

            // Pass the date to parent component
            if (onDateLoaded && data.lastUpdated) {
                onDateLoaded(data.lastUpdated)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortOrder(field === 'rank' ? 'asc' : 'desc')
        }
        // Reset to page 1 when sorting changes
        setPagination(prev => ({ ...prev, currentPage: 1 }))
    }

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, currentPage: newPage }))
        }
    }

    const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPageInput(e.target.value)
    }

    const handlePageInputSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const pageNum = parseInt(pageInput)
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pagination.totalPages) {
            handlePageChange(pageNum)
        } else {
            setPageInput(pagination.currentPage.toString())
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

    if (loading && players.length === 0) {
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
        <div className="space-y-4">
            {/* Pagination Controls - Top */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600">
                    Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} - {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} players
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="px-3 py-1 rounded bg-gradient-to-r from-gray-800 to-gray-700 text-white disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>

                    <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Page</span>
                        <input
                            type="number"
                            value={pageInput}
                            onChange={handlePageInputChange}
                            className="w-16 px-2 py-1 border border-gray-300 text-gray-600 rounded text-center"
                            min="1"
                            max={pagination.totalPages}
                        />
                        <span className="text-sm text-gray-600">of {pagination.totalPages}</span>
                    </form>

                    <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="px-3 py-1 rounded bg-gradient-to-r from-gray-800 to-gray-700 text-white disabled:opacity-20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Table */}
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
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : (
                            players.map((player, index) => (
                                <tr
                                    key={player.fide_id}
                                    className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                >
                                    <td className="px-3 py-3 whitespace-nowrap text-base font-bold text-gray-900 w-16">
                                        {player.rank}
                                    </td>
                                    <td className="px-3 py-3 text-base font-medium text-gray-900 w-52">
                                        <Link
                                            href={`/player/${player.fide_id}`}
                                            className="truncate block text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                            title={player.name}
                                        >
                                            {player.name}
                                        </Link>
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
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls - Bottom */}
            <div className="flex items-center justify-center bg-white p-4 rounded-lg shadow">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="px-3 py-1 rounded bg-gradient-to-r from-gray-800 to-gray-700 text-white disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>

                    <span className="px-4 py-1 text-sm text-gray-600">
                        Page {pagination.currentPage} of {pagination.totalPages}
                    </span>

                    <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="px-3 py-1 rounded bg-gradient-to-r from-gray-800 to-gray-700 text-white disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}