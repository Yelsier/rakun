'use client'

import { MessageCircle, Send } from 'lucide-react'
import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { MentionUser } from '@rakun-kit/core/client'

import { useEditPageContext } from '../_context/EditPageContext'

import { createManagerQueryKey, useManagerMutation, useManagerQuery } from '@/client/react'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  Mention,
  MentionContent,
  MentionInput,
  MentionItem,
} from '@/components/ui/mention'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
  MessageHeader,
} from '@/components/ui/message'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { cn } from '@/lib/utils'
import { useSession } from '@/state/session'

const displayUserName = (user: MentionUser) => user.name?.trim() || user.user

const mentionLabel = (user: MentionUser) => user.user

const isOwnCommentAuthor = ({
  author,
  currentUser,
}: {
  author: MentionUser
  currentUser: { _id: string; user: string }
}) => author._id === currentUser._id || author.user === currentUser.user

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const isCurrentUserMention = ({
  currentUser,
  mentionUser,
}: {
  currentUser: { _id: string; user: string }
  mentionUser: MentionUser
}) => mentionUser._id === currentUser._id || mentionUser.user === currentUser.user

const isSameCommentAuthor = (firstAuthor: MentionUser, secondAuthor: MentionUser) =>
  firstAuthor._id === secondAuthor._id || firstAuthor.user === secondAuthor.user

const getCommentDate = (value?: Date | string | null) => {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return date
}

const getMessageDayKey = (value?: Date | string | null) => {
  const date = getCommentDate(value)

  if (!date) return 'unknown'

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const formatMessageDayLabel = (value?: Date | string | null) => {
  const date = getCommentDate(value)

  if (!date) return 'Unknown day'

  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (getMessageDayKey(date) === getMessageDayKey(today)) return 'Today'
  if (getMessageDayKey(date) === getMessageDayKey(yesterday)) return 'Yesterday'

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatMessageTime = (value?: Date | string | null) => {
  const date = getCommentDate(value)

  if (!date) return null

  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const DaySeparator = ({ date }: { date?: Date | string | null }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="h-px flex-1 bg-border" />
    <span className="rounded-full bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border">
      {formatMessageDayLabel(date)}
    </span>
    <div className="h-px flex-1 bg-border" />
  </div>
)

const UserHoverCard = ({
  children,
  user,
}: {
  children: ReactNode
  user: MentionUser
}) => (
  <HoverCard openDelay={150}>
    <HoverCardTrigger asChild>{children}</HoverCardTrigger>
    <HoverCardContent align="start" className="w-64">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar
          name={displayUserName(user)}
          avatar={user.avatar}
          className="size-10"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{displayUserName(user)}</p>
          <p className="truncate text-xs text-muted-foreground">@{user.user}</p>
        </div>
      </div>
    </HoverCardContent>
  </HoverCard>
)

const CommentText = ({
  currentUser,
  mentions,
  text,
}: {
  currentUser: { _id: string; user: string }
  mentions: MentionUser[]
  text: string
}) => {
  const mentionsByUsername = new Map(
    mentions.map((mentionUser) => [mentionUser.user.toLowerCase(), mentionUser]),
  )
  const usernames = Array.from(mentionsByUsername.keys())
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)

  if (usernames.length === 0) return <>{text}</>

  const pattern = new RegExp(`@+(${usernames.join('|')})(?![A-Za-z0-9_.-])`, 'gi')
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text))) {
    const [rawMention, username] = match
    const mentionUser = mentionsByUsername.get(username.toLowerCase())

    if (!mentionUser) continue

    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const currentUserMention = isCurrentUserMention({
      currentUser,
      mentionUser,
    })

    parts.push(
      <UserHoverCard key={`${match.index}:${rawMention}`} user={mentionUser}>
        <span
          tabIndex={0}
          className={cn(
            'inline-flex cursor-default rounded-sm bg-primary/10 px-1 py-0.5 font-medium text-primary outline-none ring-offset-background hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            currentUserMention &&
              'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30 hover:bg-amber-500/20 dark:text-amber-300'
          )}
        >
          @{mentionUser.user}
        </span>
      </UserHoverCard>,
    )
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}

