'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  headerActions?: ReactNode;
  className?: string;
}

export function PageLayout({ 
  children, 
  title, 
  description, 
  breadcrumbs, 
  headerActions,
  className = ''
}: PageLayoutProps) {
  return (
    <div className={`min-h-full ${className}`}>
      {/* Page Header */}
      <div className="mb-8">
        {/* Simple Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-4">
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.label} className="flex items-center">
                  {index > 0 && (
                    <ChevronRight className="h-4 w-4 mx-2" />
                  )}
                  {crumb.href ? (
                    <Link 
                      href={crumb.href} 
                      className="hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">
                      {crumb.label}
                    </span>
                  )}
                </div>
              ))}
            </nav>
          </div>
        )}
        
        {/* Page Title & Actions */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground text-base max-w-2xl">
                {description}
              </p>
            )}
          </div>
          
          {headerActions && (
            <div className="flex items-center space-x-2">
              {headerActions}
            </div>
          )}
        </div>
      </div>

      {/* Page Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
} 