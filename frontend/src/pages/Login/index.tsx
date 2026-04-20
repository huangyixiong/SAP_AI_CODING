import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authApi.login(values.username, values.password);
      const { accessToken, refreshToken, user } = res.data;
      localStorage.setItem('refreshToken', refreshToken);
      setAuth(accessToken, user);
      navigate(user.mustChangePassword ? '/change-password' : '/', { replace: true });
    } catch (err: unknown) {
      const axiosMsg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } })?.error?.message
        : undefined;
      message.error(axiosMsg || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card title="SAP AI CODING 平台登录" style={{ width: 380 }}>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
