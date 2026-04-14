import React, { useEffect } from 'react';
import { Layout, Menu, Tooltip, Typography, Divider, ConfigProvider, Select, Button, Popconfirm, Avatar } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileTextOutlined,
  FormOutlined,
  CodeOutlined,
  TeamOutlined,
  UserOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  TranslationOutlined,
  AudioOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../store/useAppStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getHealthStatus } from '../../api/sap.api';
import { locales, languageOptions } from '../../i18n/locales';
import { EYColors, EYTypography, EYSpacing, EYBorderRadius, EYShadows, eyAntdTheme } from '../../styles/ey-theme';

const { Sider, Content } = Layout;
const { Text } = Typography;

type MenuItem = Required<MenuProps>['items'][number];

// Function to generate menu items based on language
const getMenuItems = (t: any): MenuItem[] => [
  {
    key: 'research',
    label: t.research,
    type: 'group',
    children: [
      { 
        key: '/research/meeting-audio', 
        icon: <AudioOutlined />, 
        label: t.meetingAudio 
      },
    ],
  },
  {
    key: 'blueprint',
    label: t.blueprint,
    type: 'group',
    children: [
      { 
        key: '/blueprint/meeting-fs', 
        icon: <TeamOutlined />, 
        label: t.meetingToFS 
      },
    ],
  },
  {
    key: 'implementation',
    label: t.implementation,
    type: 'group',
    children: [
      { 
        key: '/implementation/sap-ts', 
        icon: <FileTextOutlined />, 
        label: t.sapToTS 
      },
      { 
        key: '/implementation/sap-fs', 
        icon: <FormOutlined />, 
        label: t.sapToFS 
      },
      { 
        key: '/implementation/fs-code', 
        icon: <CodeOutlined />, 
        label: t.fsToCode 
      },
      { 
        key: '/implementation/config', 
        icon: <SettingOutlined />, 
        label: t.configManagement 
      },
    ],
  },
];

