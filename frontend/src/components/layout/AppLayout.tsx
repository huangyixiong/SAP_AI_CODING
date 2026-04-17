import React, { useEffect } from 'react';
import { Layout, Menu, Tooltip, Typography, Divider, ConfigProvider, Grid, Drawer, Button } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileTextOutlined,
  FormOutlined,
  CodeOutlined,
  UserOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  TranslationOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../store/useAppStore';
import { getHealthStatus } from '../../api/sap.api';
import { EYColors, EYTypography, EYSpacing, EYBorderRadius, EYShadows, eyAntdTheme } from '../../styles/ey-theme';

const { Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  {
    key: 'core',
    label: '核心功能',
    type: 'group',
    children: [
      { 
        key: '/implementation/sap-ts', 
        icon: <FileTextOutlined />, 
        label: '代码反向工程(TS)' 
      },
      { 
        key: '/implementation/sap-fs', 
        icon: <FormOutlined />, 
        label: '代码反向工程(FS)' 
      },
      { 
        key: '/implementation/fs-code', 
        icon: <CodeOutlined />, 
        label: '规格驱动代码生成' 
      },
    ],
  },
] as MenuItem[];

const PAGE_LABELS: Record<string, string> = {
  '/implementation/sap-ts': '代码反向工程 - 技术规格书',
  '/implementation/sap-fs': '代码反向工程 - 功能规格书',
  '/implementation/fs-code': '规格驱动代码生成',
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
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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
        .catch(() =>
          setSAPInfo({
            connected: false,
            url: '',
            host: '',
            user: '',
            client: '',
            language: '',
            lastCheck: null,
          })
        );
    };

    check();
    const timer = setInterval(check, 15000);
    return () => clearInterval(timer);
  }, [setSAPInfo]);

  // Get the current path for highlighting
  const currentPath = location.pathname;
  const pageLabel = PAGE_LABELS[currentPath] ?? 'AI Assistant';

  return (
    <ConfigProvider theme={eyAntdTheme}>
      <Layout style={{ minHeight: '100vh', background: EYColors.lightGray }}>
        {/* ── Sidebar - EY Style ── */}
        {!isMobile && (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: EYSpacing.md }}>
              <span
                style={{
                  fontFamily: EYTypography.headingFontFamily,
                  fontWeight: EYTypography.weights.black,
                  fontSize: 44,
                  color: EYColors.yellow,
                  letterSpacing: EYTypography.letterSpacings.tight,
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  position: 'relative',
                  top: 6,
                }}
              >
                EY
              </span>
              <div style={{ 
                borderLeft: `2px solid ${EYColors.yellow}`, 
                paddingLeft: EYSpacing.md,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
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
              defaultOpenKeys={['core']}
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
                  <div><b>SAP URL：</b>{sap.url || '未配置'}</div>
                  <div style={{ marginTop: EYSpacing.xs }}>
                    <b>最后检查：</b>
                    {sap.lastCheck
                      ? new Date(sap.lastCheck).toLocaleTimeString('zh-CN')
                      : '未检查'}
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
                  {sap.connected ? 'SAP 已连接' : 'SAP 未连接'}
                </Text>
              </div>
            </Tooltip>

            {/* System info */}
            {sap.connected && (
              <>
                <Divider style={{ borderColor: 'rgba(255,230,0,0.15)', margin: `${EYSpacing.sm}px 0` }} />
                <InfoRow icon={<UserOutlined />}        label="用户"   value={sap.user} />
                <InfoRow icon={<DatabaseOutlined />}    label="Client" value={sap.client} />
                <InfoRow icon={<GlobalOutlined />}      label="主机"   value={sap.host} />
                <InfoRow icon={<TranslationOutlined />} label="语言"   value={sap.language} />
              </>
            )}
          </div>
        </Sider>
        )}

        {/* ── Main Content Area ── */}
        <Layout style={{ background: EYColors.lightGray }}>
          {/* Header - EY Yellow Accent */}
          <div
            style={{
              background: EYColors.white,
              height: 72,
              padding: `0 ${isMobile ? EYSpacing.md : EYSpacing.xxl}px`,
              borderBottom: `4px solid ${EYColors.yellow}`,
              boxShadow: EYShadows.md,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                maxWidth: 1600,
                width: '100%',
                height: '100%',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isMobile && (
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setMobileMenuOpen(true)}
                  style={{ marginRight: EYSpacing.sm }}
                />
              )}
              <Text style={{ 
                fontSize: isMobile ? EYTypography.sizes.lg : EYTypography.sizes.xxl,
                fontWeight: EYTypography.weights.bold, 
                color: EYColors.deepGray, 
                letterSpacing: EYTypography.letterSpacings.normal,
              }}>
                {pageLabel}
              </Text>
              <div style={{ marginLeft: 'auto', display: isMobile ? 'none' : 'block' }}>
                <Text style={{ 
                  fontSize: EYTypography.sizes.xs, 
                  color: EYColors.mediumGray, 
                  fontStyle: 'italic', 
                  letterSpacing: EYTypography.letterSpacings.wider,
                  opacity: 0.8
                }}>
                  Building a better working world
                </Text>
              </div>
            </div>
          </div>

          {/* Content */}
          <Content
            style={{
              padding: isMobile ? EYSpacing.md : EYSpacing.xxl,
              background: EYColors.lightGray,
              overflow: 'auto',
              minHeight: 'calc(100vh - 72px)',
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
      <Drawer
        title="导航"
        placement="left"
        open={isMobile && mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        width={280}
        bodyStyle={{ padding: 0, background: EYColors.deepGray }}
        headerStyle={{ background: EYColors.deepGray, color: EYColors.white, borderBottom: '1px solid rgba(255,230,0,0.2)' }}
      >
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentPath]}
          defaultOpenKeys={['core']}
          items={menuItems}
          onClick={({ key }) => {
            navigate(key);
            setMobileMenuOpen(false);
          }}
          style={{ borderRight: 'none', background: EYColors.deepGray }}
        />
      </Drawer>
    </ConfigProvider>
  );
}
