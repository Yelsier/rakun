'use client'

import { useState } from 'react'
import { CheckIcon, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import { confirm } from '@/components/confirm'
import UnauthorizedMessage from '@/components/unauthorized'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useTranslations } from '@/i18n'
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
  const t = useTranslations()
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
      toast.success(t('settings.reviewPolicies.saved'))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('settings.reviewPolicies.saveError')))
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
    await confirm({
      title: t('settings.reviewPolicies.deleteTitle'),
      description: t('settings.reviewPolicies.deleteDescription'),
      confirmLabel: t('common.delete'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync({ id })
          await policiesQuery.refetch()
          if (editingId === id) reset()
          toast.success(t('settings.reviewPolicies.deleted'))
        } catch (error) {
          toast.error(
            getActionErrorMessage(error, t('settings.reviewPolicies.deleteError')),
          )
          throw error
        }
      },
    })
  }

  return (
    <div className="container mx-auto space-y-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">{t('settings.reviewPolicies.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('settings.reviewPolicies.description')}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit policy' : 'New policy'}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('settings.reviewPolicies.authorRole')}</Label>
            <Select value={roleId || undefined} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder={t('users.selectRole')} />
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
            <Label>{t('settings.reviewPolicies.contentTypes')}</Label>
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
            <Label htmlFor="required-approvals">{t('settings.reviewPolicies.requiredApprovals')}</Label>
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
            <Label>{t('settings.reviewPolicies.reviewerRoles')}</Label>
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
                {t('common.cancel')}
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
                <span className="text-muted-foreground">{t('settings.reviewPolicies.for')}</span>
                {policy.contentTypes.map((contentType) => (
                  <Badge key={contentType} variant="outline">
                    {contentType}
                  </Badge>
                ))}
                <span className="text-sm text-muted-foreground">
                  {t('settings.reviewPolicies.approvalsFrom', {
                    count: policy.requiredApprovals,
                  })}{' '}
                  {policy.reviewerRoleIds.map((id) => roleNames.get(id) ?? id).join(', ')}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => edit(policy)}>
                  <Pencil />
                  {t('common.edit')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void remove(policy._id)}
                >
                  <Trash2 />
                  {t('common.delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!policiesQuery.isLoading && !data?.policies.length ? (
          <p className="text-sm text-muted-foreground">{t('settings.reviewPolicies.empty')}</p>
        ) : null}
      </div>
    </div>
  )
}
