import React from 'react';
import {
  Modal,
  Typography,
  Button,
  Flex,
} from '@strapi/design-system';
import { ArrowClockwise, Play } from '@strapi/icons';

interface ReindexProfileModalProps {
  profileName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isReindexing: boolean;
}

const ReindexProfileModal: React.FC<ReindexProfileModalProps> = ({
  profileName,
  isOpen,
  onClose,
  onConfirm,
  isReindexing,
}) => {
  return (
    <Modal.Root open={isOpen} onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Flex gap={2} alignItems="center">
            <ArrowClockwise width="24px" height="24px" fill="primary600" />
            <Modal.Title>Reindex Profile</Modal.Title>
          </Flex>
        </Modal.Header>

        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={4}>
            <Typography>
              Start reindexing embeddings for <Typography fontWeight="bold">"{profileName}"</Typography>?
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              This will regenerate all embeddings for the content types associated with this profile. 
              The process will run in the background and may take some time depending on the amount of content.
            </Typography>
          </Flex>
        </Modal.Body>

        <Modal.Footer>
          <Flex justifyContent="space-between" width="100%">
            <Modal.Close>
              <Button variant="tertiary" disabled={isReindexing}>
                Cancel
              </Button>
            </Modal.Close>
            <Button 
              variant="default" 
              startIcon={<Play />} 
              onClick={onConfirm}
              loading={isReindexing}
            >
              Start Reindexing
            </Button>
          </Flex>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export { ReindexProfileModal };
