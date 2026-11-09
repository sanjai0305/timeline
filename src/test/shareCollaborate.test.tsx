import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ShareModal } from '../components/routine/ShareModal';
import { useRoutineStore } from '../store/routineStore';
import { useAuthStore } from '../store/authStore';

vi.mock('../services/firebase', () => ({
  auth: { currentUser: { uid: 'user_owner_1', email: 'owner@example.com' }, app: { name: 'test' } },
  googleProvider: {},
  firestore: {},
}));

vi.mock('../services/backButtonService', () => ({
  backButtonService: {
    registerModal: vi.fn(() => () => {}),
  },
}));

describe('Share & Collaborate Interface (ShareModal)', () => {
  const mockTimelineId = 'timeline_abc_123';
  const mockTimelineName = 'Fitness & Study Routine';
  const mockStartDate = '2026-03-01';
  const mockEndDate = '2026-03-31';

  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      user: {
        uid: 'user_owner_1',
        email: 'owner@example.com',
        displayName: 'Owner User',
      } as any,
    });

    useRoutineStore.setState({
      selectedMembers: [
        {
          userId: 'user_owner_1',
          email: 'owner@example.com',
          displayName: 'Owner User',
          role: 'owner',
          status: 'active',
          joinedAt: '2026-03-01T08:00:00Z',
        },
        {
          userId: 'user_editor_2',
          email: 'editor@example.com',
          displayName: 'Alex Editor',
          role: 'editor',
          status: 'active',
          joinedAt: '2026-03-02T10:00:00Z',
        },
        {
          userId: 'user_pending_3',
          email: 'pending@example.com',
          displayName: 'Pending Colleague',
          role: 'viewer',
          status: 'invited',
          joinedAt: '2026-03-03T12:00:00Z',
        },
      ],
      fetchMembers: vi.fn().mockImplementation(async () => {
        // resolves immediately
      }),
      inviteMember: vi.fn().mockResolvedValue({
        userId: 'user_new_4',
        email: 'newuser@example.com',
        role: 'editor',
        status: 'invited',
        joinedAt: new Date().toISOString(),
      }),
      updateMemberRole: vi.fn().mockResolvedValue(undefined),
      removeMember: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ShareModal
        isOpen={false}
        timelineId={mockTimelineId}
        timelineName={mockTimelineName}
        onClose={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders Header with Title "Share & Collaborate", routine name and date range', async () => {
    render(
      <ShareModal
        isOpen={true}
        timelineId={mockTimelineId}
        timelineName={mockTimelineName}
        startDate={mockStartDate}
        endDate={mockEndDate}
        userRole="owner"
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Share & Collaborate')).toBeInTheDocument();
    expect(screen.getByText(mockTimelineName)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('renders Add Collaborator section with email input, role select, and Send Invitation button for owner', async () => {
    render(
      <ShareModal
        isOpen={true}
        timelineId={mockTimelineId}
        timelineName={mockTimelineName}
        userRole="owner"
        onClose={() => {}}
      />
    );

    expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('validates email format before submitting invitation', async () => {
    render(
      <ShareModal
        isOpen={true}
        timelineId={mockTimelineId}
        timelineName={mockTimelineName}
        userRole="owner"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText('Enter email address');
    const sendButton = screen.getByRole('button', { name: /send invitation/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('prevents user from inviting themselves as a collaborator', async () => {
    render(
      <ShareModal
        isOpen={true}
        timelineId={mockTimelineId}
        timelineName={mockTimelineName}
        userRole="owner"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText('Enter email address');
    const sendButton = screen.getByRole('button', { name: /send invitation/i });

    fireEvent.change(emailInput, { target: { value: 'owner@example.com' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/you are already the owner of this timeline/i)).toBeInTheDocument();
    });
  });

  it('prevents duplicate collaborator invitations', async () => {
    render(
      <ShareModal
        isOpen={true}
        timelineId={mockTimelineId}
        timelineName={mockTimelineName}
        userRole="owner"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText('Enter email address');
    const sendButton = screen.getByRole('button', { name: /send invitation/i });

    fireEvent.change(emailInput, { target: { value: 'editor@example.com' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/already a collaborator/i)).toBeInTheDocument();
    });
  });

  it('renders members list showing avatars, names, emails, roles and status badges', async () => {
    render(
      <ShareModal
        isOpen={true}
        timelineId={mockTimelineId}
        timelineName={mockTimelineName}
        userRole="owner"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Owner User')).toBeInTheDocument();
    });

    expect(screen.getByText('Alex Editor')).toBeInTheDocument();
    expect(screen.getByText('Pending Colleague')).toBeInTheDocument();

    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('editor@example.com')).toBeInTheDocument();
    expect(screen.getByText('pending@example.com')).toBeInTheDocument();

    // Badges
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('displays empty state with "+ Add Collaborator" when no collaborators exist', async () => {
    useRoutineStore.setState({
      selectedMembers: [],
      fetchMembers: vi.fn().mockImplementation(async () => {
        useRoutineStore.setState({ selectedMembers: [] });
      }),
    });

    render(
      <ShareModal
        isOpen={true}
        timelineId={mockTimelineId}
        timelineName={mockTimelineName}
        userRole="owner"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/no collaborators yet/i)).toBeInTheDocument();
    });
  });

  it('displays error state with "Unable to load collaborators" and "Retry" button on API failure', async () => {
    const fetchFailMock = vi.fn().mockRejectedValue(new Error('Network failure'));
    useRoutineStore.setState({
      selectedMembers: [],
      fetchMembers: fetchFailMock,
    });

    render(
      <ShareModal
        isOpen={true}
        timelineId={mockTimelineId}
        timelineName={mockTimelineName}
        userRole="owner"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load collaborators')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('does not display owner-only invitation form or controls for viewer role', async () => {
    render(
      <ShareModal
        isOpen={true}
        timelineId={mockTimelineId}
        timelineName={mockTimelineName}
        userRole="viewer"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Enter email address')).not.toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /send invitation/i })).not.toBeInTheDocument();
    expect(screen.getByText(/only timeline owners can invite or remove members/i)).toBeInTheDocument();
  });
});
