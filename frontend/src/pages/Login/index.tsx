import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Divider } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { loginApi } from '../../api/auth.api';
import { EYColors, EYTypography, EYSpacing, EYBorderRadius, EYShadows } from '../../styles/ey-theme';

const { Title, Text } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      // 调用后端登录API
      const response = await loginApi(values.username, values.password);
      
      if (response.success && response.data) {
        // 保存用户信息到Store
        login(response.data);
        
        message.success('登录成功！');
        navigate('/research/meeting-audio');
      } else {
        message.error(response.message || '登录失败，请检查用户名和密码');
      }
    } catch (error) {
      message.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${EYColors.deepGray} 0%, #2d2d2d 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: EYSpacing.xl,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: EYBorderRadius.lg,
          boxShadow: EYShadows.xl,
          border: `2px solid ${EYColors.yellow}`,
        }}
        bodyStyle={{
          padding: EYSpacing.xxl,
        }}
      >
        {/* Logo区域 */}
        <div style={{ textAlign: 'center', marginBottom: EYSpacing.xl }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: EYSpacing.sm,
              marginBottom: EYSpacing.md,
            }}
          >
            <span
              style={{
                fontFamily: EYTypography.headingFontFamily,
                fontWeight: EYTypography.weights.black,
                fontSize: 48,
                color: EYColors.yellow,
                letterSpacing: EYTypography.letterSpacings.tight,
                lineHeight: 1,
              }}
            >
              EY
            </span>
            <div
              style={{
                borderLeft: `3px solid ${EYColors.yellow}`,
                paddingLeft: EYSpacing.md,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  color: EYColors.yellow,
                  fontSize: EYTypography.sizes.lg,
                  fontWeight: EYTypography.weights.bold,
                  lineHeight: 1.2,
                  letterSpacing: EYTypography.letterSpacings.wider,
                  textTransform: 'uppercase',
                }}
              >
                AI
              </div>
              <div
                style={{
                  color: EYColors.mediumGray,
                  fontSize: EYTypography.sizes.sm,
                  lineHeight: 1.2,
                  letterSpacing: EYTypography.letterSpacings.wide,
                }}
              >
                Assistant
              </div>
            </div>
          </div>
          <Title level={4} style={{ margin: 0, color: EYColors.deepGray }}>
            欢迎登录
          </Title>
          <Text type="secondary" style={{ fontSize: EYTypography.sizes.sm }}>
            Building a better working world
          </Text>
        </div>

        <Divider style={{ borderColor: EYColors.lightGray, margin: `${EYSpacing.lg}px 0` }} />

        {/* 登录表单 */}
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={handleLogin}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: EYColors.yellow }} />}
              placeholder="用户名"
              style={{
                borderRadius: EYBorderRadius.md,
                borderColor: EYColors.lightGray,
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: EYColors.yellow }} />}
              placeholder="密码"
              style={{
                borderRadius: EYBorderRadius.md,
                borderColor: EYColors.lightGray,
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: EYSpacing.lg }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<LoginOutlined />}
              block
              style={{
                background: EYColors.yellow,
                borderColor: EYColors.yellow,
                color: EYColors.deepGray,
                fontWeight: EYTypography.weights.bold,
                borderRadius: EYBorderRadius.md,
                height: 48,
                fontSize: EYTypography.sizes.md,
                letterSpacing: EYTypography.letterSpacings.normal,
              }}
            >
              登 录
            </Button>
          </Form.Item>
        </Form>

        {/* 底部提示 */}
        <div style={{ textAlign: 'center', marginTop: EYSpacing.lg }}>
          <Text type="secondary" style={{ fontSize: EYTypography.sizes.xs }}>
            © 2024 EY AI Assistant. All rights reserved.
          </Text>
        </div>
      </Card>
    </div>
  );
}
