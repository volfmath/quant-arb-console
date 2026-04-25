import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input } from 'antd';
import { useState } from 'react';
import { login } from '../api/client';
import { useAuthStore } from './auth-store';

type LoginForm = {
  username: string;
  password: string;
};

export function LoginPage() {
  const setSession = useAuthStore((state) => state.setSession);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFinish(values: LoginForm) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await login(values.username, values.password);
      setSession(response);
    } catch {
      setError('用户名或密码错误');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel" aria-label="login panel">
        <div>
          <p className="eyebrow">Quant Arb Console</p>
          <h1>登录控制台</h1>
        </div>
        {error ? <Alert type="error" message={error} showIcon /> : null}
        <Form<LoginForm>
          layout="vertical"
          initialValues={{ username: 'admin', password: 'change-me-admin' }}
          onFinish={handleFinish}
        >
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            登录
          </Button>
        </Form>
      </section>
    </main>
  );
}

