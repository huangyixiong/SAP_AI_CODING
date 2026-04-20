import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../api/auth.api';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, setAuth, clearAuth } = useAuthStore();
  const [checking, setChecking] = useState(!accessToken);

  useEffect(() => {
    if (accessToken) return;
    const raw = localStorage.getItem('refreshToken');
    if (!raw) { setChecking(false); return; }

    authApi.refresh(raw)
      .then((res) => {
        const { accessToken: newToken, refreshToken } = res.data;
        localStorage.setItem('refreshToken', refreshToken);
        return authApi.me().then((meRes) => setAuth(newToken, meRes.data));
      })
      .catch(() => clearAuth())
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <Spin fullscreen tip="加载中..." />;
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
