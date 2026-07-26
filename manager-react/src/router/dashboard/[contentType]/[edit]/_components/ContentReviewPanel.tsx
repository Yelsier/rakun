'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  CheckCircle2,
  CircleAlert,
  GitPullRequestArrow,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { useEditPageContext } from '../_context/EditPageContext'

import { createManagerQueryKey, useManagerMutation, useManagerQuery } from '@/client/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/user-avatar'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useSession } from '@/state/session'
import { useQueryClient } from '@tanstack/react-query'

const statusVariant = (status?: string) => {
  if (status === 'approved') return 'default' as const
  if (status === 'changes_requested') return 'destructive' as const
  return 'secondary' as const
}

export const ContentReviewPanel = ({ open }: { open: boolean }) => {
  const {
    contentTypeId,
    contentTypeName,
    documentActions,
    languageCode,
  } = useEditPageContext()
  const { user } = useSession()
  const queryClient = useQueryClient()
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([])
  const [reviewerPickerOpen, setReviewerPickerOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const input = contentTypeId
    ? { contentType: contentTypeName, documentId: contentTypeId }
    : undefined
  const reviewQuery = useManagerQuery({
    name: 'manager.reviews.get',
    input: input ?? ({ contentType: '', documentId: '' } as never),
    enabled: Boolean(open && input),
  })
  const candidatesQuery = useManagerQuery({
    name: 'manager.reviews.candidates',
    input: input ?? ({ contentType: '', documentId: '' } as never),
    enabled: Boolean(open && input && reviewQuery.data?.canRequest),
  })
  const requestMutation = useManagerMutation('manager.reviews.request')
  const decideMutation = useManagerMutation('manager.reviews.decide')
  const cancelMutation = useManagerMutation('manager.reviews.cancel')
  const review = reviewQuery.data?.review
  const currentDecision = review?.decisions.find(
    (decision) => decision.reviewer._id === user._id,
  )
  const currentReviewer = review?.reviewers.find(
    (reviewer) => reviewer.user._id === user._id,
  )
  const canDecide =
    review?.status === 'pending' && Boolean(currentReviewer) && !currentDecision
  const requiredApprovals =
    reviewQuery.data?.policy?.requiredApprovals ?? review?.requiredApprovals ?? 1
  const approvingCandidates = useMemo(
    () =>
      (candidatesQuery.data ?? []).filter(
        (candidate) =>
          selectedReviewers.includes(candidate.user._id) && candidate.canApprove,
      ).length,
    [candidatesQuery.data, selectedReviewers],
  )
  const selectedCandidates = useMemo(
    () =>
      (candidatesQuery.data ?? []).filter((candidate) =>
        selectedReviewers.includes(candidate.user._id),
      ),
    [candidatesQuery.data, selectedReviewers],
  )

  const toggleReviewer = (reviewerId: string) => {
    setSelectedReviewers((current) =>
      current.includes(reviewerId)
        ? current.filter((id) => id !== reviewerId)
        : [...current, reviewerId],
    )
  }

  useEffect(() => {
    if (!review || review.status !== 'outdated') return
    setSelectedReviewers(review.reviewers.map((reviewer) => reviewer.user._id))
  }, [review?._id, review?.status])

  const refresh = async () => {
    await reviewQuery.refetch()
    if (input) {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: createManagerQueryKey('manager.comments.list', input),
        }),
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[1] === 'manager.notifications.list',
        }),
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[1] === 'manager.contentVersions.list',
        }),
      ])
    }
  }

  const requestReview = async () => {
    if (!input || !selectedReviewers.length) return
    try {
      await requestMutation.mutateAsync({ ...input, reviewerIds: selectedReviewers })
      setSelectedReviewers([])
      await refresh()
      toast.success('Review requested')
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not request review'))
    }
  }

  const decide = async (decision: 'approve' | 'request_changes') => {
    if (!review) return
    try {
      await decideMutation.mutateAsync({
        reviewId: review._id,
        decision,
        ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
      })
      setFeedback('')
      await refresh()
      toast.success(decision === 'approve' ? 'Review approved' : 'Changes requested')
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not submit review'))
    }
  }

  const cancel = async () => {
    if (!review) return
    try {
      await cancelMutation.mutateAsync({ reviewId: review._id })
      await refresh()
      toast.success('Review cancelled')
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not cancel review'))
    }
  }

  if (!contentTypeId || reviewQuery.isLoading) {
    return (
      <div className="border-b px-4 py-3 text-sm text-muted-foreground">
        {contentTypeId ? 'Loading review…' : 'Save the document before requesting review.'}
      </div>
    )
  }

  const canCreateRequest =
    reviewQuery.data?.canRequest &&
    (!review || review.status === 'outdated') &&
    selectedReviewers.length > 0 &&
    (!reviewQuery.data.policy || approvingCandidates >= requiredApprovals)

  return (
    <div className="space-y-3 border-b px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GitPullRequestArrow className="size-4" />
          <span className="text-sm font-medium">Review</span>
          {review ? (
            <Badge variant={statusVariant(review.status)}>
              {review.status.replaceAll('_', ' ')}
            </Badge>
          ) : (
            <Badge variant="outline">
              {reviewQuery.data?.policy ? 'required' : 'not requested'}
            </Badge>
          )}
        </div>
        {review?.status === 'pending' && review.requestedBy._id === user._id ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={cancelMutation.isPending}
            onClick={() => void cancel()}
          >
            Cancel
          </Button>
        ) : null}
      </div>

      {review ? (
        <div className="space-y-2 text-sm">
          <div className="text-muted-foreground">
            {review.approvalCount}/{review.requiredApprovals} approvals
            {review.blocking ? ' · required before publishing' : ' · optional'}
          </div>
          <div className="grid gap-2">
            {review.reviewers.map((reviewer) => {
              const decision = review.decisions.find(
                (item) => item.reviewer._id === reviewer.user._id,
              )
              return (
                <div
                  key={reviewer.user._id}
                  className="space-y-2 rounded-md border px-2 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      name={reviewer.user.name || reviewer.user.user}
                      email={reviewer.user.user}
                      avatar={reviewer.user.avatar}
                      className="size-7"
                      fallbackClassName="text-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {reviewer.user.name || reviewer.user.user}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        @{reviewer.user.user}
                      </div>
                    </div>
                    <span
                      className={
                        decision?.decision === 'approve'
                          ? 'flex items-center gap-1 text-xs text-emerald-600'
                          : decision?.decision === 'request_changes'
                            ? 'flex items-center gap-1 text-xs text-destructive'
                            : 'text-xs text-muted-foreground'
                      }
                    >
                      {decision?.decision === 'approve' ? (
                        <>
                          <CheckCircle2 className="size-3.5" />
                          Approved
                        </>
                      ) : decision?.decision === 'request_changes' ? (
                        <>
                          <XCircle className="size-3.5" />
                          Changes requested
                        </>
                      ) : reviewer.canApprove ? (
                        'Review requested'
                      ) : (
                        'Feedback requested'
                      )}
                    </span>
                  </div>
                  {decision?.feedback ? (
                    <p className="whitespace-pre-wrap rounded-md bg-muted px-2 py-1.5 text-xs leading-relaxed text-foreground">
                      {decision.feedback}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
          {review.status === 'changes_requested' ? (
            <p className="flex items-center gap-2 text-destructive">
              <CircleAlert className="size-4" />
              Save a new revision before requesting review again.
            </p>
          ) : null}
          {review.status === 'outdated' ? (
            <p className="text-muted-foreground">
              The document changed; request review again for the current revision.
            </p>
          ) : null}
        </div>
      ) : null}

      {review?.status === 'approved' &&
      reviewQuery.data?.canRequest &&
      documentActions.canPublishApprovedDraft ? (
        <>
          <Separator />
          <div className="space-y-2 rounded-md border bg-muted/40 p-3">
            <div>
              <p className="text-sm font-medium">Ready to publish</p>
              <p className="text-xs text-muted-foreground">
                This is a new page, so it will be published directly in{' '}
                {languageCode}. Promotion is only needed when replacing an
                existing published version.
              </p>
            </div>
            <Button
              size="sm"
              loading={documentActions.pending.promote}
              onClick={() =>
                void documentActions.handlePublishApprovedDraft()
              }
            >
              Publish page
            </Button>
          </div>
        </>
      ) : null}

      {reviewQuery.data?.canRequest && (!review || review.status === 'outdated') ? (
        <>
          <Separator />
          <Popover open={reviewerPickerOpen} onOpenChange={setReviewerPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start font-normal"
              >
                <UserPlus className="size-4" />
                {selectedReviewers.length
                  ? `${selectedReviewers.length} reviewer${selectedReviewers.length === 1 ? '' : 's'} selected`
                  : 'Select reviewers'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              <Command>
                <CommandInput placeholder="Search people…" />
                <CommandList>
                  <CommandEmpty>No reviewers found.</CommandEmpty>
                  <CommandGroup heading="Reviewers">
                    {(candidatesQuery.data ?? []).map((candidate) => {
                      const selected = selectedReviewers.includes(
                        candidate.user._id,
                      )
                      return (
                        <CommandItem
                          key={candidate.user._id}
                          value={`${candidate.user.name ?? ''} ${candidate.user.user} ${candidate.user._id}`}
                          onSelect={() => toggleReviewer(candidate.user._id)}
                          className="gap-2"
                        >
                          <span className="grid size-4 place-items-center">
                            {selected ? <Check className="size-4" /> : null}
                          </span>
                          <UserAvatar
                            name={candidate.user.name || candidate.user.user}
                            email={candidate.user.user}
                            avatar={candidate.user.avatar}
                            className="size-8"
                            fallbackClassName="text-xs"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">
                              {candidate.user.name || candidate.user.user}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              @{candidate.user.user}
                            </div>
                          </div>
                          <Badge
                            variant={candidate.canApprove ? 'secondary' : 'outline'}
                            className="shrink-0 text-[10px]"
                          >
                            {candidate.canApprove ? 'Approver' : 'Feedback'}
                          </Badge>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedCandidates.length ? (
            <div className="grid gap-1.5">
              {selectedCandidates.map((candidate) => (
                <div
                  key={candidate.user._id}
                  className="flex items-center gap-2 rounded-md border px-2 py-1.5"
                >
                  <UserAvatar
                    name={candidate.user.name || candidate.user.user}
                    email={candidate.user.user}
                    avatar={candidate.user.avatar}
                    className="size-7"
                    fallbackClassName="text-xs"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {candidate.user.name || candidate.user.user}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {candidate.canApprove ? 'Approver' : 'Feedback only'}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label={`Remove ${candidate.user.name || candidate.user.user}`}
                    onClick={() => toggleReviewer(candidate.user._id)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
          {reviewQuery.data.policy ? (
            <p className="text-xs text-muted-foreground">
              Select at least {requiredApprovals} eligible approver
              {requiredApprovals === 1 ? '' : 's'} ({approvingCandidates} selected).
            </p>
          ) : null}
          <Button
            size="sm"
            loading={requestMutation.isPending}
            disabled={!canCreateRequest}
            onClick={() => void requestReview()}
          >
            Request review
          </Button>
        </>
      ) : null}

      {canDecide ? (
        <>
          <Separator />
          <Textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Optional feedback for approval; required when requesting changes"
            className="min-h-20 resize-none"
          />
          <div className="flex gap-2">
            {currentReviewer?.canApprove ? (
              <Button
                size="sm"
                loading={decideMutation.isPending}
                onClick={() => void decide('approve')}
              >
                <CheckCircle2 />
                Approve
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="destructive"
              loading={decideMutation.isPending}
              disabled={!feedback.trim()}
              onClick={() => void decide('request_changes')}
            >
              <XCircle />
              Request changes
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
