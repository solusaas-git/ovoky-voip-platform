import { 
  Home, 
  Users, 
  Settings, 
  LogOut,
  FileText,
  Activity
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/client', icon: Home },
  { name: 'Accounts', href: '/client/accounts', icon: Users },
  { name: 'Active Calls', href: '/client/calls/active', icon: Activity },
  { name: 'CDR Reports', href: '/client/calls/cdrs', icon: FileText },
  { name: 'Settings', href: '/client/settings', icon: Settings },
];

export function ClientNav() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <nav className="flex flex-col h-full">
      <div className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5',
                  isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </div>
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <button
          onClick={() => logout()}
          className="group flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
        >
          <LogOut
            className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
            aria-hidden="true"
          />
          Sign out
        </button>
      </div>
    </nav>
  );
} 