import {
  LayoutDashboard, Library, PlayCircle, FileText, Heart, GraduationCap, Megaphone,
  Upload, FolderTree, Users, Activity, FolderOpen, UserRound, LogOut,
} from 'lucide-react'

/** Member portal sidebar. */
export const memberNavigation = [
  {
    label: 'Learn',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/library', label: 'Training Library', icon: Library },
      { to: '/library?type=VIDEO', label: 'Video Library', icon: PlayCircle },
      { to: '/library?type=PDF', label: 'PDF Library', icon: FileText },
    ],
  },
  {
    label: 'My Learning',
    items: [
      { to: '/my-learning', label: 'My Learning', icon: GraduationCap },
      { to: '/favorites', label: 'Favorites', icon: Heart },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile', label: 'My Profile', icon: UserRound },
      { action: 'logout', label: 'Log out', icon: LogOut },
    ],
  },
]

/** Member bottom tab bar on phones/tablets. */
export const memberTabs = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/my-learning', label: 'Learning', icon: GraduationCap },
  { to: '/favorites', label: 'Favorites', icon: Heart },
  { to: '/profile', label: 'Profile', icon: UserRound },
]

/** Admin console sidebar. */
export const adminNavigation = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/members', label: 'Members', icon: Users },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/admin/resources', label: 'Training Resources', icon: FolderOpen },
      { to: '/admin/upload', label: 'Upload Materials', icon: Upload },
      { to: '/admin/categories', label: 'Categories', icon: FolderTree },
      { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    ],
  },
  {
    label: 'Records',
    items: [{ to: '/admin/activity', label: 'Activity Logs', icon: Activity }],
  },
  {
    label: 'Account',
    items: [{ action: 'logout', label: 'Log out', icon: LogOut }],
  },
]