export const ContentCommentsDrawer = () => {
  const { contentTypeId, contentTypeName } = useEditPageContext()
  const { user } = useSession()
  const queryClient = useQueryClient()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [mentions, setMentions] = useState<string[]>([])
  const [composerKey, setComposerKey] = useState(0)
  const commentsInput = contentTypeId
    ? {
        contentType: contentTypeName,
        documentId: contentTypeId,
      }
    : undefined
  const commentsQuery = useManagerQuery({
    name: 'manager.comments.list',
    input: commentsInput ?? ({
      contentType: '',
      documentId: '',
    } as never),
    enabled: Boolean(open && commentsInput),
    refetchInterval: open ? 5000 : false,
  })
  const usersQuery = useManagerQuery({
    name: 'manager.users.mentions',
    input: undefined,
    enabled: open,
  })
  const createCommentMutation = useManagerMutation('manager.comments.create')
  const mentionUsers = usersQuery.data ?? []
  const mentionUsersById = useMemo(
    () => new Map(mentionUsers.map((mentionUser) => [mentionUser._id, mentionUser])),
    [mentionUsers]
  )
  const comments = commentsQuery.data?.comments ?? []
  const trimmedText = text.trim()
  const scrollMessagesToEnd = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        block: 'end',
        behavior,
      })
    })
  }, [])

  useEffect(() => {
    if (!open) return

    scrollMessagesToEnd('auto')
  }, [comments.length, open, scrollMessagesToEnd])

  if (!contentTypeId || !commentsInput) return null

  const invalidateComments = async () => {
    await queryClient.invalidateQueries({
      queryKey: createManagerQueryKey('manager.comments.list', commentsInput),
    })
  }

  const handleSubmit = async () => {
    if (!trimmedText) return

    try {
      await createCommentMutation.mutateAsync({
        ...commentsInput,
        text: trimmedText,
        mentions,
      })
      setText('')
      setMentions([])
      setComposerKey((key) => key + 1)
      if (textareaRef.current) {
        textareaRef.current.value = ''
      }
      await invalidateComments()
      scrollMessagesToEnd()
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not add comment'))
    }
  }

  const filterMentionUsers = (options: string[], term: string) => {
    const normalizedTerm = term.trim().toLowerCase()

    if (!normalizedTerm) return options

    return options.filter((id) => {
      const mentionUser = mentionUsersById.get(id)
      if (!mentionUser) return false

      return [mentionUser.name, mentionUser.user]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedTerm))
    })
  }

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DrawerTrigger asChild>
            <Button aria-label="Comments" variant="outline" size="icon">
              <MessageCircle />
            </Button>
          </DrawerTrigger>
        </TooltipTrigger>
        <TooltipContent>Comments</TooltipContent>
      </Tooltip>
      <DrawerContent className="w-[min(92vw,520px)] sm:max-w-[520px]">
        <DrawerHeader className="border-b">
          <DrawerTitle>Comments</DrawerTitle>
          <DrawerDescription>{contentTypeName}</DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex min-h-[320px] flex-col gap-4 p-4">
            {commentsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading comments...</p>
            ) : commentsQuery.isError ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-destructive">Could not load comments.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void commentsQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : comments.length ? (
              <MessageGroup>
                {comments.map((comment, index) => {
                  const previousComment = comments[index - 1]
                  const showDaySeparator =
                    !previousComment ||
                    getMessageDayKey(previousComment.createdAt) !==
                      getMessageDayKey(comment.createdAt)
                  const showAuthor =
                    !previousComment ||
                    showDaySeparator ||
                    !isSameCommentAuthor(previousComment.author, comment.author)
                  const ownComment = isOwnCommentAuthor({
                    author: comment.author,
                    currentUser: user,
                  })
                  const createdAt = getCommentDate(comment.createdAt)
                  const messageTime = formatMessageTime(createdAt)

                  return (
                    <Fragment key={comment._id}>
                      {showDaySeparator ? <DaySeparator date={comment.createdAt} /> : null}
                      <Message align={ownComment ? 'end' : 'start'}>
                        <MessageAvatar className={cn(!showAuthor && 'invisible')}>
                          <UserHoverCard user={comment.author}>
                            <span className="inline-flex cursor-default rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                              <UserAvatar
                                name={displayUserName(comment.author)}
                                avatar={comment.author.avatar}
                                className="size-8"
                              />
                            </span>
                          </UserHoverCard>
                        </MessageAvatar>
                        <MessageContent className={cn(ownComment && 'items-end')}>
                          {showAuthor ? (
                            <MessageHeader className={cn(ownComment && 'justify-end')}>
                              <UserHoverCard user={comment.author}>
                                <span className="cursor-default rounded-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                  {displayUserName(comment.author)}
                                </span>
                              </UserHoverCard>
                            </MessageHeader>
                          ) : null}
                          <div
                            className={cn(
                              'w-fit max-w-[82%] whitespace-pre-wrap break-words rounded-md bg-muted px-3 py-2 text-left text-sm leading-relaxed',
                              ownComment && 'self-end'
                            )}
                          >
                            <CommentText
                              currentUser={user}
                              mentions={comment.mentions}
                              text={comment.text}
                            />
                            {createdAt && messageTime ? (
                              <time
                                dateTime={createdAt.toISOString()}
                                className="mt-1 block text-right text-[10px] font-medium leading-none text-muted-foreground"
                              >
                                {messageTime}
                              </time>
                            ) : null}
                          </div>
                        </MessageContent>
                      </Message>
                    </Fragment>
                  )
                })}
              </MessageGroup>
            ) : (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        </ScrollArea>
        <DrawerFooter className="border-t">
          <Mention
            key={composerKey}
            value={mentions}
            onValueChange={setMentions}
            inputValue={text}
            onInputValueChange={setText}
            trigger="@"
            onFilter={filterMentionUsers}
          >
            <MentionInput asChild>
              <Textarea
                ref={textareaRef}
                placeholder="Write a comment..."
                className="max-h-40 min-h-24 resize-none"
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault()
                    void handleSubmit()
                  }
                }}
              />
            </MentionInput>
            <MentionContent className="max-h-64 min-w-64 overflow-y-auto">
              {usersQuery.isLoading ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Loading users...
                </div>
              ) : mentionUsers.length ? (
                mentionUsers.map((mentionUser) => (
                  <MentionItem
                    key={mentionUser._id}
                    value={mentionUser._id}
                    label={mentionLabel(mentionUser)}
                  >
                    <UserAvatar
                      name={displayUserName(mentionUser)}
                      avatar={mentionUser.avatar}
                      className="size-6"
                    />
                    <span className="min-w-0">
                      <span className="block truncate">{displayUserName(mentionUser)}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        @{mentionUser.user}
                      </span>
                    </span>
                  </MentionItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No users found
                </div>
              )}
            </MentionContent>
          </Mention>
          <Button
            type="button"
            loading={createCommentMutation.isPending}
            disabled={!trimmedText}
            onClick={() => void handleSubmit()}
          >
            <Send />
            Send
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
