import React from 'react';
import {
  Modal,
  Typography,
  Box,
  Flex,
  Badge,
  Divider,
} from '@strapi/design-system';

interface Profile {
  id: string;
  name: string;
  slug: string;
  description?: string;
  enabled: boolean;
  auto_sync: boolean;
  created_at: string;
  updated_at: string;
  fields?: any[];
}

interface ViewProfileModalProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
}

const ViewProfileModal: React.FC<ViewProfileModalProps> = ({ profile, isOpen, onClose }) => {
  if (!profile) return null;

  return (
    <Modal.Root open={isOpen} onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>Profile Details</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Box>
              <Typography variant="sigma" textColor="neutral600">Name</Typography>
              <Typography variant="omega" fontWeight="semiBold">{profile.name}</Typography>
            </Box>

            <Box>
              <Typography variant="sigma" textColor="neutral600">Slug</Typography>
              <Flex gap={2} alignItems="center">
                <Badge backgroundColor="neutral150">{profile.slug}</Badge>
              </Flex>
            </Box>

            {profile.description && (
              <Box>
                <Typography variant="sigma" textColor="neutral600">Description</Typography>
                <Typography variant="omega">{profile.description}</Typography>
              </Box>
            )}

            <Flex gap={4}>
              <Box>
                <Typography variant="sigma" textColor="neutral600">Status</Typography>
                <Flex paddingTop={1}>
                  <Badge 
                    backgroundColor={profile.enabled ? 'success100' : 'neutral150'}
                    textColor={profile.enabled ? 'success700' : 'neutral700'}
                  >
                    {profile.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </Flex>
              </Box>

              <Box>
                <Typography variant="sigma" textColor="neutral600">Auto-Sync</Typography>
                <Flex paddingTop={1}>
                  <Badge 
                    backgroundColor={profile.auto_sync ? 'primary100' : 'neutral150'}
                    textColor={profile.auto_sync ? 'primary700' : 'neutral700'}
                  >
                    {profile.auto_sync ? 'Enabled' : 'Disabled'}
                  </Badge>
                </Flex>
              </Box>
            </Flex>

            <Divider />

            <Box>
              <Typography variant="sigma" textColor="neutral600">Created At</Typography>
              <Typography variant="omega">
                {new Date(profile.created_at).toLocaleString()}
              </Typography>
            </Box>

            <Box>
              <Typography variant="sigma" textColor="neutral600">Updated At</Typography>
              <Typography variant="omega">
                {new Date(profile.updated_at).toLocaleString()}
              </Typography>
            </Box>

            {profile.fields && profile.fields.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Typography variant="sigma" textColor="neutral600" paddingBottom={2}>
                    Indexed Fields ({profile.fields.length})
                  </Typography>
                  <Flex direction="column" alignItems="stretch" gap={2}>
                    {profile.fields.map((field: any, index: number) => (
                      <Box 
                        key={index} 
                        background="neutral100" 
                        padding={3} 
                        hasRadius
                      >
                        <Typography variant="omega" fontWeight="semiBold">
                          {field.content_type}
                        </Typography>
                        <Typography variant="pi" textColor="neutral600">
                          {field.field_name}
                        </Typography>
                      </Box>
                    ))}
                  </Flex>
                </Box>
              </>
            )}
          </Flex>
        </Modal.Body>

        <Modal.Footer>
          <Modal.Close>Close</Modal.Close>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export { ViewProfileModal };
