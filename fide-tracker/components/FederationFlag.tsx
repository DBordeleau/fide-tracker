import { fideToIso } from '../lib/fideToIso'
import * as Flags from 'country-flag-icons/react/3x2'

interface FlagIconProps {
    fideCode: string
    className?: string
}

export default function FlagIcon({ fideCode, className = 'w-6 h-4' }: FlagIconProps) {
    const isoCode = fideToIso(fideCode)

    if (!isoCode) {
        // Show the FIDE code as text if no mapping found
        return <span className="text-xs text-gray-500">{fideCode}</span>
    }

    const FlagComponent = (Flags as any)[isoCode]

    if (!FlagComponent) {
        return <span className="text-xs text-gray-500">{fideCode}</span>
    }

    return <FlagComponent title={fideCode} className={className} />
}