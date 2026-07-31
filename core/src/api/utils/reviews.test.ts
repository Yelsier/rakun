import { describe, expect, it } from 'bun:test'

import { getPermissionList } from '../../lib/Permissions'
import { notificationItem } from '../../schemas/manager/notifications'
import { upsertReviewPolicyInput } from '../../schemas/manager/reviewPolicies'
import { decideReviewInput } from '../../schemas/manager/reviews'
import {
  getDocumentRevisionToken,
  getReviewPolicyContentTypes,
  getReviewDecisionStatus,
  resolveStoredReviewStatus,
} from './reviews'

describe('review workflow', () => {
  it('uses version revisions and updated timestamps as stable review tokens', () => {
    expect(getDocumentRevisionToken({ _id: 'one', _revision: 3 })).toBe(
      'revision:3',
    )
    expect(
      getDocumentRevisionToken({
        _id: 'two',
        updatedAt: new Date('2026-07-26T10:00:00.000Z'),
      }),
    ).toBe('updatedAt:2026-07-26T10:00:00.000Z')
  })

  it('invalidates decisions when the document revision changes', () => {
    expect(
      resolveStoredReviewStatus(
        { revisionToken: 'revision:1', status: 'approved' },
        'revision:2',
      ),
    ).toBe('outdated')
    expect(
      resolveStoredReviewStatus(
        { revisionToken: 'revision:1', status: 'cancelled' },
        'revision:2',
      ),
    ).toBe('cancelled')
  })

  it('requires the quorum and lets requested changes take precedence', () => {
    expect(
      getReviewDecisionStatus({
        decisions: [{ decision: 'approve' }],
        requiredApprovals: 2,
      }),
    ).toBe('pending')
    expect(
      getReviewDecisionStatus({
        decisions: [{ decision: 'approve' }, { decision: 'approve' }],
        requiredApprovals: 2,
      }),
    ).toBe('approved')
    expect(
      getReviewDecisionStatus({
        decisions: [{ decision: 'approve' }, { decision: 'request_changes' }],
        requiredApprovals: 1,
      }),
    ).toBe('changes_requested')
  })

  it('requires feedback when requesting changes', () => {
    expect(
      decideReviewInput.safeParse({
        reviewId: 'review',
        decision: 'request_changes',
      }).success,
    ).toBe(false)
    expect(
      decideReviewInput.safeParse({
        reviewId: 'review',
        decision: 'request_changes',
        feedback: 'Please update the title',
      }).success,
    ).toBe(true)
  })

  it('keeps legacy notifications valid and exposes review permissions', () => {
    expect(
      notificationItem.safeParse({
        _id: 'notification',
        commentId: 'comment',
        contentType: 'Page',
        documentId: 'page',
        text: 'Mention',
        author: { _id: 'user', user: 'editor', avatar: null },
        read: false,
      }).success,
    ).toBe(true)
    expect(
      notificationItem.safeParse({
        _id: 'notification',
        kind: 'redirect_enable_requested',
        contentType: 'Redirect',
        documentId: 'redirect',
        text: 'Enable redirect',
        author: { _id: 'user', user: 'editor', avatar: null },
        read: false,
      }).success,
    ).toBe(true)
    expect(getPermissionList()).toContain('review.policy.configure')
    expect(getPermissionList()).toContain('review.workflow.selfApprove')
  })

  it('stores several content types in one policy and reads legacy policies', () => {
    expect(
      upsertReviewPolicyInput.safeParse({
        roleId: 'author',
        contentTypes: ['Page', 'Article'],
        reviewerRoleIds: ['reviewer'],
        requiredApprovals: 1,
      }).success,
    ).toBe(true)
    expect(getReviewPolicyContentTypes({ contentType: 'Page' })).toEqual([
      'Page',
    ])
    expect(
      getReviewPolicyContentTypes({
        contentTypes: ['Page', 'Article', 'Page'],
      }),
    ).toEqual(['Page', 'Article'])
  })
})
