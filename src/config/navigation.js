import {
  LayoutDashboard, Library, PlayCircle, FileText, Heart, GraduationCap, Megaphone,
  Upload, FolderTree, Users, Activity, FolderOpen, UserRound, LogOut, Briefcase, Compass,
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
    label: 'Career Paths',
    items: [
      { to: '/lava-portal', label: 'LAVA Automation', icon: Briefcase },
      { to: '/explore-niches', label: 'Explore VA Niches', icon: Compass },
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
    label: 'LAVA Applicants',
    items: [{ to: '/admin/lava', label: 'Applicant Management', icon: Briefcase }],
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

/*
 * Top navigation (desktop ≥1280px). Items with `items` open a dropdown.
 * The sidebar sections above are still used for the phone/tablet menu drawer.
 */
export const memberTopNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Library',
    icon: Library,
    items: [
      { to: '/library', label: 'Training Library', icon: Library, description: 'Every video lesson and PDF guide' },
      { to: '/library?type=VIDEO', label: 'Video Library', icon: PlayCircle, description: 'Step-by-step video lessons' },
      { to: '/library?type=PDF', label: 'PDF Library', icon: FileText, description: 'Guides, templates and checklists' },
    ],
  },
  { to: '/lava-portal', label: 'LAVA Automation', icon: Briefcase },
  { to: '/explore-niches', label: 'VA Niches', icon: Compass },
  { to: '/my-learning', label: 'My Learning', icon: GraduationCap },
  { to: '/favorites', label: 'Favorites', icon: Heart },
]

export const adminTopNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/members', label: 'Members', icon: Users },
  {
    label: 'Content',
    icon: FolderOpen,
    items: [
      { to: '/admin/resources', label: 'Training Resources', icon: FolderOpen, description: 'Edit, publish and replace files' },
      { to: '/admin/upload', label: 'Upload Materials', icon: Upload, description: 'Add new videos and PDFs' },
      { to: '/admin/categories', label: 'Categories', icon: FolderTree, description: 'Organize the library' },
      { to: '/admin/announcements', label: 'Announcements', icon: Megaphone, description: 'News for members' },
    ],
  },
  { to: '/admin/lava', label: 'LAVA Applicants', icon: Briefcase },
  { to: '/admin/activity', label: 'Activity Logs', icon: Activity },
]
