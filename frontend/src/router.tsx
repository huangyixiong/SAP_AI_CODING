import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SourceToTS from './pages/SourceToTS';
import SourceToFS from './pages/SourceToFS';
import SpecWorkspace from './pages/SpecWorkspace';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/workspace/spec" replace />} />

      <Route path="/workspace/spec" element={<SpecWorkspace />} />

      <Route path="/implementation">
        <Route path="sap-ts" element={<SourceToTS />} />
        <Route path="sap-fs" element={<SourceToFS />} />
      </Route>
      <Route path="*" element={<Navigate to="/workspace/spec" replace />} />
    </Routes>
  );
}
