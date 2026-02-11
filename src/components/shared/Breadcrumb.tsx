import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

import { cn } from "@/lib/utils"

export interface BreadcrumbProps {
    items: {
        label: string
        href: string
    }[]
    className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
    return (
        <nav
            aria-label="Breadcrumb"
            className={cn("flex flex-wrap items-center gap-1 text-sm text-muted-foreground", className)}
        >
            <Link
                href="/"
                className="flex items-center hover:text-foreground transition-colors"
            >
                <Home className="h-4 w-4" />
                <span className="sr-only">Home</span>
            </Link>
            {items.map((item, index) => (
                <div key={item.href} className="flex items-center min-w-0">
                    <ChevronRight className="h-4 w-4 mx-1" />
                    {index === items.length - 1 ? (
                        <span className="font-medium text-foreground truncate max-w-[140px] sm:max-w-[240px]">{item.label}</span>
                    ) : (
                        <Link
                            href={item.href}
                            className="hover:text-foreground transition-colors truncate max-w-[140px] sm:max-w-[240px]"
                        >
                            {item.label}
                        </Link>
                    )}
                </div>
            ))}
        </nav>
    )
}
