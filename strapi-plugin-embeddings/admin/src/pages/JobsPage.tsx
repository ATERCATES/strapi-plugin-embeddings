import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import {
  Main,
  Box,
  Button,
  Typography,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Badge,
  Flex,
  Divider,
  IconButton,
  Loader,
  Alert,
  EmptyStateLayout,
} from '@strapi/design-system';
import { Layouts } from '@strapi/strapi/admin';
import { Play, CheckCircle, CrossCircle, ArrowClockwise, Clock } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import { getTranslation } from '../utils/getTranslation';
import { PLUGIN_ID } from '../pluginId';
import { SubNav } from '../components/SubNav';

interface Job {
  id: string;
  profile: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  processed?: number;
  total?: number;
  createdAt: string;
  updatedAt: string;
}

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
  pending: {
    icon: Clock,
    color: 'warning600',
    background: 'warning100'
  },
  failed: { 
    icon: CrossCircle, 
    color: 'danger600', 
    background: 'danger100' 
  },
};

const JobsPage = () => {
  const { formatMessage } = useIntl();
  const { get } = useFetchClient();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data }: any = await get(`/${PLUGIN_ID}/jobs`);
      setJobs(data?.data || []);
    } catch (err) {
      console.error('Error loading jobs:', err);
      setError('Failed to load jobs');
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title="Indexing Jobs"
          subtitle="Monitor the progress of embedding generation jobs"
          primaryAction={
            <Button startIcon={<ArrowClockwise />} onClick={loadJobs} size="L">
              Refresh
            </Button>
          }
        />

        <SubNav />

        <Box padding={8} background="neutral100">
          {isLoading ? (
            <Flex justifyContent="center" alignItems="center" padding={11}>
              <Loader>Loading jobs...</Loader>
            </Flex>
          ) : error ? (
            <Alert closeLabel="Close" title="Error" variant="danger">
              {error}
            </Alert>
          ) : jobs.length === 0 ? (
            <Box background="neutral0" padding={8} shadow="tableShadow" hasRadius>
              <EmptyStateLayout
                icon={<Clock width="10rem" height="10rem" />}
                content="No jobs found. Jobs will appear here when profiles are indexed."
              />
            </Box>
          ) : (
            <Box background="neutral0" shadow="tableShadow" hasRadius>
              <Box padding={6}>
                <Flex justifyContent="space-between" alignItems="center">
                  <Typography variant="delta" as="h2">
                    Active and Recent Jobs
                  </Typography>
                  <Badge size="M">{jobs.length} jobs</Badge>
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
                      const config = statusConfig[job.status] || statusConfig.pending;
                      const StatusIcon = config.icon;
                      const processed = job.processed || 0;
                      const total = job.total || 0;
                      const progress = total > 0 ? Math.round((processed / total) * 100) : 0;
                      
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
                            {total > 0 ? (
                              <Flex direction="column" alignItems="flex-start" gap={1}>
                                <Typography variant="pi">
                                  {processed}/{total} ({progress}%)
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
                            ) : (
                              <Typography variant="pi" textColor="neutral500">-</Typography>
                            )}
                          </Td>
                          <Td>
                            <Typography variant="pi" textColor="neutral600">
                              {job.startedAt ? new Date(job.startedAt).toLocaleString() : '-'}
                            </Typography>
                          </Td>
                          <Td>
                            <Typography variant="pi" textColor="neutral600">
                              {job.finishedAt ? new Date(job.finishedAt).toLocaleString() : '-'}
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
          )}
        </Box>
      </Main>
    </Layouts.Root>
  );
};

export { JobsPage };
