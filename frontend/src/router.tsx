import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SourceToTS from './pages/SourceToTS';
import SourceToFS from './pages/SourceToFS';
import FSToCode from './pages/FSToCode';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/implementation/sap-ts" replace />} />
      
      {/* 系统实施 */}
      <Route path="/implementation">
        <Route path="sap-ts" element={<SourceToTS />} />
        <Route path="sap-fs" element={<SourceToFS />} />
        <Route path="fs-code" element={<FSToCode />} />
      </Route>
      <Route path="*" element={<Navigate to="/implementation/sap-ts" replace />} />
    </Routes>
  );
}
