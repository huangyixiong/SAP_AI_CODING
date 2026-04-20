import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/useAuthStore';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: { oldPassword: string; newPassword: string }) => {
    setLoading(true);
    try {
      await authApi.changePassword(values.oldPassword, values.newPassword);
      message.success('密码已修改，请重新登录');
      useAuthStore.getState().clearAuth();
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const axiosMsg = (err as any)?.response?.data?.error?.message;
      message.error(axiosMsg || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card title="修改初始密码" style={{ width: 420 }}>
        <p>您正在使用初始密码，请立即修改后才能使用系统。</p>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item label="当前密码" name="oldPassword" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="新密码（至少8位）" name="newPassword" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="确认新密码" name="confirm" dependencies={['newPassword']}
            rules={[{ required: true }, ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                return Promise.reject(new Error('两次密码不一致'));
              },
            })]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>确认修改</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
