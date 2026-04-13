import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SourceToTS from './pages/SourceToTS';
import SourceToFS from './pages/SourceToFS';
import FSToCode from './pages/FSToCode';
import MeetingToFS from './pages/MeetingToFS';
import MeetingAudio from './pages/MeetingAudio';
import SAPConfig from './pages/SAPConfig';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/research/meeting-audio" replace />} />
      
      {/* 前期调研 */}
      <Route path="/research">
        <Route path="meeting-audio" element={<MeetingAudio />} />
      </Route>
      
      {/* 蓝图计划 */}
      <Route path="/blueprint">
        <Route path="meeting-fs" element={<MeetingToFS />} />
      </Route>
      
      {/* 系统实施 */}
      <Route path="/implementation">
        <Route path="sap-ts" element={<SourceToTS />} />
        <Route path="sap-fs" element={<SourceToFS />} />
        <Route path="fs-code" element={<FSToCode />} />
        <Route path="config" element={<SAPConfig />} />
      </Route>
    </Routes>
  );
}
