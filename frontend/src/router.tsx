import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/Login';
import ChangePasswordPage from './pages/ChangePassword';
import SourceToTS from './pages/SourceToTS';
import SourceToFS from './pages/SourceToFS';
import SpecWorkspace from './pages/SpecWorkspace';
import AdminUsers from './pages/Admin/Users';
import AdminRoles from './pages/Admin/Roles';
import AdminMailConfig from './pages/Admin/MailConfig';

export default function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* Protected — AppLayout renders <Outlet /> for nested pages */}
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/workspace/spec" replace />} />
        <Route path="workspace/spec" element={<SpecWorkspace />} />
        <Route path="implementation/sap-ts" element={<SourceToTS />} />
        <Route path="implementation/sap-fs" element={<SourceToFS />} />

        {/* Admin — AdminRoute checks isAdmin(), renders <Outlet /> */}
        <Route path="admin" element={<AdminRoute />}>
          <Route path="users" element={<AdminUsers />} />
          <Route path="roles" element={<AdminRoles />} />
          <Route path="mail-config" element={<AdminMailConfig />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
