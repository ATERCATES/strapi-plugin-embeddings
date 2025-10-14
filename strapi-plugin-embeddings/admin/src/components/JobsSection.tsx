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
import { Play, CheckCircle, CrossCircle, Clock, ArrowClockwise } from '@strapi/icons';

// Dummy jobs data for initial UI
const jobs = [
  {
    id: 1,
    profile: 'Profile A',
    status: 'completed',
    startedAt: '2024-06-01 10:00',
    finishedAt: '2024-06-01 10:05',
    error: null,
    processed: 150,
    total: 150,
  },
  {
    id: 2,
    profile: 'Profile B',
    status: 'running',
    startedAt: '2024-06-02 12:00',
    finishedAt: null,
    error: null,
    processed: 75,
    total: 200,
  },
  {
    id: 3,
    profile: 'Profile C',
    status: 'failed',
    startedAt: '2024-06-03 14:00',
    finishedAt: '2024-06-03 14:02',
    error: 'Connection timeout',
    processed: 30,
    total: 100,
  },
];

const statusConfig: Record<string, { icon: any; color: string; background: string }> = {
  completed: { 
    icon: CheckCircle, 
    color: 'success600', 
    background: 'success100' 
  },
  running: { 
    icon: Play, 
    color: 'primary600', 
    background: 'primary100' 
  },
  failed: { 
    icon: CrossCircle, 
    color: 'danger600', 
    background: 'danger100' 
  },
};

const JobsSection: React.FC = () => (
  <Box background="neutral0" shadow="tableShadow" hasRadius>
    <Box padding={6}>
      <Flex justifyContent="space-between" alignItems="center">
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="delta" as="h2">Indexing Jobs</Typography>
          <Typography variant="pi" textColor="neutral600">
            Monitor the progress of embedding generation jobs
          </Typography>
        </Flex>
        <IconButton aria-label="Refresh jobs">
          <ArrowClockwise />
        </IconButton>
      </Flex>
    </Box>
    
    <Divider />
    
    <Box padding={6}>
      <Table colCount={7} rowCount={jobs.length}>
        <Thead>
          <Tr>
            <Th><Typography variant="sigma">Job ID</Typography></Th>
            <Th><Typography variant="sigma">Profile</Typography></Th>
            <Th><Typography variant="sigma">Status</Typography></Th>
            <Th><Typography variant="sigma">Progress</Typography></Th>
            <Th><Typography variant="sigma">Started At</Typography></Th>
            <Th><Typography variant="sigma">Finished At</Typography></Th>
            <Th><Typography variant="sigma">Error</Typography></Th>
          </Tr>
        </Thead>
        <Tbody>
          {jobs.map(job => {
            const config = statusConfig[job.status];
            const StatusIcon = config.icon;
            const progress = job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;
            
            return (
              <Tr key={job.id}>
                <Td>
                  <Badge backgroundColor="neutral150">#{job.id}</Badge>
                </Td>
                <Td>
                  <Typography fontWeight="semiBold">{job.profile}</Typography>
                </Td>
                <Td>
                  <Flex gap={2} alignItems="center">
                    <StatusIcon width="16px" height="16px" fill={config.color} />
                    <Badge backgroundColor={config.background}>
                      {job.status.toUpperCase()}
                    </Badge>
                  </Flex>
                </Td>
                <Td>
                  <Flex direction="column" alignItems="flex-start" gap={1}>
                    <Typography variant="pi">
                      {job.processed}/{job.total} ({progress}%)
                    </Typography>
                    {job.status === 'running' && (
                      <Box 
                        background="primary200" 
                        style={{ 
                          width: '100px', 
                          height: '4px', 
                          borderRadius: '2px',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <Box 
                          background="primary600"
                          style={{ 
                            width: `${progress}%`, 
                            height: '100%',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </Box>
                    )}
                  </Flex>
                </Td>
                <Td>
                  <Typography variant="pi" textColor="neutral600">
                    {job.startedAt}
                  </Typography>
                </Td>
                <Td>
                  <Typography variant="pi" textColor="neutral600">
                    {job.finishedAt || '-'}
                  </Typography>
                </Td>
                <Td>
                  {job.error ? (
                    <Typography variant="pi" textColor="danger600">
                      {job.error}
                    </Typography>
                  ) : (
                    <Typography variant="pi" textColor="neutral500">-</Typography>
                  )}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  </Box>
);

export default JobsSection;
