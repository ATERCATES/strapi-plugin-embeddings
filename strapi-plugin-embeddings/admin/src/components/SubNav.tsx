import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Flex } from '@strapi/design-system';
import { PLUGIN_ID } from '../pluginId';

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  isActive: boolean;
}

const NavLink = ({ to, children, isActive }: NavLinkProps) => {
  return (
    <Link
      to={to}
      style={{
        textDecoration: 'none',
        padding: '12px 24px',
        borderBottom: isActive ? '2px solid #4945FF' : '2px solid transparent',
        color: isActive ? '#4945FF' : '#32324D',
        fontWeight: isActive ? 600 : 400,
        fontSize: '14px',
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </Link>
  );
};

const SubNav = () => {
  const location = useLocation();
  const basePath = `/plugins/${PLUGIN_ID}`;
  
  const isActive = (path: string) => {
    if (path === basePath) {
      return location.pathname === basePath;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      background="neutral0"
      borderColor="neutral200"
      style={{
        borderBottom: '1px solid #EAEAEF',
        marginBottom: '0',
      }}
    >
      <Box paddingLeft={8} paddingRight={8}>
        <Flex gap={0}>
          <NavLink to={basePath} isActive={isActive(basePath)}>
            Profiles
          </NavLink>
          <NavLink to={`${basePath}/jobs`} isActive={isActive(`${basePath}/jobs`)}>
            Jobs
          </NavLink>
          <NavLink to={`${basePath}/logs`} isActive={isActive(`${basePath}/logs`)}>
            Logs
          </NavLink>
        </Flex>
      </Box>
    </Box>
  );
};

export { SubNav };
