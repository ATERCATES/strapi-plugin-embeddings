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
import { ArrowClockwise, CheckCircle, CrossCircle, File } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import { getTranslation } from '../utils/getTranslation';
import { PLUGIN_ID } from '../pluginId';
import { SubNav } from '../components/SubNav';

interface Log {
  id: string;
  timestamp: string;
  profile: string;
  endpoint: string;
  status: number;
  query?: string;
  duration?: number;
  createdAt: string;
}

const getStatusColor = (status: number) => {
  if (status >= 200 && status < 300) return { bg: 'success100', text: 'success600', icon: CheckCircle };
  if (status >= 400) return { bg: 'danger100', text: 'danger600', icon: CrossCircle };
  return { bg: 'neutral150', text: 'neutral600', icon: CheckCircle };
};

const LogsPage = () => {
  const { formatMessage } = useIntl();
  const { get } = useFetchClient();
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data }: any = await get(`/${PLUGIN_ID}/logs`);
      setLogs(data?.data || []);
    } catch (err) {
      console.error('Error loading logs:', err);
      setError('Failed to load logs');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title="API Query Logs"
          subtitle="Recent API calls and their performance metrics"
          primaryAction={
            <Button startIcon={<ArrowClockwise />} onClick={loadLogs} size="L">
              Refresh
            </Button>
          }
        />

        <SubNav />

        <Box padding={8} background="neutral100">
          {isLoading ? (
            <Flex justifyContent="center" alignItems="center" padding={11}>
              <Loader>Loading logs...</Loader>
            </Flex>
          ) : error ? (
            <Alert closeLabel="Close" title="Error" variant="danger">
              {error}
            </Alert>
          ) : logs.length === 0 ? (
            <Box background="neutral0" padding={8} shadow="tableShadow" hasRadius>
              <EmptyStateLayout
                icon={<File width="10rem" height="10rem" />}
                content="No logs found. API query logs will appear here when embeddings are queried."
              />
            </Box>
          ) : (
            <Box background="neutral0" shadow="tableShadow" hasRadius>
              <Box padding={6}>
                <Flex justifyContent="space-between" alignItems="center">
                  <Typography variant="delta" as="h2">
                    Recent API Calls
                  </Typography>
                  <Badge size="M">{logs.length} logs</Badge>
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
                      const duration = log.duration 
                        ? log.duration < 1000 
                          ? `${log.duration}ms` 
                          : `${(log.duration / 1000).toFixed(2)}s`
                        : '-';
                      
                      return (
                        <Tr key={log.id}>
                          <Td>
                            <Badge backgroundColor="neutral150">#{log.id}</Badge>
                          </Td>
                          <Td>
                            <Typography variant="pi" textColor="neutral600">
                              {new Date(log.timestamp).toLocaleString()}
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
                            {log.duration ? (
                              <Typography 
                                variant="pi" 
                                textColor={log.duration < 1000 ? 'success600' : 'warning600'}
                                fontWeight="semiBold"
                              >
                                {duration}
                              </Typography>
                            ) : (
                              <Typography variant="pi" textColor="neutral500">-</Typography>
                            )}
                          </Td>
                          <Td>
                            {log.query ? (
                              <Typography 
                                variant="pi" 
                                textColor="neutral600"
                                style={{ 
                                  maxWidth: '200px', 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={log.query}
                              >
                                {log.query}
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

export { LogsPage };
