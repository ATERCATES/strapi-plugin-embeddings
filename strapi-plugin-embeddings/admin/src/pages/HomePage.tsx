import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
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
  TextInput,
} from '@strapi/design-system';
import { Layouts } from '@strapi/strapi/admin';
import { Plus, Eye, Pencil, Trash, ArrowClockwise } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import { getTranslation } from '../utils/getTranslation';
import { PLUGIN_ID } from '../pluginId';

interface Profile {
  id: string;
  name: string;
  slug: string;
  description?: string;
  provider: string;
  embedding_dimension: number;
  distance_metric: string;
  enabled: boolean;
  auto_sync: boolean;
  created_at: string;
  updated_at: string;
}

const HomePage = () => {
  const { formatMessage } = useIntl();
  const { get, post } = useFetchClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    provider: 'openai',
    embedding_dimension: 1536,
    distance_metric: 'cosine',
    auto_sync: true,
  });

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
    if (!confirm(formatMessage({ id: getTranslation('profiles.actions.delete') }))) {
      return;
    }
    // TODO: Implement delete endpoint
    console.log('Delete profile:', id);
  };

  const handleReindex = async (id: string) => {
    // TODO: Implement reindex endpoint
    console.log('Reindex profile:', id);
  };

  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title={formatMessage({ id: getTranslation('page.homepage.title') })}
          subtitle={formatMessage({ id: getTranslation('page.homepage.subtitle') })}
          primaryAction={
            <Button startIcon={<Plus />} onClick={() => setIsCreateOpen(true)}>
              {formatMessage({ id: getTranslation('profiles.create') })}
            </Button>
          }
        />

        <Box padding={8}>
          {isLoading ? (
            <Box padding={8}>
              <Typography>Loading...</Typography>
            </Box>
          ) : error ? (
            <Box padding={8}>
              <Typography textColor="danger600">{error}</Typography>
            </Box>
          ) : profiles.length === 0 ? (
            <EmptyStateLayout
              icon={<Pencil width="10rem" height="10rem" />}
              content={formatMessage({ id: getTranslation('profiles.empty.description') })}
              action={
                <Button
                  variant="secondary"
                  startIcon={<Plus />}
                  onClick={() => setIsCreateOpen(true)}
                >
                  {formatMessage({ id: getTranslation('profiles.create') })}
                </Button>
              }
            />
          ) : (
            <Box background="neutral0" padding={8} shadow="tableShadow" hasRadius>
              <Typography variant="delta" as="h2" paddingBottom={4}>
                {formatMessage({ id: getTranslation('profiles.title') })}
              </Typography>

              <Table colCount={7} rowCount={profiles.length}>
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
                        {formatMessage({ id: getTranslation('profiles.table.provider') })}
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">
                        {formatMessage({ id: getTranslation('profiles.table.dimension') })}
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">
                        {formatMessage({ id: getTranslation('profiles.table.status') })}
                      </Typography>
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
                        <Typography fontWeight="semiBold">{profile.name}</Typography>
                        {profile.description && (
                          <Typography variant="pi" textColor="neutral600">
                            {profile.description}
                          </Typography>
                        )}
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">{profile.slug}</Typography>
                      </Td>
                      <Td>
                        <Typography>{profile.provider}</Typography>
                      </Td>
                      <Td>
                        <Typography>{profile.embedding_dimension}</Typography>
                      </Td>
                      <Td>
                        <Badge active={profile.enabled}>
                          {profile.enabled
                            ? formatMessage({ id: getTranslation('profiles.status.enabled') })
                            : formatMessage({ id: getTranslation('profiles.status.disabled') })}
                        </Badge>
                      </Td>
                      <Td>
                        <Flex gap={1}>
                          <IconButton
                            onClick={() => console.log('View', profile.id)}
                            label={formatMessage({ id: getTranslation('profiles.actions.view') })}
                            icon={<Eye />}
                          />
                          <IconButton
                            onClick={() => console.log('Edit', profile.id)}
                            label={formatMessage({ id: getTranslation('profiles.actions.edit') })}
                            icon={<Pencil />}
                          />
                          <IconButton
                            onClick={() => handleReindex(profile.id)}
                            label={formatMessage({ id: getTranslation('profiles.actions.reindex') })}
                            icon={<ArrowClockwise />}
                          />
                          <IconButton
                            onClick={() => handleDelete(profile.id)}
                            label={formatMessage({ id: getTranslation('profiles.actions.delete') })}
                            icon={<Trash />}
                          />
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>

        {isCreateOpen && (
          <Box padding={6} background="neutral0" shadow="tableShadow" hasRadius marginTop={4}>
            <Flex justifyContent="space-between" alignItems="center">
              <Typography as="h2" id="create-profile-title" variant="delta">
                {formatMessage({ id: getTranslation('profiles.create') })}
              </Typography>
              <Button variant="tertiary" onClick={() => setIsCreateOpen(false)}>
                Close
              </Button>
            </Flex>

            <Box paddingTop={4}>
              <TextInput
                name="name"
                label="Name"
                placeholder="Profile name"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, name: e.target.value }))}
                value={form.name}
              />

              <Box paddingTop={2}>
                <TextInput
                  name="slug"
                  label="Slug"
                  placeholder="profile-slug"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, slug: e.target.value }))}
                  value={form.slug}
                />
              </Box>

              <Box paddingTop={2}>
                <label htmlFor="provider">Provider</label>
                <select
                  id="provider"
                  value={form.provider}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((s) => ({ ...s, provider: e.target.value }))}
                  style={{ display: 'block', marginTop: 8 }}
                >
                  <option value="openai">OpenAI</option>
                </select>
              </Box>

              <Box paddingTop={2}>
                <TextInput
                  name="embedding_dimension"
                  label="Embedding dimension"
                  type="number"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, embedding_dimension: Number(e.target.value) }))}
                  value={String(form.embedding_dimension)}
                />
              </Box>

              <Box paddingTop={2}>
                <label htmlFor="distance_metric">Distance metric</label>
                <select
                  id="distance_metric"
                  value={form.distance_metric}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((s) => ({ ...s, distance_metric: e.target.value }))}
                  style={{ display: 'block', marginTop: 8 }}
                >
                  <option value="cosine">Cosine</option>
                  <option value="l2">L2</option>
                  <option value="dot">Dot</option>
                </select>
              </Box>

              <Box paddingTop={2}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={form.auto_sync}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, auto_sync: e.target.checked }))}
                  />
                  <span>Auto-sync</span>
                </label>
              </Box>

              <Flex justifyContent="flex-end" gap={2} paddingTop={4}>
                <Button variant="tertiary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      setCreating(true);
                      setError(null);
                      const payload = {
                        name: form.name,
                        slug: form.slug,
                        provider: form.provider,
                        embedding_dimension: form.embedding_dimension,
                        distance_metric: form.distance_metric,
                        fields: [],
                        auto_sync: form.auto_sync,
                      } as any;

                      await post(`/${PLUGIN_ID}/profiles`, { body: JSON.stringify(payload) });
                      // Refresh list
                      await loadProfiles();
                      setIsCreateOpen(false);
                    } catch (e) {
                      console.error('Create profile error', e);
                      setError('Failed to create profile');
                    } finally {
                      setCreating(false);
                    }
                  }}
                  startIcon={<Plus />}
                >
                  Create
                </Button>
              </Flex>
            </Box>
          </Box>
        )}
      </Main>
    </Layouts.Root>
  );
};

export { HomePage };

