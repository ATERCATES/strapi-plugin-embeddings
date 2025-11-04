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
        padding: '12px 32px',
        borderBottom: isActive ? '3px solid #4945FF' : '3px solid transparent',
        color: isActive ? '#4945FF' : '#32324D',
        fontWeight: isActive ? 600 : 500,
        fontSize: '14px',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        whiteSpace: 'nowrap',
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
      style={{
        borderBottom: '1px solid #EAEAEF',
        marginBottom: '0',
      }}
    >
      <Box paddingLeft={8} paddingRight={8} paddingTop={3} paddingBottom={3}>
        <Flex gap={0} alignItems="center" minHeight="48px">
          <NavLink to={basePath} isActive={isActive(basePath)}>
            Profiles
          </NavLink>
        </Flex>
      </Box>
    </Box>
  );
};

export { SubNav };
