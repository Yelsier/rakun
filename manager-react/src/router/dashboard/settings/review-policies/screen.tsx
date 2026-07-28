'use client'

import { useState } from 'react'
import { CheckIcon, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import UnauthorizedMessage from '@/components/unauthorized'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tags,
  TagsContent,
  TagsEmpty,
  TagsGroup,
  TagsInput,
  TagsItem,
  TagsList,
  TagsTrigger,
  TagsValue,
} from '@/components/ui/shadcn-io/tags'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useSession } from '@/state/session'

const PolicyMultiSelect = ({
  options,
  value,
  onValueChange,
  searchPlaceholder,
}: {
  options: Array<{ value: string; label: string }>
  value: string[]
  onValueChange: (value: string[]) => void
  searchPlaceholder: string
}) => {
  const labelsByValue = new Map(options.map((option) => [option.value, option.label]))
  const remove = (removedValue: string) =>
    onValueChange(value.filter((item) => item !== removedValue))
  const toggle = (selectedValue: string) =>
    value.includes(selectedValue) ? remove(selectedValue) : onValueChange([...value, selectedValue])

  return (
    <Tags>
      <TagsTrigger>
        {value.map((selectedValue) => (
          <TagsValue key={selectedValue} onRemove={() => remove(selectedValue)}>
            {labelsByValue.get(selectedValue) ?? selectedValue}
          </TagsValue>
        ))}
      </TagsTrigger>
      <TagsContent>
        <TagsInput placeholder={searchPlaceholder} />
        <TagsList>
          <TagsEmpty />
          <TagsGroup>
            {options.map((option) => (
              <TagsItem key={option.value} value={option.value} onSelect={toggle}>
                {option.label}
                {value.includes(option.value) ? (
                  <CheckIcon className="text-muted-foreground" size={14} />
                ) : null}
              </TagsItem>
            ))}
          </TagsGroup>
        </TagsList>
      </TagsContent>
    </Tags>
  )
}

export const ManagerSettingsReviewPoliciesScreen = () => {
  const { hasPermissions } = useSession()
  const allowed = hasPermissions(['review.policy.configure'])
  const policiesQuery = useManagerQuery({
    name: 'manager.reviewPolicies.list',
    input: undefined,
    enabled: allowed,
  })
  const upsertMutation = useManagerMutation('manager.reviewPolicies.upsert')
  const deleteMutation = useManagerMutation('manager.reviewPolicies.delete')
  const [editingId, setEditingId] = useState<string | undefined>()
  const [roleId, setRoleId] = useState('')
  const [contentTypes, setContentTypes] = useState<string[]>([])
  const [reviewerRoleIds, setReviewerRoleIds] = useState<string[]>([])
  const [requiredApprovals, setRequiredApprovals] = useState(1)
  const [deletingPolicyId, setDeletingPolicyId] = useState<string | null>(null)
  const data = policiesQuery.data
  const roleNames = new Map((data?.roles ?? []).map((role) => [role._id, role.name]))

  if (!allowed) {
    return <UnauthorizedMessage neededPermission={['review.policy.configure']} />
  }

  const reset = () => {
    setEditingId(undefined)
    setRoleId('')
    setContentTypes([])
    setReviewerRoleIds([])
    setRequiredApprovals(1)
  }

  const save = async () => {
    if (!roleId || !contentTypes.length || !reviewerRoleIds.length) return
    try {
      await upsertMutation.mutateAsync({
        ...(editingId ? { id: editingId } : {}),
        roleId,
        contentTypes: Array.from(new Set(contentTypes)),
        reviewerRoleIds,
        requiredApprovals,
      })
      await policiesQuery.refetch()
      reset()
      toast.success('Review policy saved')
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not save review policy'))
    }
  }

  const edit = (policy: NonNullable<typeof data>['policies'][number]) => {
    setEditingId(policy._id)
    setRoleId(policy.roleId)
    setContentTypes(policy.contentTypes)
    setReviewerRoleIds(policy.reviewerRoleIds)
    setRequiredApprovals(policy.requiredApprovals)
  }

  const remove = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id })
      await policiesQuery.refetch()
      if (editingId === id) reset()
      setDeletingPolicyId(null)
      toast.success('Review policy deleted')
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not delete review policy'))
    }
  }

  return (
    <div className="container mx-auto space-y-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Review policies</h1>
        <p className="text-sm text-muted-foreground">
          Require approvals by author role and content type.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit policy' : 'New policy'}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Author role</Label>
            <Select value={roleId || undefined} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {(data?.roles ?? []).map((role) => (
                  <SelectItem key={role._id} value={role._id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Content types</Label>
            <PolicyMultiSelect
              options={(data?.contentTypes ?? []).map((item) => ({
                value: item.name,
                label: item.name,
              }))}
              value={contentTypes}
              onValueChange={setContentTypes}
              searchPlaceholder="Search content types..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="required-approvals">Required approvals</Label>
            <Input
              id="required-approvals"
              type="number"
              min={1}
              value={requiredApprovals}
              onChange={(event) =>
                setRequiredApprovals(Math.max(1, Number(event.target.value) || 1))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Reviewer roles</Label>
            <PolicyMultiSelect
              options={(data?.roles ?? []).map((role) => ({
                value: role._id,
                label: role.name,
              }))}
              value={reviewerRoleIds}
              onValueChange={setReviewerRoleIds}
              searchPlaceholder="Search reviewer roles..."
            />
          </div>
          <div className="flex gap-2 md:col-span-2 justify-end">
            <Button
              loading={upsertMutation.isPending}
              disabled={!roleId || !contentTypes.length || !reviewerRoleIds.length}
              onClick={() => void save()}
            >
              {editingId ? <Pencil /> : <Plus />}
              {editingId ? 'Update policy' : 'Create policy'}
            </Button>
            {editingId ? (
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {(data?.policies ?? []).map((policy) => (
          <Card key={policy._id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{roleNames.get(policy.roleId) ?? policy.roleId}</strong>
                <span className="text-muted-foreground">for</span>
                {policy.contentTypes.map((contentType) => (
                  <Badge key={contentType} variant="outline">
                    {contentType}
                  </Badge>
                ))}
                <span className="text-sm text-muted-foreground">
                  {policy.requiredApprovals} approval
                  {policy.requiredApprovals === 1 ? '' : 's'} from{' '}
                  {policy.reviewerRoleIds.map((id) => roleNames.get(id) ?? id).join(', ')}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => edit(policy)}>
                  <Pencil />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  loading={deleteMutation.isPending}
                  onClick={() => setDeletingPolicyId(policy._id)}
                >
                  <Trash2 />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!policiesQuery.isLoading && !data?.policies.length ? (
          <p className="text-sm text-muted-foreground">No review policies configured.</p>
        ) : null}
      </div>
      <Dialog
        open={Boolean(deletingPolicyId)}
        onOpenChange={(open) => {
          if (!open) setDeletingPolicyId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete review policy</DialogTitle>
            <DialogDescription>
              This policy will stop requiring its configured review workflow. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingPolicyId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (deletingPolicyId) void remove(deletingPolicyId)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
