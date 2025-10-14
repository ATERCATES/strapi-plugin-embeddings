import { Page } from '@strapi/strapi/admin';
import { Routes, Route } from 'react-router-dom';

import { HomePage } from './HomePage';
import { JobsPage } from './JobsPage';
import { LogsPage } from './LogsPage';

const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="jobs" element={<JobsPage />} />
      <Route path="logs" element={<LogsPage />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  );
};

export { App };
