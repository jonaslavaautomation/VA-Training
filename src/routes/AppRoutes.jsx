import { Route, Routes } from 'react-router-dom'
import AuthLayout from '@/components/layout/AuthLayout'
import MemberLayout from '@/components/layout/MemberLayout'
import AdminLayout from '@/components/layout/AdminLayout'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'
import PublicOnlyRoute from './PublicOnlyRoute'
import HomeRedirect from './HomeRedirect'
import { lazyPage } from '@/lib/lazyPage'

import LoginPage from '@/pages/auth/LoginPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import SignUpPage from '@/pages/auth/SignUpPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import NotFoundPage from '@/pages/NotFoundPage'

// Pages behind sign-in load on demand (smaller first download, faster login page).
const MemberDashboardPage = lazyPage(() => import('@/pages/member/DashboardPage'))
const LibraryPage = lazyPage(() => import('@/pages/member/LibraryPage'))
const ResourceDetailPage = lazyPage(() => import('@/pages/member/ResourceDetailPage'))
const MyLearningPage = lazyPage(() => import('@/pages/member/MyLearningPage'))
const FavoritesPage = lazyPage(() => import('@/pages/member/FavoritesPage'))
const ProfilePage = lazyPage(() => import('@/pages/member/ProfilePage'))
const AdminDashboardPage = lazyPage(() => import('@/pages/admin/AdminDashboardPage'))
const MembersPage = lazyPage(() => import('@/pages/admin/MembersPage'))
const UploadPage = lazyPage(() => import('@/pages/admin/UploadPage'))
const ManageResourcesPage = lazyPage(() => import('@/pages/admin/ManageResourcesPage'))
const MemberDetailsPage = lazyPage(() => import('@/pages/admin/MemberDetailsPage'))
const CategoriesPage = lazyPage(() => import('@/pages/admin/CategoriesPage'))
const AdminAnnouncementsPage = lazyPage(() => import('@/pages/admin/AnnouncementsPage'))
const ActivityLogsPage = lazyPage(() => import('@/pages/admin/ActivityLogsPage'))
const MemberAnnouncementsPage = lazyPage(() => import('@/pages/member/AnnouncementsPage'))

export default function AppRoutes() {
  return (
    <Routes>
      {/* Signed-out pages */}
      <Route element={<AuthLayout />}>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/signup" element={<SignUpPage />} />
        </Route>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Signed-in pages */}
      <Route element={<ProtectedRoute />}>
        <Route index element={<HomeRedirect />} />

        {/* Member portal */}
        <Route element={<MemberLayout />}>
          <Route path="/dashboard" element={<MemberDashboardPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/:id" element={<ResourceDetailPage />} />
          <Route path="/my-learning" element={<MyLearningPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/announcements" element={<MemberAnnouncementsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Admin console */}
        <Route path="/admin" element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="resources" element={<ManageResourcesPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="announcements" element={<AdminAnnouncementsPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="members/:id" element={<MemberDetailsPage />} />
            <Route path="activity" element={<ActivityLogsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
