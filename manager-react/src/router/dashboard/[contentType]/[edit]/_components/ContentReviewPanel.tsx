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
import type { MentionUser } from '@rakun-kit/core/client'

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
import { useTranslations } from '@/i18n'
import { useSession } from '@/state/session'
import { useManagerUsers } from '@/state/users'
import { useQueryClient } from '@tanstack/react-query'

const AT = '@'

const statusVariant = (status?: string) => {
  if (status === 'approved') return 'default' as const
  if (status === 'changes_requested') return 'destructive' as const
  return 'secondary' as const
}

export const ContentReviewPanel = ({ open }: { open: boolean }) => {
  const t = useTranslations()
  const {
    contentTypeId,
    contentTypeName,
    documentActions,
    languageCode,
  } = useEditPageContext()
  const { user } = useSession()
  const { usersById } = useManagerUsers()
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
  const review = useMemo(() => {
    const value = reviewQuery.data?.review
    if (!value) return value

    const resolveUser = (reviewUser: MentionUser) =>
      usersById.get(reviewUser._id) ?? reviewUser

    return {
      ...value,
      requestedBy: resolveUser(value.requestedBy),
      author: resolveUser(value.author),
      reviewers: value.reviewers.map((reviewer) => ({
        ...reviewer,
        user: resolveUser(reviewer.user),
      })),
      decisions: value.decisions.map((decision) => ({
        ...decision,
        reviewer: resolveUser(decision.reviewer),
      })),
    }
  }, [reviewQuery.data?.review, usersById])
  const candidates = useMemo(
    () =>
      (candidatesQuery.data ?? []).map((candidate) => ({
        ...candidate,
        user: usersById.get(candidate.user._id) ?? candidate.user,
      })),
    [candidatesQuery.data, usersById],
  )
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
      candidates.filter(
        (candidate) =>
          selectedReviewers.includes(candidate.user._id) && candidate.canApprove,
      ).length,
    [candidates, selectedReviewers],
  )
  const selectedCandidates = useMemo(
    () =>
      candidates.filter((candidate) =>
        selectedReviewers.includes(candidate.user._id),
      ),
    [candidates, selectedReviewers],
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
      toast.success(t('review.requestedToast'))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('review.couldNotRequest')))
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
      toast.success(
        decision === 'approve'
          ? t('review.approvedToast')
          : t('review.changesRequestedToast'),
      )
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('review.couldNotSubmit')))
    }
  }

  const cancel = async () => {
    if (!review) return
    try {
      await cancelMutation.mutateAsync({ reviewId: review._id })
      await refresh()
      toast.success(t('review.cancelledToast'))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('review.couldNotCancel')))
    }
  }

  if (!contentTypeId || reviewQuery.isLoading) {
    return (
      <div className="border-b px-4 py-3 text-sm text-muted-foreground">
        {contentTypeId ? t('review.loading') : t('review.saveBeforeRequest')}
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
          <span className="text-sm font-medium">{t('review.title')}</span>
          {review ? (
            <Badge variant={statusVariant(review.status)}>
              {review.status.replaceAll('_', ' ')}
            </Badge>
          ) : (
            <Badge variant="outline">
              {reviewQuery.data?.policy ? t('review.required') : t('review.notRequested')}
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
            {t('common.cancel')}
          </Button>
        ) : null}
      </div>

      {review ? (
        <div className="space-y-2 text-sm">
          <div className="text-muted-foreground">
            {t('review.approvals', {
              count: review.approvalCount,
              required: review.requiredApprovals,
            })}
            {review.blocking
              ? ` · ${t('review.requiredBeforePublishing')}`
              : ` · ${t('review.optional')}`}
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
                        {AT}
                        {reviewer.user.user}
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
                          {t('review.approved')}
                        </>
                      ) : decision?.decision === 'request_changes' ? (
                        <>
                          <XCircle className="size-3.5" />
                          {t('review.changesRequested')}
                        </>
                      ) : reviewer.canApprove ? (
                        t('review.reviewRequested')
                      ) : (
                        t('review.feedbackRequested')
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
              {t('review.saveRevisionBeforeRequest')}
            </p>
          ) : null}
          {review.status === 'outdated' ? (
            <p className="text-muted-foreground">
              {t('review.documentChanged')}
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
              <p className="text-sm font-medium">{t('review.readyToPublish')}</p>
              <p className="text-xs text-muted-foreground">
                {t('review.newPagePublishDescription', { language: languageCode })}
              </p>
            </div>
            <Button
              size="sm"
              loading={documentActions.pending.promote}
              onClick={() =>
                void documentActions.handlePublishApprovedDraft()
              }
            >
              {t('review.publishPage')}
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
                  ? t('review.reviewersSelected', { count: selectedReviewers.length })
                  : t('review.selectReviewers')}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              <Command>
                <CommandInput placeholder={t('review.searchPeople')} />
                <CommandList>
                  <CommandEmpty>{t('review.noReviewersFound')}</CommandEmpty>
                  <CommandGroup heading={t('review.reviewers')}>
                    {candidates.map((candidate) => {
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
                              {AT}
                              {candidate.user.user}
                            </div>
                          </div>
                          <Badge
                            variant={candidate.canApprove ? 'secondary' : 'outline'}
                            className="shrink-0 text-[10px]"
                          >
                            {candidate.canApprove ? t('review.approver') : t('review.feedback')}
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
                    {candidate.canApprove ? t('review.approver') : t('review.feedbackOnly')}
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
              {t('review.selectAtLeastApprovers', {
                count: requiredApprovals,
                selected: approvingCandidates,
              })}
            </p>
          ) : null}
          <Button
            size="sm"
            loading={requestMutation.isPending}
            disabled={!canCreateRequest}
            onClick={() => void requestReview()}
          >
            {t('review.requestReview')}
          </Button>
        </>
      ) : null}

      {canDecide ? (
        <>
          <Separator />
          <Textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder={t('review.feedbackPlaceholder')}
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
                {t('review.approve')}
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
              {t('review.requestChanges')}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
