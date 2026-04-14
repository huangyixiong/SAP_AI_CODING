import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import SourceToTS from './pages/SourceToTS';
import SourceToFS from './pages/SourceToFS';
import FSToCode from './pages/FSToCode';
import MeetingToFS from './pages/MeetingToFS';
import MeetingAudio from './pages/MeetingAudio';
import SAPConfig from './pages/SAPConfig';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

export default function AppRouter() {
  return (
    <Routes>
      {/* 公开路由 - 登录页 */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* 受保护路由 - 需要登录才能访问 */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Navigate to="/research/meeting-audio" replace />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      {/* 前期调研 */}
      <Route
        path="/research/meeting-audio"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MeetingAudio />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      {/* 蓝图计划 */}
      <Route
        path="/blueprint/meeting-fs"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MeetingToFS />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      
      {/* 系统实施 */}
      <Route
        path="/implementation/sap-ts"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SourceToTS />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/implementation/sap-fs"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SourceToFS />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/implementation/fs-code"
        element={
          <ProtectedRoute>
            <AppLayout>
              <FSToCode />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/implementation/config"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SAPConfig />
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
