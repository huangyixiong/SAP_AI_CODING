import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppRouter from './router';

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#FFE600',
          colorPrimaryHover: '#F0D800',
          colorPrimaryActive: '#E0CB00',
          colorText: '#2E2E38',
          colorTextSecondary: '#747480',
          colorBgLayout: '#F6F6FA',
          colorBgContainer: '#FFFFFF',
          colorBorder: '#DEDEE0',
          borderRadius: 0,
          borderRadiusLG: 0,
          borderRadiusSM: 0,
          borderRadiusXS: 0,
          fontFamily: "'EYInterstate', 'Noto Sans SC', 'Microsoft YaHei', Arial, sans-serif",
          colorLink: '#2E2E38',
          colorLinkHover: '#FFE600',
          colorSuccess: '#168736',
          colorWarning: '#FFE600',
          colorError: '#c0392b',
          boxShadow: '0 1px 4px rgba(46,46,56,0.08)',
          boxShadowSecondary: '0 2px 8px rgba(46,46,56,0.10)',
        },
        components: {
          Button: {
            primaryColor: '#2E2E38',
            borderRadius: 0,
          },
          Card: {
            borderRadius: 0,
            borderRadiusLG: 0,
          },
          Menu: {
            itemSelectedBg: '#FFE600',
            itemSelectedColor: '#2E2E38',
            itemHoverBg: 'rgba(255,230,0,0.12)',
            itemHoverColor: '#FFE600',
            itemColor: 'rgba(255,255,255,0.75)',
            darkItemSelectedBg: '#FFE600',
            darkItemSelectedColor: '#2E2E38',
            darkItemHoverBg: 'rgba(255,230,0,0.15)',
            darkItemHoverColor: '#FFE600',
            darkItemColor: 'rgba(255,255,255,0.75)',
          },
          Steps: {
            colorPrimary: '#FFE600',
          },
          Table: {
            borderRadius: 0,
            borderRadiusLG: 0,
          },
        },
      }}
    >
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ConfigProvider>
  );
}
