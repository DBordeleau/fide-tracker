import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
)

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '25')
        const sortBy = searchParams.get('sortBy') || 'rank'
        const sortDirection = searchParams.get('sortDirection') || 'asc'

        // Validate inputs
        if (page < 1 || pageSize < 1 || pageSize > 100) {
            return NextResponse.json(
                { error: 'Invalid pagination parameters' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase.rpc('get_rankings_paginated', {
            page_number: page,
            page_size: pageSize,
            sort_by: sortBy,
            sort_direction: sortDirection
        })

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Extract total count and latest date from first row
        const totalCount = data && data.length > 0 ? data[0].total_count : 0
        const totalPages = Math.ceil(totalCount / pageSize)

        // Get the latest scraped date
        const { data: latestDate, error: dateError } = await supabase
            .from('rankings')
            .select('scraped_date')
            .order('scraped_date', { ascending: false })
            .limit(1)
            .single()

        return NextResponse.json({
            players: data,
            pagination: {
                currentPage: page,
                pageSize,
                totalCount,
                totalPages
            },
            lastUpdated: latestDate?.scraped_date || null
        })
    } catch (error) {
        console.error('API error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch rankings' },
            { status: 500 }
        )
    }
}