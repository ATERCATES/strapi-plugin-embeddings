import React from 'react';
import { 
  Box, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td, 
  Typography, 
  Badge, 
  Flex, 
  Divider,
  IconButton 
} from '@strapi/design-system';
import { ArrowClockwise, CheckCircle, CrossCircle } from '@strapi/icons';

// Dummy logs data for initial UI
const logs = [
  {
    id: 1,
    timestamp: '2024-06-01 10:01',
    profile: 'Profile A',
    endpoint: '/embeddings/query',
    status: 200,
    query: '{"text": "example query"}',
    duration: '145ms',
  },
  {
    id: 2,
    timestamp: '2024-06-02 12:05',
    profile: 'Profile B',
    endpoint: '/embeddings/query',
    status: 500,
    query: '{"text": "error query"}',
    duration: '2.3s',
  },
  {
    id: 3,
    timestamp: '2024-06-03 09:15',
    profile: 'Profile A',
    endpoint: '/embeddings/query',
    status: 200,
    query: '{"text": "another query"}',
    duration: '98ms',
  },
];

const getStatusColor = (status: number) => {
  if (status >= 200 && status < 300) return { bg: 'success100', text: 'success600', icon: CheckCircle };
  if (status >= 400) return { bg: 'danger100', text: 'danger600', icon: CrossCircle };
  return { bg: 'neutral150', text: 'neutral600', icon: CheckCircle };
};

const LogsSection: React.FC = () => (
  <Box background="neutral0" shadow="tableShadow" hasRadius>
    <Box padding={6}>
      <Flex justifyContent="space-between" alignItems="center">
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="delta" as="h2">API Query Logs</Typography>
          <Typography variant="pi" textColor="neutral600">
            Recent API calls and their performance metrics
          </Typography>
        </Flex>
        <IconButton aria-label="Refresh logs">
          <ArrowClockwise />
        </IconButton>
      </Flex>
    </Box>
    
    <Divider />
    
    <Box padding={6}>
      <Table colCount={7} rowCount={logs.length}>
        <Thead>
          <Tr>
            <Th><Typography variant="sigma">Log ID</Typography></Th>
            <Th><Typography variant="sigma">Timestamp</Typography></Th>
            <Th><Typography variant="sigma">Profile</Typography></Th>
            <Th><Typography variant="sigma">Endpoint</Typography></Th>
            <Th><Typography variant="sigma">Status</Typography></Th>
            <Th><Typography variant="sigma">Duration</Typography></Th>
            <Th><Typography variant="sigma">Query</Typography></Th>
          </Tr>
        </Thead>
        <Tbody>
          {logs.map(log => {
            const statusColors = getStatusColor(log.status);
            const StatusIcon = statusColors.icon;
            
            return (
              <Tr key={log.id}>
                <Td>
                  <Badge backgroundColor="neutral150">#{log.id}</Badge>
                </Td>
                <Td>
                  <Typography variant="pi" textColor="neutral600">
                    {log.timestamp}
                  </Typography>
                </Td>
                <Td>
                  <Typography fontWeight="semiBold">{log.profile}</Typography>
                </Td>
                <Td>
                  <Badge backgroundColor="primary100">
                    {log.endpoint}
                  </Badge>
                </Td>
                <Td>
                  <Flex gap={2} alignItems="center">
                    <StatusIcon width="16px" height="16px" fill={statusColors.text} />
                    <Badge backgroundColor={statusColors.bg}>
                      {log.status}
                    </Badge>
                  </Flex>
                </Td>
                <Td>
                  <Typography 
                    variant="pi" 
                    textColor={log.duration.includes('ms') ? 'success600' : 'warning600'}
                    fontWeight="semiBold"
                  >
                    {log.duration}
                  </Typography>
                </Td>
                <Td>
                  <Typography 
                    variant="pi" 
                    textColor="neutral600"
                    style={{ 
                      maxWidth: '200px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {log.query}
                  </Typography>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  </Box>
);

export default LogsSection;
