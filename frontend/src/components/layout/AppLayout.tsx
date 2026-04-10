import React, { useEffect } from 'react';
import { Layout, Menu, Tooltip, Typography, Divider } from 'antd';
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
} from '@ant-design/icons';
import { useAppStore } from '../../store/useAppStore';
import { getHealthStatus } from '../../api/sap.api';

const { Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/ts',      icon: <FileTextOutlined />, label: 'SAP 读取 → TS 文档' },
  { key: '/fs',      icon: <FormOutlined />,     label: 'SAP 读取 → FS 文档' },
  { key: '/code',    icon: <CodeOutlined />,      label: 'FS 文档 → ABAP 代码' },
  { key: '/meeting', icon: <TeamOutlined />,      label: '会议记录 → FS 文档' },
];

const PAGE_LABELS: Record<string, string> = {
  '/ts':      'Generate Technical Specification',
  '/fs':      'Generate Functional Specification',
  '/code':    'Generate ABAP Code from FS',
  '/meeting': 'Meeting Notes to FS',
};

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, flexShrink: 0 }}>{icon}</span>
      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, flexShrink: 0, minWidth: 36 }}>
        {label}
      </span>
      <span
        style={{
          color: 'rgba(255,255,255,0.75)',
          fontSize: 11,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
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

  const pageLabel = PAGE_LABELS[location.pathname] ?? 'SAP AI Development Platform';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <Sider
        width={240}
        style={{ background: '#2E2E38', display: 'flex', flexDirection: 'column' }}
        breakpoint="lg"
        collapsedWidth="0"
      >
        {/* EY Logo */}
        <div
          style={{
            padding: '0 20px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span
              style={{
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontWeight: 900,
                fontSize: 28,
                color: '#FFE600',
                letterSpacing: '-1px',
                lineHeight: 1,
              }}
            >
              EY
            </span>
            <div style={{ marginLeft: 10, borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 10 }}>
              <div style={{ color: '#FFE600', fontSize: 11, fontWeight: 700, lineHeight: 1.2, letterSpacing: '0.08em' }}>
                SAP AI
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, lineHeight: 1.2, letterSpacing: '0.04em' }}>
                DEVELOPMENT
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, paddingTop: 8, overflowY: 'auto' }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ background: 'transparent', borderRight: 'none' }}
          />
        </div>

        {/* ── SAP Status + Account Info ── */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '14px 16px 16px',
            flexShrink: 0,
          }}
        >
          {/* Connection status row */}
          <Tooltip
            placement="right"
            title={
              <div style={{ fontSize: 12 }}>
                <div><b>SAP URL：</b>{sap.url || '未配置'}</div>
                <div style={{ marginTop: 4 }}>
                  <b>最后检查：</b>
                  {sap.lastCheck
                    ? new Date(sap.lastCheck).toLocaleTimeString('zh-CN')
                    : '未检查'}
                </div>
              </div>
            }
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default' }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: sap.connected ? '#52c41a' : '#ff4d4f',
                  flexShrink: 0,
                  boxShadow: sap.connected
                    ? '0 0 6px rgba(82,196,26,0.7)'
                    : '0 0 6px rgba(255,77,79,0.7)',
                }}
              />
              <Text style={{ color: sap.connected ? '#52c41a' : '#ff4d4f', fontSize: 12, fontWeight: 600 }}>
                {sap.connected ? 'SAP Connected' : 'SAP Disconnected'}
              </Text>
            </div>
          </Tooltip>

          {/* Account & System info — only when connected */}
          {sap.connected && (
            <>
              <Divider style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '10px 0 4px' }} />
              <InfoRow icon={<UserOutlined />}        label="用户"   value={sap.user} />
              <InfoRow icon={<DatabaseOutlined />}    label="Client" value={sap.client} />
              <InfoRow icon={<GlobalOutlined />}      label="主机"   value={sap.host} />
              <InfoRow icon={<TranslationOutlined />} label="语言"   value={sap.language} />
            </>
          )}
        </div>
      </Sider>

      {/* ── Main content ── */}
      <Layout style={{ background: '#F6F6FA' }}>
        <div
          style={{
            background: '#FFFFFF',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            borderBottom: '3px solid #FFE600',
            boxShadow: '0 1px 4px rgba(46,46,56,0.06)',
            flexShrink: 0,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: 700, color: '#2E2E38', letterSpacing: '0.01em' }}>
            {pageLabel}
          </Text>
          <div style={{ marginLeft: 'auto' }}>
            <Text style={{ fontSize: 11, color: '#747480', fontStyle: 'italic', letterSpacing: '0.04em' }}>
              Building a better working world
            </Text>
          </div>
        </div>

        <Content
          style={{
            padding: 24,
            background: '#F6F6FA',
            overflow: 'auto',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
