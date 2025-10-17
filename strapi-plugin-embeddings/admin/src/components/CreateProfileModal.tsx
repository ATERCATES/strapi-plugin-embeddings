import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import {
  Modal,
  Typography,
  Button,
  Flex,
  Field,
  Grid,
  TextInput,
  SingleSelect,
  SingleSelectOption,
  MultiSelect,
  MultiSelectOption,
  Toggle,
  Box,
} from '@strapi/design-system';
import { ChevronDown, ChevronRight } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import { getTranslation } from '../utils/getTranslation';
import { PLUGIN_ID } from '../pluginId';

interface Field {
  name: string;
  type: string;
  isComponent?: boolean;
  isComponentField?: boolean;
  componentUid?: string;
  children?: Array<Field & { parentName: string; displayName: string }>;
  parentName?: string;
  displayName?: string;
}

interface ContentType {
  uid: string;
  displayName: string;
  fields: Field[];
}

interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateProfileModal: React.FC<CreateProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { formatMessage } = useIntl();
  const { get, post } = useFetchClient();

  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    selectedContentType: '',
    selectedFields: [] as string[],
    auto_sync: true,
  });

  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadContentTypes();
    }
  }, [isOpen]);

  const loadContentTypes = async () => {
    try {
      setLoading(true);
      const { data }: any = await get(`/${PLUGIN_ID}/content-types`);
      setContentTypes(data?.data || []);
    } catch (err) {
      console.error('Error loading content types:', err);
      setError('Failed to load content types');
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      // Auto-generate slug from name if slug is empty or matches previous auto-generated value
      slug: prev.slug === '' || prev.slug === prev.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        ? value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        : prev.slug,
    }));
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      setError(null);

      // Validate
      if (!form.name.trim()) {
        setError('Profile name is required');
        return;
      }

      if (!form.slug.trim()) {
        setError('Slug is required');
        return;
      }

      if (!form.selectedContentType) {
        setError('Please select a content type');
        return;
      }

      if (form.selectedFields.length === 0) {
        setError('Please select at least one field');
        return;
      }

      const fields = form.selectedFields.map((fieldName) => {
        // Check if this is a component field (contains a dot)
        const [parentField, childField] = fieldName.includes('.')
          ? fieldName.split('.')
          : [fieldName, null];

        return {
          content_type: form.selectedContentType,
          field_name: childField ? `${parentField}.${childField}` : fieldName,
          component_parent: childField ? parentField : undefined,
        };
      });

      const payload = {
        name: form.name,
        slug: form.slug,
        fields,
        auto_sync: form.auto_sync,
      };

      await post(`/${PLUGIN_ID}/profiles`, payload);
      
      // Reset form
      setForm({
        name: '',
        slug: '',
        selectedContentType: '',
        selectedFields: [],
        auto_sync: true,
      });
      setExpandedComponents(new Set());
      
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error('Create profile error', e);
      setError(e?.response?.data?.error?.message || 'Failed to create profile');
    } finally {
      setCreating(false);
    }
  };

  const selectedContentType = contentTypes.find(
    (ct) => ct.uid === form.selectedContentType
  );

  const availableFields = selectedContentType?.fields || [];

  return (
    <Modal.Root open={isOpen} onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
            {formatMessage({ id: getTranslation('profiles.create') })}
          </Typography>
        </Modal.Header>

        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            {error && (
              <Typography textColor="danger600" variant="pi">
                {error}
              </Typography>
            )}

            <Grid.Root gap={4}>
              <Grid.Item col={6} s={12}>
                <Field.Root
                  name="name"
                  required
                  hint={formatMessage({ id: getTranslation('form.profile.name.placeholder') })}
                >
                  <Field.Label>
                    {formatMessage({ id: getTranslation('form.profile.name') })}
                  </Field.Label>
                  <TextInput
                    placeholder={formatMessage({
                      id: getTranslation('form.profile.name.placeholder'),
                    })}
                    value={form.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleNameChange(e.target.value)
                    }
                  />
                </Field.Root>
              </Grid.Item>

              <Grid.Item col={6} s={12}>
                <Field.Root
                  name="slug"
                  required
                  hint={formatMessage({ id: getTranslation('form.profile.slug.hint') })}
                >
                  <Field.Label>
                    {formatMessage({ id: getTranslation('form.profile.slug') })}
                  </Field.Label>
                  <TextInput
                    placeholder={formatMessage({
                      id: getTranslation('form.profile.slug.placeholder'),
                    })}
                    value={form.slug}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setForm((prev) => ({ ...prev, slug: e.target.value }))
                    }
                  />
                </Field.Root>
              </Grid.Item>

              <Grid.Item col={12}>
                <Field.Root name="contentType" required>
                  <Field.Label>
                    {formatMessage({ id: getTranslation('form.profile.fields.contentType') })}
                  </Field.Label>
                  <SingleSelect
                    placeholder={formatMessage({
                      id: getTranslation('form.profile.fields.contentType.placeholder'),
                    })}
                    value={form.selectedContentType}
                    onChange={(value: string) =>
                      setForm((prev) => ({
                        ...prev,
                        selectedContentType: value,
                        selectedFields: [], // Reset fields when content type changes
                      }))
                    }
                    disabled={loading}
                  >
                    {contentTypes.map((ct) => (
                      <SingleSelectOption key={ct.uid} value={ct.uid}>
                        {ct.displayName}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Field.Root>
              </Grid.Item>

              <Grid.Item col={12}>
                <Field.Root
                  name="fields"
                  required
                  hint={formatMessage({ id: getTranslation('form.profile.fields.description') })}
                >
                  <Field.Label>
                    {formatMessage({ id: getTranslation('form.profile.fields') })}
                  </Field.Label>
                  <Box
                    hasRadius
                    borderColor="neutral200"
                    borderStyle="solid"
                    borderWidth="1px"
                    padding={3}
                    background="neutral100"
                  >
                    <Flex direction="column" gap={2}>
                      {availableFields.length === 0 ? (
                        <Typography textColor="neutral600" variant="pi">
                          {!form.selectedContentType
                            ? 'Select a content type first'
                            : 'No text fields available in this content type'}
                        </Typography>
                      ) : (
                        availableFields.map((field) => {
                          if (field.isComponent) {
                            const isExpanded = expandedComponents.has(field.name);
                            return (
                              <Box key={field.name}>
                                <Box
                                  paddingTop={2}
                                  paddingBottom={2}
                                  paddingLeft={3}
                                  paddingRight={3}
                                  hasRadius
                                  borderColor="neutral200"
                                  borderStyle="solid"
                                  borderWidth="1px"
                                  background="neutral0"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => {
                                    const newExpanded = new Set(expandedComponents);
                                    if (isExpanded) {
                                      newExpanded.delete(field.name);
                                    } else {
                                      newExpanded.add(field.name);
                                    }
                                    setExpandedComponents(newExpanded);
                                  }}
                                >
                                  <Flex alignItems="center" gap={2}>
                                    {isExpanded ? <ChevronDown /> : <ChevronRight />}
                                    <Typography fontWeight="bold" textColor="neutral800">
                                      {field.name}
                                    </Typography>
                                    <Typography textColor="neutral600" variant="pi">
                                      (component)
                                    </Typography>
                                  </Flex>
                                </Box>
                                {isExpanded && field.children && (
                                  <Box paddingLeft={6} paddingTop={2} paddingBottom={2}>
                                    <Flex direction="column" gap={2}>
                                      {field.children.map((childField) => {
                                        const fieldId = childField.displayName || `${field.name}.${childField.name}`;
                                        const isSelected = form.selectedFields.includes(fieldId);
                                        return (
                                          <Flex
                                            key={fieldId}
                                            as="label"
                                            alignItems="center"
                                            gap={2}
                                            paddingTop={2}
                                            paddingBottom={2}
                                            paddingLeft={3}
                                            paddingRight={3}
                                            hasRadius
                                            borderColor={isSelected ? 'primary200' : 'neutral200'}
                                            borderStyle="solid"
                                            borderWidth="1px"
                                            background={isSelected ? 'primary100' : 'neutral0'}
                                            style={{ cursor: 'pointer' }}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => {
                                                setForm((prev) => ({
                                                  ...prev,
                                                  selectedFields: isSelected
                                                    ? prev.selectedFields.filter((f) => f !== fieldId)
                                                    : [...prev.selectedFields, fieldId],
                                                }));
                                              }}
                                            />
                                            <Typography textColor="neutral800">
                                              {childField.name}
                                            </Typography>
                                            <Typography textColor="neutral600" variant="pi">
                                              ({childField.type})
                                            </Typography>
                                          </Flex>
                                        );
                                      })}
                                    </Flex>
                                  </Box>
                                )}
                              </Box>
                            );
                          } else {
                            const isSelected = form.selectedFields.includes(field.name);
                            return (
                              <Flex
                                key={field.name}
                                as="label"
                                alignItems="center"
                                gap={2}
                                paddingTop={2}
                                paddingBottom={2}
                                paddingLeft={3}
                                paddingRight={3}
                                hasRadius
                                borderColor={isSelected ? 'primary200' : 'neutral200'}
                                borderStyle="solid"
                                borderWidth="1px"
                                background={isSelected ? 'primary100' : 'neutral0'}
                                style={{ cursor: 'pointer' }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setForm((prev) => ({
                                      ...prev,
                                      selectedFields: isSelected
                                        ? prev.selectedFields.filter((f) => f !== field.name)
                                        : [...prev.selectedFields, field.name],
                                    }));
                                  }}
                                />
                                <Typography textColor="neutral800">{field.name}</Typography>
                                <Typography textColor="neutral600" variant="pi">
                                  ({field.type})
                                </Typography>
                              </Flex>
                            );
                          }
                        })
                      )}
                    </Flex>
                  </Box>
                </Field.Root>
              </Grid.Item>

              <Grid.Item col={12}>
                <Field.Root
                  name="auto_sync"
                  hint={formatMessage({ id: getTranslation('form.profile.autoSync.hint') })}
                >
                  <Flex direction="row" alignItems="center" gap={2}>
                    <Toggle
                      checked={form.auto_sync}
                      onChange={() =>
                        setForm((prev) => ({ ...prev, auto_sync: !prev.auto_sync }))
                      }
                    />
                    <Typography>
                      {formatMessage({ id: getTranslation('form.profile.autoSync') })}
                    </Typography>
                  </Flex>
                </Field.Root>
              </Grid.Item>
            </Grid.Root>
          </Flex>
        </Modal.Body>

        <Modal.Footer>
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: getTranslation('form.cancel') })}
          </Button>
          <Button onClick={handleCreate} loading={creating} disabled={creating}>
            {formatMessage({ id: getTranslation('form.create') })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};
