import React from 'react';
import {
  Modal,
  Typography,
  Button,
  Flex,
} from '@strapi/design-system';
import { CrossCircle, Trash } from '@strapi/icons';

interface DeleteProfileModalProps {
  profileName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

const DeleteProfileModal: React.FC<DeleteProfileModalProps> = ({
  profileName,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  return (
    <Modal.Root open={isOpen} onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Flex gap={2} alignItems="center">
            <CrossCircle width="24px" height="24px" fill="danger600" />
            <Modal.Title>Delete Profile</Modal.Title>
          </Flex>
        </Modal.Header>

        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Typography>
              Are you sure you want to delete the profile <Typography fontWeight="bold">"{profileName}"</Typography>?
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              This action cannot be undone. All embeddings associated with this profile will be removed.
            </Typography>
          </Flex>
        </Modal.Body>

        <Modal.Footer>
          <Flex justifyContent="space-between" width="100%">
            <Modal.Close>
              <Button variant="tertiary" disabled={isDeleting}>
                Cancel
              </Button>
            </Modal.Close>
            <Button 
              variant="danger" 
              startIcon={<Trash />} 
              onClick={onConfirm}
              loading={isDeleting}
            >
              Delete Profile
            </Button>
          </Flex>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export { DeleteProfileModal };
