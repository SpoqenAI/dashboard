'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export function UserNav() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSettingsClick = () => {
    router.push('/settings');
  };

  const handleLogoutClick = async () => {
    try {
      await signOut();

      toast({
        title: 'Signed out successfully',
        description: 'You have been logged out.',
      });

      // Redirect is handled by the auth provider
    } catch (error: any) {
      toast({
        title: 'Error signing out',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="relative h-8 w-8 rounded-full bg-black text-white hover:bg-gray-800">
          <Avatar className="h-8 w-8">
            {user?.user_metadata?.avatar_url ? (
              <AvatarImage
                src={user.user_metadata.avatar_url}
                alt="User Avatar"
              />
            ) : null}
            <AvatarFallback>
              {user?.user_metadata?.first_name?.[0]?.toUpperCase() || ''}
              {user?.user_metadata?.last_name?.[0]?.toUpperCase() ||
                user?.email?.[0]?.toUpperCase() ||
                'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.user_metadata?.display_name ||
                user?.user_metadata?.full_name ||
                'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || 'No email'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleSettingsClick}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogoutClick}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
