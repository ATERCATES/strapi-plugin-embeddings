import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import {
  Modal,
  Typography,
  Button,
  Flex,
  Field,
  Toggle,
  Box,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';
import { getTranslation } from '../utils/getTranslation';
import { PLUGIN_ID } from '../pluginId';

interface Profile {
  id: string;
  content_type: string;
  enabled: boolean;
  auto_sync: boolean;
}

interface EditProfileModalProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  profile,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { formatMessage } = useIntl();
  const { put } = useFetchClient();

  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    enabled: true,
    auto_sync: true,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        enabled: profile.enabled,
        auto_sync: profile.auto_sync,
      });
    }
  }, [profile]);

  const handleUpdate = async () => {
    if (!profile) return;

    try {
      setUpdating(true);
      setError(null);

      await put(`/${PLUGIN_ID}/profiles/${profile.id}`, {
        enabled: form.enabled,
        auto_sync: form.auto_sync,
      });
      
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error('Update profile error', e);
      setError(e?.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (!profile) return null;

  return (
    <Modal.Root open={isOpen} onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
            Edit Profile Settings
          </Typography>
        </Modal.Header>

        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            {error && (
              <Typography textColor="danger600" variant="pi">
                {error}
              </Typography>
            )}

            <Box>
              <Typography variant="sigma" textColor="neutral600">
                Content Type
              </Typography>
              <Typography variant="omega" fontWeight="semiBold">
                {profile.content_type}
              </Typography>
            </Box>

            <Field.Root
              name="enabled"
              hint="When disabled, this profile will not be used for search and indexing"
            >
              <Flex direction="row" alignItems="center" gap={2}>
                <Toggle
                  checked={form.enabled}
                  onChange={() =>
                    setForm((prev) => ({ ...prev, enabled: !prev.enabled }))
                  }
                />
                <Typography>Enable Profile</Typography>
              </Flex>
            </Field.Root>

            <Field.Root
              name="auto_sync"
              hint="Automatically update embeddings when content changes"
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
          </Flex>
        </Modal.Body>

        <Modal.Footer>
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: getTranslation('form.cancel') })}
          </Button>
          <Button onClick={handleUpdate} loading={updating} disabled={updating}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};
