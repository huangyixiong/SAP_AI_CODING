import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SourceToTS from './pages/SourceToTS';
import SourceToFS from './pages/SourceToFS';
import FSToCode from './pages/FSToCode';
import MeetingToFS from './pages/MeetingToFS';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/ts" replace />} />
      <Route path="/ts" element={<SourceToTS />} />
      <Route path="/fs" element={<SourceToFS />} />
      <Route path="/code" element={<FSToCode />} />
      <Route path="/meeting" element={<MeetingToFS />} />
    </Routes>
  );
}
