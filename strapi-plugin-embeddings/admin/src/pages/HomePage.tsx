import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import {
  Main,
  Box,
  Button,
  Typography,
  EmptyStateLayout,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Badge,
  IconButton,
  Flex,
  VisuallyHidden,
  Divider,
  Loader,
  Alert,
} from '@strapi/design-system';
import { Layouts } from '@strapi/strapi/admin';
import { Plus, Eye, Pencil, Trash, ArrowClockwise, Play, CheckCircle, Clock } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import { getTranslation } from '../utils/getTranslation';
import { PLUGIN_ID } from '../pluginId';
import { CreateProfileModal } from '../components/CreateProfileModal';
import { SubNav } from '../components/SubNav';
import { ViewProfileModal } from '../components/ViewProfileModal';
import { DeleteProfileModal } from '../components/DeleteProfileModal';
import { ReindexProfileModal } from '../components/ReindexProfileModal';

interface Profile {
  id: string;
  name: string;
  slug: string;
  description?: string;
  enabled: boolean;
  auto_sync: boolean;
  created_at: string;
  updated_at: string;
}

const HomePage = () => {
  const { formatMessage } = useIntl();
  const { get, post, del } = useFetchClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isReindexOpen, setIsReindexOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data }: any = await get(`/${PLUGIN_ID}/profiles`);
      setProfiles(data?.data || []);
    } catch (err) {
      console.error('Error loading profiles:', err);
      const e: any = err;
      const status = e?.status || e?.response?.status || null;
      if (status === 404) {
        setProfiles([]);
      } else {
        setError('Failed to load profiles');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedProfile) return;
    
    try {
      setIsDeleting(true);
      await del(`/${PLUGIN_ID}/profiles/${id}`);
      await loadProfiles();
      setIsDeleteOpen(false);
      setSelectedProfile(null);
    } catch (err) {
      console.error('Error deleting profile:', err);
      setError('Failed to delete profile');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReindex = async (id: string) => {
    if (!selectedProfile) return;
    
    try {
      setIsReindexing(true);
      await post(`/${PLUGIN_ID}/profiles/${id}/reindex`);
      setIsReindexOpen(false);
      setSelectedProfile(null);
      // Optionally reload profiles or show success message
    } catch (err) {
      console.error('Error reindexing profile:', err);
      setError('Failed to start reindexing');
    } finally {
      setIsReindexing(false);
    }
  };

  const openViewModal = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsViewOpen(true);
  };

  const openDeleteModal = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsDeleteOpen(true);
  };

  const openReindexModal = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsReindexOpen(true);
  };

  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title={formatMessage({ id: getTranslation('page.homepage.title') })}
          subtitle={formatMessage({ id: getTranslation('page.homepage.subtitle') })}
          primaryAction={
            <Button startIcon={<Plus />} onClick={() => setIsCreateOpen(true)} size="L">
              {formatMessage({ id: getTranslation('profiles.create') })}
            </Button>
          }
        />

        <SubNav />

        <Box padding={8} background="neutral100">
          {isLoading ? (
            <Flex justifyContent="center" alignItems="center" padding={11}>
              <Loader>Loading profiles...</Loader>
            </Flex>
          ) : error ? (
            <Alert closeLabel="Close" title="Error" variant="danger">
              {error}
            </Alert>
          ) : profiles.length === 0 ? (
            <Box background="neutral0" padding={8} shadow="tableShadow" hasRadius>
              <EmptyStateLayout
                icon={<Pencil width="10rem" height="10rem" />}
                content={formatMessage({ id: getTranslation('profiles.empty.description') })}
                action={
                  <Button
                    variant="secondary"
                    startIcon={<Plus />}
                    onClick={() => setIsCreateOpen(true)}
                    size="L"
                  >
                    {formatMessage({ id: getTranslation('profiles.create') })}
                  </Button>
                }
              />
            </Box>
          ) : (
            <>
              {/* Stats Cards */}
              <Flex gap={4} style={{ marginBottom: '24px' }} wrap="wrap">
                <Box 
                  background="neutral0" 
                  padding={6} 
                  shadow="tableShadow" 
                  hasRadius
                  style={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' }}
                >
                  <Flex direction="column" alignItems="flex-start" gap={2}>
                    <Flex gap={2} alignItems="center">
                      <CheckCircle width="24px" height="24px" fill="success600" />
                      <Typography variant="omega" textColor="neutral600">Total Profiles</Typography>
                    </Flex>
                    <Typography variant="alpha" textColor="neutral800" fontWeight="bold">
                      {profiles.length}
                    </Typography>
                  </Flex>
                </Box>
                
                <Box 
                  background="neutral0" 
                  padding={6} 
                  shadow="tableShadow" 
                  hasRadius
                  style={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' }}
                >
                  <Flex direction="column" alignItems="flex-start" gap={2}>
                    <Flex gap={2} alignItems="center">
                      <Play width="24px" height="24px" fill="success600" />
                      <Typography variant="omega" textColor="neutral600">Active Profiles</Typography>
                    </Flex>
                    <Typography variant="alpha" textColor="success600" fontWeight="bold">
                      {profiles.filter(p => p.enabled).length}
                    </Typography>
                  </Flex>
                </Box>
                
                <Box 
                  background="neutral0" 
                  padding={6} 
                  shadow="tableShadow" 
                  hasRadius
                  style={{ flex: '1 1 calc(33.333% - 16px)', minWidth: '250px' }}
                >
                  <Flex direction="column" alignItems="flex-start" gap={2}>
                    <Flex gap={2} alignItems="center">
                      <Clock width="24px" height="24px" fill="warning600" />
                      <Typography variant="omega" textColor="neutral600">Auto-Sync Enabled</Typography>
                    </Flex>
                    <Typography variant="alpha" textColor="warning600" fontWeight="bold">
                      {profiles.filter(p => p.auto_sync).length}
                    </Typography>
                  </Flex>
                </Box>
              </Flex>

              {/* Profiles Table */}
              <Box background="neutral0" padding={6} shadow="tableShadow" hasRadius style={{ marginBottom: '24px' }}>
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
                  <Typography variant="delta" as="h2">
                    {formatMessage({ id: getTranslation('profiles.title') })}
                  </Typography>
                  <Badge size="M">{profiles.length} profiles</Badge>
                </Flex>
                
                <Divider />

                <Box paddingTop={4}>
                  <Table colCount={5} rowCount={profiles.length}>
                    <Thead>
                      <Tr>
                        <Th>
                          <Typography variant="sigma">
                            {formatMessage({ id: getTranslation('profiles.table.name') })}
                          </Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma">
                            {formatMessage({ id: getTranslation('profiles.table.slug') })}
                          </Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma">
                            {formatMessage({ id: getTranslation('profiles.table.status') })}
                          </Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma">Auto-Sync</Typography>
                        </Th>
                        <Th>
                          <VisuallyHidden>
                            {formatMessage({ id: getTranslation('profiles.table.actions') })}
                          </VisuallyHidden>
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {profiles.map((profile) => (
                        <Tr key={profile.id}>
                          <Td>
                            <Flex direction="column" alignItems="flex-start" gap={1}>
                              <Typography fontWeight="semiBold" textColor="neutral800">
                                {profile.name}
                              </Typography>
                              {profile.description && (
                                <Typography variant="pi" textColor="neutral600">
                                  {profile.description}
                                </Typography>
                              )}
                            </Flex>
                          </Td>
                          <Td>
                            <Badge>{profile.slug}</Badge>
                          </Td>
                          <Td>
                            <Badge 
                              active={profile.enabled}
                              backgroundColor={profile.enabled ? 'success100' : 'neutral150'}
                            >
                              {profile.enabled
                                ? formatMessage({ id: getTranslation('profiles.status.enabled') })
                                : formatMessage({ id: getTranslation('profiles.status.disabled') })}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge 
                              backgroundColor={profile.auto_sync ? 'primary100' : 'neutral150'}
                            >
                              {profile.auto_sync ? 'Yes' : 'No'}
                            </Badge>
                          </Td>
                          <Td>
                            <Flex gap={1} justifyContent="flex-end">
                              <IconButton 
                                onClick={() => openViewModal(profile)}
                                aria-label="View profile"
                              >
                                <Eye />
                              </IconButton>
                              <IconButton 
                                onClick={() => console.log('Edit', profile.id)}
                                aria-label="Edit profile"
                              >
                                <Pencil />
                              </IconButton>
                              <IconButton 
                                onClick={() => openReindexModal(profile)}
                                aria-label="Reindex profile"
                              >
                                <ArrowClockwise />
                              </IconButton>
                              <IconButton 
                                onClick={() => openDeleteModal(profile)}
                                aria-label="Delete profile"
                              >
                                <Trash />
                              </IconButton>
                            </Flex>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            </>
          )}
        </Box>

        <CreateProfileModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={loadProfiles}
        />

        {selectedProfile && (
          <>
            <ViewProfileModal
              isOpen={isViewOpen}
              onClose={() => {
                setIsViewOpen(false);
                setSelectedProfile(null);
              }}
              profile={selectedProfile}
            />

            <DeleteProfileModal
              isOpen={isDeleteOpen}
              onClose={() => {
                setIsDeleteOpen(false);
                setSelectedProfile(null);
              }}
              onConfirm={() => handleDelete(selectedProfile.id)}
              profileName={selectedProfile.name}
              isDeleting={isDeleting}
            />

            <ReindexProfileModal
              isOpen={isReindexOpen}
              onClose={() => {
                setIsReindexOpen(false);
                setSelectedProfile(null);
              }}
              onConfirm={() => handleReindex(selectedProfile.id)}
              profileName={selectedProfile.name}
              isReindexing={isReindexing}
            />
          </>
        )}
      </Main>
    </Layouts.Root>
  );
};

export { HomePage };

