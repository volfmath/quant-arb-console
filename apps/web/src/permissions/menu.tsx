import {
  AlertOutlined,
  DashboardOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

type MenuItem = Required<MenuProps>['items'][number] & {
  permission: string;
};

const menuDefinitions: MenuItem[] = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard', permission: 'dashboard:view' },
  { key: 'opportunities', icon: <ThunderboltOutlined />, label: '套利机会', permission: 'opportunity:view' },
  { key: 'risk', icon: <SafetyOutlined />, label: '风控中心', permission: 'risk:view' },
  { key: 'alerts', icon: <AlertOutlined />, label: '告警中心', permission: 'alert:view' },
];

export function createMenuItems(permissions: string[]): MenuProps['items'] {
  return menuDefinitions
    .filter((item) => permissions.includes(item.permission))
    .map(({ permission: _permission, ...item }) => item);
}