const PAGE_LABELS: Record<string, string> = {
  '/research/meeting-audio': 'pageMeetingAudio',
  '/blueprint/meeting-fs': 'pageMeetingToFS',
  '/implementation/sap-ts': 'pageSapToTS',
  '/implementation/sap-fs': 'pageSapToFS',
  '/implementation/fs-code': 'pageFsToCode',
  '/implementation/config': 'pageConfig',
};

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: EYSpacing.sm, 
      marginTop: EYSpacing.xs,
      padding: `${EYSpacing.xs}px ${EYSpacing.sm}px`,
      borderRadius: EYBorderRadius.md,
      background: 'rgba(255,255,255,0.04)',
      transition: 'all 0.2s ease'
    }}>
      <span style={{ 
        color: EYColors.yellow, 
        fontSize: EYTypography.sizes.sm, 
        flexShrink: 0,
        width: 16,
        textAlign: 'center'
      }}>
        {icon}
      </span>
      <span style={{ 
        color: 'rgba(255,255,255,0.5)', 
        fontSize: EYTypography.sizes.xs, 
        flexShrink: 0, 
        minWidth: 40,
        fontWeight: EYTypography.weights.medium,
        letterSpacing: EYTypography.letterSpacings.wide
      }}>
        {label}
      </span>
      <span
        style={{
          color: 'rgba(255,255,255,0.9)',
          fontSize: EYTypography.sizes.xs,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: EYTypography.weights.medium,
          flex: 1
        }}
      >
        {value || '—'}
      </span>
    </div>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { sap, setSAPInfo } = useAppStore();
  const { language, setLanguage } = useLanguageStore();
  const { user, logout } = useAuthStore();
  
  // Get translations
  const t = locales[language];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const check = () => {
      getHealthStatus()
        .then((data) =>
          setSAPInfo({
            connected: data.sap.connected,
            url:       data.sap.url,
            host:      data.sap.host,
            user:      data.sap.user,
            client:    data.sap.client,
            language:  data.sap.language,
            lastCheck: data.sap.lastCheck ?? null,
          })
        )
        .catch(() => setSAPInfo({ connected: false }));
    };

    check();
    const timer = setInterval(check, 15000);
    return () => clearInterval(timer);
  }, [setSAPInfo]);

  // Get the current path for highlighting
  const currentPath = location.pathname;
  const pageLabelKey = PAGE_LABELS[currentPath];
  const pageLabel = pageLabelKey ? t[pageLabelKey as keyof typeof t] : t.appTitle;
  
  // Generate menu items with current language
  const menuItems = getMenuItems(t);

  return (
    <ConfigProvider theme={eyAntdTheme}>
      <Layout style={{ minHeight: '100vh', background: EYColors.lightGray }}>
        {/* ── Sidebar - EY Style ── */}
        <Sider
          width={280}
          style={{ 
            background: EYColors.deepGray,
            display: 'flex', 
            flexDirection: 'column',
            borderRight: `3px solid ${EYColors.yellow}`
          }}
          breakpoint="lg"
          collapsedWidth="0"
        >
          {/* EY Logo - Brand Standard */}
          <div
            style={{
              padding: `0 ${EYSpacing.xl}px`,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              borderBottom: `1px solid rgba(255,230,0,0.2)`,
              flexShrink: 0,
              background: 'rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  fontFamily: EYTypography.headingFontFamily,
                  fontWeight: EYTypography.weights.black,
                  fontSize: EYTypography.sizes.display,
                  color: EYColors.yellow,
                  letterSpacing: EYTypography.letterSpacings.tight,
                  lineHeight: EYTypography.lineHeights.tight,
                }}
              >
                EY
              </span>
              <div style={{ 
                marginLeft: EYSpacing.md, 
                borderLeft: `2px solid ${EYColors.yellow}`, 
                paddingLeft: EYSpacing.md 
              }}>
                <div style={{ 
                  color: EYColors.yellow, 
                  fontSize: EYTypography.sizes.sm, 
                  fontWeight: EYTypography.weights.bold, 
                  lineHeight: EYTypography.lineHeights.tight, 
                  letterSpacing: EYTypography.letterSpacings.wider,
                  textTransform: 'uppercase'
                }}>
                  AI
                </div>
                <div style={{ 
                  color: 'rgba(255,255,255,0.6)', 
                  fontSize: EYTypography.sizes.xs, 
                  lineHeight: EYTypography.lineHeights.tight, 
                  letterSpacing: EYTypography.letterSpacings.wide 
                }}>
                  Assistant
                </div>
              </div>
            </div>
          </div>

          {/* Navigation - Clean & Minimal */}
          <div style={{ 
            flex: 1, 
            paddingTop: EYSpacing.lg, 
            overflowY: 'auto', 
            overflowX: 'hidden',
            paddingInline: EYSpacing.md
          }}>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[currentPath]}
              defaultOpenKeys={['research', 'blueprint', 'implementation']}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
              style={{ 
                background: 'transparent', 
                borderRight: 'none',
                fontSize: EYTypography.sizes.md,
                fontWeight: EYTypography.weights.medium
              }}
            />
          </div>

          {/* ── SAP Status Panel - EY Style ── */}
          <div
            style={{
              borderTop: `1px solid rgba(255,230,0,0.2)`,
              padding: `${EYSpacing.lg}px ${EYSpacing.lg}px ${EYSpacing.xl}px`,
              flexShrink: 0,
              background: 'rgba(0,0,0,0.15)'
            }}
          >
            {/* Connection status */}
            <Tooltip
              placement="right"
              title={
                <div style={{ fontSize: EYTypography.sizes.sm }}>
                  <div><b>SAP URL：</b>{sap.url || t.notConfigured}</div>
                  <div style={{ marginTop: EYSpacing.xs }}>
                    <b>{t.lastCheck}：</b>
                    {sap.lastCheck
                      ? new Date(sap.lastCheck).toLocaleTimeString(language === 'zh-CN' ? 'zh-CN' : 'en-US')
                      : t.notChecked}
                  </div>
                </div>
              }
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: EYSpacing.sm, 
                cursor: 'default', 
                marginBottom: EYSpacing.sm 
              }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: EYBorderRadius.round,
                    background: sap.connected ? EYColors.success : EYColors.error,
                    flexShrink: 0,
                    boxShadow: sap.connected
                      ? `0 0 10px ${EYColors.success}, inset 0 0 4px rgba(255,255,255,0.3)`
                      : `0 0 10px ${EYColors.error}, inset 0 0 4px rgba(255,255,255,0.3)`,
                    transition: 'all 0.3s ease'
                  }}
                />
                <Text style={{ 
                  color: sap.connected ? EYColors.success : EYColors.error, 
                  fontSize: EYTypography.sizes.sm, 
                  fontWeight: EYTypography.weights.semibold,
                  letterSpacing: EYTypography.letterSpacings.normal
                }}>
                  {sap.connected ? t.sapConnected : t.sapDisconnected}
                </Text>
              </div>
            </Tooltip>

            {/* System info */}
            {sap.connected && (
              <>
                <Divider style={{ borderColor: 'rgba(255,230,0,0.15)', margin: `${EYSpacing.sm}px 0` }} />
                <InfoRow icon={<UserOutlined />}        label={t.user}   value={sap.user} />
                <InfoRow icon={<DatabaseOutlined />}    label={t.client} value={sap.client} />
                <InfoRow icon={<GlobalOutlined />}      label={t.host}   value={sap.host} />
                <InfoRow icon={<TranslationOutlined />} label={t.language}   value={sap.language} />
              </>
            )}
          </div>
        </Sider>

        {/* ── Main Content Area ── */}
        <Layout style={{ background: EYColors.lightGray }}>
          {/* Header - EY Yellow Accent */}
          <div
            style={{
              background: EYColors.white,
              height: 72,
              display: 'flex',
              alignItems: 'center',
              padding: `0 ${EYSpacing.xxl}px`,
              borderBottom: `4px solid ${EYColors.yellow}`,
              boxShadow: EYShadows.md,
              flexShrink: 0,
            }}
          >
            <Text style={{ 
              fontSize: EYTypography.sizes.xxl, 
              fontWeight: EYTypography.weights.bold, 
              color: EYColors.deepGray, 
              letterSpacing: EYTypography.letterSpacings.normal,
            }}>
              {pageLabel}
            </Text>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: EYSpacing.lg }}>
              {/* User Info */}
              {user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: EYSpacing.sm }}>
                  <Avatar 
                    size="default" 
                    icon={<UserOutlined />} 
                    style={{ 
                      background: EYColors.yellow, 
                      color: EYColors.deepGray,
                      fontWeight: EYTypography.weights.bold 
                    }} 
                  />
                  <Text style={{ 
                    fontSize: EYTypography.sizes.sm, 
                    color: EYColors.deepGray,
                    fontWeight: EYTypography.weights.medium 
                  }}>
                    {user.username}
                  </Text>
                </div>
              )}
              
              {/* Language Selector */}
              <Select
                value={language}
                onChange={setLanguage}
                options={languageOptions}
                style={{ width: 120 }}
                size="middle"
                suffixIcon={<GlobalOutlined style={{ color: EYColors.yellow }} />}
                dropdownStyle={{
                  borderRadius: EYBorderRadius.md,
                  boxShadow: EYShadows.md
                }}
              />
              
              {/* Logout Button */}
              <Popconfirm
                title="确认登出"
                description="确定要退出登录吗？"
                onConfirm={handleLogout}
                okText="确定"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button
                  icon={<LogoutOutlined />}
                  size="middle"
                  style={{
                    borderColor: EYColors.mediumGray,
                    color: EYColors.mediumGray,
                    borderRadius: EYBorderRadius.md,
                  }}
                >
                  登出
                </Button>
              </Popconfirm>
              
              <Text style={{ 
                fontSize: EYTypography.sizes.xs, 
                color: EYColors.mediumGray, 
                fontStyle: 'italic', 
                letterSpacing: EYTypography.letterSpacings.wider,
                opacity: 0.8
              }}>
                {t.buildingBetterWorld}
              </Text>
            </div>
          </div>

          {/* Content */}
          <Content
            style={{
              padding: EYSpacing.xxl,
              background: EYColors.lightGray,
              overflow: 'auto',
              minHeight: 'calc(100vh - 72px)',
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
