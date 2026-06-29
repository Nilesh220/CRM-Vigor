import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function AppShell() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <TopHeader />
        <Outlet />
      </div>
    </div>
  );
}
